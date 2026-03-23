from fastapi import APIRouter, Depends, Header, HTTPException

from app.data import battles, dashboard_data, paths, teacher_dashboard, world_map
from app.models import (
    DailyMissionResponse,
    ClassUpdateRequest,
    ClassReport,
    ClassSummary,
    CosmeticItem,
    EquipCosmeticRequest,
    ExerciseAttemptRequest,
    ForumPostCreate,
    ForumTopicClassUpdateRequest,
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
    ResetPasswordResponse,
    QuestionBankUpdateRequest,
    RegisterRequest,
    SchoolCreateRequest,
    SchoolUpdateRequest,
    SchoolSummary,
    ApproveSignupRequest,
    StudentMiniProfile,
    StudentCoinsUpdateRequest,
    StudentClassUpdateRequest,
    StudentLearningTrailsResponse,
    StudentSignupRequestCreate,
    StudentSignupRequestSummary,
    StudentReport,
    TeacherAccessCodeResponse,
    TeacherAccessCodeUpdateRequest,
    TeacherPasswordChangeRequest,
    TeacherPasswordResetApprovalResponse,
    TeacherPasswordResetRequestCreate,
    TeacherPasswordResetRequestSummary,
    TeacherClassAssignmentRequest,
    TeacherCreateClassRequest,
    TeacherCreateStudentRequest,
    TeacherAccessStudent,
    TeacherDirectoryItem,
    TeacherTrail,
    TeacherTrailCreateRequest,
    TutorFeedback,
    UserProfileUpdateRequest,
)
from app.services import (
    assign_class_to_teacher,
    approve_signup_request,
    authenticate_user,
    build_bootstrap,
    create_class_for_teacher,
    create_school,
    create_forum_post,
    create_forum_topic,
    create_question_bank_item,
    create_teacher_trail,
    create_student_signup_request,
    create_student_for_teacher,
    equip_cosmetic_item,
    delete_forum_topic,
    complete_student_trail_activity,
    get_authenticated_user,
    get_class_ranking,
    get_class_report,
    get_forum_topic,
    get_profile_view,
    get_student_report,
    get_teacher_access_students,
    get_teacher_access_code,
    get_students_for_teacher,
    list_forum_topics,
    list_public_classes,
    list_profile_inventory,
    list_question_bank_items,
    list_question_bank_lessons,
    list_rewards_overview,
    list_schools,
    list_shop_items,
    list_signup_requests_for_teacher,
    list_student_learning_trails,
    list_teachers,
    list_teacher_classes,
    list_teacher_trails,
    build_daily_mission,
    record_attempt,
    register_user,
    request_teacher_password_reset,
    reset_student_password_for_teacher,
    approve_teacher_password_reset,
    purchase_shop_item,
    reassign_student_class_for_manager,
    change_teacher_password,
    update_profile,
    update_classroom,
    update_forum_topic_class,
    update_question_bank_item,
    update_school,
    update_student_coins_for_manager,
    list_teacher_password_reset_requests,
    update_teacher_access_code,
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
    return authenticate_user(payload.identifier or payload.email or "", payload.password)


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


@router.post("/auth/teacher-password-reset-request", response_model=GenericMessage)
def teacher_password_reset_request(payload: TeacherPasswordResetRequestCreate):
    return request_teacher_password_reset(payload.email)


@router.get("/auth/me")
def me(user=Depends(current_user)):
    return user


@router.patch("/profiles/{user_id}")
def patch_profile(user_id: str, payload: UserProfileUpdateRequest, user=Depends(current_user)):
    if user.role not in {"master", "teacher"} and user.id != user_id:
        raise HTTPException(status_code=403, detail="Sem permissao para editar este perfil")
    return update_profile(user_id, payload.full_name, payload.avatar_url, payload.bio)


@router.post("/profiles/{user_id}/change-password", response_model=GenericMessage)
def post_profile_change_password(user_id: str, payload: TeacherPasswordChangeRequest, user=Depends(current_user)):
    if user.id != user_id or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Apenas o proprio professor pode alterar a senha.")
    return change_teacher_password(user_id, payload.current_password, payload.new_password)


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


@router.get("/student/learning-trails", response_model=StudentLearningTrailsResponse)
def get_student_learning_trails(user=Depends(current_user)):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="As trilhas de aprendizado sao exclusivas para alunos")
    return list_student_learning_trails(user.id)


@router.post("/student/trail-activities/{activity_id}/complete", response_model=GenericMessage)
def post_student_trail_activity_complete(activity_id: str, user=Depends(current_user)):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Apenas alunos podem concluir atividades de trilha")
    return complete_student_trail_activity(user.id, activity_id)


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
    target_teacher_id = user.id if user.role == "teacher" else None
    return list_teacher_classes(target_teacher_id)


@router.get("/teacher/trails", response_model=list[TeacherTrail])
def teacher_trails(user=Depends(current_user)):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="Apenas professores podem ver trilhas proprias")
    return list_teacher_trails(user.id)


@router.post("/teacher/trails", response_model=TeacherTrail)
def teacher_create_trail(payload: TeacherTrailCreateRequest, user=Depends(current_user)):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="Apenas professores podem criar trilhas")
    return create_teacher_trail(
        user.id,
        payload.title,
        payload.description,
        payload.class_ids,
        [activity.model_dump() for activity in payload.activities],
    )


@router.post("/teacher/classes", response_model=ClassSummary)
def teacher_create_class(payload: TeacherCreateClassRequest, user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas o usuario master pode criar turmas")
    return create_class_for_teacher(payload.teacher_id, payload.name, payload.grade_band, payload.school_id)


@router.patch("/master/classes/{class_id}", response_model=ClassSummary)
def master_update_class(class_id: str, payload: ClassUpdateRequest, user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas master pode editar turmas")
    return update_classroom(class_id, payload.name, payload.grade_band, payload.school_id)


@router.post("/master/classes/{class_id}/assign-teacher", response_model=ClassSummary)
def master_assign_teacher_for_class(class_id: str, payload: TeacherClassAssignmentRequest, user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas master pode reatribuir turmas")
    return assign_class_to_teacher(class_id, payload.teacher_id)


@router.get("/teacher/students", response_model=list[StudentMiniProfile])
def teacher_students(user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem ver alunos")
    target_teacher_id = user.id if user.role == "teacher" else None
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
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas o usuario master pode cadastrar alunos")
    return create_student_for_teacher(
        user.id,
        payload.full_name,
        payload.email,
        payload.username,
        payload.pin,
        payload.grade_band,
        payload.bio,
        payload.class_id,
    )


@router.post("/teacher/students/{student_id}/reset-password", response_model=ResetPasswordResponse)
def teacher_reset_student_password(student_id: str, user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem redefinir senhas")
    target_teacher_id = user.id if user.role == "teacher" else None
    return reset_student_password_for_teacher(target_teacher_id, student_id)


@router.patch("/teacher/students/{student_id}/coins", response_model=StudentMiniProfile)
def teacher_update_student_coins(student_id: str, payload: StudentCoinsUpdateRequest, user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem ajustar moedas")
    return update_student_coins_for_manager(user.role, user.id, student_id, payload.coins)


@router.patch("/teacher/students/{student_id}/class", response_model=StudentMiniProfile)
def teacher_reassign_student_class(student_id: str, payload: StudentClassUpdateRequest, user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem mover alunos de turma")
    return reassign_student_class_for_manager(user.role, user.id, student_id, payload.class_id)


@router.get("/teacher/signup-requests", response_model=list[StudentSignupRequestSummary])
def teacher_signup_requests(user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas o usuario master pode ver solicitacoes")
    return list_signup_requests_for_teacher(None)


@router.post("/teacher/signup-requests/{request_id}/approve", response_model=StudentMiniProfile)
def teacher_approve_signup_request(request_id: str, payload: ApproveSignupRequest, user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas o usuario master pode aprovar solicitacoes")
    return approve_signup_request(None, request_id, payload.username, payload.pin, payload.class_id)


@router.get("/teacher/access-logins", response_model=list[TeacherAccessStudent])
def teacher_access_logins(user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem ver os acessos dos alunos")
    target_teacher_id = user.id if user.role == "teacher" else None
    return get_teacher_access_students(target_teacher_id)


@router.get("/master/teachers", response_model=list[TeacherDirectoryItem])
def master_teachers(user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas master pode listar professores")
    return list_teachers()


@router.get("/master/schools", response_model=list[SchoolSummary])
def master_schools(user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas master pode listar escolas")
    return list_schools()


@router.post("/master/schools", response_model=SchoolSummary)
def master_create_school(payload: SchoolCreateRequest, user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas master pode criar escolas")
    return create_school(payload.name, payload.address, payload.director_name)


@router.patch("/master/schools/{school_id}", response_model=SchoolSummary)
def master_update_school(school_id: str, payload: SchoolUpdateRequest, user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas master pode editar escolas")
    return update_school(school_id, payload.name, payload.address, payload.director_name)


@router.get("/master/settings/teacher-access-code", response_model=TeacherAccessCodeResponse)
def master_teacher_access_code(user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas master pode ver o codigo de acesso de professores")
    return TeacherAccessCodeResponse(access_code=get_teacher_access_code().message)


@router.patch("/master/settings/teacher-access-code", response_model=TeacherAccessCodeResponse)
def master_update_teacher_access_code(payload: TeacherAccessCodeUpdateRequest, user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas master pode alterar o codigo de acesso de professores")
    return TeacherAccessCodeResponse(access_code=update_teacher_access_code(payload.access_code).message)


@router.get("/master/teachers/{teacher_id}/students", response_model=list[TeacherAccessStudent])
def master_teacher_students(teacher_id: str, user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas master pode ver os alunos de um professor")
    return get_teacher_access_students(teacher_id)


@router.get("/master/teacher-password-resets", response_model=list[TeacherPasswordResetRequestSummary])
def master_teacher_password_resets(user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas master pode ver resets de senha de professores")
    return list_teacher_password_reset_requests()


@router.post("/master/teacher-password-resets/{request_id}/approve", response_model=TeacherPasswordResetApprovalResponse)
def master_approve_teacher_password_reset(request_id: str, user=Depends(current_user)):
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Apenas master pode aprovar resets de senha de professores")
    return approve_teacher_password_reset(user.id, request_id)


@router.get("/teacher/classes/{class_id}/ranking")
def class_ranking(class_id: str, user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem ver ranking")
    return get_class_ranking(class_id)


@router.get("/teacher/classes/{class_id}/report", response_model=ClassReport)
def class_report(class_id: str, user=Depends(current_user)):
    if user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem ver relatorios")
    if user.role == "teacher":
        owned_class = next((item for item in list_teacher_classes(user.id) if item.id == class_id), None)
        if owned_class is None:
            raise HTTPException(status_code=403, detail="Voce so pode ver relatorios das suas turmas")
    return get_class_report(class_id)


@router.get("/students/{student_id}/report", response_model=StudentReport)
def student_report(student_id: str, user=Depends(current_user)):
    if user.role not in {"teacher", "master"} and user.id != student_id:
        raise HTTPException(status_code=403, detail="Sem permissao para este relatorio")
    return get_student_report(student_id)


@router.get("/forum/topics", response_model=list[ForumTopicSummary])
def forum_topics(class_ids: list[str] | None = None, user=Depends(current_user)):
    return list_forum_topics(user.id, user.role, class_ids)


@router.get("/forum/topics/{topic_id}", response_model=ForumTopicDetail)
def forum_topic_detail(topic_id: str, user=Depends(current_user)):
    return get_forum_topic(user.id, user.role, topic_id)


@router.post("/forum/topics", response_model=ForumTopicSummary)
def forum_topic_create(payload: ForumTopicCreate, user=Depends(current_user)):
    if user.id != payload.author_id and user.role != "master":
        raise HTTPException(status_code=403, detail="Voce so pode criar topicos em seu proprio nome")
    if payload.topic_type in {"challenge", "activity"} and user.role not in {"teacher", "master"}:
        raise HTTPException(status_code=403, detail="Apenas professores e master podem criar atividades avaliativas")
    return create_forum_topic(user.role, payload.class_id, payload.author_id, payload.title, payload.body, payload.tags, payload.topic_type, payload.due_at)


@router.patch("/forum/topics/{topic_id}/class", response_model=ForumTopicSummary)
def forum_topic_update_class(topic_id: str, payload: ForumTopicClassUpdateRequest, user=Depends(current_user)):
    return update_forum_topic_class(topic_id, user.id, user.role, payload.class_id)


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
