from fractions import Fraction

from app.models import (
    AdaptivePlan,
    Badge,
    BattleChallenge,
    BootstrapResponse,
    DashboardResponse,
    EvolutionPoint,
    Exercise,
    ExerciseOption,
    LearningPath,
    LeaderboardEntry,
    Lesson,
    Mission,
    RewardItem,
    StatBlock,
    StudyTip,
    TeacherClassOverview,
    TeacherDashboardResponse,
    TeacherStudentPerformance,
    TutorFeedback,
    UserProfile,
    WeakPoint,
    WorldMap,
    WorldNode,
)


student_profile = UserProfile(
    id="student-001",
    role="student",
    full_name="Ana Carolina",
    avatar_url="https://api.dicebear.com/8.x/adventurer/svg?seed=Ana",
    email="ana@example.com",
    grade_band="8o ano",
    level=12,
    xp=1860,
    coins=940,
    streak=9,
    lives=4,
    progress_percent=68,
    stats=StatBlock(
        accuracy=82,
        mistakes=37,
        study_minutes=410,
        completed_lessons=27,
    ),
)

fractions_exercises = [
    Exercise(
        id="ex-001",
        lesson_id="lesson-001",
        prompt="Qual e a fracao equivalente a 3/4?",
        exercise_type="multiple_choice",
        difficulty=2,
        correct_answer="6/8",
        explanation="Multiplicando numerador e denominador por 2, 3/4 vira 6/8.",
        options=[
            ExerciseOption(id="a", label="6/8", value="6/8"),
            ExerciseOption(id="b", label="4/7", value="4/7"),
            ExerciseOption(id="c", label="9/16", value="9/16"),
            ExerciseOption(id="d", label="12/20", value="12/20"),
        ],
        hints=["Pense em multiplicar numerador e denominador pelo mesmo numero."],
        estimated_seconds=35,
        skill="fracoes equivalentes",
    ),
    Exercise(
        id="ex-002",
        lesson_id="lesson-001",
        prompt="Digite o resultado: 2/3 + 1/6",
        exercise_type="input",
        difficulty=3,
        correct_answer="5/6",
        explanation="MMC entre 3 e 6 e 6. Assim, 2/3 vira 4/6 e 4/6 + 1/6 = 5/6.",
        hints=["Transforme as fracoes para o mesmo denominador."],
        estimated_seconds=40,
        skill="soma de fracoes",
    ),
]

paths = [
    LearningPath(
        id="path-001",
        title="Mundo das Fracoes",
        category="Fracoes",
        difficulty="iniciante",
        grade_band="6o ao 8o ano",
        completion_rate=76,
        world_name="Ilhas das Partes",
        lessons=[
            Lesson(
                id="lesson-001",
                title="Fracoes equivalentes e soma",
                summary="Domine representacoes equivalentes e operacoes basicas.",
                estimated_minutes=8,
                xp_reward=40,
                locked=False,
                completed=False,
                exercises=fractions_exercises,
            ),
            Lesson(
                id="lesson-002",
                title="Comparacao e simplificacao",
                summary="Compare fracoes e simplifique respostas com confianca.",
                estimated_minutes=7,
                xp_reward=45,
                locked=False,
                completed=True,
                exercises=[],
            ),
        ],
    ),
    LearningPath(
        id="path-002",
        title="Liga da Algebra",
        category="Algebra",
        difficulty="intermediario",
        grade_band="8o ano ao 1o EM",
        completion_rate=48,
        world_name="Cidade das Equacoes",
        lessons=[
            Lesson(
                id="lesson-003",
                title="Equacoes do 1o grau",
                summary="Resolva incognitas com equilibrio e raciocinio.",
                estimated_minutes=10,
                xp_reward=55,
                locked=False,
                completed=False,
                exercises=[],
            )
        ],
    ),
    LearningPath(
        id="path-003",
        title="Laboratorio das Funcoes",
        category="Funcoes",
        difficulty="avancado",
        grade_band="1o ao 3o EM",
        completion_rate=22,
        world_name="Orbita dos Graficos",
        lessons=[
            Lesson(
                id="lesson-004",
                title="Leitura de graficos lineares",
                summary="Conecte taxa de variacao, dominio e interpretacao visual.",
                estimated_minutes=12,
                xp_reward=70,
                locked=True,
                completed=False,
                exercises=[],
            )
        ],
    ),
]

dashboard_data = DashboardResponse(
    profile=student_profile,
    badges=[
        Badge(
            id="badge-001",
            name="Fogo Constante",
            description="9 dias seguidos estudando",
            icon="flame",
            unlocked=True,
        ),
        Badge(
            id="badge-002",
            name="Exploradora de Mundos",
            description="Concluiu 3 trilhas completas",
            icon="map",
            unlocked=False,
        ),
        Badge(
            id="badge-003",
            name="Algebra Ninja",
            description="Acerte 15 questoes de equacao sem errar",
            icon="sparkles",
            unlocked=False,
        ),
    ],
    missions=[
        Mission(
            id="mission-001",
            title="Aquecimento Diario",
            description="Resolva 5 exercicios hoje",
            progress=3,
            goal=5,
            xp_reward=35,
            coin_reward=20,
            completed=False,
        ),
        Mission(
            id="mission-002",
            title="Velocidade Matematica",
            description="Complete um desafio cronometrado",
            progress=1,
            goal=1,
            xp_reward=50,
            coin_reward=35,
            completed=True,
        ),
    ],
    leaderboard=[
        LeaderboardEntry(position=1, user_name="Luan", xp=2410, streak=12, avatar_url="https://api.dicebear.com/8.x/adventurer/svg?seed=Luan"),
        LeaderboardEntry(position=2, user_name="Ana Carolina", xp=1860, streak=9, avatar_url=student_profile.avatar_url),
        LeaderboardEntry(position=3, user_name="Bianca", xp=1740, streak=7, avatar_url="https://api.dicebear.com/8.x/adventurer/svg?seed=Bianca"),
    ],
    rewards=[
        RewardItem(
            id="reward-001",
            name="Tema Aurora",
            category="theme",
            price=320,
            description="Gradientes energeticos para estudar com estilo.",
            rarity="raro",
            unlocked=True,
        ),
        RewardItem(
            id="reward-002",
            name="+1 Vida",
            category="powerup",
            price=120,
            description="Recupere uma vida antes do proximo desafio.",
            rarity="comum",
            unlocked=False,
        ),
        RewardItem(
            id="reward-003",
            name="Avatar Astro",
            category="avatar",
            price=500,
            description="Visual cosmico para seu perfil.",
            rarity="epico",
            unlocked=False,
        ),
    ],
    adaptive_plan=AdaptivePlan(
        current_difficulty=3,
        next_focus="fracoes com denominadores diferentes",
        weak_points=[
            WeakPoint(
                topic="MMC em fracoes",
                confidence=58,
                recommendation="Revise somas com denominadores diferentes antes de subir a dificuldade.",
            ),
            WeakPoint(
                topic="Interpretacao de problemas",
                confidence=61,
                recommendation="Pratique leitura guiada com o tutor inteligente.",
            ),
        ],
        suggested_revision=["Simplificacao de fracoes", "Multiplicacao de fracoes", "Problemas com pizza e porcentagem"],
        daily_goal="Ganhar 120 XP e manter o streak de hoje.",
    ),
    evolution=[
        EvolutionPoint(label="Seg", xp=120, accuracy=70),
        EvolutionPoint(label="Ter", xp=180, accuracy=76),
        EvolutionPoint(label="Qua", xp=220, accuracy=79),
        EvolutionPoint(label="Qui", xp=260, accuracy=81),
        EvolutionPoint(label="Sex", xp=320, accuracy=84),
    ],
    study_tips=[
        StudyTip(
            title="Tutor inteligente",
            content="Quando errar, leia a explicacao por etapas e compare com sua estrategia.",
        ),
        StudyTip(
            title="Meta personalizada",
            content="Seu melhor horario de estudo tem sido entre 18h e 20h. Vale repetir esse padrao.",
        ),
    ],
)

teacher_dashboard = TeacherDashboardResponse(
    classes=[
        TeacherClassOverview(
            id="class-001",
            name="8o Ano A",
            grade_band="8o ano",
            students=32,
            average_accuracy=78,
            pending_challenges=2,
        ),
        TeacherClassOverview(
            id="class-002",
            name="1o EM B",
            grade_band="1o ensino medio",
            students=28,
            average_accuracy=71,
            pending_challenges=4,
        ),
    ],
    top_students=[
        TeacherStudentPerformance(
            student_name="Ana Carolina",
            progress_percent=68,
            accuracy=82,
            weekly_minutes=118,
            strongest_topic="Fracoes",
            weak_topic="Equacoes",
        ),
        TeacherStudentPerformance(
            student_name="Pedro",
            progress_percent=73,
            accuracy=85,
            weekly_minutes=104,
            strongest_topic="Geometria",
            weak_topic="Estatistica",
        ),
    ],
    attention_needed=[
        TeacherStudentPerformance(
            student_name="Marcos",
            progress_percent=39,
            accuracy=56,
            weekly_minutes=42,
            strongest_topic="Aritmetica",
            weak_topic="Fracoes",
        ),
        TeacherStudentPerformance(
            student_name="Julia",
            progress_percent=44,
            accuracy=60,
            weekly_minutes=37,
            strongest_topic="Geometria",
            weak_topic="Funcoes",
        ),
    ],
)

battles = [
    BattleChallenge(
        id="battle-001",
        title="Duelo Relampago das Fracoes",
        opponent_name="Bianca",
        topic="Fracoes",
        difficulty=3,
        reward_xp=80,
        duration_seconds=90,
    ),
    BattleChallenge(
        id="battle-002",
        title="Arena da Algebra",
        opponent_name="Luan",
        topic="Equacoes",
        difficulty=4,
        reward_xp=120,
        duration_seconds=120,
    ),
]

world_map = WorldMap(
    world_name="Ilhas das Partes",
    theme="oceano matematico",
    nodes=[
        WorldNode(id="node-001", title="Porto das Fracoes", category="Fracoes", status="completed", stars=3),
        WorldNode(id="node-002", title="Ponte do MMC", category="Fracoes", status="current", stars=2),
        WorldNode(id="node-003", title="Vulcao da Algebra", category="Algebra", status="locked", stars=0),
        WorldNode(id="node-004", title="Templo da Geometria", category="Geometria", status="locked", stars=0),
    ],
)

bootstrap_data = BootstrapResponse(
    dashboard=dashboard_data,
    learning_paths=paths,
    teacher_dashboard=teacher_dashboard,
    world_map=world_map,
    battles=battles,
)


def answers_match(answer: str, correct_answer: str) -> bool:
    normalized_answer = answer.strip().lower()
    normalized_correct = correct_answer.strip().lower()
    if normalized_answer == normalized_correct:
        return True

    if "/" in normalized_answer and "/" in normalized_correct:
        try:
            return Fraction(normalized_answer) == Fraction(normalized_correct)
        except (ValueError, ZeroDivisionError):
            return False

    return False


def evaluate_attempt(answer: str, correct_answer: str) -> TutorFeedback:
    if answers_match(answer, correct_answer):
        return TutorFeedback(
            status="correct",
            xp_delta=18,
            coins_delta=12,
            lives_delta=0,
            message="Boa! Voce acertou e ganhou impulso no streak.",
            tutor_explanation="Voce identificou corretamente a estrategia e executou o calculo com precisao.",
            recommended_review=["Avance para um exercicio com dificuldade maior."],
        )

    return TutorFeedback(
        status="incorrect",
        xp_delta=4,
        coins_delta=0,
        lives_delta=-1,
        message="Quase la. Vamos transformar esse erro em aprendizado.",
        tutor_explanation="Compare os denominadores primeiro. Quando eles sao diferentes, use o MMC antes de somar ou comparar as fracoes.",
        recommended_review=["Revise o conceito de MMC", "Pratique soma de fracoes equivalentes"],
    )
