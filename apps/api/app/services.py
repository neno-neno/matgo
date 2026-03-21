from __future__ import annotations

import json
from datetime import datetime
import uuid
from collections import Counter

from fastapi import HTTPException, status

from app import data
from app.config import settings
from app.cosmetics import COSMETIC_CATALOG
from app.db import (
    create_session,
    execute,
    fetch_all,
    fetch_one,
    get_user_by_email,
    get_user_by_token,
    make_password_hash,
    now_iso,
    verify_password,
)
from app.models import (
    AchievementItem,
    AuthUser,
    DailyMissionExercise,
    DailyMissionResponse,
    ClassRankingEntry,
    ClassReport,
    ClassSummary,
    GenericMessage,
    CosmeticItem,
    ProfileInventoryResponse,
    RewardUnlockItem,
    RewardsOverviewResponse,
    ShopItem,
    ShopResponse,
    ForumPostItem,
    ForumTopicDetail,
    ForumTopicSummary,
    LoginResponse,
    PublicClassOption,
    QuestionBankItem,
    QuestionBankLessonOption,
    StudentSignupRequestSummary,
    StudentMiniProfile,
    StudentReport,
    TeacherCreateStudentRequest,
    TeacherDirectoryItem,
    TeacherAccessStudent,
    WeakPoint,
)
from app.question_bank import LESSON_MIN_GRADE_BAND, QUESTION_BANK_LESSONS, QUESTION_BANK_PATHS


def _row_to_auth_user(row) -> AuthUser:
    return AuthUser(
        id=row["id"],
        role=row["role"],
        full_name=row["full_name"],
        email=row["email"],
        avatar_url=row["avatar_url"],
        grade_band=row["grade_band"],
        bio=row["bio"],
        level=row["level"],
        xp=row["xp"],
        coins=row["coins"],
        streak=row["streak"],
        lives=row["lives"],
    )


def authenticate_user(email: str, password: str) -> LoginResponse:
    user = get_user_by_email(email.strip().lower())
    if user is None or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas")
    token = create_session(user["id"])
    return LoginResponse(token=token, user=_row_to_auth_user(user))


def register_user(
    full_name: str,
    email: str,
    password: str,
    role: str,
    grade_band: str | None,
    bio: str | None,
    access_code: str | None,
) -> LoginResponse:
    existing = get_user_by_email(email.strip().lower())
    if existing is not None:
        raise HTTPException(status_code=409, detail="Ja existe um usuario com este email")
    if role == "teacher" and access_code != settings.master_access_code:
        raise HTTPException(status_code=403, detail="Codigo de acesso invalido para cadastro de professor")

    school = fetch_one("SELECT id FROM schools ORDER BY created_at ASC LIMIT 1")
    if school is None:
        raise HTTPException(status_code=500, detail="Escola base nao encontrada")

    user_id = f"{role}-{uuid.uuid4().hex[:10]}"
    execute(
        """
        INSERT INTO users (
          id, school_id, role, full_name, email, password_hash, avatar_url, grade_band, bio,
          level, xp, coins, streak, lives, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 5, ?, ?)
        """,
        (
            user_id,
            school["id"],
            role,
            full_name,
            email.strip().lower(),
            make_password_hash(password),
            f"https://api.dicebear.com/8.x/adventurer/svg?seed={full_name.split()[0]}",
            grade_band,
            bio or "",
            now_iso(),
            now_iso(),
        ),
    )
    created = fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
    _sync_user_cosmetics(user_id)
    _sync_user_achievements(user_id)
    token = create_session(user_id)
    return LoginResponse(token=token, user=_row_to_auth_user(created))


def list_public_classes() -> list[PublicClassOption]:
    rows = fetch_all(
        """
        SELECT c.id, c.name, c.grade_band, u.full_name AS teacher_name
        FROM class_groups c
        JOIN users u ON u.id = c.teacher_id
        ORDER BY c.name
        """
    )
    return [PublicClassOption(**dict(row)) for row in rows]


def create_student_signup_request(class_id: str, full_name: str, email: str, note: str | None) -> GenericMessage:
    existing_user = get_user_by_email(email.strip().lower())
    existing_request = fetch_one("SELECT id, status FROM signup_requests WHERE email = ?", (email.strip().lower(),))
    if existing_user is not None:
        raise HTTPException(status_code=409, detail="Ja existe uma conta com este email")
    if existing_request is not None and existing_request["status"] == "pending":
        raise HTTPException(status_code=409, detail="Ja existe uma solicitacao pendente com este email")

    class_row = fetch_one("SELECT id, teacher_id, grade_band FROM class_groups WHERE id = ?", (class_id,))
    if class_row is None:
        raise HTTPException(status_code=404, detail="Turma nao encontrada")
    request_id = f"signup-{uuid.uuid4().hex[:10]}"
    execute(
        """
        INSERT INTO signup_requests (
          id, class_id, requested_teacher_id, full_name, email, grade_band, note, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        """,
        (request_id, class_id, class_row["teacher_id"], full_name, email.strip().lower(), class_row["grade_band"], note, now_iso()),
    )
    return GenericMessage(message="Solicitacao enviada para o professor responsavel pela turma.")


def get_authenticated_user(token: str) -> AuthUser:
    user = get_user_by_token(token)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao invalida ou expirada")
    return _row_to_auth_user(user)


def list_teacher_classes(teacher_id: str) -> list[ClassSummary]:
    rows = fetch_all(
        """
        SELECT
          c.id,
          c.name,
          c.grade_band,
          c.invite_code,
          COUNT(DISTINCT e.student_id) AS students_count,
          COALESCE(ROUND(AVG(m.last_accuracy)), 0) AS average_accuracy,
          COALESCE(SUM(u.xp), 0) AS total_xp
        FROM class_groups c
        LEFT JOIN class_enrollments e ON e.class_id = c.id
        LEFT JOIN users u ON u.id = e.student_id
        LEFT JOIN student_skill_metrics m ON m.student_id = e.student_id
        WHERE c.teacher_id = ?
        GROUP BY c.id, c.name, c.grade_band, c.invite_code
        ORDER BY c.name
        """,
        (teacher_id,),
    )
    return [ClassSummary(**dict(row)) for row in rows]


def _student_accuracy(student_id: str) -> int:
    row = fetch_one(
        "SELECT COALESCE(ROUND(AVG(CASE WHEN is_correct = 1 THEN 100 ELSE 0 END)), 0) AS accuracy FROM exercise_attempts WHERE student_id = ?",
        (student_id,),
    )
    return int(row["accuracy"]) if row else 0


def _student_minutes(student_id: str) -> int:
    row = fetch_one(
        "SELECT COALESCE(SUM(minutes_studied), 0) AS minutes FROM study_sessions WHERE student_id = ?",
        (student_id,),
    )
    return int(row["minutes"]) if row else 0


def _strength_weakness_lists(student_id: str) -> tuple[list[WeakPoint], list[WeakPoint]]:
    rows = fetch_all(
        """
        SELECT topic, strength_score, weakness_score, last_accuracy, recommendation
        FROM student_skill_metrics
        WHERE student_id = ?
        ORDER BY strength_score DESC, weakness_score DESC
        """,
        (student_id,),
    )
    strengths = [
        WeakPoint(topic=row["topic"], confidence=row["strength_score"], recommendation=row["recommendation"])
        for row in rows[:2]
    ]
    weaknesses = [
        WeakPoint(topic=row["topic"], confidence=row["weakness_score"], recommendation=row["recommendation"])
        for row in sorted(rows, key=lambda item: item["weakness_score"], reverse=True)[:2]
    ]
    return strengths, weaknesses


def _student_profile(student_id: str) -> StudentMiniProfile:
    row = fetch_one("SELECT * FROM users WHERE id = ?", (student_id,))
    if row is None:
        raise HTTPException(status_code=404, detail="Aluno nao encontrado")
    strengths, weaknesses = _strength_weakness_lists(student_id)
    return StudentMiniProfile(
        id=row["id"],
        full_name=row["full_name"],
        email=row["email"],
        avatar_url=row["avatar_url"] or "",
        grade_band=row["grade_band"] or "",
        level=row["level"],
        xp=row["xp"],
        streak=row["streak"],
        accuracy=_student_accuracy(student_id),
        study_minutes=_student_minutes(student_id),
        strong_areas=[item.topic for item in strengths],
        weak_areas=[item.topic for item in weaknesses],
    )


def get_students_for_teacher(teacher_id: str) -> list[StudentMiniProfile]:
    rows = fetch_all(
        """
        SELECT u.id
        FROM teacher_student_links l
        JOIN users u ON u.id = l.student_id
        WHERE l.teacher_id = ?
        ORDER BY u.full_name
        """,
        (teacher_id,),
    )
    return [_student_profile(row["id"]) for row in rows]


def get_teacher_access_students(teacher_id: str) -> list[TeacherAccessStudent]:
    rows = fetch_all(
        """
        SELECT u.id, u.full_name, u.email, COALESCE(u.grade_band, '') AS grade_band
        FROM teacher_student_links l
        JOIN users u ON u.id = l.student_id
        WHERE l.teacher_id = ?
        ORDER BY u.full_name
        """,
        (teacher_id,),
    )
    return [TeacherAccessStudent(**dict(row)) for row in rows]


def list_signup_requests_for_teacher(teacher_id: str) -> list[StudentSignupRequestSummary]:
    rows = fetch_all(
        """
        SELECT *
        FROM signup_requests
        WHERE requested_teacher_id = ?
        ORDER BY created_at DESC
        """,
        (teacher_id,),
    )
    return [StudentSignupRequestSummary(**dict(row)) for row in rows]


def create_class_for_teacher(teacher_id: str, name: str, grade_band: str) -> ClassSummary:
    teacher = fetch_one("SELECT school_id FROM users WHERE id = ? AND role IN ('teacher', 'master')", (teacher_id,))
    if teacher is None:
        raise HTTPException(status_code=404, detail="Professor nao encontrado")
    class_id = f"class-{uuid.uuid4().hex[:10]}"
    invite_code = f"{''.join(part[0] for part in name.split()[:3]).upper()}{uuid.uuid4().hex[:4].upper()}"
    execute(
        "INSERT INTO class_groups (id, school_id, teacher_id, name, grade_band, invite_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (class_id, teacher["school_id"], teacher_id, name, grade_band, invite_code, now_iso()),
    )
    classes = list_teacher_classes(teacher_id)
    created = next((item for item in classes if item.id == class_id), None)
    if created is None:
        raise HTTPException(status_code=500, detail="Turma criada mas nao recuperada")
    return created


def create_student_for_teacher(
    teacher_id: str,
    full_name: str,
    email: str,
    password: str,
    grade_band: str,
    bio: str | None,
    class_id: str | None,
) -> StudentMiniProfile:
    existing = get_user_by_email(email.strip().lower())
    if existing is not None:
        raise HTTPException(status_code=409, detail="Ja existe um usuario com este email")
    teacher = fetch_one("SELECT school_id FROM users WHERE id = ? AND role IN ('teacher', 'master')", (teacher_id,))
    if teacher is None:
        raise HTTPException(status_code=404, detail="Professor nao encontrado")
    student_id = f"student-{uuid.uuid4().hex[:10]}"
    execute(
        """
        INSERT INTO users (
          id, school_id, role, full_name, email, password_hash, avatar_url, grade_band, bio,
          level, xp, coins, streak, lives, created_at, updated_at
        ) VALUES (?, ?, 'student', ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 5, ?, ?)
        """,
        (
            student_id,
            teacher["school_id"],
            full_name,
            email.strip().lower(),
            make_password_hash(password),
            f"https://api.dicebear.com/8.x/adventurer/svg?seed={full_name.split()[0]}",
            grade_band,
            bio or "Aluno cadastrado pelo professor.",
            now_iso(),
            now_iso(),
        ),
    )
    execute("INSERT INTO teacher_student_links (teacher_id, student_id) VALUES (?, ?)", (teacher_id, student_id))
    if class_id:
        execute("INSERT INTO class_enrollments (class_id, student_id, joined_at) VALUES (?, ?, ?)", (class_id, student_id, now_iso()))
    execute(
        """
        INSERT INTO student_skill_metrics (
          student_id, topic, strength_score, weakness_score, last_accuracy, recommendation, updated_at
        ) VALUES (?, 'Base inicial', 40, 60, 0, 'Iniciar trilha diagnostica.', ?)
        """,
        (student_id, now_iso()),
    )
    _sync_user_cosmetics(student_id)
    _sync_user_achievements(student_id)
    return _student_profile(student_id)


def approve_signup_request(teacher_id: str, request_id: str, password: str, class_id: str | None = None) -> StudentMiniProfile:
    request_row = fetch_one(
        "SELECT * FROM signup_requests WHERE id = ? AND requested_teacher_id = ?",
        (request_id, teacher_id),
    )
    if request_row is None:
        raise HTTPException(status_code=404, detail="Solicitacao nao encontrada")
    if request_row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Solicitacao ja foi processada")
    created = create_student_for_teacher(
        teacher_id,
        request_row["full_name"],
        request_row["email"],
        password,
        request_row["grade_band"],
        request_row["note"],
        class_id or request_row["class_id"],
    )
    execute(
        """
        UPDATE signup_requests
        SET status = 'approved', approved_student_id = ?, reviewed_at = ?
        WHERE id = ?
        """,
        (created.id, now_iso(), request_id),
    )
    return created


def list_teachers() -> list[TeacherDirectoryItem]:
    rows = fetch_all(
        """
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.grade_band,
          COUNT(l.student_id) AS students_count
        FROM users u
        LEFT JOIN teacher_student_links l ON l.teacher_id = u.id
        WHERE u.role = 'teacher'
        GROUP BY u.id, u.full_name, u.email, u.grade_band
        ORDER BY u.full_name
        """
    )
    return [TeacherDirectoryItem(**dict(row)) for row in rows]


def _default_skill_for_lesson(lesson_id: str) -> str:
    mapping = {
        "lesson-001": "fracoes equivalentes",
        "lesson-002": "soma de fracoes",
        "lesson-003": "equacoes",
        "lesson-005": "soma",
        "lesson-006": "subtracao",
        "lesson-007": "multiplicacao",
        "lesson-008": "divisao",
        "lesson-009": "porcentagem",
        "lesson-010": "aumento percentual",
        "lesson-014": "potenciacao",
        "lesson-015": "radiciacao",
        "lesson-016": "comparacao de fracoes",
        "lesson-017": "simplificacao de fracoes",
        "lesson-018": "equacoes dois passos",
        "lesson-019": "expressoes com potencia",
        "lesson-020": "notacao cientifica",
    }
    return mapping.get(lesson_id, "pratica objetiva")


FUNDAMENTAL_FLOW = ["6o ano", "7o ano", "8o ano", "9o ano"]
HIGH_SCHOOL_FLOW = ["1o EM", "2o EM", "3o EM"]


def _normalize_grade_band(value: str | None) -> str:
    if not value:
        return ""
    normalized = value.strip().lower()
    aliases = {
        "6 ano": "6o ano",
        "6o ano": "6o ano",
        "7 ano": "7o ano",
        "7o ano": "7o ano",
        "8 ano": "8o ano",
        "8o ano": "8o ano",
        "9 ano": "9o ano",
        "9o ano": "9o ano",
        "1o em": "1o EM",
        "1o ensino medio": "1o EM",
        "2o em": "2o EM",
        "2o ensino medio": "2o EM",
        "3o em": "3o EM",
        "3o ensino medio": "3o EM",
    }
    return aliases.get(normalized, value)


def _grade_position(value: str | None) -> tuple[str | None, int]:
    normalized = _normalize_grade_band(value)
    if normalized in FUNDAMENTAL_FLOW:
        return ("fundamental", FUNDAMENTAL_FLOW.index(normalized))
    if normalized in HIGH_SCHOOL_FLOW:
        return ("high_school", HIGH_SCHOOL_FLOW.index(normalized))
    return (None, -1)


def _can_access_lesson(student_grade_band: str | None, lesson_id: str) -> bool:
    lesson_grade_band = LESSON_MIN_GRADE_BAND.get(lesson_id)
    if not lesson_grade_band:
        return True
    student_flow, student_index = _grade_position(student_grade_band)
    lesson_flow, lesson_index = _grade_position(lesson_grade_band)
    if student_flow is None or lesson_flow is None:
        return True
    if student_flow != lesson_flow:
        return False
    return student_index >= lesson_index


def list_question_bank_lessons() -> list[QuestionBankLessonOption]:
    path_lookup = {path_id: {"path_title": title, "theme": category, "grade_band": grade_band} for path_id, title, category, grade_band, *_ in QUESTION_BANK_PATHS}
    options: list[QuestionBankLessonOption] = []
    for lesson_id, path_id, lesson_title, _summary, _minutes, _sequence_order, _xp_reward in QUESTION_BANK_LESSONS:
        path = path_lookup.get(path_id)
        if not path:
            continue
        options.append(
            QuestionBankLessonOption(
                lesson_id=lesson_id,
                lesson_title=lesson_title,
                theme=path["theme"],
                grade_band=LESSON_MIN_GRADE_BAND.get(lesson_id, path["grade_band"]),
                path_title=path["path_title"],
                default_skill=_default_skill_for_lesson(lesson_id),
            )
        )
    return options


def _row_to_question_bank_item(row) -> QuestionBankItem:
    return QuestionBankItem(
        id=row["id"],
        lesson_id=row["lesson_id"],
        lesson_title=row["lesson_title"],
        theme=row["theme"],
        grade_band=LESSON_MIN_GRADE_BAND.get(row["lesson_id"], row["grade_band"]),
        path_title=row["path_title"],
        prompt=row["prompt"],
        exercise_type=row["exercise_type"],
        difficulty=row["difficulty"],
        correct_answer=row["correct_answer"],
        explanation=row["explanation"],
        options=json.loads(row["options_json"]),
        hints=json.loads(row["hints_json"]),
        estimated_seconds=row["estimated_seconds"],
        skill=row["skill"],
    )


def _cosmetic_unlocked_for_user(user_row, item) -> bool:
    if user_row["role"] in {"teacher", "master"}:
        return True
    if item.requirement_type == "default":
        return True
    if item.requirement_type == "level":
        return int(user_row["level"]) >= item.requirement_value
    if item.requirement_type == "streak":
        return int(user_row["streak"]) >= item.requirement_value
    if item.requirement_type == "coins":
        return int(user_row["coins"]) >= item.requirement_value
    if item.requirement_type == "xp_streak_combo":
        return int(user_row["xp"]) >= item.requirement_value and int(user_row["streak"]) >= 7
    return False


def _sync_user_cosmetics(user_id: str) -> None:
    user_row = fetch_one("SELECT id, role, level, xp, coins, streak FROM users WHERE id = ?", (user_id,))
    if user_row is None:
        return
    unlocked_item_ids = {item.id for item in COSMETIC_CATALOG if _cosmetic_unlocked_for_user(user_row, item)}
    if not unlocked_item_ids:
        return
    existing_rows = fetch_all("SELECT item_id, equipped FROM user_cosmetics WHERE user_id = ?", (user_id,))
    existing_ids = {row["item_id"] for row in existing_rows}
    for item_id in unlocked_item_ids - existing_ids:
        execute(
            "INSERT INTO user_cosmetics (user_id, item_id, unlocked_at, equipped) VALUES (?, ?, ?, 0)",
            (user_id, item_id, now_iso()),
        )
    equipped_row = next((row for row in existing_rows if int(row["equipped"]) == 1), None)
    if equipped_row is None:
        preferred_item = "avatar-matgo-owl" if "avatar-matgo-owl" in unlocked_item_ids else next(iter(unlocked_item_ids))
        equip_cosmetic_item(user_id, preferred_item)


def list_profile_inventory(user_id: str) -> ProfileInventoryResponse:
    _sync_user_cosmetics(user_id)
    rows = fetch_all(
        """
        SELECT
          c.id,
          c.name,
          c.category,
          c.rarity,
          c.asset_url,
          c.description,
          c.unlock_hint,
          c.price,
          c.is_purchasable,
          CASE WHEN uc.item_id IS NOT NULL THEN 1 ELSE 0 END AS unlocked,
          COALESCE(uc.equipped, 0) AS equipped
        FROM cosmetic_items c
        LEFT JOIN user_cosmetics uc
          ON uc.item_id = c.id AND uc.user_id = ?
        ORDER BY
          CASE c.rarity WHEN 'comum' THEN 1 WHEN 'raro' THEN 2 ELSE 3 END,
          c.name ASC
        """,
        (user_id,),
    )
    items = [
        CosmeticItem(
            id=row["id"],
            name=row["name"],
            category=row["category"],
            rarity=row["rarity"],
            asset_url=row["asset_url"],
            description=row["description"],
            unlock_hint=row["unlock_hint"],
            price=row["price"],
            is_purchasable=bool(row["is_purchasable"]),
            unlocked=bool(row["unlocked"]),
            equipped=bool(row["equipped"]),
        )
        for row in rows
    ]
    equipped_avatar = next((item.id for item in items if item.category == "avatar" and item.equipped), None)
    return ProfileInventoryResponse(equipped_avatar_id=equipped_avatar, items=items)


def list_shop_items(user_id: str) -> ShopResponse:
    _sync_user_cosmetics(user_id)
    user_row = fetch_one("SELECT id, role, coins FROM users WHERE id = ?", (user_id,))
    if user_row is None:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    rows = fetch_all(
        """
        SELECT
          c.id,
          c.name,
          c.category,
          c.rarity,
          c.asset_url,
          c.description,
          c.unlock_hint,
          c.price,
          c.is_purchasable,
          CASE WHEN uc.item_id IS NOT NULL THEN 1 ELSE 0 END AS owned
        FROM cosmetic_items c
        LEFT JOIN user_cosmetics uc
          ON uc.item_id = c.id AND uc.user_id = ?
        ORDER BY
          CASE c.category WHEN 'avatar' THEN 1 WHEN 'theme' THEN 2 ELSE 3 END,
          CASE c.rarity WHEN 'comum' THEN 1 WHEN 'raro' THEN 2 ELSE 3 END,
          c.price ASC,
          c.name ASC
        """,
        (user_id,),
    )
    is_teacher_like = user_row["role"] in {"teacher", "master"}
    items = [
        ShopItem(
            id=row["id"],
            name=row["name"],
            category=row["category"],
            rarity=row["rarity"],
            asset_url=row["asset_url"],
            description=row["description"],
            unlock_hint=row["unlock_hint"],
            price=row["price"],
            is_purchasable=bool(row["is_purchasable"]),
            owned=bool(row["owned"]),
            can_purchase=bool(row["is_purchasable"]) and not bool(row["owned"]) and (is_teacher_like or int(user_row["coins"]) >= int(row["price"])),
        )
        for row in rows
    ]
    return ShopResponse(coins_balance=int(user_row["coins"]), role=user_row["role"], items=items)


def purchase_shop_item(user_id: str, item_id: str) -> ShopResponse:
    user_row = fetch_one("SELECT id, role, coins FROM users WHERE id = ?", (user_id,))
    if user_row is None:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    _sync_user_cosmetics(user_id)
    item = fetch_one("SELECT * FROM cosmetic_items WHERE id = ?", (item_id,))
    if item is None:
        raise HTTPException(status_code=404, detail="Item da loja nao encontrado")
    if not bool(item["is_purchasable"]) and user_row["role"] == "student":
        raise HTTPException(status_code=403, detail="Esse item nao esta disponivel para compra")
    existing = fetch_one("SELECT 1 FROM user_cosmetics WHERE user_id = ? AND item_id = ?", (user_id, item_id))
    if existing is not None:
        raise HTTPException(status_code=409, detail="Esse item ja esta no seu inventario")
    if user_row["role"] == "student":
        if int(user_row["coins"]) < int(item["price"]):
            raise HTTPException(status_code=400, detail="Moedas insuficientes para comprar este item")
        execute("UPDATE users SET coins = ?, updated_at = ? WHERE id = ?", (int(user_row["coins"]) - int(item["price"]), now_iso(), user_id))
    execute(
        "INSERT INTO user_cosmetics (user_id, item_id, unlocked_at, equipped) VALUES (?, ?, ?, 0)",
        (user_id, item_id, now_iso()),
    )
    return list_shop_items(user_id)


def _unlock_achievement(user_id: str, code: str) -> None:
    achievement = fetch_one("SELECT id FROM achievements WHERE code = ?", (code,))
    if achievement is None:
        return
    existing = fetch_one(
        "SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_id = ?",
        (user_id, achievement["id"]),
    )
    if existing is not None:
        return
    execute(
        "INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)",
        (user_id, achievement["id"], now_iso()),
    )


def _sync_user_achievements(user_id: str) -> None:
    user_row = fetch_one("SELECT xp, coins, streak FROM users WHERE id = ?", (user_id,))
    if user_row is None:
        return
    if int(user_row["streak"]) >= 7:
        _unlock_achievement(user_id, "streak_7")
    if int(user_row["coins"]) >= 400:
        _unlock_achievement(user_id, "coins_400")

    accuracy_row = fetch_one(
        """
        SELECT COUNT(*) AS total, COALESCE(SUM(is_correct), 0) AS correct
        FROM (
          SELECT is_correct
          FROM exercise_attempts
          WHERE student_id = ?
          ORDER BY created_at DESC
          LIMIT 10
        ) recent
        """,
        (user_id,),
    )
    if accuracy_row and int(accuracy_row["total"]) >= 10 and int(accuracy_row["correct"]) == int(accuracy_row["total"]):
        _unlock_achievement(user_id, "accuracy_master")

    forum_row = fetch_one(
        "SELECT COUNT(*) AS total FROM forum_posts WHERE author_id = ?",
        (user_id,),
    )
    if forum_row and int(forum_row["total"]) >= 10:
        _unlock_achievement(user_id, "forum_helper")

    today = datetime.utcnow().date().isoformat()
    mission_row = fetch_one(
        """
        SELECT COUNT(DISTINCT exercise_id) AS total
        FROM exercise_attempts
        WHERE student_id = ? AND substr(created_at, 1, 10) = ?
        """,
        (user_id, today),
    )
    if mission_row and int(mission_row["total"]) >= 5:
        _unlock_achievement(user_id, "mission_daily")


def list_rewards_overview(user_id: str) -> RewardsOverviewResponse:
    _sync_user_cosmetics(user_id)
    _sync_user_achievements(user_id)
    inventory = list_profile_inventory(user_id)
    achievement_rows = fetch_all(
        """
        SELECT
          a.id,
          a.code,
          a.name,
          a.description,
          a.icon,
          ua.unlocked_at
        FROM achievements a
        LEFT JOIN user_achievements ua
          ON ua.achievement_id = a.id AND ua.user_id = ?
        ORDER BY a.name
        """,
        (user_id,),
    )
    achievements = [
        AchievementItem(
            id=row["id"],
            code=row["code"],
            name=row["name"],
            description=row["description"],
            icon=row["icon"],
            unlocked=row["unlocked_at"] is not None,
            unlocked_at=row["unlocked_at"],
        )
        for row in achievement_rows
    ]
    cosmetic_unlock_rows = fetch_all(
        """
        SELECT
          c.id,
          c.name,
          c.description,
          c.rarity,
          uc.unlocked_at
        FROM user_cosmetics uc
        JOIN cosmetic_items c ON c.id = uc.item_id
        WHERE uc.user_id = ?
        ORDER BY uc.unlocked_at DESC
        LIMIT 6
        """,
        (user_id,),
    )
    achievement_unlock_rows = fetch_all(
        """
        SELECT
          a.id,
          a.name,
          a.description,
          'badge' AS rarity,
          ua.unlocked_at
        FROM user_achievements ua
        JOIN achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = ?
        ORDER BY ua.unlocked_at DESC
        LIMIT 6
        """,
        (user_id,),
    )
    recent_unlocks = [
        RewardUnlockItem(
            id=row["id"],
            kind="cosmetic",
            title=row["name"],
            description=row["description"],
            rarity=row["rarity"],
            unlocked_at=row["unlocked_at"],
        )
        for row in cosmetic_unlock_rows
    ] + [
        RewardUnlockItem(
            id=row["id"],
            kind="achievement",
            title=row["name"],
            description=row["description"],
            rarity=row["rarity"],
            unlocked_at=row["unlocked_at"],
        )
        for row in achievement_unlock_rows
    ]
    recent_unlocks.sort(key=lambda item: item.unlocked_at, reverse=True)
    return RewardsOverviewResponse(
        achievements=achievements,
        cosmetics=inventory.items,
        recent_unlocks=recent_unlocks[:6],
    )


def equip_cosmetic_item(user_id: str, item_id: str) -> ProfileInventoryResponse:
    _sync_user_cosmetics(user_id)
    item_row = fetch_one("SELECT * FROM cosmetic_items WHERE id = ?", (item_id,))
    if item_row is None:
        raise HTTPException(status_code=404, detail="Item cosmetico nao encontrado")
    user_item = fetch_one("SELECT equipped FROM user_cosmetics WHERE user_id = ? AND item_id = ?", (user_id, item_id))
    if user_item is None:
        raise HTTPException(status_code=403, detail="Esse item ainda nao foi desbloqueado")
    if item_row["category"] == "avatar":
        execute(
            """
            UPDATE user_cosmetics
            SET equipped = CASE WHEN item_id = ? THEN 1 ELSE 0 END
            WHERE user_id = ? AND item_id IN (SELECT id FROM cosmetic_items WHERE category = 'avatar')
            """,
            (item_id, user_id),
        )
        execute(
            "UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?",
            (item_row["asset_url"], now_iso(), user_id),
        )
    else:
        execute("UPDATE user_cosmetics SET equipped = 1 WHERE user_id = ? AND item_id = ?", (user_id, item_id))
    return list_profile_inventory(user_id)


def list_question_bank_items() -> list[QuestionBankItem]:
    rows = fetch_all(
        """
        SELECT
          e.*,
          l.title AS lesson_title,
          p.title AS path_title,
          p.category AS theme,
          p.grade_band AS grade_band
        FROM exercises e
        JOIN lessons l ON l.id = e.lesson_id
        JOIN learning_paths p ON p.id = l.path_id
        WHERE e.id LIKE 'qb-%' OR e.id LIKE 'exercise-%'
        ORDER BY p.category, l.sequence_order, e.difficulty, e.id
        """
    )
    return [_row_to_question_bank_item(row) for row in rows]


def create_question_bank_item(
    lesson_id: str,
    prompt: str,
    exercise_type: str,
    difficulty: int,
    correct_answer: str,
    explanation: str,
    options: list[dict],
    hints: list[str],
    estimated_seconds: int,
    skill: str | None,
) -> QuestionBankItem:
    lesson = fetch_one(
        """
        SELECT l.id
        FROM lessons l
        JOIN learning_paths p ON p.id = l.path_id
        WHERE l.id = ?
        """,
        (lesson_id,),
    )
    if lesson is None:
        raise HTTPException(status_code=404, detail="Tema predefinido nao encontrado")

    exercise_id = f"exercise-{uuid.uuid4().hex[:10]}"
    execute(
        """
        INSERT INTO exercises (
          id, lesson_id, prompt, exercise_type, difficulty, correct_answer, explanation,
          options_json, hints_json, estimated_seconds, skill
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            exercise_id,
            lesson_id,
            prompt.strip(),
            exercise_type,
            difficulty,
            correct_answer.strip(),
            explanation.strip(),
            json.dumps(options, ensure_ascii=True),
            json.dumps(hints, ensure_ascii=True),
            estimated_seconds,
            (skill or _default_skill_for_lesson(lesson_id)).strip(),
        ),
    )
    row = fetch_one(
        """
        SELECT
          e.*,
          l.title AS lesson_title,
          p.title AS path_title,
          p.category AS theme,
          p.grade_band AS grade_band
        FROM exercises e
        JOIN lessons l ON l.id = e.lesson_id
        JOIN learning_paths p ON p.id = l.path_id
        WHERE e.id = ?
        """,
        (exercise_id,),
    )
    if row is None:
        raise HTTPException(status_code=500, detail="Questao criada mas nao recuperada")
    return _row_to_question_bank_item(row)


def update_question_bank_item(
    exercise_id: str,
    lesson_id: str | None = None,
    prompt: str | None = None,
    exercise_type: str | None = None,
    difficulty: int | None = None,
    correct_answer: str | None = None,
    explanation: str | None = None,
    options: list[dict] | None = None,
    hints: list[str] | None = None,
    estimated_seconds: int | None = None,
    skill: str | None = None,
) -> QuestionBankItem:
    current = fetch_one("SELECT * FROM exercises WHERE id = ?", (exercise_id,))
    if current is None:
        raise HTTPException(status_code=404, detail="Questao nao encontrada")

    next_lesson_id = lesson_id or current["lesson_id"]
    execute(
        """
        UPDATE exercises
        SET
          lesson_id = ?,
          prompt = ?,
          exercise_type = ?,
          difficulty = ?,
          correct_answer = ?,
          explanation = ?,
          options_json = ?,
          hints_json = ?,
          estimated_seconds = ?,
          skill = ?
        WHERE id = ?
        """,
        (
            next_lesson_id,
            prompt.strip() if prompt is not None else current["prompt"],
            exercise_type or current["exercise_type"],
            difficulty if difficulty is not None else current["difficulty"],
            correct_answer.strip() if correct_answer is not None else current["correct_answer"],
            explanation.strip() if explanation is not None else current["explanation"],
            json.dumps(options, ensure_ascii=True) if options is not None else current["options_json"],
            json.dumps(hints, ensure_ascii=True) if hints is not None else current["hints_json"],
            estimated_seconds if estimated_seconds is not None else current["estimated_seconds"],
            skill.strip() if skill is not None else current["skill"],
            exercise_id,
        ),
    )
    row = fetch_one(
        """
        SELECT
          e.*,
          l.title AS lesson_title,
          p.title AS path_title,
          p.category AS theme,
          p.grade_band AS grade_band
        FROM exercises e
        JOIN lessons l ON l.id = e.lesson_id
        JOIN learning_paths p ON p.id = l.path_id
        WHERE e.id = ?
        """,
        (exercise_id,),
    )
    if row is None:
        raise HTTPException(status_code=500, detail="Questao atualizada mas nao recuperada")
    return _row_to_question_bank_item(row)


def get_student_report(student_id: str) -> StudentReport:
    profile = _student_profile(student_id)
    strengths, weaknesses = _strength_weakness_lists(student_id)
    attempts = fetch_all(
        """
        SELECT e.prompt, a.submitted_answer, a.is_correct, a.created_at
        FROM exercise_attempts a
        JOIN exercises e ON e.id = a.exercise_id
        WHERE a.student_id = ?
        ORDER BY a.created_at DESC
        LIMIT 5
        """,
        (student_id,),
    )
    activity = [
        f"{'Acerto' if row['is_correct'] else 'Erro'} em '{row['prompt']}' com resposta '{row['submitted_answer']}'."
        for row in attempts
    ]
    return StudentReport(
        student=profile,
        performance_summary=(
            f"{profile.full_name} tem {profile.accuracy}% de acerto, {profile.study_minutes} minutos estudados"
            f" e nivel {profile.level}. Principais reforcos sugeridos: {', '.join(profile.weak_areas) or 'nenhum'}."
        ),
        strengths=strengths,
        weaknesses=weaknesses,
        recent_activity=activity,
    )


def get_class_ranking(class_id: str) -> list[ClassRankingEntry]:
    rows = fetch_all(
        """
        SELECT u.id, u.full_name, u.xp, u.streak
        FROM class_enrollments e
        JOIN users u ON u.id = e.student_id
        WHERE e.class_id = ?
        ORDER BY u.xp DESC, u.streak DESC, u.full_name ASC
        """,
        (class_id,),
    )
    ranking: list[ClassRankingEntry] = []
    for index, row in enumerate(rows, start=1):
        ranking.append(
            ClassRankingEntry(
                position=index,
                student_id=row["id"],
                student_name=row["full_name"],
                xp=row["xp"],
                accuracy=_student_accuracy(row["id"]),
                streak=row["streak"],
            )
        )
    return ranking


def get_class_report(class_id: str) -> ClassReport:
    class_row = fetch_one("SELECT * FROM class_groups WHERE id = ?", (class_id,))
    if class_row is None:
        raise HTTPException(status_code=404, detail="Turma nao encontrada")
    class_summary = list_teacher_classes(class_row["teacher_id"])
    class_info = next((item for item in class_summary if item.id == class_id), None)
    if class_info is None:
        raise HTTPException(status_code=404, detail="Resumo da turma nao encontrado")

    student_rows = fetch_all("SELECT student_id FROM class_enrollments WHERE class_id = ?", (class_id,))
    student_profiles = [_student_profile(row["student_id"]) for row in student_rows]
    weak_counter: Counter[str] = Counter()
    strong_counter: Counter[str] = Counter()
    for student in student_profiles:
        strong_counter.update(student.strong_areas)
        weak_counter.update(student.weak_areas)

    return ClassReport(
        class_info=class_info,
        ranking=get_class_ranking(class_id),
        top_strengths=[topic for topic, _ in strong_counter.most_common(3)],
        top_weaknesses=[topic for topic, _ in weak_counter.most_common(3)],
        students_needing_attention=[student for student in student_profiles if student.accuracy < 65],
    )


def list_forum_topics(class_id: str | None = None) -> list[ForumTopicSummary]:
    if class_id:
        rows = fetch_all(
            """
            SELECT t.*, u.full_name AS author_name, COUNT(p.id) AS replies
            FROM forum_topics t
            JOIN users u ON u.id = t.author_id
            LEFT JOIN forum_posts p ON p.topic_id = t.id
            WHERE t.class_id = ?
            GROUP BY t.id
            ORDER BY t.is_pinned DESC, t.created_at DESC
            """,
            (class_id,),
        )
    else:
        rows = fetch_all(
            """
            SELECT t.*, u.full_name AS author_name, COUNT(p.id) AS replies
            FROM forum_topics t
            JOIN users u ON u.id = t.author_id
            LEFT JOIN forum_posts p ON p.topic_id = t.id
            GROUP BY t.id
            ORDER BY t.is_pinned DESC, t.created_at DESC
            """
        )
    return [
        ForumTopicSummary(
            id=row["id"],
            class_id=row["class_id"],
            author_name=row["author_name"],
            title=row["title"],
            body=row["body"],
            tags=[tag for tag in row["tags"].split(",") if tag],
            topic_type=row["topic_type"],
            due_at=row["due_at"],
            is_pinned=bool(row["is_pinned"]),
            replies=row["replies"],
            created_at=row["created_at"],
        )
        for row in rows
    ]


def get_forum_topic(topic_id: str) -> ForumTopicDetail:
    rows = list_forum_topics()
    topic = next((item for item in rows if item.id == topic_id), None)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topico nao encontrado")
    posts = fetch_all(
        """
        SELECT p.id, p.body, p.created_at, u.full_name AS author_name
        FROM forum_posts p
        JOIN users u ON u.id = p.author_id
        WHERE p.topic_id = ?
        ORDER BY p.created_at ASC
        """,
        (topic_id,),
    )
    return ForumTopicDetail(
        topic=topic,
        posts=[ForumPostItem(id=row["id"], author_name=row["author_name"], body=row["body"], created_at=row["created_at"]) for row in posts],
    )


def create_forum_topic(
    class_id: str | None,
    author_id: str,
    title: str,
    body: str,
    tags: list[str],
    topic_type: str,
    due_at: str | None,
) -> ForumTopicSummary:
    topic_id = f"topic-{uuid.uuid4().hex[:10]}"
    normalized_due_at = due_at
    if topic_type == "activity" and due_at:
        try:
            base_date = datetime.fromisoformat(due_at).date() if "T" in due_at else datetime.strptime(due_at, "%Y-%m-%d").date()
            normalized_due_at = f"{base_date.isoformat()}T23:59:00"
        except ValueError:
            normalized_due_at = due_at
    execute(
        """
        INSERT INTO forum_topics (
          id, class_id, author_id, title, body, tags, topic_type, due_at, is_pinned, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        """,
        (topic_id, class_id, author_id, title, body, ",".join(tags), topic_type, normalized_due_at, now_iso()),
    )
    return get_forum_topic(topic_id).topic


def create_forum_post(topic_id: str, author_id: str, body: str) -> ForumTopicDetail:
    post_id = f"post-{uuid.uuid4().hex[:10]}"
    execute(
        "INSERT INTO forum_posts (id, topic_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)",
        (post_id, topic_id, author_id, body, now_iso()),
    )
    _sync_user_achievements(author_id)
    return get_forum_topic(topic_id)


def update_profile(user_id: str, full_name: str | None, avatar_url: str | None, bio: str | None) -> AuthUser:
    current = fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if current is None:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    safe_avatar_url = current["avatar_url"]
    if avatar_url:
        inventory = list_profile_inventory(user_id)
        equipped_or_unlocked = next((item for item in inventory.items if item.asset_url == avatar_url and item.unlocked), None)
        if equipped_or_unlocked is not None:
            safe_avatar_url = avatar_url
    execute(
        """
        UPDATE users
        SET full_name = ?, avatar_url = ?, bio = ?, updated_at = ?
        WHERE id = ?
        """,
        (
            full_name or current["full_name"],
            safe_avatar_url,
            bio or current["bio"],
            now_iso(),
            user_id,
        ),
    )
    updated = fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
    _sync_user_cosmetics(user_id)
    _sync_user_achievements(user_id)
    return _row_to_auth_user(updated)


def build_bootstrap():
    return data.bootstrap_data


def _topic_for_today() -> str:
    themes = [
        "Fracoes",
        "Algebra",
        "Geometria",
        "Porcentagem",
        "Funcoes",
        "Probabilidade",
        "Revisao mista",
    ]
    return themes[datetime.utcnow().weekday() % len(themes)]


def _normalize_topic(topic: str | None) -> str:
    if not topic:
        return ""
    return topic.strip().lower()


def _theme_matches(theme: str, text: str | None) -> bool:
    normalized_theme = _normalize_topic(theme)
    normalized_text = _normalize_topic(text)
    if not normalized_theme or not normalized_text:
        return False
    return normalized_theme in normalized_text or normalized_text in normalized_theme


def _target_difficulty_for_student(student_id: str) -> int:
    row = fetch_one(
        """
        SELECT
          COALESCE(AVG(CASE WHEN a.is_correct = 1 THEN 1.0 ELSE 0.0 END), 0.0) AS accuracy,
          COALESCE(AVG(e.difficulty), 2.0) AS avg_difficulty
        FROM (
          SELECT *
          FROM exercise_attempts
          WHERE student_id = ?
          ORDER BY created_at DESC
          LIMIT 20
        ) a
        JOIN exercises e ON e.id = a.exercise_id
        """,
        (student_id,),
    )
    if row is None:
        return 2
    accuracy = float(row["accuracy"] or 0.0)
    avg_difficulty = float(row["avg_difficulty"] or 2.0)
    if accuracy >= 0.82:
        return min(5, max(2, round(avg_difficulty + 1)))
    if accuracy <= 0.55:
        return max(1, round(avg_difficulty - 1))
    return max(2, round(avg_difficulty))


def _recent_attempt_profile(student_id: str) -> tuple[set[str], set[str], dict[str, tuple[int, int]]]:
    rows = fetch_all(
        """
        SELECT a.exercise_id, a.is_correct, e.skill
        FROM exercise_attempts a
        JOIN exercises e ON e.id = a.exercise_id
        WHERE a.student_id = ?
        ORDER BY a.created_at DESC
        LIMIT 40
        """,
        (student_id,),
    )
    very_recent = {row["exercise_id"] for row in rows[:8]}
    recent = {row["exercise_id"] for row in rows[:18]}
    skill_stats: dict[str, tuple[int, int]] = {}
    for row in rows:
        correct, total = skill_stats.get(row["skill"], (0, 0))
        skill_stats[row["skill"]] = (correct + int(row["is_correct"]), total + 1)
    return very_recent, recent, skill_stats


def _clamp_score(value: int) -> int:
    return max(0, min(100, value))


def _skill_recent_accuracy(student_id: str, skill: str) -> int:
    row = fetch_one(
        """
        SELECT COALESCE(ROUND(AVG(CASE WHEN recent.is_correct = 1 THEN 100 ELSE 0 END)), 0) AS accuracy
        FROM (
          SELECT a.is_correct
          FROM exercise_attempts a
          JOIN exercises e ON e.id = a.exercise_id
          WHERE a.student_id = ? AND e.skill = ?
          ORDER BY a.created_at DESC
          LIMIT 12
        ) recent
        """,
        (student_id, skill),
    )
    return int(row["accuracy"]) if row else 0


def _recommendation_for_skill(skill: str, accuracy: int) -> str:
    if accuracy >= 85:
        return f"Voce esta indo muito bem em {skill}. Mantenha o ritmo e suba a dificuldade."
    if accuracy >= 65:
        return f"Continue praticando {skill} para ganhar mais velocidade e seguranca."
    return f"Retome {skill} com questoes diretas para consolidar a base."


def _update_student_skill_metric(student_id: str, topic: str, is_correct: int) -> None:
    current = fetch_one(
        """
        SELECT strength_score, weakness_score
        FROM student_skill_metrics
        WHERE student_id = ? AND topic = ?
        """,
        (student_id, topic),
    )
    current_strength = int(current["strength_score"]) if current else 45
    current_weakness = int(current["weakness_score"]) if current else 55
    if is_correct:
        next_strength = _clamp_score(current_strength + 6)
        next_weakness = _clamp_score(current_weakness - 4)
    else:
        next_strength = _clamp_score(current_strength - 2)
        next_weakness = _clamp_score(current_weakness + 8)
    accuracy = _skill_recent_accuracy(student_id, topic)
    recommendation = _recommendation_for_skill(topic, accuracy)
    execute(
        """
        INSERT INTO student_skill_metrics (
          student_id, topic, strength_score, weakness_score, last_accuracy, recommendation, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(student_id, topic) DO UPDATE SET
          strength_score = excluded.strength_score,
          weakness_score = excluded.weakness_score,
          last_accuracy = excluded.last_accuracy,
          recommendation = excluded.recommendation,
          updated_at = excluded.updated_at
        """,
        (student_id, topic, next_strength, next_weakness, accuracy, recommendation, now_iso()),
    )


def build_daily_mission(student_id: str) -> DailyMissionResponse:
    student = fetch_one("SELECT full_name, streak, grade_band FROM users WHERE id = ? AND role = 'student'", (student_id,))
    if student is None:
        raise HTTPException(status_code=404, detail="Aluno nao encontrado")

    weak_points = fetch_all(
        """
        SELECT topic, recommendation
        FROM student_skill_metrics
        WHERE student_id = ?
        ORDER BY weakness_score DESC, last_accuracy ASC
        LIMIT 2
        """,
        (student_id,),
    )
    focus_topic = weak_points[0]["topic"] if weak_points else None
    focus_recommendation = weak_points[0]["recommendation"] if weak_points else "Continue praticando para manter consistencia."
    theme_of_day = _topic_for_today()
    target_difficulty = _target_difficulty_for_student(student_id)
    very_recent_exercises, recent_exercises, recent_skill_stats = _recent_attempt_profile(student_id)

    rows = fetch_all(
        """
        SELECT
          e.id,
          e.lesson_id,
          e.prompt,
          e.exercise_type,
          e.difficulty,
          e.explanation,
          e.options_json,
          e.hints_json,
          e.estimated_seconds,
          e.skill,
          l.title AS lesson_title,
          p.title AS path_title,
          p.category AS topic
        FROM exercises e
        JOIN lessons l ON l.id = e.lesson_id
        JOIN learning_paths p ON p.id = l.path_id
        WHERE e.id LIKE 'qb-%'
        ORDER BY e.difficulty ASC, e.id ASC
        """
    )

    mission_pool: list[tuple[int, object]] = []
    for row in rows:
        if not _can_access_lesson(student["grade_band"], row["lesson_id"]):
            continue
        score = 0
        if _theme_matches(theme_of_day, row["topic"]) or _theme_matches(theme_of_day, row["skill"]):
            score += 4
        if focus_topic and (_theme_matches(focus_topic, row["topic"]) or _theme_matches(focus_topic, row["skill"])):
            score += 3
        score += max(0, 4 - abs(int(row["difficulty"]) - target_difficulty))
        if row["id"] in recent_exercises:
            score -= 5
        if row["id"] in very_recent_exercises:
            score -= 100
        if row["skill"] in recent_skill_stats:
            correct, total = recent_skill_stats[row["skill"]]
            if total > 0:
                accuracy = correct / total
                if accuracy < 0.6:
                    score += 4
                elif accuracy > 0.85:
                    score -= 1
        mission_pool.append((score, row))

    ranked_rows = [row for _, row in sorted(mission_pool, key=lambda item: (-item[0], item[1]["difficulty"], item[1]["id"]))]
    selected_rows: list[object] = []
    skill_counts: dict[str, int] = {}
    for row in ranked_rows:
        if len(selected_rows) >= 5:
            break
        if row["id"] in very_recent_exercises:
            continue
        if skill_counts.get(row["skill"], 0) >= 2:
            continue
        selected_rows.append(row)
        skill_counts[row["skill"]] = skill_counts.get(row["skill"], 0) + 1

    if len(selected_rows) < 5:
        selected_ids = {row["id"] for row in selected_rows}
        for row in ranked_rows:
            if len(selected_rows) >= 5:
                break
            if row["id"] in selected_ids:
                continue
            selected_rows.append(row)
            selected_ids.add(row["id"])

    if not selected_rows:
        raise HTTPException(status_code=404, detail="Nenhum exercicio disponivel para a missao diaria")

    exercise_ids = [row["id"] for row in selected_rows]
    placeholders = ",".join("?" for _ in exercise_ids)
    today = datetime.utcnow().date().isoformat()
    progress_row = fetch_one(
        f"""
        SELECT COUNT(DISTINCT exercise_id) AS completed
        FROM exercise_attempts
        WHERE student_id = ?
          AND exercise_id IN ({placeholders})
          AND substr(created_at, 1, 10) = ?
        """,
        (student_id, *exercise_ids, today),
    )
    completed_exercises = int(progress_row["completed"]) if progress_row else 0

    exercises = [
        DailyMissionExercise(
            id=row["id"],
            lesson_id=row["lesson_id"],
            prompt=row["prompt"],
            exercise_type=row["exercise_type"],
            difficulty=row["difficulty"],
            explanation=row["explanation"],
            options=__import__("json").loads(row["options_json"]),
            hints=__import__("json").loads(row["hints_json"]),
            estimated_seconds=row["estimated_seconds"],
            skill=row["skill"],
            topic=row["topic"],
            lesson_title=row["lesson_title"],
            path_title=row["path_title"],
        )
        for row in selected_rows
    ]

    estimated_minutes = max(5, round(sum(exercise.estimated_seconds for exercise in exercises) / 60))
    xp_reward = len(exercises) * 18
    dominant_topic = Counter(exercise.topic for exercise in exercises).most_common(1)[0][0]
    theme_label = dominant_topic or focus_topic or theme_of_day

    return DailyMissionResponse(
        mission_date=today,
        title=f"Missao diaria de {theme_label}",
        theme=theme_label,
        focus_reason=(
            f"Hoje vamos alternar o tema do dia com reforco em {focus_topic}."
            if focus_topic and not _theme_matches(theme_of_day, focus_topic)
            else f"Hoje o foco principal e {theme_label}."
        ),
        daily_goal=f"Concluir {len(exercises)} questoes objetivas e manter a constancia de estudo.",
        recommendation=focus_recommendation,
        total_exercises=len(exercises),
        completed_exercises=completed_exercises,
        estimated_minutes=estimated_minutes,
        xp_reward=xp_reward,
        streak_target=f"Seu streak atual e de {student['streak']} dias. Feche a missao para mantelo vivo.",
        exercises=exercises,
    )


def record_attempt(student_id: str, exercise_id: str, class_id: str | None, answer: str, elapsed_seconds: int):
    exercise = fetch_one("SELECT * FROM exercises WHERE id = ?", (exercise_id,))
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")
    is_correct = int(data.answers_match(answer, exercise["correct_answer"]))
    attempt_id = f"attempt-{uuid.uuid4().hex[:10]}"
    lesson = fetch_one(
        """
        SELECT p.category
        FROM lessons l
        JOIN learning_paths p ON p.id = l.path_id
        WHERE l.id = ?
        """,
        (exercise["lesson_id"],),
    )
    topic = lesson["category"] if lesson else exercise["skill"]
    execute(
        """
        INSERT INTO exercise_attempts (
          id, student_id, exercise_id, class_id, submitted_answer, is_correct, elapsed_seconds, topic, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (attempt_id, student_id, exercise_id, class_id, answer, is_correct, elapsed_seconds, topic, now_iso()),
    )
    _update_student_skill_metric(student_id, exercise["skill"], is_correct)
    if topic and topic != exercise["skill"]:
        _update_student_skill_metric(student_id, topic, is_correct)
    current = fetch_one("SELECT xp, coins, lives FROM users WHERE id = ?", (student_id,))
    xp_delta = 18 if is_correct else 4
    coins_delta = 12 if is_correct else 0
    lives_delta = 0 if is_correct else -1
    execute(
        "UPDATE users SET xp = ?, coins = ?, lives = ?, updated_at = ? WHERE id = ?",
        (
            current["xp"] + xp_delta,
            current["coins"] + coins_delta,
            max(0, current["lives"] + lives_delta),
            now_iso(),
            student_id,
        ),
    )
    _sync_user_cosmetics(student_id)
    _sync_user_achievements(student_id)
    return data.evaluate_attempt(answer, exercise["correct_answer"])
