from __future__ import annotations

import json
from datetime import datetime
import uuid
from collections import Counter
import secrets

from fastapi import HTTPException, status

from app import data
from app.config import settings
from app.cosmetics import COSMETIC_CATALOG
from app.db import (
    create_session,
    execute,
    fetch_all,
    fetch_one,
    get_connection,
    get_setting_value,
    get_user_by_email,
    get_user_by_username,
    get_user_by_token,
    make_password_hash,
    normalize_username,
    now_iso,
    set_setting_value,
    verify_password,
)
from app.models import (
    AchievementItem,
    AdaptivePlan,
    AuthUser,
    DailyMissionExercise,
    DailyMissionResponse,
    ClassRankingEntry,
    ClassReport,
    ClassSummary,
    EvolutionPoint,
    Exercise,
    GenericMessage,
    ResetPasswordResponse,
    SchoolSummary,
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
    LearningPath,
    Lesson,
    ProfileViewResponse,
    PublicProfileClassItem,
    PublicClassOption,
    QuestionBankItem,
    QuestionBankLessonOption,
    StudentSignupRequestSummary,
    StudentMiniProfile,
    StudentInsightsResponse,
    StudentReport,
    TeacherDirectoryItem,
    TeacherTrail,
    TeacherTrailCreateRequest,
    TeacherPasswordResetApprovalResponse,
    TeacherPasswordResetRequestSummary,
    TeacherAccessStudent,
    TrailActivity,
    TrailClass,
    StudentLearningTrailsResponse,
    WeakPoint,
)
from app.question_bank import LESSON_MIN_GRADE_BAND, QUESTION_BANK_LESSONS, QUESTION_BANK_PATHS

BASE_LESSON_CHALLENGE_LIMIT = 5


def _row_to_auth_user(row) -> AuthUser:
    return AuthUser(
        id=row["id"],
        role=row["role"],
        full_name=row["full_name"],
        email=row["email"],
        username=row["username"],
        student_pin=row["student_pin"],
        avatar_url=row["avatar_url"],
        grade_band=row["grade_band"],
        bio=row["bio"],
        level=row["level"],
        xp=row["xp"],
        coins=row["coins"],
        streak=row["streak"],
        lives=row["lives"],
    )


def _teacher_can_manage_student(teacher_id: str, student_id: str) -> bool:
    link = fetch_one(
        "SELECT 1 FROM teacher_student_links WHERE teacher_id = ? AND student_id = ?",
        (teacher_id, student_id),
    )
    return link is not None


def _students_share_class(left_student_id: str, right_student_id: str) -> bool:
    row = fetch_one(
        """
        SELECT 1
        FROM class_enrollments a
        JOIN class_enrollments b ON b.class_id = a.class_id
        WHERE a.student_id = ? AND b.student_id = ?
        LIMIT 1
        """,
        (left_student_id, right_student_id),
    )
    return row is not None


def _class_belongs_to_teacher(class_id: str, teacher_id: str) -> bool:
    row = fetch_one(
        "SELECT 1 FROM class_groups WHERE id = ? AND teacher_id = ?",
        (class_id, teacher_id),
    )
    return row is not None


def _class_ids_for_user(user_id: str, role: str) -> list[str]:
    if role == "master":
        rows = fetch_all("SELECT id FROM class_groups ORDER BY name")
    elif role == "teacher":
        rows = fetch_all("SELECT id FROM class_groups WHERE teacher_id = ? ORDER BY name", (user_id,))
    else:
        rows = fetch_all("SELECT class_id AS id FROM class_enrollments WHERE student_id = ? ORDER BY class_id", (user_id,))
    return [row["id"] for row in rows]


def _validate_student_pin(pin: str) -> str:
    normalized = pin.strip()
    if not normalized.isdigit() or len(normalized) != 4:
        raise HTTPException(status_code=422, detail="O PIN do aluno deve ter exatamente 4 digitos.")
    return normalized


def _validate_student_username(username: str) -> str:
    normalized = normalize_username(username)
    if len(normalized) < 3:
        raise HTTPException(status_code=422, detail="O usuario do aluno precisa ter pelo menos 3 caracteres validos.")
    existing = get_user_by_username(normalized)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Ja existe um aluno com este usuario.")
    return normalized


def _validate_teacher_password(password: str) -> str:
    normalized = password.strip()
    if len(normalized) < 8:
        raise HTTPException(status_code=422, detail="A nova senha do professor precisa ter pelo menos 8 caracteres.")
    return normalized


def _generate_teacher_temporary_password() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    return "".join(secrets.choice(alphabet) for _ in range(10))


def _teacher_reset_summary(row) -> TeacherPasswordResetRequestSummary:
    return TeacherPasswordResetRequestSummary(
        id=row["id"],
        teacher_id=row["teacher_id"],
        teacher_name=row["teacher_name"],
        teacher_email=row["teacher_email"],
        status=row["status"],
        requested_at=row["requested_at"],
        approved_at=row["approved_at"],
        completed_at=row["completed_at"],
        approved_by_name=row["approved_by_name"],
        temporary_password=row["temporary_password_plain"],
        email_message=row["email_message"],
    )


def authenticate_user(identifier: str, password: str) -> LoginResponse:
    cleaned_identifier = identifier.strip()
    user = get_user_by_email(cleaned_identifier.lower()) if "@" in cleaned_identifier else None
    if user is None:
        user = get_user_by_username(cleaned_identifier)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas")

    if user["role"] == "student":
        normalized_pin = _validate_student_pin(password)
        if user["student_pin"] != normalized_pin and not verify_password(normalized_pin, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas")
    elif not verify_password(password, user["password_hash"]):
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
    if role == "teacher" and access_code != (get_setting_value("teacher_access_code", settings.master_access_code) or settings.master_access_code):
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


def _list_classes_for_profile(user_id: str, role: str) -> list[PublicProfileClassItem]:
    if role in {"teacher", "master"}:
        rows = fetch_all(
            """
            SELECT id, name, grade_band
            FROM class_groups
            WHERE teacher_id = ?
            ORDER BY name
            """,
            (user_id,),
        )
    else:
        rows = fetch_all(
            """
            SELECT c.id, c.name, c.grade_band
            FROM class_enrollments e
            JOIN class_groups c ON c.id = e.class_id
            WHERE e.student_id = ?
            ORDER BY c.name
            """,
            (user_id,),
        )
    return [PublicProfileClassItem(**dict(row)) for row in rows]


def get_profile_view(viewer_id: str, user_id: str) -> ProfileViewResponse:
    viewer = fetch_one("SELECT id, role FROM users WHERE id = ?", (viewer_id,))
    if viewer is None:
        raise HTTPException(status_code=404, detail="Usuario autenticado nao encontrado")
    target = fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if target is None:
        raise HTTPException(status_code=404, detail="Perfil nao encontrado")

    target_user = _row_to_auth_user(target)
    target_classes = _list_classes_for_profile(user_id, target["role"])
    equipped_frame_id = list_profile_inventory(user_id).equipped_frame_id

    if viewer_id == user_id:
        student_report = get_student_report(user_id) if target["role"] == "student" else None
        return ProfileViewResponse(profile=target_user, classes=target_classes, student_report=student_report, equipped_frame_id=equipped_frame_id)

    if viewer["role"] in {"teacher", "master"} and target["role"] == "student":
        return ProfileViewResponse(profile=target_user, classes=target_classes, student_report=get_student_report(user_id), equipped_frame_id=equipped_frame_id)

    if viewer["role"] == "master" and target["role"] in {"teacher", "master"}:
        return ProfileViewResponse(profile=target_user, classes=target_classes, student_report=None, equipped_frame_id=equipped_frame_id)

    if viewer["role"] == "student" and target["role"] in {"teacher", "master"}:
        basic_profile = AuthUser(
            id=target_user.id,
            role=target_user.role,
            full_name=target_user.full_name,
            email="",
            avatar_url=target_user.avatar_url,
            grade_band=target_user.grade_band,
            bio=target_user.bio,
            level=0,
            xp=0,
            coins=0,
            streak=0,
            lives=0,
        )
        return ProfileViewResponse(profile=basic_profile, classes=target_classes, student_report=None, equipped_frame_id=equipped_frame_id)

    if viewer["role"] == "student" and target["role"] == "student" and _students_share_class(viewer_id, user_id):
        basic_profile = AuthUser(
            id=target_user.id,
            role=target_user.role,
            full_name=target_user.full_name,
            email="",
            username=None,
            student_pin=None,
            avatar_url=target_user.avatar_url,
            grade_band=target_user.grade_band,
            bio=target_user.bio,
            level=target_user.level,
            xp=target_user.xp,
            coins=target_user.coins,
            streak=target_user.streak,
            lives=target_user.lives,
        )
        return ProfileViewResponse(profile=basic_profile, classes=target_classes, student_report=None, equipped_frame_id=equipped_frame_id)

    raise HTTPException(status_code=403, detail="Sem permissao para visualizar este perfil")


def list_teacher_classes(teacher_id: str | None) -> list[ClassSummary]:
    if teacher_id is None:
        rows = fetch_all(
            """
            SELECT
              c.id,
              c.school_id,
              c.school_name,
              c.name,
              c.grade_band,
              c.teacher_id,
              t.full_name AS teacher_name,
              c.invite_code,
              COUNT(DISTINCT e.student_id) AS students_count,
              COALESCE(ROUND(AVG(m.last_accuracy)), 0) AS average_accuracy,
              COALESCE(SUM(u.xp), 0) AS total_xp
            FROM class_groups c
            LEFT JOIN users t ON t.id = c.teacher_id
            LEFT JOIN class_enrollments e ON e.class_id = c.id
            LEFT JOIN users u ON u.id = e.student_id
            LEFT JOIN student_skill_metrics m ON m.student_id = e.student_id
            GROUP BY c.id, c.school_id, c.school_name, c.name, c.grade_band, c.teacher_id, t.full_name, c.invite_code
            ORDER BY c.name
            """
        )
    else:
        rows = fetch_all(
            """
            SELECT
              c.id,
              c.school_id,
              c.school_name,
              c.name,
              c.grade_band,
              c.teacher_id,
              t.full_name AS teacher_name,
              c.invite_code,
              COUNT(DISTINCT e.student_id) AS students_count,
              COALESCE(ROUND(AVG(m.last_accuracy)), 0) AS average_accuracy,
              COALESCE(SUM(u.xp), 0) AS total_xp
            FROM class_groups c
            LEFT JOIN users t ON t.id = c.teacher_id
            LEFT JOIN class_enrollments e ON e.class_id = c.id
            LEFT JOIN users u ON u.id = e.student_id
            LEFT JOIN student_skill_metrics m ON m.student_id = e.student_id
            WHERE c.teacher_id = ?
            GROUP BY c.id, c.school_id, c.school_name, c.name, c.grade_band, c.teacher_id, t.full_name, c.invite_code
            ORDER BY c.name
            """,
            (teacher_id,),
        )
    return [ClassSummary(**dict(row)) for row in rows]


def list_schools() -> list[SchoolSummary]:
    rows = fetch_all(
        """
        SELECT
          s.id,
          s.name,
          s.address,
          s.director_name,
          s.created_at,
          COUNT(c.id) AS classes_count
        FROM schools s
        LEFT JOIN class_groups c ON c.school_id = s.id
        GROUP BY s.id, s.name, s.address, s.director_name, s.created_at
        ORDER BY s.name
        """
    )
    return [SchoolSummary(**dict(row)) for row in rows]


def create_school(name: str, address: str | None, director_name: str | None) -> SchoolSummary:
    normalized_name = name.strip()
    if not normalized_name:
        raise HTTPException(status_code=422, detail="Informe o nome da escola.")
    school_id = f"school-{uuid.uuid4().hex[:10]}"
    timestamp = now_iso()
    execute(
        """
        INSERT INTO schools (id, name, address, director_name, updated_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (school_id, normalized_name, (address or "").strip() or None, (director_name or "").strip() or None, timestamp, timestamp),
    )
    row = fetch_one(
        """
        SELECT id, name, address, director_name, created_at, 0 AS classes_count
        FROM schools
        WHERE id = ?
        """,
        (school_id,),
    )
    if row is None:
        raise HTTPException(status_code=500, detail="Escola criada mas nao recuperada.")
    return SchoolSummary(**dict(row))


def update_school(school_id: str, name: str, address: str | None, director_name: str | None) -> SchoolSummary:
    current = fetch_one("SELECT id FROM schools WHERE id = ?", (school_id,))
    if current is None:
        raise HTTPException(status_code=404, detail="Escola nao encontrada.")
    normalized_name = name.strip()
    if not normalized_name:
        raise HTTPException(status_code=422, detail="Informe o nome da escola.")
    execute(
        """
        UPDATE schools
        SET name = ?, address = ?, director_name = ?, updated_at = ?
        WHERE id = ?
        """,
        (normalized_name, (address or "").strip() or None, (director_name or "").strip() or None, now_iso(), school_id),
    )
    row = fetch_one(
        """
        SELECT s.id, s.name, s.address, s.director_name, s.created_at, COUNT(c.id) AS classes_count
        FROM schools s
        LEFT JOIN class_groups c ON c.school_id = s.id
        WHERE s.id = ?
        GROUP BY s.id, s.name, s.address, s.director_name, s.created_at
        """,
        (school_id,),
    )
    if row is None:
        raise HTTPException(status_code=500, detail="Escola atualizada mas nao recuperada.")
    return SchoolSummary(**dict(row))


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


def _student_completed_lessons(student_id: str) -> int:
    row = fetch_one(
        """
        SELECT COUNT(DISTINCT e.lesson_id) AS total
        FROM exercise_attempts a
        JOIN exercises e ON e.id = a.exercise_id
        WHERE a.student_id = ? AND a.is_correct = 1
        """,
        (student_id,),
    )
    return int(row["total"]) if row else 0


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
        username=row["username"],
        student_pin=row["student_pin"],
        avatar_url=row["avatar_url"] or "",
        grade_band=row["grade_band"] or "",
        level=row["level"],
        xp=row["xp"],
        coins=row["coins"],
        streak=row["streak"],
        accuracy=_student_accuracy(student_id),
        study_minutes=_student_minutes(student_id),
        strong_areas=[item.topic for item in strengths],
        weak_areas=[item.topic for item in weaknesses],
    )


def _current_class_for_student(student_id: str) -> str | None:
    row = fetch_one(
        """
        SELECT class_id
        FROM class_enrollments
        WHERE student_id = ?
        ORDER BY enrolled_at DESC
        LIMIT 1
        """,
        (student_id,),
    )
    return str(row["class_id"]) if row and row["class_id"] else None


def get_students_for_teacher(teacher_id: str | None) -> list[StudentMiniProfile]:
    if teacher_id is None:
        rows = fetch_all(
            """
            SELECT u.id
            FROM users u
            WHERE u.role = 'student'
            ORDER BY u.full_name
            """
        )
    else:
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


def get_teacher_access_students(teacher_id: str | None) -> list[TeacherAccessStudent]:
    if teacher_id is None:
        rows = fetch_all(
            """
            SELECT
              u.id,
              u.full_name,
              u.email,
              u.username,
              u.student_pin,
              COALESCE(u.grade_band, '') AS grade_band,
              u.coins,
              c.id AS current_class_id,
              c.name AS current_class_name
            FROM users u
            LEFT JOIN class_enrollments e ON e.student_id = u.id
            LEFT JOIN class_groups c ON c.id = e.class_id
            WHERE u.role = 'student'
            ORDER BY u.full_name
            """
        )
    else:
        rows = fetch_all(
            """
            SELECT
              u.id,
              u.full_name,
              u.email,
              u.username,
              u.student_pin,
              COALESCE(u.grade_band, '') AS grade_band,
              u.coins,
              c.id AS current_class_id,
              c.name AS current_class_name
            FROM teacher_student_links l
            JOIN users u ON u.id = l.student_id
            LEFT JOIN class_enrollments e ON e.student_id = u.id
            LEFT JOIN class_groups c ON c.id = e.class_id
            WHERE l.teacher_id = ?
            ORDER BY u.full_name
            """,
            (teacher_id,),
        )
    return [TeacherAccessStudent(**dict(row)) for row in rows]


def list_signup_requests_for_teacher(teacher_id: str | None) -> list[StudentSignupRequestSummary]:
    if teacher_id is None:
        rows = fetch_all(
            """
            SELECT *
            FROM signup_requests
            ORDER BY created_at DESC
            """
        )
    else:
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


def create_class_for_teacher(teacher_id: str | None, name: str, grade_band: str, school_id: str) -> ClassSummary:
    school = fetch_one("SELECT id, name FROM schools WHERE id = ?", (school_id,))
    if school is None:
        raise HTTPException(status_code=404, detail="Escola nao encontrada")
    if teacher_id:
        teacher = fetch_one("SELECT id FROM users WHERE id = ? AND role = 'teacher'", (teacher_id,))
        if teacher is None:
            raise HTTPException(status_code=404, detail="Professor nao encontrado")
    class_id = f"class-{uuid.uuid4().hex[:10]}"
    invite_code = f"{''.join(part[0] for part in name.split()[:3]).upper()}{uuid.uuid4().hex[:4].upper()}"
    execute(
        "INSERT INTO class_groups (id, school_id, teacher_id, school_name, name, grade_band, invite_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (class_id, school_id, teacher_id, school["name"], name, grade_band, invite_code, now_iso()),
    )
    classes = list_teacher_classes(None)
    created = next((item for item in classes if item.id == class_id), None)
    if created is None:
        raise HTTPException(status_code=500, detail="Turma criada mas nao recuperada")
    return created


def update_classroom(class_id: str, name: str, grade_band: str, school_id: str) -> ClassSummary:
    classroom = fetch_one("SELECT id FROM class_groups WHERE id = ?", (class_id,))
    school = fetch_one("SELECT id, name FROM schools WHERE id = ?", (school_id,))
    if classroom is None:
        raise HTTPException(status_code=404, detail="Turma nao encontrada")
    if school is None:
        raise HTTPException(status_code=404, detail="Escola nao encontrada")

    execute(
        """
        UPDATE class_groups
        SET name = ?, grade_band = ?, school_id = ?, school_name = ?
        WHERE id = ?
        """,
        (name.strip(), grade_band, school_id, school["name"], class_id),
    )
    updated = next((item for item in list_teacher_classes(None) if item.id == class_id), None)
    if updated is None:
        raise HTTPException(status_code=500, detail="Turma atualizada mas nao recuperada")
    return updated


def assign_class_to_teacher(class_id: str, teacher_id: str) -> ClassSummary:
    teacher = fetch_one("SELECT id FROM users WHERE id = ? AND role = 'teacher'", (teacher_id,))
    classroom = fetch_one("SELECT id, school_id FROM class_groups WHERE id = ?", (class_id,))
    if teacher is None:
        raise HTTPException(status_code=404, detail="Professor nao encontrado")
    if classroom is None:
        raise HTTPException(status_code=404, detail="Turma nao encontrada")

    execute("UPDATE class_groups SET teacher_id = ? WHERE id = ?", (teacher_id, class_id))
    student_rows = fetch_all("SELECT student_id FROM class_enrollments WHERE class_id = ?", (class_id,))
    for row in student_rows:
        execute(
            """
            INSERT INTO teacher_student_links (teacher_id, student_id)
            VALUES (?, ?)
            ON CONFLICT(teacher_id, student_id) DO NOTHING
            """,
            (teacher_id, row["student_id"]),
        )
    updated = next((item for item in list_teacher_classes(None) if item.id == class_id), None)
    if updated is None:
        raise HTTPException(status_code=500, detail="Turma atualizada mas nao recuperada")
    return updated


def update_student_coins_for_manager(manager_role: str, manager_id: str, student_id: str, coins: int) -> StudentMiniProfile:
    if manager_role == "teacher" and not _teacher_can_manage_student(manager_id, student_id):
        raise HTTPException(status_code=403, detail="Aluno nao vinculado a este professor")
    student = fetch_one("SELECT id FROM users WHERE id = ? AND role = 'student'", (student_id,))
    if student is None:
        raise HTTPException(status_code=404, detail="Aluno nao encontrado")
    execute("UPDATE users SET coins = ?, updated_at = ? WHERE id = ?", (coins, now_iso(), student_id))
    return _student_profile(student_id)


def reassign_student_class_for_manager(manager_role: str, manager_id: str, student_id: str, class_id: str) -> StudentMiniProfile:
    student = fetch_one("SELECT id FROM users WHERE id = ? AND role = 'student'", (student_id,))
    classroom = fetch_one("SELECT id, teacher_id FROM class_groups WHERE id = ?", (class_id,))
    if student is None:
        raise HTTPException(status_code=404, detail="Aluno nao encontrado")
    if classroom is None:
        raise HTTPException(status_code=404, detail="Turma nao encontrada")
    if manager_role == "teacher":
        if not _teacher_can_manage_student(manager_id, student_id):
            raise HTTPException(status_code=403, detail="Aluno nao vinculado a este professor.")
        if classroom["teacher_id"] != manager_id:
            raise HTTPException(status_code=403, detail="Voce so pode mover o aluno para turmas sob sua responsabilidade.")

    with get_connection() as connection:
        connection.execute("DELETE FROM class_enrollments WHERE student_id = ?", (student_id,))
        connection.execute(
            "INSERT INTO class_enrollments (class_id, student_id, joined_at) VALUES (?, ?, ?)",
            (class_id, student_id, now_iso()),
        )
        if classroom["teacher_id"]:
            connection.execute(
                """
                INSERT INTO teacher_student_links (teacher_id, student_id)
                VALUES (?, ?)
                ON CONFLICT(teacher_id, student_id) DO NOTHING
                """,
                (classroom["teacher_id"], student_id),
            )
    return _student_profile(student_id)


def delete_student_for_manager(manager_role: str, manager_id: str, student_id: str) -> dict[str, str]:
    student = fetch_one("SELECT id, full_name FROM users WHERE id = ? AND role = 'student'", (student_id,))
    if student is None:
        raise HTTPException(status_code=404, detail="Aluno nao encontrado")

    if manager_role == "teacher" and not _teacher_can_manage_student(manager_id, student_id):
        raise HTTPException(status_code=403, detail="Aluno nao vinculado a este professor")

    with get_connection() as connection:
        connection.execute("DELETE FROM teacher_student_links WHERE student_id = ?", (student_id,))
        connection.execute("DELETE FROM class_enrollments WHERE student_id = ?", (student_id,))
        connection.execute("DELETE FROM profile_inventory WHERE user_id = ?", (student_id,))
        connection.execute("DELETE FROM cosmetic_unlocks WHERE user_id = ?", (student_id,))
        connection.execute("DELETE FROM study_sessions WHERE student_id = ?", (student_id,))
        connection.execute("DELETE FROM student_skill_metrics WHERE student_id = ?", (student_id,))
        connection.execute("DELETE FROM exercise_attempts WHERE student_id = ?", (student_id,))
        connection.execute("DELETE FROM teacher_password_reset_requests WHERE teacher_id = ?", (student_id,))
        connection.execute("DELETE FROM auth_sessions WHERE user_id = ?", (student_id,))
        connection.execute("DELETE FROM forum_posts WHERE author_id = ?", (student_id,))
        connection.execute("DELETE FROM forum_topics WHERE author_id = ?", (student_id,))
        connection.execute("DELETE FROM users WHERE id = ? AND role = 'student'", (student_id,))

    return {"message": f"Aluno {student['full_name']} excluido permanentemente."}


def get_teacher_access_code() -> GenericMessage:
    return GenericMessage(message=get_setting_value("teacher_access_code", settings.master_access_code) or settings.master_access_code)


def update_teacher_access_code(access_code: str) -> GenericMessage:
    normalized = access_code.strip()
    if len(normalized) < 6:
        raise HTTPException(status_code=422, detail="O codigo de acesso precisa ter pelo menos 6 caracteres.")
    set_setting_value("teacher_access_code", normalized)
    return GenericMessage(message=normalized)


def create_student_for_teacher(
    teacher_id: str,
    full_name: str,
    email: str,
    username: str,
    pin: str,
    grade_band: str,
    bio: str | None,
    class_id: str | None,
) -> StudentMiniProfile:
    existing = get_user_by_email(email.strip().lower())
    if existing is not None:
        raise HTTPException(status_code=409, detail="Ja existe um usuario com este email")
    manager = fetch_one("SELECT school_id, role FROM users WHERE id = ? AND role IN ('teacher', 'master')", (teacher_id,))
    if manager is None:
        raise HTTPException(status_code=404, detail="Responsavel nao encontrado")
    class_row = None
    linked_teacher_id = teacher_id
    if class_id:
        class_row = fetch_one("SELECT id, teacher_id FROM class_groups WHERE id = ?", (class_id,))
        if class_row is None:
            raise HTTPException(status_code=404, detail="Turma nao encontrada")
        linked_teacher_id = class_row["teacher_id"]
    if manager["role"] == "master" and not class_id:
        raise HTTPException(status_code=422, detail="O master precisa cadastrar o aluno diretamente em uma turma.")
    
    normalized_username = _validate_student_username(username)
    
    # Check if username is already taken
    existing_username = fetch_one("SELECT id FROM users WHERE username = ?", (normalized_username,))
    if existing_username is not None:
        raise HTTPException(status_code=409, detail="Este nome de usuario ja esta em uso")
    normalized_pin = _validate_student_pin(pin)
    student_id = f"student-{uuid.uuid4().hex[:10]}"
    created_at = now_iso()
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO users (
              id, school_id, role, full_name, email, username, password_hash, student_pin, avatar_url, grade_band, bio,
              level, xp, coins, streak, lives, created_at, updated_at
            ) VALUES (?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 5, ?, ?)
            """,
            (
                student_id,
                manager["school_id"],
                full_name,
                email.strip().lower(),
                normalized_username,
                make_password_hash(normalized_pin),
                normalized_pin,
                f"https://api.dicebear.com/8.x/adventurer/svg?seed={full_name.split()[0]}",
                grade_band,
                bio or "Aluno cadastrado pelo professor.",
                created_at,
                created_at,
            ),
        )
        if linked_teacher_id:
            connection.execute(
                """
                INSERT INTO teacher_student_links (teacher_id, student_id)
                VALUES (?, ?)
                ON CONFLICT(teacher_id, student_id) DO NOTHING
                """,
                (linked_teacher_id, student_id),
            )
        if class_id:
            connection.execute(
                "INSERT INTO class_enrollments (class_id, student_id, joined_at) VALUES (?, ?, ?)",
                (class_id, student_id, created_at),
            )
        connection.execute(
            """
            INSERT INTO student_skill_metrics (
              student_id, topic, strength_score, weakness_score, last_accuracy, recommendation, updated_at
            ) VALUES (?, 'Base inicial', 40, 60, 0, 'Iniciar trilha diagnostica.', ?)
            """,
            (student_id, created_at),
        )
    _sync_user_cosmetics(student_id)
    _sync_user_achievements(student_id)
    return _student_profile(student_id)


def approve_signup_request(
    teacher_id: str | None,
    request_id: str,
    username: str,
    pin: str,
    class_id: str | None = None,
) -> StudentMiniProfile:
    if teacher_id is None:
        request_row = fetch_one("SELECT * FROM signup_requests WHERE id = ?", (request_id,))
    else:
        request_row = fetch_one(
            "SELECT * FROM signup_requests WHERE id = ? AND requested_teacher_id = ?",
            (request_id, teacher_id),
        )
    if request_row is None:
        raise HTTPException(status_code=404, detail="Solicitacao nao encontrada")
    if request_row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Solicitacao ja foi processada")
    created = create_student_for_teacher(
        request_row["requested_teacher_id"],
        request_row["full_name"],
        request_row["email"],
        username,
        pin,
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


def reject_signup_request(teacher_id: str | None, request_id: str) -> None:
    if teacher_id is None:
        request_row = fetch_one("SELECT id FROM signup_requests WHERE id = ?", (request_id,))
    else:
        request_row = fetch_one("SELECT id FROM signup_requests WHERE id = ? AND requested_teacher_id = ?", (request_id, teacher_id))
    if request_row is None:
        raise HTTPException(status_code=404, detail="Solicitacao nao encontrada")
    execute("DELETE FROM signup_requests WHERE id = ?", (request_id,))


def reset_student_password_for_teacher(teacher_id: str | None, student_id: str) -> ResetPasswordResponse:
    if teacher_id is not None:
        link = fetch_one(
            "SELECT student_id FROM teacher_student_links WHERE teacher_id = ? AND student_id = ?",
            (teacher_id, student_id),
        )
        if link is None:
            raise HTTPException(status_code=404, detail="Aluno nao vinculado a este professor")

    student = fetch_one("SELECT id, full_name FROM users WHERE id = ? AND role = 'student'", (student_id,))
    if student is None:
        raise HTTPException(status_code=404, detail="Aluno nao encontrado")

    temporary_pin = f"{secrets.randbelow(9000) + 1000:04d}"
    execute(
        """
        UPDATE users
        SET password_hash = ?, student_pin = ?, updated_at = ?
        WHERE id = ?
        """,
        (make_password_hash(temporary_pin), temporary_pin, now_iso(), student_id),
    )
    return ResetPasswordResponse(
        message=f"Senha redefinida para {student['full_name']} com sucesso.",
        temporary_pin=temporary_pin,
    )


def delete_class_group(class_id: str) -> dict[str, str]:
    target = fetch_one("SELECT id FROM class_groups WHERE id = ?", (class_id,))
    if target is None:
        raise HTTPException(status_code=404, detail="Turma nao encontrada")
    execute("DELETE FROM class_groups WHERE id = ?", (class_id,))
    return {"message": "Turma e vinculos removidos."}


def list_teachers() -> list[TeacherDirectoryItem]:
    rows = fetch_all(
        """
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.grade_band,
          COUNT(DISTINCT l.student_id) AS students_count,
          COUNT(DISTINCT c.id) AS classes_count
        FROM users u
        LEFT JOIN teacher_student_links l ON l.teacher_id = u.id
        LEFT JOIN class_groups c ON c.teacher_id = u.id
        WHERE u.role = 'teacher'
        GROUP BY u.id, u.full_name, u.email, u.grade_band
        ORDER BY u.full_name
        """
    )
    class_rows = fetch_all(
        """
        SELECT teacher_id, name
        FROM class_groups
        WHERE teacher_id IN (SELECT id FROM users WHERE role = 'teacher')
        ORDER BY name
        """
    )
    classes_by_teacher: dict[str, list[str]] = {}
    for row in class_rows:
        classes_by_teacher.setdefault(row["teacher_id"], []).append(row["name"])
    return [TeacherDirectoryItem(**{**dict(row), "classes": classes_by_teacher.get(row["id"], [])}) for row in rows]


def request_teacher_password_reset(email: str) -> GenericMessage:
    teacher = fetch_one(
        "SELECT id, full_name, email FROM users WHERE email = ? AND role = 'teacher'",
        (email.strip().lower(),),
    )
    if teacher is None:
        raise HTTPException(status_code=404, detail="Professor nao encontrado com este email.")

    execute(
        """
        UPDATE teacher_password_resets
        SET status = 'completed',
            completed_at = ?,
            temporary_password_plain = NULL,
            temporary_password_hash = NULL,
            email_message = NULL
        WHERE teacher_id = ? AND status IN ('pending', 'approved')
        """,
        (now_iso(), teacher["id"]),
    )
    execute(
        """
        INSERT INTO teacher_password_resets (
          id, teacher_id, requested_at, status
        ) VALUES (?, ?, ?, 'pending')
        """,
        (f"teacher-reset-{uuid.uuid4().hex[:10]}", teacher["id"], now_iso()),
    )
    return GenericMessage(message="Solicitacao de redefinicao enviada para o usuario master.")


def list_teacher_password_reset_requests() -> list[TeacherPasswordResetRequestSummary]:
    rows = fetch_all(
        """
        SELECT
          r.id,
          r.teacher_id,
          t.full_name AS teacher_name,
          t.email AS teacher_email,
          r.status,
          r.requested_at,
          r.approved_at,
          r.completed_at,
          approver.full_name AS approved_by_name,
          r.temporary_password_plain,
          r.email_message
        FROM teacher_password_resets r
        JOIN users t ON t.id = r.teacher_id
        LEFT JOIN users approver ON approver.id = r.approved_by
        ORDER BY
          CASE r.status
            WHEN 'pending' THEN 0
            WHEN 'approved' THEN 1
            ELSE 2
          END,
          r.requested_at DESC
        """
    )
    return [_teacher_reset_summary(row) for row in rows]


def approve_teacher_password_reset(master_id: str, request_id: str) -> TeacherPasswordResetApprovalResponse:
    request_row = fetch_one(
        """
        SELECT r.id, r.teacher_id, r.status, t.full_name AS teacher_name, t.email AS teacher_email
        FROM teacher_password_resets r
        JOIN users t ON t.id = r.teacher_id
        WHERE r.id = ?
        """,
        (request_id,),
    )
    if request_row is None:
        raise HTTPException(status_code=404, detail="Solicitacao de reset nao encontrada.")
    if request_row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Essa solicitacao ja foi tratada.")

    temporary_password = _generate_teacher_temporary_password()
    email_message = (
        f"Olá, {request_row['teacher_name']}.\n\n"
        f"Sua redefinição de senha da MatGo foi autorizada.\n"
        f"Senha temporária: {temporary_password}\n\n"
        f"Entre na plataforma com seu email e essa senha temporária. "
        f"Depois, vá até o perfil e altere para uma nova senha definitiva.\n\n"
        "Mensagem enviada manualmente pela equipe responsável da escola."
    )
    approved_at = now_iso()
    execute(
        """
        UPDATE users
        SET password_hash = ?, updated_at = ?
        WHERE id = ?
        """,
        (make_password_hash(temporary_password), approved_at, request_row["teacher_id"]),
    )
    execute(
        """
        UPDATE teacher_password_resets
        SET status = 'approved',
            approved_at = ?,
            approved_by = ?,
            temporary_password_plain = ?,
            temporary_password_hash = ?,
            email_message = ?
        WHERE id = ?
        """,
        (
            approved_at,
            master_id,
            temporary_password,
            make_password_hash(temporary_password),
            email_message,
            request_id,
        ),
    )
    updated = fetch_one(
        """
        SELECT
          r.id,
          r.teacher_id,
          t.full_name AS teacher_name,
          t.email AS teacher_email,
          r.status,
          r.requested_at,
          r.approved_at,
          r.completed_at,
          approver.full_name AS approved_by_name,
          r.temporary_password_plain,
          r.email_message
        FROM teacher_password_resets r
        JOIN users t ON t.id = r.teacher_id
        LEFT JOIN users approver ON approver.id = r.approved_by
        WHERE r.id = ?
        """,
        (request_id,),
    )
    summary = _teacher_reset_summary(updated)
    return TeacherPasswordResetApprovalResponse(
        message=f"Senha temporaria gerada para {request_row['teacher_name']}.",
        temporary_password=temporary_password,
        email_message=email_message,
        request=summary,
    )


def change_teacher_password(user_id: str, current_password: str, new_password: str) -> GenericMessage:
    teacher = fetch_one("SELECT id, role, password_hash FROM users WHERE id = ?", (user_id,))
    if teacher is None or teacher["role"] != "teacher":
        raise HTTPException(status_code=404, detail="Professor nao encontrado.")
    if not verify_password(current_password, teacher["password_hash"]):
        raise HTTPException(status_code=401, detail="Senha atual invalida.")

    next_password = _validate_teacher_password(new_password)
    execute(
        """
        UPDATE users
        SET password_hash = ?, updated_at = ?
        WHERE id = ?
        """,
        (make_password_hash(next_password), now_iso(), user_id),
    )
    execute(
        """
        UPDATE teacher_password_resets
        SET status = 'completed',
            completed_at = ?,
            temporary_password_plain = NULL,
            temporary_password_hash = NULL,
            email_message = NULL
        WHERE teacher_id = ? AND status = 'approved'
        """,
        (now_iso(), user_id),
    )
    return GenericMessage(message="Senha alterada com sucesso.")


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
    equipped_frame = next((item.id for item in items if item.category == "frame" and item.equipped), None)
    return ProfileInventoryResponse(equipped_avatar_id=equipped_avatar, equipped_frame_id=equipped_frame, items=items)


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
          CASE c.category WHEN 'avatar' THEN 1 WHEN 'frame' THEN 2 WHEN 'theme' THEN 3 ELSE 4 END,
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
    elif item_row["category"] == "theme":
        execute(
            """
            UPDATE user_cosmetics
            SET equipped = CASE WHEN item_id = ? THEN 1 ELSE 0 END
            WHERE user_id = ? AND item_id IN (SELECT id FROM cosmetic_items WHERE category = 'theme')
            """,
            (item_id, user_id),
        )
    elif item_row["category"] == "frame":
        execute(
            """
            UPDATE user_cosmetics
            SET equipped = CASE WHEN item_id = ? THEN 1 ELSE 0 END
            WHERE user_id = ? AND item_id IN (SELECT id FROM cosmetic_items WHERE category = 'frame')
            """,
            (item_id, user_id),
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


def list_forum_topics(viewer_id: str, viewer_role: str, class_ids: list[str] | None = None) -> list[ForumTopicSummary]:
    allowed_class_ids = _class_ids_for_user(viewer_id, viewer_role)
    if viewer_role != "master" and not allowed_class_ids:
        return []
    requested_class_ids = class_ids or []
    if requested_class_ids:
        effective_class_ids = [class_id for class_id in requested_class_ids if viewer_role == "master" or class_id in allowed_class_ids]
    else:
        effective_class_ids = allowed_class_ids
    if viewer_role != "master" and not effective_class_ids:
        return []
    params: tuple[object, ...] = ()
    if viewer_role == "master" and not effective_class_ids:
        where_clause = ""
    else:
        placeholders = ",".join("?" for _ in effective_class_ids)
        where_clause = f"WHERE t.class_id IN ({placeholders})"
        params = tuple(effective_class_ids)
    rows = fetch_all(
        f"""
        SELECT t.*, u.full_name AS author_name, COUNT(p.id) AS replies
        FROM forum_topics t
        JOIN users u ON u.id = t.author_id
        LEFT JOIN forum_posts p ON p.topic_id = t.id
        {where_clause}
        GROUP BY t.id
        ORDER BY t.is_pinned DESC, t.created_at DESC
        """,
        params,
    )
    return [
        ForumTopicSummary(
            id=row["id"],
            class_id=row["class_id"],
            author_id=row["author_id"],
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


def get_forum_topic(viewer_id: str, viewer_role: str, topic_id: str) -> ForumTopicDetail:
    rows = list_forum_topics(viewer_id, viewer_role)
    topic = next((item for item in rows if item.id == topic_id), None)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topico nao encontrado")
    posts = fetch_all(
        """
        SELECT p.id, p.author_id, p.body, p.created_at, u.full_name AS author_name
        FROM forum_posts p
        JOIN users u ON u.id = p.author_id
        WHERE p.topic_id = ?
        ORDER BY p.created_at ASC
        """,
        (topic_id,),
    )
    return ForumTopicDetail(
        topic=topic,
        posts=[
            ForumPostItem(
                id=row["id"],
                author_id=row["author_id"],
                author_name=row["author_name"],
                body=row["body"],
                created_at=row["created_at"],
            )
            for row in posts
        ],
    )


def create_forum_topic(
    viewer_role: str,
    class_id: str | None,
    author_id: str,
    title: str,
    body: str,
    tags: list[str],
    topic_type: str,
    due_at: str | None,
) -> ForumTopicSummary:
    if not class_id:
        raise HTTPException(status_code=422, detail="Selecione a turma do topico.")
    allowed_class_ids = _class_ids_for_user(author_id, viewer_role)
    if viewer_role != "master" and class_id not in allowed_class_ids:
        raise HTTPException(status_code=403, detail="Voce so pode publicar no forum das suas turmas.")
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
    return get_forum_topic(author_id, viewer_role, topic_id).topic


def create_forum_post(topic_id: str, author_id: str, body: str) -> ForumTopicDetail:
    topic = fetch_one("SELECT class_id FROM forum_topics WHERE id = ?", (topic_id,))
    if topic is None:
        raise HTTPException(status_code=404, detail="Topico nao encontrado")
    author = fetch_one("SELECT role FROM users WHERE id = ?", (author_id,))
    if author is None:
        raise HTTPException(status_code=404, detail="Autor nao encontrado")
    allowed_class_ids = _class_ids_for_user(author_id, author["role"])
    if author["role"] != "master" and topic["class_id"] not in allowed_class_ids:
        raise HTTPException(status_code=403, detail="Sem permissao para responder neste topico.")
    post_id = f"post-{uuid.uuid4().hex[:10]}"
    execute(
        "INSERT INTO forum_posts (id, topic_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)",
        (post_id, topic_id, author_id, body, now_iso()),
    )
    _sync_user_achievements(author_id)
    return get_forum_topic(author_id, author["role"], topic_id)


def update_forum_topic_class(topic_id: str, actor_id: str, actor_role: str, class_id: str) -> ForumTopicSummary:
    topic = fetch_one("SELECT id, author_id, class_id FROM forum_topics WHERE id = ?", (topic_id,))
    if topic is None:
        raise HTTPException(status_code=404, detail="Topico nao encontrado")
    classroom = fetch_one("SELECT id, teacher_id FROM class_groups WHERE id = ?", (class_id,))
    if classroom is None:
        raise HTTPException(status_code=404, detail="Turma nao encontrada")

    if actor_role == "master":
        pass
    elif topic["author_id"] != actor_id:
        raise HTTPException(status_code=403, detail="Apenas o criador do topico ou o master podem alterar a turma.")
    else:
        allowed_class_ids = _class_ids_for_user(actor_id, actor_role)
        if topic["class_id"] not in allowed_class_ids or class_id not in allowed_class_ids:
            raise HTTPException(status_code=403, detail="Voce so pode mover topicos entre turmas que voce gerencia.")

    execute("UPDATE forum_topics SET class_id = ? WHERE id = ?", (class_id, topic_id))
    return get_forum_topic(actor_id, actor_role, topic_id).topic


def delete_forum_topic(topic_id: str, actor_id: str, actor_role: str) -> GenericMessage:
    topic = fetch_one("SELECT id, author_id, class_id FROM forum_topics WHERE id = ?", (topic_id,))
    if topic is None:
        raise HTTPException(status_code=404, detail="Topico nao encontrado")
    if actor_role == "teacher" and topic["class_id"] not in _class_ids_for_user(actor_id, actor_role):
        raise HTTPException(status_code=403, detail="Sem permissao para excluir topicos de outra turma.")
    if actor_role not in {"teacher", "master"} and topic["author_id"] != actor_id:
        raise HTTPException(status_code=403, detail="Sem permissao para excluir este topico")
    execute("DELETE FROM forum_posts WHERE topic_id = ?", (topic_id,))
    execute("DELETE FROM forum_topics WHERE id = ?", (topic_id,))
    return GenericMessage(message="Topico excluido com sucesso.")


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


def _grade_matches(student_grade_band: str | None, path_grade_band: str | None) -> bool:
    if not student_grade_band or not path_grade_band:
        return False
    return student_grade_band.lower() in path_grade_band.lower()


def _row_to_exercise(row) -> Exercise:
    return Exercise(
        id=row["id"],
        lesson_id=row["lesson_id"],
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


def _build_base_learning_paths_for_student(student_id: str) -> list[LearningPath]:
    student = fetch_one("SELECT grade_band FROM users WHERE id = ? AND role = 'student'", (student_id,))
    if student is None:
        raise HTTPException(status_code=404, detail="Aluno nao encontrado")

    path_rows = fetch_all("SELECT * FROM learning_paths ORDER BY title ASC")
    lesson_rows = fetch_all("SELECT * FROM lessons ORDER BY sequence_order ASC, title ASC")
    exercise_rows = fetch_all("SELECT * FROM exercises ORDER BY id ASC")
    completed_rows = fetch_all(
        """
        SELECT DISTINCT a.exercise_id
        FROM exercise_attempts a
        WHERE a.student_id = ? AND a.is_correct = 1
        """,
        (student_id,),
    )
    completed_exercise_ids = {row["exercise_id"] for row in completed_rows}

    exercises_by_lesson: dict[str, list[data.Exercise]] = {}
    for row in exercise_rows:
        exercises_by_lesson.setdefault(row["lesson_id"], []).append(_row_to_exercise(row))

    lessons_by_path: dict[str, list[Lesson]] = {}
    for row in lesson_rows:
        path_row = next((path for path in path_rows if path["id"] == row["path_id"]), None)
        if path_row is None or not _grade_matches(student["grade_band"], path_row["grade_band"]):
            continue
        lesson_exercises = exercises_by_lesson.get(row["id"], [])[:BASE_LESSON_CHALLENGE_LIMIT]
        completed_lesson_exercise_ids = [exercise.id for exercise in lesson_exercises if exercise.id in completed_exercise_ids]
        completed = bool(lesson_exercises) and len(completed_lesson_exercise_ids) == len(lesson_exercises)
        lessons_by_path.setdefault(row["path_id"], []).append(
            Lesson(
                id=row["id"],
                title=row["title"],
                summary=row["summary"],
                estimated_minutes=row["estimated_minutes"],
                xp_reward=row["xp_reward"],
                locked=False,
                completed=completed,
                exercise_count=len(lesson_exercises),
                completed_exercise_ids=completed_lesson_exercise_ids,
                exercises=lesson_exercises,
            )
        )

    visible_paths: list[LearningPath] = []
    for row in path_rows:
        if not _grade_matches(student["grade_band"], row["grade_band"]):
            continue
        lessons = lessons_by_path.get(row["id"], [])
        encountered_open = False
        normalized_lessons: list[Lesson] = []
        for lesson in lessons:
            if lesson.completed:
                normalized_lessons.append(lesson)
                continue
            if not encountered_open:
                normalized_lessons.append(lesson.model_copy(update={"locked": False}))
                encountered_open = True
            else:
                normalized_lessons.append(lesson.model_copy(update={"locked": True}))
        completion_rate = round((sum(1 for lesson in normalized_lessons if lesson.completed) / len(normalized_lessons)) * 100) if normalized_lessons else 0
        visible_paths.append(
            LearningPath(
                id=row["id"],
                title=row["title"],
                category=row["category"],
                difficulty=row["difficulty"],
                grade_band=row["grade_band"],
                completion_rate=completion_rate,
                world_name=row["world_name"],
                lessons=normalized_lessons,
            )
        )
    return visible_paths


def _build_teacher_trails(
    trail_rows: list[object],
    class_rows: list[object],
    activity_rows: list[object],
    completed_activity_ids: set[str] | None = None,
) -> list[TeacherTrail]:
    completed_activity_ids = completed_activity_ids or set()
    classes_by_trail: dict[str, list[TrailClass]] = {}
    for row in class_rows:
        classes_by_trail.setdefault(row["trail_id"], []).append(
            TrailClass(
                id=row["class_id"],
                name=row["class_name"],
                grade_band=row["grade_band"],
            )
        )

    raw_activities_by_trail: dict[str, list[TrailActivity]] = {}
    for row in activity_rows:
        raw_activities_by_trail.setdefault(row["trail_id"], []).append(
            TrailActivity(
                id=row["id"],
                title=row["title"],
                activity_type=row["activity_type"],
                difficulty=row["difficulty"],
                estimated_minutes=row["estimated_minutes"],
                xp_reward=row["xp_reward"],
                sequence_order=row["sequence_order"],
                source_exercise_id=row["source_exercise_id"],
                completed=row["id"] in completed_activity_ids,
                locked=False,
            )
        )

    trails: list[TeacherTrail] = []
    for row in trail_rows:
        activities = sorted(raw_activities_by_trail.get(row["id"], []), key=lambda item: item.sequence_order)
        encountered_open = False
        normalized_activities: list[TrailActivity] = []
        for activity in activities:
            if activity.completed:
                normalized_activities.append(activity)
                continue
            if not encountered_open:
                normalized_activities.append(activity.model_copy(update={"locked": False}))
                encountered_open = True
            else:
                normalized_activities.append(activity.model_copy(update={"locked": True}))
        trails.append(
            TeacherTrail(
                id=row["id"],
                teacher_id=row["teacher_id"],
                teacher_name=row["teacher_name"],
                title=row["title"],
                description=row["description"],
                created_at=row["created_at"],
                classes=classes_by_trail.get(row["id"], []),
                activities=normalized_activities,
            )
        )
    return trails


def _trail_activity_xp_reward(estimated_minutes: int, difficulty: int | None) -> int:
    base = max(1, estimated_minutes) * 6
    difficulty_bonus = (difficulty or 1) * 8
    return max(20, base + difficulty_bonus)


def create_teacher_trail(
    teacher_id: str,
    title: str,
    description: str | None,
    class_ids: list[str],
    activities: list[dict[str, object]],
) -> TeacherTrail:
    clean_title = title.strip()
    if not clean_title:
        raise HTTPException(status_code=422, detail="A trilha precisa ter um titulo.")
    if not class_ids:
        raise HTTPException(status_code=422, detail="Selecione ao menos uma turma para publicar a trilha.")
    if not activities:
        raise HTTPException(status_code=422, detail="Adicione pelo menos uma atividade na trilha.")

    teacher = fetch_one("SELECT id, full_name FROM users WHERE id = ? AND role = 'teacher'", (teacher_id,))
    if teacher is None:
        raise HTTPException(status_code=404, detail="Professor nao encontrado.")

    unique_class_ids = list(dict.fromkeys(class_ids))
    placeholders = ",".join("?" for _ in unique_class_ids)
    class_rows = fetch_all(
        f"""
        SELECT id, name, grade_band, teacher_id
        FROM class_groups
        WHERE id IN ({placeholders})
        """,
        tuple(unique_class_ids),
    )
    if len(class_rows) != len(unique_class_ids):
        raise HTTPException(status_code=404, detail="Uma ou mais turmas selecionadas nao foram encontradas.")
    if any(row["teacher_id"] != teacher_id for row in class_rows):
        raise HTTPException(status_code=403, detail="Voce so pode publicar trilhas nas suas proprias turmas.")

    trail_id = f"trail-{uuid.uuid4().hex[:10]}"
    created_at = now_iso()
    normalized_activities = []
    for index, activity in enumerate(activities, start=1):
        activity_title = str(activity.get("title", "")).strip()
        difficulty = activity.get("difficulty")
        normalized_difficulty = int(difficulty) if difficulty not in (None, "") else None
        estimated_minutes = int(activity.get("estimated_minutes") or 0)
        if estimated_minutes <= 0:
            raise HTTPException(status_code=422, detail=f"A atividade {index} precisa ter tempo estimado valido.")
        activity_type = str(activity.get("activity_type", "")).strip()
        if not activity_type:
            raise HTTPException(status_code=422, detail=f"A atividade {index} precisa ter um tipo.")
        source_exercise_id = activity.get("source_exercise_id")
        if source_exercise_id:
            source_exercise = fetch_one(
                """
                SELECT prompt, exercise_type, difficulty, estimated_seconds
                FROM exercises
                WHERE id = ?
                """,
                (str(source_exercise_id),),
            )
            if source_exercise is None:
                raise HTTPException(status_code=404, detail=f"A questao vinculada da atividade {index} nao foi encontrada.")
            if not activity_title:
                activity_title = str(source_exercise["prompt"])
            activity_type = str(source_exercise["exercise_type"])
            normalized_difficulty = int(source_exercise["difficulty"])
            estimated_minutes = max(1, round(int(source_exercise["estimated_seconds"]) / 60))
        if not activity_title:
            raise HTTPException(status_code=422, detail=f"A atividade {index} precisa ter um titulo.")
        normalized_activities.append(
            {
                "id": f"trail-activity-{uuid.uuid4().hex[:10]}",
                "title": activity_title,
                "activity_type": activity_type,
                "difficulty": normalized_difficulty,
                "estimated_minutes": estimated_minutes,
                "xp_reward": _trail_activity_xp_reward(estimated_minutes, normalized_difficulty),
                "source_exercise_id": str(source_exercise_id) if source_exercise_id else None,
                "sequence_order": index,
            }
        )

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO teacher_trails (id, teacher_id, title, description, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (trail_id, teacher_id, clean_title, (description or "").strip(), created_at),
        )
        connection.executemany(
            """
            INSERT INTO teacher_trail_activities (
              id, trail_id, title, activity_type, difficulty, estimated_minutes, xp_reward, source_exercise_id, sequence_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    activity["id"],
                    trail_id,
                    activity["title"],
                    activity["activity_type"],
                    activity["difficulty"],
                    activity["estimated_minutes"],
                    activity["xp_reward"],
                    activity["source_exercise_id"],
                    activity["sequence_order"],
                )
                for activity in normalized_activities
            ],
        )
        connection.executemany(
            "INSERT INTO teacher_trail_classes (trail_id, class_id) VALUES (?, ?)",
            [(trail_id, class_id) for class_id in unique_class_ids],
        )

    return list_teacher_trails(teacher_id)[0]


def list_teacher_trails(teacher_id: str) -> list[TeacherTrail]:
    trail_rows = fetch_all(
        """
        SELECT t.id, t.teacher_id, t.title, t.description, t.created_at, u.full_name AS teacher_name
        FROM teacher_trails t
        JOIN users u ON u.id = t.teacher_id
        WHERE t.teacher_id = ?
        ORDER BY t.created_at DESC, t.title ASC
        """,
        (teacher_id,),
    )
    if not trail_rows:
        return []

    trail_ids = tuple(row["id"] for row in trail_rows)
    placeholders = ",".join("?" for _ in trail_ids)
    class_rows = fetch_all(
        f"""
        SELECT tc.trail_id, c.id AS class_id, c.name AS class_name, c.grade_band
        FROM teacher_trail_classes tc
        JOIN class_groups c ON c.id = tc.class_id
        WHERE tc.trail_id IN ({placeholders})
        ORDER BY c.name ASC
        """,
        trail_ids,
    )
    activity_rows = fetch_all(
        f"""
        SELECT id, trail_id, title, activity_type, difficulty, estimated_minutes, xp_reward, sequence_order
        FROM teacher_trail_activities
        WHERE trail_id IN ({placeholders})
        ORDER BY sequence_order ASC
        """,
        trail_ids,
    )
    return _build_teacher_trails(trail_rows, class_rows, activity_rows)


def list_student_learning_trails(student_id: str) -> StudentLearningTrailsResponse:
    base_paths = _build_base_learning_paths_for_student(student_id)
    class_rows = fetch_all(
        """
        SELECT class_id
        FROM class_enrollments
        WHERE student_id = ?
        """,
        (student_id,),
    )
    class_ids = [row["class_id"] for row in class_rows]
    teacher_trails: list[TeacherTrail] = []
    if class_ids:
        placeholders = ",".join("?" for _ in class_ids)
        trail_rows = fetch_all(
            f"""
            SELECT DISTINCT t.id, t.teacher_id, t.title, t.description, t.created_at, u.full_name AS teacher_name
            FROM teacher_trails t
            JOIN users u ON u.id = t.teacher_id
            JOIN teacher_trail_classes tc ON tc.trail_id = t.id
            WHERE tc.class_id IN ({placeholders})
            ORDER BY t.created_at DESC, t.title ASC
            """,
            tuple(class_ids),
        )
        if trail_rows:
            trail_ids = tuple(row["id"] for row in trail_rows)
            trail_placeholders = ",".join("?" for _ in trail_ids)
            trail_class_rows = fetch_all(
                f"""
                SELECT tc.trail_id, c.id AS class_id, c.name AS class_name, c.grade_band
                FROM teacher_trail_classes tc
                JOIN class_groups c ON c.id = tc.class_id
                WHERE tc.trail_id IN ({trail_placeholders})
                ORDER BY c.name ASC
                """,
                trail_ids,
            )
            activity_rows = fetch_all(
                f"""
                SELECT id, trail_id, title, activity_type, difficulty, estimated_minutes, xp_reward, source_exercise_id, sequence_order
                FROM teacher_trail_activities
                WHERE trail_id IN ({trail_placeholders})
                ORDER BY sequence_order ASC
                """,
                trail_ids,
            )
            completed_rows = fetch_all(
                """
                SELECT trail_activity_id
                FROM student_trail_activity_progress
                WHERE student_id = ?
                """,
                (student_id,),
            )
            completed_ids = {row["trail_activity_id"] for row in completed_rows}
            teacher_trails = _build_teacher_trails(trail_rows, trail_class_rows, activity_rows, completed_ids)

    return StudentLearningTrailsResponse(base_paths=base_paths, teacher_trails=teacher_trails)


def complete_student_trail_activity(student_id: str, trail_activity_id: str) -> GenericMessage:
    activity = fetch_one(
        """
        SELECT a.id
        FROM teacher_trail_activities a
        JOIN teacher_trail_classes tc ON tc.trail_id = a.trail_id
        JOIN class_enrollments e ON e.class_id = tc.class_id
        WHERE a.id = ? AND e.student_id = ?
        LIMIT 1
        """,
        (trail_activity_id, student_id),
    )
    if activity is None:
        raise HTTPException(status_code=404, detail="Atividade de trilha nao encontrada para este aluno.")
    execute(
        """
        INSERT INTO student_trail_activity_progress (student_id, trail_activity_id, completed_at)
        VALUES (?, ?, ?)
        ON CONFLICT(student_id, trail_activity_id) DO NOTHING
        """,
        (student_id, trail_activity_id, now_iso()),
    )
    return GenericMessage(message="Atividade da trilha concluida com sucesso.")


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


def _target_difficulty_for_student(student_id: str, streak: int = 0) -> int:
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
        accuracy = 0.0
        avg_difficulty = 2.0
    else:
        accuracy = float(row["accuracy"] or 0.0)
        avg_difficulty = float(row["avg_difficulty"] or 2.0)

    if accuracy >= 0.82:
        base_diff = min(5, max(2, round(avg_difficulty + 1)))
    elif accuracy <= 0.55:
        base_diff = max(1, round(avg_difficulty - 1))
    else:
        base_diff = max(2, round(avg_difficulty))

    if streak >= 14:
        base_diff += 2
    elif streak >= 7:
        base_diff += 1

    return min(5, base_diff)


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


def _student_evolution(student_id: str) -> list[EvolutionPoint]:
    rows = fetch_all(
        """
        SELECT
          substr(created_at, 1, 10) AS day,
          SUM(CASE WHEN is_correct = 1 THEN 18 ELSE 4 END) AS xp,
          COALESCE(ROUND(AVG(CASE WHEN is_correct = 1 THEN 100 ELSE 0 END)), 0) AS accuracy
        FROM exercise_attempts
        WHERE student_id = ?
        GROUP BY substr(created_at, 1, 10)
        ORDER BY day DESC
        LIMIT 7
        """,
        (student_id,),
    )
    weekday_labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    points = []
    for row in reversed(rows):
        try:
            label = weekday_labels[datetime.fromisoformat(row["day"]).weekday()]
        except Exception:
            label = str(row["day"])
        points.append(EvolutionPoint(label=label, xp=int(row["xp"] or 0), accuracy=int(row["accuracy"] or 0)))
    return points


def build_student_insights(student_id: str) -> StudentInsightsResponse:
    student = fetch_one("SELECT id, streak FROM users WHERE id = ? AND role = 'student'", (student_id,))
    if student is None:
        raise HTTPException(status_code=404, detail="Aluno nao encontrado")

    strengths, weaknesses = _strength_weakness_lists(student_id)
    accuracy = _student_accuracy(student_id)
    study_minutes = _student_minutes(student_id)
    completed_lessons = _student_completed_lessons(student_id)
    current_difficulty = _target_difficulty_for_student(student_id, int(student["streak"] or 0))
    next_focus = weaknesses[0].topic if weaknesses else _topic_for_today()
    daily_goal = (
        f"Conclua uma sessao curta e mantenha o acerto acima de {max(65, accuracy)}%."
        if accuracy > 0
        else "Comece com uma sessao curta para registrar seus primeiros acertos."
    )

    return StudentInsightsResponse(
        accuracy=accuracy,
        study_minutes=study_minutes,
        completed_lessons=completed_lessons,
        strong_areas=[item.topic for item in strengths],
        weak_areas=[item.topic for item in weaknesses],
        adaptive_plan=AdaptivePlan(
            current_difficulty=current_difficulty,
            next_focus=next_focus,
            weak_points=weaknesses,
            suggested_revision=[item.topic for item in weaknesses] or [item.topic for item in strengths],
            daily_goal=daily_goal,
        ),
        evolution=_student_evolution(student_id),
    )


def record_study_activity(student_id: str, class_id: str | None = None, route_path: str | None = None) -> None:
    student = fetch_one("SELECT id FROM users WHERE id = ? AND role = 'student'", (student_id,))
    if student is None:
        raise HTTPException(status_code=404, detail="Aluno nao encontrado")

    effective_class_id = class_id or _current_class_for_student(student_id)
    minute_key = datetime.utcnow().replace(second=0, microsecond=0).isoformat()[:16]
    existing = fetch_one(
        "SELECT id FROM study_sessions WHERE student_id = ? AND substr(created_at, 1, 16) = ? LIMIT 1",
        (student_id, minute_key),
    )
    if existing is not None:
        return

    session_id = f"session-{uuid.uuid4().hex[:10]}"
    execute(
        """
        INSERT INTO study_sessions (id, student_id, class_id, minutes_studied, completed_lessons, xp_earned, created_at)
        VALUES (?, ?, ?, 1, 0, 0, ?)
        """,
        (session_id, student_id, effective_class_id, now_iso()),
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
    target_difficulty = _target_difficulty_for_student(student_id, student["streak"])
    very_recent_exercises, recent_exercises, recent_skill_stats = _recent_attempt_profile(student_id)
    today = datetime.utcnow().date().isoformat()

    assignment_row = fetch_one(
        """
        SELECT exercise_ids_json
        FROM daily_mission_assignments
        WHERE student_id = ? AND mission_date = ?
        """,
        (student_id, today),
    )

    selected_rows: list[object] = []
    if assignment_row:
        saved_ids = [str(exercise_id) for exercise_id in json.loads(assignment_row["exercise_ids_json"] or "[]")]
        if saved_ids:
            saved_rows = fetch_all(
                f"""
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
                WHERE e.id IN ({",".join("?" for _ in saved_ids)})
                """,
                tuple(saved_ids),
            )
            saved_rows_by_id = {row["id"]: row for row in saved_rows}
            selected_rows = [saved_rows_by_id[exercise_id] for exercise_id in saved_ids if exercise_id in saved_rows_by_id]
            if len(selected_rows) != len(saved_ids):
                selected_rows = []

    if not selected_rows:
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

        if selected_rows:
            execute(
                """
                INSERT INTO daily_mission_assignments (student_id, mission_date, exercise_ids_json, created_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(student_id, mission_date) DO UPDATE SET
                  exercise_ids_json = excluded.exercise_ids_json
                """,
                (student_id, today, json.dumps([row["id"] for row in selected_rows]), now_iso()),
            )

    if not selected_rows:
        raise HTTPException(status_code=404, detail="Nenhum exercicio disponivel para a missao diaria")

    exercise_ids = [row["id"] for row in selected_rows]
    placeholders = ",".join("?" for _ in exercise_ids)
    progress_rows = fetch_all(
        f"""
        SELECT DISTINCT exercise_id
        FROM exercise_attempts
        WHERE student_id = ?
          AND exercise_id IN ({placeholders})
          AND substr(created_at, 1, 10) = ?
        """,
        (student_id, *exercise_ids, today),
    )
    completed_exercise_ids = [row["exercise_id"] for row in progress_rows]
    completed_exercises = len(completed_exercise_ids)

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
        completed_exercise_ids=completed_exercise_ids,
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
