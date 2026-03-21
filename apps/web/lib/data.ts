export type TutorFeedback = {
  status: "correct" | "incorrect";
  xp_delta: number;
  coins_delta: number;
  lives_delta: number;
  message: string;
  tutor_explanation: string;
  recommended_review: string[];
};

export type DashboardData = {
  profile: {
    id: string;
    role: "student" | "teacher";
    full_name: string;
    avatar_url: string;
    email: string;
    grade_band: string;
    level: number;
    xp: number;
    coins: number;
    streak: number;
    lives: number;
    progress_percent: number;
    stats: {
      accuracy: number;
      mistakes: number;
      study_minutes: number;
      completed_lessons: number;
    };
  };
  badges: {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
  }[];
  missions: {
    id: string;
    title: string;
    description: string;
    progress: number;
    goal: number;
    xp_reward: number;
    coin_reward: number;
    completed: boolean;
  }[];
  leaderboard: {
    position: number;
    user_name: string;
    xp: number;
    streak: number;
    avatar_url: string;
  }[];
  rewards: {
    id: string;
    name: string;
    category: "avatar" | "theme" | "powerup";
    price: number;
    description: string;
    rarity: "comum" | "raro" | "epico";
    unlocked: boolean;
  }[];
  adaptive_plan: {
    current_difficulty: number;
    next_focus: string;
    weak_points: {
      topic: string;
      confidence: number;
      recommendation: string;
    }[];
    suggested_revision: string[];
    daily_goal: string;
  };
  evolution: {
    label: string;
    xp: number;
    accuracy: number;
  }[];
  study_tips: {
    title: string;
    content: string;
  }[];
};

export type Exercise = {
  id: string;
  lesson_id: string;
  prompt: string;
  exercise_type: "multiple_choice" | "input" | "drag_drop" | "step_by_step" | "timed";
  difficulty: number;
  correct_answer: string;
  explanation: string;
  options: {
    id: string;
    label: string;
    value: string;
  }[];
  hints: string[];
  estimated_seconds: number;
  skill: string;
};

export type DailyMissionExercise = {
  id: string;
  lesson_id: string;
  prompt: string;
  exercise_type: "multiple_choice" | "input" | "drag_drop" | "step_by_step" | "timed";
  difficulty: number;
  explanation: string;
  options: {
    id: string;
    label: string;
    value: string;
  }[];
  hints: string[];
  estimated_seconds: number;
  skill: string;
  topic: string;
  lesson_title: string;
  path_title: string;
};

export type DailyMission = {
  mission_date: string;
  title: string;
  theme: string;
  focus_reason: string;
  daily_goal: string;
  recommendation: string;
  total_exercises: number;
  completed_exercises: number;
  estimated_minutes: number;
  xp_reward: number;
  streak_target: string;
  exercises: DailyMissionExercise[];
};

export type Lesson = {
  id: string;
  title: string;
  summary: string;
  estimated_minutes: number;
  xp_reward: number;
  locked: boolean;
  completed: boolean;
  exercises: Exercise[];
};

export type LearningPath = {
  id: string;
  title: string;
  category: string;
  difficulty: "iniciante" | "intermediario" | "avancado";
  grade_band: string;
  completion_rate: number;
  world_name: string;
  lessons: Lesson[];
};

export type TeacherDashboard = {
  classes: {
    id: string;
    name: string;
    grade_band: string;
    students: number;
    average_accuracy: number;
    pending_challenges: number;
  }[];
  top_students: {
    student_name: string;
    progress_percent: number;
    accuracy: number;
    weekly_minutes: number;
    strongest_topic: string;
    weak_topic: string;
  }[];
  attention_needed: {
    student_name: string;
    progress_percent: number;
    accuracy: number;
    weekly_minutes: number;
    strongest_topic: string;
    weak_topic: string;
  }[];
};

export type WorldMap = {
  world_name: string;
  theme: string;
  nodes: {
    id: string;
    title: string;
    category: string;
    status: "completed" | "current" | "locked";
    stars: number;
  }[];
};

export type Battle = {
  id: string;
  title: string;
  opponent_name: string;
  topic: string;
  difficulty: number;
  reward_xp: number;
  duration_seconds: number;
};

export type TeacherClassSummary = {
  id: string;
  name: string;
  grade_band: string;
  invite_code: string;
  students_count: number;
  average_accuracy: number;
  total_xp: number;
};

export type StudentMiniProfile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  grade_band: string;
  level: number;
  xp: number;
  streak: number;
  accuracy: number;
  study_minutes: number;
  strong_areas: string[];
  weak_areas: string[];
};

export type StudentReport = {
  student: StudentMiniProfile;
  performance_summary: string;
  strengths: {
    topic: string;
    confidence: number;
    recommendation: string;
  }[];
  weaknesses: {
    topic: string;
    confidence: number;
    recommendation: string;
  }[];
  recent_activity: string[];
};

export type ClassReport = {
  class_info: TeacherClassSummary;
  ranking: {
    position: number;
    student_id: string;
    student_name: string;
    xp: number;
    accuracy: number;
    streak: number;
  }[];
  top_strengths: string[];
  top_weaknesses: string[];
  students_needing_attention: StudentMiniProfile[];
};

export type ForumTopic = {
  id: string;
  class_id: string | null;
  author_name: string;
  title: string;
  body: string;
  tags: string[];
  is_pinned: boolean;
  topic_type: "discussion" | "challenge" | "activity";
  due_at?: string | null;
  replies: number;
  created_at: string;
};

export type ForumPost = {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
};

export type ForumTopicDetail = {
  topic: ForumTopic;
  posts: ForumPost[];
};

export type TeacherDirectoryItem = {
  id: string;
  full_name: string;
  email: string;
  grade_band: string | null;
  students_count: number;
};

export type QuestionBankLessonOption = {
  lesson_id: string;
  lesson_title: string;
  theme: string;
  grade_band: string;
  path_title: string;
  default_skill: string;
};

export type QuestionBankItem = {
  id: string;
  lesson_id: string;
  lesson_title: string;
  theme: string;
  grade_band: string;
  path_title: string;
  prompt: string;
  exercise_type: "multiple_choice" | "input" | "drag_drop" | "step_by_step" | "timed";
  difficulty: number;
  correct_answer: string;
  explanation: string;
  options: {
    id: string;
    label: string;
    value: string;
  }[];
  hints: string[];
  estimated_seconds: number;
  skill: string;
};

export type AuthUser = {
  id: string;
  role: "master" | "teacher" | "student";
  full_name: string;
  email: string;
  avatar_url?: string | null;
  grade_band?: string | null;
  bio?: string | null;
  level: number;
  xp: number;
  coins: number;
  streak: number;
  lives: number;
};

export type CosmeticItem = {
  id: string;
  name: string;
  category: "avatar" | "theme" | "powerup";
  rarity: "comum" | "raro" | "epico";
  asset_url: string;
  description: string;
  unlock_hint: string;
  price: number;
  is_purchasable: boolean;
  unlocked: boolean;
  equipped: boolean;
};

export type ProfileInventory = {
  equipped_avatar_id: string | null;
  items: CosmeticItem[];
};

export type AchievementItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at?: string | null;
};

export type RewardUnlockItem = {
  id: string;
  kind: "achievement" | "cosmetic";
  title: string;
  description: string;
  rarity: string;
  unlocked_at: string;
};

export type RewardsOverview = {
  achievements: AchievementItem[];
  cosmetics: CosmeticItem[];
  recent_unlocks: RewardUnlockItem[];
};

export type ShopItem = {
  id: string;
  name: string;
  category: "avatar" | "theme" | "powerup";
  rarity: "comum" | "raro" | "epico";
  asset_url: string;
  description: string;
  unlock_hint: string;
  price: number;
  is_purchasable: boolean;
  owned: boolean;
  can_purchase: boolean;
};

export type ShopData = {
  coins_balance: number;
  role: "master" | "teacher" | "student";
  items: ShopItem[];
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
  role: "student" | "teacher";
  grade_band?: string;
  bio?: string;
  access_code?: string;
};

export type PublicClassOption = {
  id: string;
  name: string;
  grade_band: string;
  teacher_name: string;
};

export type SignupRequestSummary = {
  id: string;
  class_id: string;
  requested_teacher_id: string;
  full_name: string;
  email: string;
  grade_band: string;
  note?: string | null;
  status: "pending" | "approved" | "rejected";
  approved_student_id?: string | null;
  created_at: string;
  reviewed_at?: string | null;
};

export type BootstrapData = {
  dashboard: DashboardData;
  learning_paths: LearningPath[];
  teacher_dashboard: TeacherDashboard;
  world_map: WorldMap;
  battles: Battle[];
};

export const fallbackBootstrapData: BootstrapData = {
  dashboard: {
    profile: {
      id: "student-001",
      role: "student",
      full_name: "Ana Carolina",
      avatar_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=Ana",
      email: "ana@example.com",
      grade_band: "8o ano",
      level: 12,
      xp: 1860,
      coins: 940,
      streak: 9,
      lives: 4,
      progress_percent: 68,
      stats: {
        accuracy: 82,
        mistakes: 37,
        study_minutes: 410,
        completed_lessons: 27,
      },
    },
    badges: [
      { id: "badge-001", name: "Fogo Constante", description: "9 dias seguidos estudando", icon: "flame", unlocked: true },
      { id: "badge-002", name: "Exploradora de Mundos", description: "Concluiu 3 trilhas", icon: "map", unlocked: false },
      { id: "badge-003", name: "Algebra Ninja", description: "15 acertos seguidos em equacoes", icon: "sparkles", unlocked: false },
    ],
    missions: [
      { id: "mission-001", title: "Aquecimento Diario", description: "Resolva 5 exercicios hoje", progress: 3, goal: 5, xp_reward: 35, coin_reward: 20, completed: false },
      { id: "mission-002", title: "Velocidade Matematica", description: "Complete um desafio cronometrado", progress: 1, goal: 1, xp_reward: 50, coin_reward: 35, completed: true },
    ],
    leaderboard: [
      { position: 1, user_name: "Luan", xp: 2410, streak: 12, avatar_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=Luan" },
      { position: 2, user_name: "Ana Carolina", xp: 1860, streak: 9, avatar_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=Ana" },
      { position: 3, user_name: "Bianca", xp: 1740, streak: 7, avatar_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=Bianca" },
    ],
    rewards: [
      { id: "reward-001", name: "Tema Aurora", category: "theme", price: 320, description: "Gradientes energeticos para estudar com estilo.", rarity: "raro", unlocked: true },
      { id: "reward-002", name: "+1 Vida", category: "powerup", price: 120, description: "Recupere uma vida antes do proximo desafio.", rarity: "comum", unlocked: false },
      { id: "reward-003", name: "Avatar Astro", category: "avatar", price: 500, description: "Visual cosmico para seu perfil.", rarity: "epico", unlocked: false },
    ],
    adaptive_plan: {
      current_difficulty: 3,
      next_focus: "fracoes com denominadores diferentes",
      weak_points: [
        { topic: "MMC em fracoes", confidence: 58, recommendation: "Revise somas com denominadores diferentes antes de subir a dificuldade." },
        { topic: "Interpretacao de problemas", confidence: 61, recommendation: "Pratique leitura guiada com o tutor inteligente." },
      ],
      suggested_revision: ["Simplificacao de fracoes", "Multiplicacao de fracoes", "Problemas com pizza e porcentagem"],
      daily_goal: "Ganhar 120 XP e manter o streak de hoje.",
    },
    evolution: [
      { label: "Seg", xp: 120, accuracy: 70 },
      { label: "Ter", xp: 180, accuracy: 76 },
      { label: "Qua", xp: 220, accuracy: 79 },
      { label: "Qui", xp: 260, accuracy: 81 },
      { label: "Sex", xp: 320, accuracy: 84 },
    ],
    study_tips: [
      { title: "Tutor inteligente", content: "Quando errar, leia a explicacao por etapas e compare com sua estrategia." },
      { title: "Meta personalizada", content: "Seu melhor horario de estudo tem sido entre 18h e 20h." },
    ],
  },
  learning_paths: [
    {
      id: "path-001",
      title: "Mundo das Fracoes",
      category: "Fracoes",
      difficulty: "iniciante",
      grade_band: "6o ao 8o ano",
      completion_rate: 76,
      world_name: "Ilhas das Partes",
      lessons: [
        {
          id: "lesson-001",
          title: "Fracoes equivalentes e soma",
          summary: "Domine representacoes equivalentes e operacoes basicas.",
          estimated_minutes: 8,
          xp_reward: 40,
          locked: false,
          completed: false,
          exercises: [
            {
              id: "ex-001",
              lesson_id: "lesson-001",
              prompt: "Qual e a fracao equivalente a 3/4?",
              exercise_type: "multiple_choice",
              difficulty: 2,
              correct_answer: "6/8",
              explanation: "Multiplicando numerador e denominador por 2, 3/4 vira 6/8.",
              options: [
                { id: "a", label: "6/8", value: "6/8" },
                { id: "b", label: "4/7", value: "4/7" },
                { id: "c", label: "9/16", value: "9/16" },
                { id: "d", label: "12/20", value: "12/20" },
              ],
              hints: ["Pense em multiplicar numerador e denominador pelo mesmo numero."],
              estimated_seconds: 35,
              skill: "fracoes equivalentes",
            },
            {
              id: "ex-002",
              lesson_id: "lesson-001",
              prompt: "Digite o resultado: 2/3 + 1/6",
              exercise_type: "input",
              difficulty: 3,
              correct_answer: "5/6",
              explanation: "MMC entre 3 e 6 e 6. Assim, 2/3 vira 4/6 e 4/6 + 1/6 = 5/6.",
              options: [],
              hints: ["Transforme as fracoes para o mesmo denominador."],
              estimated_seconds: 40,
              skill: "soma de fracoes",
            },
          ],
        },
      ],
    },
  ],
  teacher_dashboard: {
    classes: [
      { id: "class-001", name: "8o Ano A", grade_band: "8o ano", students: 32, average_accuracy: 78, pending_challenges: 2 },
      { id: "class-002", name: "1o EM B", grade_band: "1o ensino medio", students: 28, average_accuracy: 71, pending_challenges: 4 },
    ],
    top_students: [
      { student_name: "Ana Carolina", progress_percent: 68, accuracy: 82, weekly_minutes: 118, strongest_topic: "Fracoes", weak_topic: "Equacoes" },
      { student_name: "Pedro", progress_percent: 73, accuracy: 85, weekly_minutes: 104, strongest_topic: "Geometria", weak_topic: "Estatistica" },
    ],
    attention_needed: [
      { student_name: "Marcos", progress_percent: 39, accuracy: 56, weekly_minutes: 42, strongest_topic: "Aritmetica", weak_topic: "Fracoes" },
      { student_name: "Julia", progress_percent: 44, accuracy: 60, weekly_minutes: 37, strongest_topic: "Geometria", weak_topic: "Funcoes" },
    ],
  },
  world_map: {
    world_name: "Ilhas das Partes",
    theme: "oceano matematico",
    nodes: [
      { id: "node-001", title: "Porto das Fracoes", category: "Fracoes", status: "completed", stars: 3 },
      { id: "node-002", title: "Ponte do MMC", category: "Fracoes", status: "current", stars: 2 },
      { id: "node-003", title: "Vulcao da Algebra", category: "Algebra", status: "locked", stars: 0 },
      { id: "node-004", title: "Templo da Geometria", category: "Geometria", status: "locked", stars: 0 },
    ],
  },
  battles: [
    { id: "battle-001", title: "Duelo Relampago das Fracoes", opponent_name: "Bianca", topic: "Fracoes", difficulty: 3, reward_xp: 80, duration_seconds: 90 },
    { id: "battle-002", title: "Arena da Algebra", opponent_name: "Luan", topic: "Equacoes", difficulty: 4, reward_xp: 120, duration_seconds: 120 },
  ],
};

export const fallbackForumTopics: ForumTopic[] = [
  {
    id: "topic-001",
    class_id: "class-001",
    author_name: "Ana Carolina",
    title: "Duvida em fracoes equivalentes",
    body: "Nao entendi por que 3/4 e igual a 6/8.",
    tags: ["fracoes", "duvida"],
    topic_type: "discussion",
    due_at: null,
    is_pinned: true,
    replies: 2,
    created_at: "2026-03-21T09:00:00",
  },
  {
    id: "topic-002",
    class_id: "class-001",
    author_name: "Prof. Carla Menezes",
    title: "Desafio relampago da semana",
    body: "Resolva os tres itens sobre fracoes equivalentes e explique sua estrategia.",
    tags: ["desafio", "fracoes"],
    topic_type: "challenge",
    due_at: "2026-03-25T18:00",
    is_pinned: false,
    replies: 1,
    created_at: "2026-03-21T10:30:00",
  },
  {
    id: "topic-003",
    class_id: "class-001",
    author_name: "Prof. Carla Menezes",
    title: "Atividade aplicada de porcentagem",
    body: "Resolva os 4 itens objetivos sobre porcentagem e responda neste topico com suas respostas numeradas.",
    tags: ["atividade", "porcentagem"],
    topic_type: "activity",
    due_at: "2026-03-24T23:59:00",
    is_pinned: true,
    replies: 0,
    created_at: "2026-03-21T11:15:00",
  },
];

export const fallbackForumTopicDetail: ForumTopicDetail = {
  topic: fallbackForumTopics[2],
  posts: [
    {
      id: "post-001",
      author_name: "Prof. Carla Menezes",
      body: "Entreguem as respostas em formato 1), 2), 3), 4) antes do prazo final.",
      created_at: "2026-03-21T09:10:00",
    },
  ],
};

export const fallbackTeacherClasses: TeacherClassSummary[] = [
  {
    id: "class-001",
    name: "8o Ano A",
    grade_band: "8o ano",
    invite_code: "8A2026",
    students_count: 3,
    average_accuracy: 72,
    total_xp: 4500,
  },
];

export const fallbackStudentReport: StudentReport = {
  student: {
    id: "student-001",
    full_name: "Ana Carolina",
    email: "ana@matematica.local",
    avatar_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=Ana",
    grade_band: "8o ano",
    level: 12,
    xp: 1860,
    streak: 9,
    accuracy: 50,
    study_minutes: 118,
    strong_areas: ["MMC em fracoes"],
    weak_areas: ["Equacoes"],
  },
  performance_summary: "Ana Carolina tem 50% de acerto e precisa reforcar equacoes sem perder o bom ritmo em fracoes.",
  strengths: [
    { topic: "MMC em fracoes", confidence: 82, recommendation: "Pode avancar para problemas contextualizados." },
  ],
  weaknesses: [
    { topic: "Equacoes", confidence: 40, recommendation: "Reforcar isolamento da incognita." },
  ],
  recent_activity: [
    "Acerto em 'Qual e a fracao equivalente a 3/4?' com resposta '6/8'.",
    "Erro em 'Digite o resultado: 2/3 + 1/6' com resposta '4/6'.",
  ],
};

export const fallbackClassReport: ClassReport = {
  class_info: fallbackTeacherClasses[0],
  ranking: [
    { position: 1, student_id: "student-001", student_name: "Ana Carolina", xp: 1860, accuracy: 50, streak: 9 },
    { position: 2, student_id: "student-002", student_name: "Pedro Henrique", xp: 1650, accuracy: 100, streak: 6 },
    { position: 3, student_id: "student-003", student_name: "Marcos Vinicius", xp: 990, accuracy: 100, streak: 3 },
  ],
  top_strengths: ["Fracoes", "MMC em fracoes", "Geometria"],
  top_weaknesses: ["Equacoes", "Interpretacao de problemas", "Funcoes"],
  students_needing_attention: [
    fallbackStudentReport.student,
  ],
};

export const fallbackTeachers: TeacherDirectoryItem[] = [
  { id: "teacher-001", full_name: "Prof. Carla Menezes", email: "carla@matematica.local", grade_band: "8o ano", students_count: 3 },
  { id: "teacher-002", full_name: "Prof. Ricardo Alves", email: "ricardo@matematica.local", grade_band: "1o EM", students_count: 1 },
];

export const fallbackQuestionBankLessons: QuestionBankLessonOption[] = [
  {
    lesson_id: "lesson-005",
    lesson_title: "Soma objetiva",
    theme: "Aritmetica",
    grade_band: "4o ao 7o ano",
    path_title: "Oficina da Aritmetica",
    default_skill: "soma",
  },
  {
    lesson_id: "lesson-009",
    lesson_title: "Porcentagem e desconto",
    theme: "Porcentagem",
    grade_band: "6o ano ao 1o EM",
    path_title: "Central da Porcentagem",
    default_skill: "porcentagem",
  },
  {
    lesson_id: "lesson-003",
    lesson_title: "Equacoes do 1o grau",
    theme: "Algebra",
    grade_band: "8o ano ao 1o EM",
    path_title: "Liga da Algebra",
    default_skill: "equacoes",
  },
];

export const fallbackQuestionBankItems: QuestionBankItem[] = [
  {
    id: "qb-soma-001",
    lesson_id: "lesson-005",
    lesson_title: "Soma objetiva",
    theme: "Aritmetica",
    grade_band: "4o ao 7o ano",
    path_title: "Oficina da Aritmetica",
    prompt: "Quanto e 7 + 10?",
    exercise_type: "multiple_choice",
    difficulty: 1,
    correct_answer: "17",
    explanation: "Some 7 e 10 para obter 17.",
    options: [
      { id: "a", label: "17", value: "17" },
      { id: "b", label: "16", value: "16" },
      { id: "c", label: "19", value: "19" },
      { id: "d", label: "14", value: "14" },
    ],
    hints: ["Some primeiro as dezenas e depois as unidades."],
    estimated_seconds: 20,
    skill: "soma",
  },
];

export const fallbackDailyMission: DailyMission = {
  mission_date: "2026-03-21",
  title: "Missao diaria de fracoes",
  theme: "Fracoes",
  focus_reason: "Hoje o foco principal e Fracoes.",
  daily_goal: "Concluir 5 questoes objetivas e manter a constancia de estudo.",
  recommendation: "Revise somas com denominadores diferentes antes de subir a dificuldade.",
  total_exercises: 5,
  completed_exercises: 0,
  estimated_minutes: 6,
  xp_reward: 90,
  streak_target: "Seu streak atual e de 9 dias. Feche a missao para mantelo vivo.",
  exercises: [
    {
      id: "ex-001",
      lesson_id: "lesson-001",
      prompt: "Qual e a fracao equivalente a 3/4?",
      exercise_type: "multiple_choice",
      difficulty: 2,
      explanation: "Multiplicando numerador e denominador por 2, 3/4 vira 6/8.",
      options: [
        { id: "a", label: "6/8", value: "6/8" },
        { id: "b", label: "4/7", value: "4/7" },
        { id: "c", label: "9/16", value: "9/16" },
        { id: "d", label: "12/20", value: "12/20" },
      ],
      hints: ["Pense em multiplicar numerador e denominador pelo mesmo numero."],
      estimated_seconds: 35,
      skill: "fracoes equivalentes",
      topic: "Fracoes",
      lesson_title: "Fracoes equivalentes e soma",
      path_title: "Mundo das Fracoes",
    },
    {
      id: "ex-004",
      lesson_id: "lesson-001",
      prompt: "Qual fracao e maior: 2/5 ou 3/5?",
      exercise_type: "multiple_choice",
      difficulty: 1,
      explanation: "Quando os denominadores sao iguais, a maior fracao e a de maior numerador.",
      options: [
        { id: "a", label: "2/5", value: "2/5" },
        { id: "b", label: "3/5", value: "3/5" },
        { id: "c", label: "sao iguais", value: "sao iguais" },
        { id: "d", label: "nenhuma", value: "nenhuma" },
      ],
      hints: ["Compare apenas os numeradores."],
      estimated_seconds: 25,
      skill: "comparacao de fracoes",
      topic: "Fracoes",
      lesson_title: "Fracoes equivalentes e soma",
      path_title: "Mundo das Fracoes",
    },
    {
      id: "ex-002",
      lesson_id: "lesson-001",
      prompt: "Digite o resultado: 2/3 + 1/6",
      exercise_type: "input",
      difficulty: 3,
      explanation: "MMC entre 3 e 6 e 6. Assim, 2/3 vira 4/6 e 4/6 + 1/6 = 5/6.",
      options: [],
      hints: ["Transforme as fracoes para o mesmo denominador."],
      estimated_seconds: 40,
      skill: "soma de fracoes",
      topic: "Fracoes",
      lesson_title: "Fracoes equivalentes e soma",
      path_title: "Mundo das Fracoes",
    },
    {
      id: "ex-005",
      lesson_id: "lesson-002",
      prompt: "Simplifique a fracao 12/18.",
      exercise_type: "input",
      difficulty: 2,
      explanation: "Divida numerador e denominador por 6 para obter a forma irredutivel.",
      options: [],
      hints: ["Procure o maior divisor comum entre 12 e 18."],
      estimated_seconds: 35,
      skill: "simplificacao de fracoes",
      topic: "Fracoes",
      lesson_title: "Comparacao e simplificacao",
      path_title: "Mundo das Fracoes",
    },
    {
      id: "ex-009",
      lesson_id: "lesson-004",
      prompt: "Se um produto custa 100 reais e recebe desconto de 20%, qual o novo preco?",
      exercise_type: "input",
      difficulty: 3,
      explanation: "Vinte por cento de 100 e 20. Entao 100 - 20 = 80.",
      options: [],
      hints: ["Calcule primeiro o valor do desconto."],
      estimated_seconds: 40,
      skill: "porcentagem",
      topic: "Funcoes",
      lesson_title: "Leitura de graficos lineares",
      path_title: "Laboratorio das Funcoes",
    },
  ],
};

export const fallbackProfileInventory: ProfileInventory = {
  equipped_avatar_id: "avatar-matgo-owl",
  items: [
    {
      id: "avatar-matgo-owl",
      name: "Coruja MatGo",
      category: "avatar",
      rarity: "comum",
      asset_url: "/oficial.png",
      description: "Mascote oficial da plataforma para todo aluno comecar sua jornada.",
      unlock_hint: "Mascote base da plataforma",
      price: 0,
      is_purchasable: false,
      unlocked: true,
      equipped: true,
    },
    {
      id: "avatar-explorador",
      name: "Explorador Azul",
      category: "avatar",
      rarity: "comum",
      asset_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=MatGoExplorador",
      description: "Visual inicial de quem ja deu os primeiros passos com constancia.",
      unlock_hint: "Disponivel a partir do nivel 2",
      price: 0,
      is_purchasable: false,
      unlocked: true,
      equipped: false,
    },
    {
      id: "avatar-streak",
      name: "Aura de Streak",
      category: "avatar",
      rarity: "raro",
      asset_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=MatGoFogo",
      description: "Visual de quem conseguiu criar ritmo e constancia na plataforma.",
      unlock_hint: "Liberado com streak de 7 dias",
      price: 0,
      is_purchasable: false,
      unlocked: true,
      equipped: false,
    },
    {
      id: "avatar-gemas",
      name: "Guardiao de Gemas",
      category: "avatar",
      rarity: "raro",
      asset_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=MatGoGema",
      description: "Visual de colecionador para quem juntou moedas e evoluiu no jogo.",
      unlock_hint: "Liberado com 400 moedas",
      price: 0,
      is_purchasable: false,
      unlocked: true,
      equipped: false,
    },
    {
      id: "avatar-astro",
      name: "Avatar Astro",
      category: "avatar",
      rarity: "epico",
      asset_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=MatGoAstro",
      description: "Item epico para alunos com progresso alto e consistencia real.",
      unlock_hint: "Liberado com 1500 XP e streak de 7 dias",
      price: 0,
      is_purchasable: false,
      unlocked: true,
      equipped: false,
    },
  ],
};

export const fallbackRewardsOverview: RewardsOverview = {
  achievements: [
    {
      id: "achievement-001",
      code: "streak_7",
      name: "Fogo Constante",
      description: "Estude por 7 dias seguidos",
      icon: "flame",
      unlocked: true,
      unlocked_at: "2026-03-21T09:00:00",
    },
    {
      id: "achievement-004",
      code: "mission_daily",
      name: "Missao Cumprida",
      description: "Conclua a missao diaria completa",
      icon: "sparkles",
      unlocked: false,
      unlocked_at: null,
    },
  ],
  cosmetics: fallbackProfileInventory.items,
  recent_unlocks: [
    {
      id: "avatar-streak",
      kind: "cosmetic",
      title: "Aura de Streak",
      description: "Visual raro liberado pela sua constancia.",
      rarity: "raro",
      unlocked_at: "2026-03-21T10:00:00",
    },
    {
      id: "achievement-001",
      kind: "achievement",
      title: "Fogo Constante",
      description: "Estude por 7 dias seguidos",
      rarity: "badge",
      unlocked_at: "2026-03-21T09:00:00",
    },
  ],
};

export const fallbackShopData: ShopData = {
  coins_balance: 940,
  role: "student",
  items: [
    {
      id: "avatar-neon",
      name: "Neon Runner",
      category: "avatar",
      rarity: "raro",
      asset_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=MatGoNeon",
      description: "Avatar vibrante para quem quer aparecer no ranking.",
      unlock_hint: "Disponivel na loja",
      price: 180,
      is_purchasable: true,
      owned: false,
      can_purchase: true,
    },
    {
      id: "avatar-cientista",
      name: "Mini Cientista",
      category: "avatar",
      rarity: "raro",
      asset_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=MatGoCientista",
      description: "Visual de laboratorio para quem gosta de progresso tecnico.",
      unlock_hint: "Disponivel na loja",
      price: 240,
      is_purchasable: true,
      owned: false,
      can_purchase: true,
    },
    {
      id: "theme-aurora",
      name: "Tema Aurora",
      category: "theme",
      rarity: "raro",
      asset_url: "theme-aurora",
      description: "Gradientes energeticos para estudar com estilo.",
      unlock_hint: "Disponivel na loja",
      price: 160,
      is_purchasable: true,
      owned: false,
      can_purchase: true,
    },
    {
      id: "powerup-vida-extra",
      name: "+1 Vida",
      category: "powerup",
      rarity: "comum",
      asset_url: "powerup-vida-extra",
      description: "Recupere uma vida para continuar a rotina sem travar.",
      unlock_hint: "Disponivel na loja",
      price: 110,
      is_purchasable: true,
      owned: false,
      can_purchase: true,
    },
  ],
};

export function getFirstExercise(data: BootstrapData): Exercise | null {
  return data.learning_paths.flatMap((path) => path.lessons).flatMap((lesson) => lesson.exercises)[0] ?? null;
}
