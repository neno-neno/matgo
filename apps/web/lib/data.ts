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
  completed_exercise_ids: string[];
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
  exercise_count: number;
  completed_exercise_ids: string[];
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

export type TrailClass = {
  id: string;
  name: string;
  grade_band: string;
  school_name?: string | null;
};

export type TrailActivity = {
  id: string;
  title: string;
  activity_type: "multiple_choice" | "input" | "drag_drop" | "step_by_step" | "timed";
  difficulty: number | null;
  estimated_minutes: number;
  xp_reward: number;
  sequence_order: number;
  source_exercise_id?: string | null;
  completed: boolean;
  locked: boolean;
};

export type TeacherTrail = {
  id: string;
  teacher_id: string;
  teacher_name: string;
  title: string;
  description: string;
  created_at: string;
  classes: TrailClass[];
  activities: TrailActivity[];
};

export type StudentLearningTrailsData = {
  base_paths: LearningPath[];
  teacher_trails: TeacherTrail[];
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
  school_name?: string | null;
  teacher_id?: string | null;
  teacher_name?: string | null;
  school_id?: string | null;
  invite_code: string;
  students_count: number;
  average_accuracy: number;
  total_xp: number;
};

export type SchoolSummary = {
  id: string;
  name: string;
  address?: string | null;
  director_name?: string | null;
  classes_count: number;
  created_at: string;
};

export type StudentMiniProfile = {
  id: string;
  full_name: string;
  email: string;
  username?: string | null;
  student_pin?: string | null;
  avatar_url: string;
  grade_band: string;
  level: number;
  xp: number;
  coins: number;
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
  author_id: string;
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
  author_id: string;
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
  classes_count: number;
  classes: string[];
};

export type TeacherAccessStudent = {
  id: string;
  full_name: string;
  email: string;
  username?: string | null;
  student_pin?: string | null;
  grade_band: string;
  coins: number;
  current_class_id?: string | null;
  current_class_name?: string | null;
};

export type TeacherPasswordResetRequestSummary = {
  id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_email: string;
  status: "pending" | "approved" | "completed";
  requested_at: string;
  approved_at?: string | null;
  completed_at?: string | null;
  approved_by_name?: string | null;
  temporary_password?: string | null;
  email_message?: string | null;
};

export type TeacherPasswordResetApprovalResponse = {
  message: string;
  temporary_password: string;
  email_message: string;
  request: TeacherPasswordResetRequestSummary;
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
  username?: string | null;
  student_pin?: string | null;
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
  category: "avatar" | "theme" | "powerup" | "frame";
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
  equipped_frame_id?: string | null;
  items: CosmeticItem[];
};

export type ProfileView = {
  profile: AuthUser;
  classes: {
    id: string;
    name: string;
    grade_band: string;
  }[];
  student_report: StudentReport | null;
  equipped_frame_id?: string | null;
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
  category: "avatar" | "theme" | "powerup" | "frame";
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

export type TeacherTrailCreatePayload = {
  title: string;
  description?: string;
  class_ids: string[];
  activities: {
    title: string;
    activity_type: "multiple_choice" | "input" | "drag_drop" | "step_by_step" | "timed";
    difficulty?: number | null;
    estimated_minutes: number;
    source_exercise_id?: string | null;
  }[];
};

export const fallbackBootstrapData: BootstrapData = {
  dashboard: {
    profile: {
      id: "student-001",
      role: "student",
      full_name: "Ana Carolina",
      avatar_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=Ana",
      email: "ana@example.com",
      grade_band: "8º ano",
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
      { id: "badge-003", name: "Álgebra Ninja", description: "15 acertos seguidos em equações", icon: "sparkles", unlocked: false },
    ],
    missions: [
      { id: "mission-001", title: "Aquecimento diário", description: "Resolva 5 exercícios hoje", progress: 3, goal: 5, xp_reward: 35, coin_reward: 20, completed: false },
      { id: "mission-002", title: "Velocidade Matemática", description: "Complete um desafio cronometrado", progress: 1, goal: 1, xp_reward: 50, coin_reward: 35, completed: true },
    ],
    leaderboard: [
      { position: 1, user_name: "Luan", xp: 2410, streak: 12, avatar_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=Luan" },
      { position: 2, user_name: "Ana Carolina", xp: 1860, streak: 9, avatar_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=Ana" },
      { position: 3, user_name: "Bianca", xp: 1740, streak: 7, avatar_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=Bianca" },
    ],
    rewards: [
      { id: "reward-001", name: "Tema Aurora", category: "theme", price: 320, description: "Gradientes energéticos para estudar com estilo.", rarity: "raro", unlocked: true },
      { id: "reward-002", name: "+1 Vida", category: "powerup", price: 120, description: "Recupere uma vida antes do próximo desafio.", rarity: "comum", unlocked: false },
      { id: "reward-003", name: "Avatar Astro", category: "avatar", price: 500, description: "Visual cósmico para seu perfil.", rarity: "epico", unlocked: false },
    ],
    adaptive_plan: {
      current_difficulty: 3,
      next_focus: "frações com denominadores diferentes",
      weak_points: [
        { topic: "MMC em frações", confidence: 58, recommendation: "Revise somas com denominadores diferentes antes de subir a dificuldade." },
        { topic: "Interpretação de problemas", confidence: 61, recommendation: "Pratique leitura guiada com o tutor inteligente." },
      ],
      suggested_revision: ["Simplificação de frações", "Multiplicação de frações", "Problemas com pizza e porcentagem"],
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
      { title: "Tutor inteligente", content: "Quando errar, leia a explicação por etapas e compare com sua estratégia." },
      { title: "Meta personalizada", content: "Seu melhor horário de estudo tem sido entre 18h e 20h." },
    ],
  },
  learning_paths: [
    {
      id: "path-001",
      title: "Mundo das Frações",
      category: "Frações",
      difficulty: "iniciante",
      grade_band: "6º ao 8º ano",
      completion_rate: 76,
      world_name: "Ilhas das Partes",
      lessons: [
        {
          id: "lesson-001",
          title: "Frações equivalentes e soma",
          summary: "Domine representações equivalentes e operações básicas.",
          estimated_minutes: 8,
          xp_reward: 40,
          locked: false,
          completed: false,
          exercise_count: 2,
          completed_exercise_ids: [],
          exercises: [
            {
              id: "ex-001",
              lesson_id: "lesson-001",
              prompt: "Qual é a fração equivalente a 3/4?",
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
              hints: ["Pense em multiplicar numerador e denominador pelo mesmo número."],
              estimated_seconds: 35,
              skill: "frações equivalentes",
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
              hints: ["Transforme as frações para o mesmo denominador."],
              estimated_seconds: 40,
              skill: "soma de frações",
            },
          ],
        },
      ],
    },
  ],
  teacher_dashboard: {
    classes: [
      { id: "class-001", name: "8º Ano A", grade_band: "8º ano", students: 32, average_accuracy: 78, pending_challenges: 2 },
      { id: "class-002", name: "1º EM B", grade_band: "1º ensino médio", students: 28, average_accuracy: 71, pending_challenges: 4 },
    ],
    top_students: [
      { student_name: "Ana Carolina", progress_percent: 68, accuracy: 82, weekly_minutes: 118, strongest_topic: "Frações", weak_topic: "Equações" },
      { student_name: "Pedro", progress_percent: 73, accuracy: 85, weekly_minutes: 104, strongest_topic: "Geometria", weak_topic: "Estatística" },
    ],
    attention_needed: [
      { student_name: "Marcos", progress_percent: 39, accuracy: 56, weekly_minutes: 42, strongest_topic: "Aritmética", weak_topic: "Frações" },
      { student_name: "Julia", progress_percent: 44, accuracy: 60, weekly_minutes: 37, strongest_topic: "Geometria", weak_topic: "Funções" },
    ],
  },
  world_map: {
    world_name: "Ilhas das Partes",
    theme: "oceano matematico",
    nodes: [
      { id: "node-001", title: "Porto das Frações", category: "Frações", status: "completed", stars: 3 },
      { id: "node-002", title: "Ponte do MMC", category: "Frações", status: "current", stars: 2 },
      { id: "node-003", title: "Vulcão da Álgebra", category: "Álgebra", status: "locked", stars: 0 },
      { id: "node-004", title: "Templo da Geometria", category: "Geometria", status: "locked", stars: 0 },
    ],
  },
  battles: [
    { id: "battle-001", title: "Duelo Relâmpago das Frações", opponent_name: "Bianca", topic: "Frações", difficulty: 3, reward_xp: 80, duration_seconds: 90 },
    { id: "battle-002", title: "Arena da Álgebra", opponent_name: "Luan", topic: "Equações", difficulty: 4, reward_xp: 120, duration_seconds: 120 },
  ],
};

export const fallbackStudentLearningTrails: StudentLearningTrailsData = {
  base_paths: fallbackBootstrapData.learning_paths,
  teacher_trails: [],
};

export const fallbackForumTopics: ForumTopic[] = [
  {
    id: "topic-001",
    class_id: "class-001",
    author_id: "student-001",
    author_name: "Ana Carolina",
    title: "Dúvida em frações equivalentes",
    body: "Não entendi por que 3/4 é igual a 6/8.",
    tags: ["frações", "dúvida"],
    topic_type: "discussion",
    due_at: null,
    is_pinned: true,
    replies: 2,
    created_at: "2026-03-21T09:00:00",
  },
  {
    id: "topic-002",
    class_id: "class-001",
    author_id: "teacher-001",
    author_name: "Prof. Carla Menezes",
    title: "Desafio relâmpago da semana",
    body: "Resolva os três itens sobre frações equivalentes e explique sua estratégia.",
    tags: ["desafio", "frações"],
    topic_type: "challenge",
    due_at: "2026-03-25T18:00",
    is_pinned: false,
    replies: 1,
    created_at: "2026-03-21T10:30:00",
  },
  {
    id: "topic-003",
    class_id: "class-001",
    author_id: "teacher-001",
    author_name: "Prof. Carla Menezes",
    title: "Atividade aplicada de porcentagem",
    body: "Resolva os 4 itens objetivos sobre porcentagem e responda neste tópico com suas respostas numeradas.",
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
      author_id: "teacher-001",
      author_name: "Prof. Carla Menezes",
      body: "Entreguem as respostas em formato 1), 2), 3), 4) antes do prazo final.",
      created_at: "2026-03-21T09:10:00",
    },
  ],
};

export const fallbackTeacherClasses: TeacherClassSummary[] = [
  {
    id: "class-001",
    name: "8º Ano A",
    grade_band: "8º ano",
    school_id: "school-001",
    school_name: "Domingos Fco - Matemática",
    teacher_id: "teacher-001",
    teacher_name: "Prof. Carla Menezes",
    invite_code: "8A2026",
    students_count: 3,
    average_accuracy: 72,
    total_xp: 4500,
  },
];

export const fallbackSchools: SchoolSummary[] = [
  {
    id: "school-001",
    name: "Domingos Fco - Matemática",
    address: "Rua do Cálculo, 123",
    director_name: "Marina Duarte",
    classes_count: 1,
    created_at: "2026-03-22T12:00:00",
  },
];

export const fallbackStudentReport: StudentReport = {
  student: {
    id: "student-001",
    full_name: "Ana Carolina",
    email: "ana@matematica.local",
    username: "ana",
    student_pin: "1234",
    avatar_url: "https://api.dicebear.com/8.x/adventurer/svg?seed=Ana",
    grade_band: "8º ano",
    level: 12,
    xp: 1860,
    coins: 940,
    streak: 9,
    accuracy: 50,
    study_minutes: 118,
    strong_areas: ["MMC em frações"],
    weak_areas: ["Equações"],
  },
  performance_summary: "Ana Carolina tem 50% de acerto e precisa reforçar equações sem perder o bom ritmo em frações.",
  strengths: [
    { topic: "MMC em frações", confidence: 82, recommendation: "Pode avançar para problemas contextualizados." },
  ],
  weaknesses: [
    { topic: "Equações", confidence: 40, recommendation: "Reforçar o isolamento da incógnita." },
  ],
  recent_activity: [
    "Acerto em 'Qual é a fração equivalente a 3/4?' com resposta '6/8'.",
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
  top_strengths: ["Frações", "MMC em frações", "Geometria"],
  top_weaknesses: ["Equações", "Interpretação de problemas", "Funções"],
  students_needing_attention: [
    fallbackStudentReport.student,
  ],
};

export const fallbackTeachers: TeacherDirectoryItem[] = [
  { id: "teacher-001", full_name: "Prof. Carla Menezes", email: "carla@matematica.local", grade_band: "8º ano", students_count: 3, classes_count: 1, classes: ["8º Ano A"] },
  { id: "teacher-002", full_name: "Prof. Ricardo Alves", email: "ricardo@matematica.local", grade_band: "1º EM", students_count: 1, classes_count: 1, classes: ["1º EM B"] },
];

export const fallbackTeacherAccessStudents: TeacherAccessStudent[] = [
  {
    id: "student-001",
    full_name: "Ana Carolina",
    email: "ana@matematica.local",
    username: "ana",
    student_pin: "1234",
    grade_band: "8º ano",
    coins: 940,
    current_class_id: "class-001",
    current_class_name: "8º Ano A",
  },
];

export const fallbackQuestionBankLessons: QuestionBankLessonOption[] = [
  {
    lesson_id: "lesson-005",
    lesson_title: "Soma objetiva",
    theme: "Aritmética",
    grade_band: "4º ao 7º ano",
    path_title: "Oficina da Aritmética",
    default_skill: "soma",
  },
  {
    lesson_id: "lesson-009",
    lesson_title: "Porcentagem e desconto",
    theme: "Porcentagem",
    grade_band: "6º ano ao 1º EM",
    path_title: "Central da Porcentagem",
    default_skill: "porcentagem",
  },
  {
    lesson_id: "lesson-003",
    lesson_title: "Equações do 1º grau",
    theme: "Álgebra",
    grade_band: "8º ano ao 1º EM",
    path_title: "Liga da Álgebra",
    default_skill: "equações",
  },
];

export const fallbackQuestionBankItems: QuestionBankItem[] = [
  {
    id: "qb-soma-001",
    lesson_id: "lesson-005",
    lesson_title: "Soma objetiva",
    theme: "Aritmética",
    grade_band: "4º ao 7º ano",
    path_title: "Oficina da Aritmética",
    prompt: "Quanto é 7 + 10?",
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
  title: "Missão diária de frações",
  theme: "Frações",
  focus_reason: "Hoje o foco principal é Frações.",
  daily_goal: "Concluir 5 questões objetivas e manter a constância de estudo.",
  recommendation: "Revise somas com denominadores diferentes antes de subir a dificuldade.",
  total_exercises: 5,
  completed_exercises: 0,
  completed_exercise_ids: [],
  estimated_minutes: 6,
  xp_reward: 90,
  streak_target: "Seu streak atual é de 9 dias. Feche a missão para mantê-lo vivo.",
  exercises: [
    {
      id: "ex-001",
      lesson_id: "lesson-001",
      prompt: "Qual é a fração equivalente a 3/4?",
      exercise_type: "multiple_choice",
      difficulty: 2,
      explanation: "Multiplicando numerador e denominador por 2, 3/4 vira 6/8.",
      options: [
        { id: "a", label: "6/8", value: "6/8" },
        { id: "b", label: "4/7", value: "4/7" },
        { id: "c", label: "9/16", value: "9/16" },
        { id: "d", label: "12/20", value: "12/20" },
      ],
      hints: ["Pense em multiplicar numerador e denominador pelo mesmo número."],
      estimated_seconds: 35,
      skill: "frações equivalentes",
      topic: "Frações",
      lesson_title: "Frações equivalentes e soma",
      path_title: "Mundo das Frações",
    },
    {
      id: "ex-004",
      lesson_id: "lesson-001",
      prompt: "Qual fração é maior: 2/5 ou 3/5?",
      exercise_type: "multiple_choice",
      difficulty: 1,
      explanation: "Quando os denominadores são iguais, a maior fração é a de maior numerador.",
      options: [
        { id: "a", label: "2/5", value: "2/5" },
        { id: "b", label: "3/5", value: "3/5" },
        { id: "c", label: "sao iguais", value: "sao iguais" },
        { id: "d", label: "nenhuma", value: "nenhuma" },
      ],
      hints: ["Compare apenas os numeradores."],
      estimated_seconds: 25,
      skill: "comparação de frações",
      topic: "Frações",
      lesson_title: "Frações equivalentes e soma",
      path_title: "Mundo das Frações",
    },
    {
      id: "ex-002",
      lesson_id: "lesson-001",
      prompt: "Digite o resultado: 2/3 + 1/6",
      exercise_type: "input",
      difficulty: 3,
      explanation: "MMC entre 3 e 6 e 6. Assim, 2/3 vira 4/6 e 4/6 + 1/6 = 5/6.",
      options: [],
      hints: ["Transforme as frações para o mesmo denominador."],
      estimated_seconds: 40,
      skill: "soma de frações",
      topic: "Frações",
      lesson_title: "Frações equivalentes e soma",
      path_title: "Mundo das Frações",
    },
    {
      id: "ex-005",
      lesson_id: "lesson-002",
      prompt: "Simplifique a fração 12/18.",
      exercise_type: "input",
      difficulty: 2,
      explanation: "Divida numerador e denominador por 6 para obter a forma irredutivel.",
      options: [],
      hints: ["Procure o maior divisor comum entre 12 e 18."],
      estimated_seconds: 35,
      skill: "simplificação de frações",
      topic: "Frações",
      lesson_title: "Comparação e simplificação",
      path_title: "Mundo das Frações",
    },
    {
      id: "ex-009",
      lesson_id: "lesson-004",
      prompt: "Se um produto custa 100 reais e recebe desconto de 20%, qual é o novo preço?",
      exercise_type: "input",
      difficulty: 3,
      explanation: "Vinte por cento de 100 é 20. Então 100 - 20 = 80.",
      options: [],
      hints: ["Calcule primeiro o valor do desconto."],
      estimated_seconds: 40,
      skill: "porcentagem",
      topic: "Funções",
      lesson_title: "Leitura de gráficos lineares",
      path_title: "Laboratório das Funções",
    },
  ],
};

export const fallbackProfileInventory: ProfileInventory = {
  equipped_avatar_id: "avatar-matgo-owl",
  equipped_frame_id: null,
  items: [
    {
      id: "avatar-matgo-owl",
      name: "Coruja MatGo",
      category: "avatar",
      rarity: "comum",
      asset_url: "/oficial.png",
      description: "Mascote oficial da plataforma para todo aluno começar sua jornada.",
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
      description: "Item épico para alunos com progresso alto e consistência real.",
      unlock_hint: "Liberado com 1500 XP e streak de 7 dias",
      price: 0,
      is_purchasable: false,
      unlocked: true,
      equipped: false,
    },
    {
      id: "frame-padrao",
      name: "Moldura Padrao",
      category: "frame",
      rarity: "comum",
      asset_url: "frame-padrao",
      description: "Skin base do card principal do perfil.",
      unlock_hint: "Disponivel na loja",
      price: 180,
      is_purchasable: true,
      unlocked: false,
      equipped: false,
    },
    {
      id: "frame-bronze",
      name: "Moldura Bronze",
      category: "frame",
      rarity: "comum",
      asset_url: "frame-bronze",
      description: "Acabamento quente e metálico para perfis em ascensão.",
      unlock_hint: "Disponivel na loja",
      price: 260,
      is_purchasable: true,
      unlocked: false,
      equipped: false,
    },
    {
      id: "frame-prata",
      name: "Moldura Prata",
      category: "frame",
      rarity: "raro",
      asset_url: "frame-prata",
      description: "Reflexo frio e sofisticado para o card do perfil.",
      unlock_hint: "Disponivel na loja",
      price: 340,
      is_purchasable: true,
      unlocked: false,
      equipped: false,
    },
    {
      id: "frame-ouro",
      name: "Moldura Ouro",
      category: "frame",
      rarity: "raro",
      asset_url: "frame-ouro",
      description: "Brilho dourado premium para o bloco principal.",
      unlock_hint: "Disponivel na loja",
      price: 480,
      is_purchasable: true,
      unlocked: false,
      equipped: false,
    },
    {
      id: "frame-cristal",
      name: "Moldura Cristal",
      category: "frame",
      rarity: "raro",
      asset_url: "frame-cristal",
      description: "Camadas translucidas e brilho sutil para destacar o perfil.",
      unlock_hint: "Disponivel na loja",
      price: 520,
      is_purchasable: true,
      unlocked: false,
      equipped: false,
    },
    {
      id: "frame-galaxia",
      name: "Moldura Galaxia",
      category: "frame",
      rarity: "epico",
      asset_url: "frame-galaxia",
      description: "Profundidade cósmica e brilho vibrante no card do perfil.",
      unlock_hint: "Disponivel na loja premium",
      price: 760,
      is_purchasable: true,
      unlocked: false,
      equipped: false,
    },
    {
      id: "frame-matematica",
      name: "Moldura Matemática",
      category: "frame",
      rarity: "raro",
      asset_url: "frame-matematica",
      description: "Detalhes inspirados em fórmulas, gráficos e ritmo de estudo.",
      unlock_hint: "Disponivel na loja",
      price: 610,
      is_purchasable: true,
      unlocked: false,
      equipped: false,
    },
    {
      id: "frame-mestre",
      name: "Moldura Mestre",
      category: "frame",
      rarity: "epico",
      asset_url: "frame-mestre",
      description: "A moldura mais nobre da plataforma para o card do perfil.",
      unlock_hint: "Disponivel na loja premium",
      price: 980,
      is_purchasable: true,
      unlocked: false,
      equipped: false,
    },
    {
      id: "frame-aura-pop",
      name: "Moldura Aura Pop",
      category: "frame",
      rarity: "raro",
      asset_url: "frame-aura-pop",
      description: "Cores contagiantes com kaomojis discretos e brilho alegre no card.",
      unlock_hint: "Disponivel na loja",
      price: 680,
      is_purchasable: true,
      unlocked: false,
      equipped: false,
    },
    {
      id: "frame-elegancia-neon",
      name: "Moldura Elegancia Neon",
      category: "frame",
      rarity: "epico",
      asset_url: "frame-elegancia-neon",
      description: "Neon sofisticado com emoticons leves e acabamento premium.",
      unlock_hint: "Disponivel na loja premium",
      price: 920,
      is_purchasable: true,
      unlocked: false,
      equipped: false,
    },
  ],
};

export const fallbackProfileView: ProfileView = {
  profile: {
    id: "teacher-001",
    role: "teacher",
    full_name: "Prof. Carla Menezes",
    email: "",
    avatar_url: "/oficial.png",
    grade_band: "8º ano",
    bio: "Professora responsável pelas turmas do fundamental final, com foco em prática objetiva e rotina diária.",
    level: 0,
    xp: 0,
    coins: 0,
    streak: 0,
    lives: 0,
  },
  classes: [
    { id: "class-001", name: "8º Ano A", grade_band: "8º ano" },
  ],
  student_report: null,
  equipped_frame_id: null,
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
      name: "Missão cumprida",
      description: "Conclua a missão diária completa",
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
      id: "frame-padrao",
      name: "Moldura Padrao",
      category: "frame",
      rarity: "comum",
      asset_url: "frame-padrao",
      description: "Skin base do card principal do perfil, agora vendida separadamente.",
      unlock_hint: "Disponivel na loja",
      price: 180,
      is_purchasable: true,
      owned: false,
      can_purchase: true,
    },
    {
      id: "frame-bronze",
      name: "Moldura Bronze",
      category: "frame",
      rarity: "comum",
      asset_url: "frame-bronze",
      description: "Acabamento metálico quente para perfis em ascensão.",
      unlock_hint: "Disponivel na loja",
      price: 260,
      is_purchasable: true,
      owned: false,
      can_purchase: true,
    },
    {
      id: "frame-prata",
      name: "Moldura Prata",
      category: "frame",
      rarity: "raro",
      asset_url: "frame-prata",
      description: "Reflexo frio e sofisticado para um visual premium.",
      unlock_hint: "Disponivel na loja",
      price: 340,
      is_purchasable: true,
      owned: false,
      can_purchase: true,
    },
    {
      id: "frame-ouro",
      name: "Moldura Ouro",
      category: "frame",
      rarity: "raro",
      asset_url: "frame-ouro",
      description: "Brilho dourado forte para destacar o card principal.",
      unlock_hint: "Disponivel na loja",
      price: 480,
      is_purchasable: true,
      owned: false,
      can_purchase: true,
    },
    {
      id: "frame-cristal",
      name: "Moldura Cristal",
      category: "frame",
      rarity: "raro",
      asset_url: "frame-cristal",
      description: "Camadas translucidas e brilho refinado no bloco do perfil.",
      unlock_hint: "Disponivel na loja",
      price: 520,
      is_purchasable: true,
      owned: false,
      can_purchase: true,
    },
    {
      id: "frame-galaxia",
      name: "Moldura Galaxia",
      category: "frame",
      rarity: "epico",
      asset_url: "frame-galaxia",
      description: "Profundidade cósmica com acabamento de elite.",
      unlock_hint: "Disponivel na loja premium",
      price: 760,
      is_purchasable: true,
      owned: false,
      can_purchase: true,
    },
    {
      id: "frame-matematica",
      name: "Moldura Matemática",
      category: "frame",
      rarity: "raro",
      asset_url: "frame-matematica",
      description: "Skin educativa com formulas e ritmo visual de estudo.",
      unlock_hint: "Disponivel na loja",
      price: 610,
      is_purchasable: true,
      owned: false,
      can_purchase: true,
    },
    {
      id: "frame-mestre",
      name: "Moldura Mestre",
      category: "frame",
      rarity: "epico",
      asset_url: "frame-mestre",
      description: "A moldura mais prestigiosa da plataforma.",
      unlock_hint: "Disponivel na loja premium",
      price: 980,
      is_purchasable: true,
      owned: false,
      can_purchase: true,
    },
    {
      id: "frame-aura-pop",
      name: "Moldura Aura Pop",
      category: "frame",
      rarity: "raro",
      asset_url: "frame-aura-pop",
      description: "Cores contagiantes com kaomojis discretos e energia positiva.",
      unlock_hint: "Disponivel na loja",
      price: 680,
      is_purchasable: true,
      owned: false,
      can_purchase: true,
    },
    {
      id: "frame-elegancia-neon",
      name: "Moldura Elegancia Neon",
      category: "frame",
      rarity: "epico",
      asset_url: "frame-elegancia-neon",
      description: "Camadas neon sofisticadas com emoticons sutis e premium.",
      unlock_hint: "Disponivel na loja premium",
      price: 920,
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
