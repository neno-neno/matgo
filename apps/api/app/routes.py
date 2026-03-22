from fastapi import APIRouter, Depends, Header, HTTPException

from app.data import battles, dashboard_data, paths, teacher_dashboard, world_map
from app.models import (
    DailyMissionResponse,
    ClassReport,
    ClassSummary,
    CosmeticItem,
    EquipCosmeticRequest,
    ExerciseAttemptRequest,
    ForumPostCreate,
    ForumTopicCreate,
    ForumTopicDetail,
    ForumTopicSummary,
    GenericMessage,
    LoginRequest,
    LoginResponse,
    ProfileInventoryResponse,
    ProfileViewResponse,
    RewardsOverviewResponse,
    ShopPurchaseRequest,
    ShopResponse,
    PublicClassOption,
    QuestionBankCreateRequest,
    QuestionBankItem,
    QuestionBankLessonOption,
    QuestionBankUpdateRequest,
    RegisterRequest,
    ApproveSignupRequest,
    StudentMiniProfile,
    StudentSignupRequestCreate,
    StudentSignupRequestSummary,
    StudentReport,
    TeacherCreateClassRequest,
    TeacherCreateStudentRequest,
    TeacherAccessStudent,
    TeacherDirectoryItem,
    TutorFeedback,
    UserProfileUpdateRequest,
)
from app.services import (
    approve_signup_request,
    authenticate_user,
    build_bootstrap,
    create_class_for_teacher,
    create_forum_post,
    create_forum_topic,
    create_question_bank_item,
    create_student_signup_request,
    create_student_for_teacher,
    equip_cosmetic_item,
    delete_forum_topic,
    get_authenticated_user,
    get_class_ranking,
    get_class_report,
    get_forum_topic,
    get_profile_view,
    get_student_report,
    get_teacher_access_students,
    get_students_for_teacher,
    list_forum_topics,
    list_public_classes,
    list_profile_inventory,
    list_question_bank_items,
    list_question_bank_lessons,
    list_rewards_overview,
    list_shop_items,
    list_signup_requests_for_teacher,
    list_teachers,
    list_teacher_classes,
    build_daily_mission,
    record_attempt,
    register_user,
    purchase_shop_item,
    update_profile,
    update_question_bank_item,
)

router = APIRouter()


def current_user(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token Bearer obrigatorio")
    token = authorization.replace("Bearer ", "", 1).strip()
    return get_authenticated_user(token)


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    return authenticate_user(payload.email, payload.password)


@router.post("/auth/register", response_model=LoginResponse)
def register(payload: RegisterRequest):
    return register_user(
        payload.full_name,
        payload.email,
        payload.password,
        payload.role,
        payload.grade_band,
        payload.bio,
        payload.access_code,
    )


@router.get("/public/classes", response_model=list[PublicClassOption])
def public_classes():
    return list_public_classes()


@router.post("/auth/student-signup-request", response_model=GenericMessage)
def student_signup_request(payload: StudentSignupRequestCreate):
    return create_student_signup_request(payload.class_id, payload.full_name, payload.email, payload.note)


@router.get("/auth/me")
def me(user=Depends(current_user)):
    return user


@router.patch("/profiles/{user_id}")
def patch_profile(user_id: str, payload: UserProfileUpdateRequest, user=Depends(current_user)):
    if user.role not in {"master", "teacher"} and user.id != user_id:
        raise HTTPException(status_code=403, detail="Sem permissao para editar este perfil")
    return update_profile(user_id, payload.full_name, payload.avatar_url, payload.bio)


@router.get("/profiles/{user_id}/view", response_model=ProfileViewResponse)
def get_profile_view_route(user_id: str, user=Depends(current_user)):
    return get_profile_view(user.id, user_id)


@router.get("/profiles/{user_id}/inventory", response_model=ProfileInventoryResponse)
def get_profile_inventory(user_id: str, user=Depends(current_user)):
    if user.role not in {"master", "teacher"} and user.id != user_id:
        raise HTTPException(status_code=403, detail="Sem permissao para ver este inventario")
    return list_profile_inventory(user_id)


@router.post("/profiles/{user_id}/equip", response_model=ProfileInventoryResponse)
def post_equip_cosmetic(user_id: str, payload: EquipCosmeticRequest, user=Depends(current_user)):
    if user.role not in {"master", "teacher"} and user.id != user_id:
        raise HTTPException(status_code=403, detail="Sem permissao para equipar este item")
    return equip_cosmetic_item(user_id, payload.item_id)


@router.get("/profiles/{user_id}/rewards", response_model=RewardsOverviewResponse)
def get_profile_rewards(user_id: str, user=Depends(current_user)):
    if user.role not in {"master", "teacher"} and user.id != user_id:
        raise HTTPException(status_code=403, detail="Sem permissao para ver estas recompensas")
    return list_rewards_overview(user_id)


@router.get("/profiles/{user_id}/shop", response_model=ShopResponse)
def get_profile_shop(user_id: str, user=Depends(current_user)):
    if user.role not in {"master", "teacher"} and user.id != user_id:
        raise HTTPException(status_code=403, detail="Sem permissao para ver esta loja")
    return list_shop_items(user_id)


@router.post("/profiles/{user_id}/shop/purchase", response_model=ShopResponse)
def post_profile_shop_purchase(user_id: str, payload: ShopPurchaseRequest, user=Depends(current_user)):
    if user.role not in {"master", "teacher"} and user.id != user_id:
        raise HTTPException(status_code=403, detail="Sem permissao para comprar este item")
    return purchase_shop_item(user_id, payload.item_id)


@router.get("/dashboard")
def get_dashboard():
    return dashboard_data


@router.get("/bootstrap")
def get_bootstrap():
    return build_bootstrap()


@router.get("/daily-mission", response_model=DailyMissionResponse)
def get_daily_mission(user=Depends(current_user)):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="A missao diaria e exclusiva para alunos")
    return build_daily_mission(user.id)


@router.get("/learning-paths")
def get_learning_paths():
    return paths


@router.get("/teacher/dashboard")
def get_teacher_dashboard():
    return teacher_dashboard


@router.get("/world-map")
def get_world_map():
    return world_map


@router.get("/battles")
def get_battles():
    return battles


@router.get("/teacher/classes", response_model=list[ClassSummary])
def teacher_classes(user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem ver turmas")
    target_teacher_id = user.id if user.role == "teacher" else "teacher-001"
    return list_teacher_classes(target_teacher_id)


@router.post("/teacher/classes", response_model=ClassSummary)
def teacher_create_class(payload: TeacherCreateClassRequest, user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem criar turmas")
    target_teacher_id = user.id if user.role == "teacher" else "teacher-001"
    return create_class_for_teacher(target_teacher_id, payload.name, payload.grade_band)


@router.get("/teacher/students", response_model=list[StudentMiniProfile])
def teacher_students(user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem ver alunos")
    target_teacher_id = user.id if user.role == "teacher" else "teacher-001"
    return get_students_for_teacher(target_teacher_id)


@router.get("/teacher/question-bank/meta", response_model=list[QuestionBankLessonOption])
def teacher_question_bank_meta(user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem ver o banco de questoes")
    return list_question_bank_lessons()


@router.get("/teacher/question-bank", response_model=list[QuestionBankItem])
def teacher_question_bank(user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem ver o banco de questoes")
    return list_question_bank_items()


@router.post("/teacher/question-bank", response_model=QuestionBankItem)
def teacher_create_question_bank_item(payload: QuestionBankCreateRequest, user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem criar questoes")
    return create_question_bank_item(
        payload.lesson_id,
        payload.prompt,
        payload.exercise_type,
        payload.difficulty,
        payload.correct_answer,
        payload.explanation,
        [option.model_dump() for option in payload.options],
        payload.hints,
        payload.estimated_seconds,
        payload.skill,
    )


@router.patch("/teacher/question-bank/{exercise_id}", response_model=QuestionBankItem)
def teacher_update_question_bank_item(exercise_id: str, payload: QuestionBankUpdateRequest, user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem editar questoes")
    return update_question_bank_item(
        exercise_id,
        payload.lesson_id,
        payload.prompt,
        payload.exercise_type,
        payload.difficulty,
        payload.correct_answer,
        payload.explanation,
        [option.model_dump() for option in payload.options] if payload.options is not None else None,
        payload.hints,
        payload.estimated_seconds,
        payload.skill,
    )


@router.post("/teacher/students", response_model=StudentMiniProfile)
def teacher_create_student(payload: TeacherCreateStudentRequest, user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem criar alunos")
    target_teacher_id = user.id if user.role == "teacher" else "teacher-001"
    return create_student_for_teacher(
        target_teacher_id,
        payload.full_name,
        payload.email,
        payload.password,
        payload.grade_band,
        payload.bio,
        payload.class_id,
    )


@router.get("/teacher/signup-requests", response_model=list[StudentSignupRequestSummary])
def teacher_signup_requests(user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem ver solicitacoes")
    target_teacher_id = user.id if user.role == "teacher" else "teacher-001"
    return list_signup_requests_for_teacher(target_teacher_id)


@router.post("/teacher/signup-requests/{request_id}/approve", response_model=StudentMiniProfile)
def teacher_approve_signup_request(request_id: str, payload: ApproveSignupRequest, user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem aprovar solicitacoes")
    target_teacher_id = user.id if user.role == "teacher" else "teacher-001"
    return approve_signup_request(target_teacher_id, request_id, payload.password, payload.class_id)


@router.get("/teacher/access-logins", response_model=list[TeacherAccessStudent])
def teacher_access_logins(user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem ver os acessos dos alunos")
    target_teacher_id = user.id if user.role == "teacher" else "teacher-001"
    return get_teacher_access_students(target_teacher_id)


@router.get("/master/teachers", response_model=list[TeacherDirectoryItem])
def master_teachers(user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas master pode listar professores")
    return list_teachers()


@router.get("/master/teachers/{teacher_id}/students", response_model=list[TeacherAccessStudent])
def master_teacher_students(teacher_id: str, user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas master pode ver os alunos de um professor")
    return get_teacher_access_students(teacher_id)


@router.get("/teacher/classes/{class_id}/ranking")
def class_ranking(class_id: str, user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem ver ranking")
    return get_class_ranking(class_id)


@router.get("/teacher/classes/{class_id}/report", response_model=ClassReport)
def class_report(class_id: str, user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem ver relatorios")
    return get_class_report(class_id)


@router.get("/students/{student_id}/report", response_model=StudentReport)
def student_report(student_id: str, user=Depends(current_user)):
    if user.role not in {"teacher", "master"} and user.id != student_id:
        raise HTTPException(status_code=403, detail="Sem permissao para este relatorio")
    return get_student_report(student_id)


@router.get("/forum/topics", response_model=list[ForumTopicSummary])
def forum_topics(class_id: str | None = None, user=Depends(current_user)):
    return list_forum_topics(class_id)


@router.get("/forum/topics/{topic_id}", response_model=ForumTopicDetail)
def forum_topic_detail(topic_id: str, user=Depends(current_user)):
    return get_forum_topic(topic_id)


@router.post("/forum/topics", response_model=ForumTopicSummary)
def forum_topic_create(payload: ForumTopicCreate, user=Depends(current_user)):
    if user.id != payload.author_id and user.role != "master":
        raise HTTPException(status_code=403, detail="Voce so pode criar topicos em seu proprio nome")
    if payload.topic_type in {"challenge", "activity"} and user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem criar atividades avaliativas")
    return create_forum_topic(payload.class_id, payload.author_id, payload.title, payload.body, payload.tags, payload.topic_type, payload.due_at)


@router.post("/forum/topics/{topic_id}/posts", response_model=ForumTopicDetail)
def forum_post_create(topic_id: str, payload: ForumPostCreate, user=Depends(current_user)):
    if user.id != payload.author_id and user.role != "master":
        raise HTTPException(status_code=403, detail="Voce so pode responder em seu proprio nome")
    return create_forum_post(topic_id, payload.author_id, payload.body)


@router.delete("/forum/topics/{topic_id}", response_model=GenericMessage)
def forum_topic_delete(topic_id: str, user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores podem excluir topicos")
    return delete_forum_topic(topic_id, user.id, user.role)


@router.post("/exercise-attempt", response_model=TutorFeedback)
def post_exercise_attempt(payload: ExerciseAttemptRequest):
    return record_attempt(payload.student_id, payload.exercise_id, payload.class_id, payload.answer, payload.elapsed_seconds)
