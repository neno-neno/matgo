from typing import Literal

from pydantic import BaseModel, Field


Role = Literal["student", "teacher", "master"]
ExerciseType = Literal["multiple_choice", "input", "drag_drop", "step_by_step", "timed"]
DifficultyBand = Literal["iniciante", "intermediario", "avancado"]


class StatBlock(BaseModel):
    accuracy: int
    mistakes: int
    study_minutes: int
    completed_lessons: int


class UserProfile(BaseModel):
    id: str
    role: Role
    full_name: str
    avatar_url: str
    email: str
    grade_band: str
    level: int
    xp: int
    coins: int
    streak: int
    lives: int
    progress_percent: int
    stats: StatBlock


class Badge(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    unlocked: bool


class Mission(BaseModel):
    id: str
    title: str
    description: str
    progress: int
    goal: int
    xp_reward: int
    coin_reward: int
    completed: bool


class ExerciseOption(BaseModel):
    id: str
    label: str
    value: str


class Exercise(BaseModel):
    id: str
    lesson_id: str
    prompt: str
    exercise_type: ExerciseType
    difficulty: int = Field(ge=1, le=5)
    correct_answer: str
    explanation: str
    options: list[ExerciseOption] = []
    hints: list[str] = []
    estimated_seconds: int
    skill: str


class Lesson(BaseModel):
    id: str
    title: str
    summary: str
    estimated_minutes: int
    xp_reward: int
    locked: bool
    completed: bool
    exercise_count: int = 0
    completed_exercise_ids: list[str] = []
    exercises: list[Exercise]


class LearningPath(BaseModel):
    id: str
    title: str
    category: str
    difficulty: DifficultyBand
    grade_band: str
    completion_rate: int
    world_name: str
    lessons: list[Lesson]


class TrailClass(BaseModel):
    id: str
    name: str
    grade_band: str
    school_name: str | None = None


class SchoolSummary(BaseModel):
    id: str
    name: str
    address: str | None = None
    director_name: str | None = None
    classes_count: int = 0
    created_at: str


class TrailActivity(BaseModel):
    id: str
    title: str
    activity_type: ExerciseType
    difficulty: int | None = Field(default=None, ge=1, le=5)
    estimated_minutes: int = Field(ge=1, le=180)
    xp_reward: int
    sequence_order: int
    source_exercise_id: str | None = None
    completed: bool = False
    locked: bool = False


class TeacherTrail(BaseModel):
    id: str
    teacher_id: str
    teacher_name: str
    title: str
    description: str
    created_at: str
    classes: list[TrailClass]
    activities: list[TrailActivity]


class StudentLearningTrailsResponse(BaseModel):
    base_paths: list[LearningPath]
    teacher_trails: list[TeacherTrail]


class TrailActivityCreateRequest(BaseModel):
    title: str
    activity_type: ExerciseType
    difficulty: int | None = Field(default=None, ge=1, le=5)
    estimated_minutes: int = Field(ge=1, le=180)
    source_exercise_id: str | None = None


class TeacherTrailCreateRequest(BaseModel):
    title: str
    description: str | None = None
    class_ids: list[str]
    activities: list[TrailActivityCreateRequest]


class WeakPoint(BaseModel):
    topic: str
    confidence: int
    recommendation: str


class AdaptivePlan(BaseModel):
    current_difficulty: int
    next_focus: str
    weak_points: list[WeakPoint]
    suggested_revision: list[str]
    daily_goal: str


class LeaderboardEntry(BaseModel):
    position: int
    user_name: str
    xp: int
    streak: int
    avatar_url: str


class RewardItem(BaseModel):
    id: str
    name: str
    category: Literal["avatar", "theme", "powerup"]
    price: int
    description: str
    rarity: Literal["comum", "raro", "epico"]
    unlocked: bool


class EvolutionPoint(BaseModel):
    label: str
    xp: int
    accuracy: int


class StudyTip(BaseModel):
    title: str
    content: str


class DashboardResponse(BaseModel):
    profile: UserProfile
    badges: list[Badge]
    missions: list[Mission]
    leaderboard: list[LeaderboardEntry]
    rewards: list[RewardItem]
    adaptive_plan: AdaptivePlan
    evolution: list[EvolutionPoint]
    study_tips: list[StudyTip]


class TeacherClassOverview(BaseModel):
    id: str
    name: str
    grade_band: str
    students: int
    average_accuracy: int
    pending_challenges: int


class TeacherStudentPerformance(BaseModel):
    student_name: str
    progress_percent: int
    accuracy: int
    weekly_minutes: int
    strongest_topic: str
    weak_topic: str


class TeacherDashboardResponse(BaseModel):
    classes: list[TeacherClassOverview]
    top_students: list[TeacherStudentPerformance]
    attention_needed: list[TeacherStudentPerformance]


class ExerciseAttemptRequest(BaseModel):
    exercise_id: str
    answer: str
    elapsed_seconds: int
    student_id: str = "student-001"
    class_id: str | None = "class-001"


class TutorFeedback(BaseModel):
    status: Literal["correct", "incorrect"]
    xp_delta: int
    coins_delta: int
    lives_delta: int
    message: str
    tutor_explanation: str
    recommended_review: list[str]


class DailyMissionExercise(BaseModel):
    id: str
    lesson_id: str
    prompt: str
    exercise_type: ExerciseType
    difficulty: int = Field(ge=1, le=5)
    explanation: str
    options: list[ExerciseOption] = []
    hints: list[str] = []
    estimated_seconds: int
    skill: str
    topic: str
    lesson_title: str
    path_title: str


class DailyMissionResponse(BaseModel):
    mission_date: str
    title: str
    theme: str
    focus_reason: str
    daily_goal: str
    recommendation: str
    total_exercises: int
    completed_exercises: int
    completed_exercise_ids: list[str] = []
    estimated_minutes: int
    xp_reward: int
    streak_target: str
    exercises: list[DailyMissionExercise]


class BattleChallenge(BaseModel):
    id: str
    title: str
    opponent_name: str
    topic: str
    difficulty: int
    reward_xp: int
    duration_seconds: int


class WorldNode(BaseModel):
    id: str
    title: str
    category: str
    status: Literal["completed", "current", "locked"]
    stars: int


class WorldMap(BaseModel):
    world_name: str
    theme: str
    nodes: list[WorldNode]


class BootstrapResponse(BaseModel):
    dashboard: DashboardResponse
    learning_paths: list[LearningPath]
    teacher_dashboard: TeacherDashboardResponse
    world_map: WorldMap
    battles: list[BattleChallenge]


class LoginRequest(BaseModel):
    identifier: str | None = None
    email: str | None = None
    password: str


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    role: Literal["student", "teacher"] = "student"
    grade_band: str | None = None
    bio: str | None = None
    access_code: str | None = None


class AuthUser(BaseModel):
    id: str
    role: Literal["master", "teacher", "student"]
    full_name: str
    email: str
    username: str | None = None
    student_pin: str | None = None
    avatar_url: str | None = None
    grade_band: str | None = None
    bio: str | None = None
    level: int
    xp: int
    coins: int
    streak: int
    lives: int


class LoginResponse(BaseModel):
    token: str
    user: AuthUser


class TeacherAccessStudent(BaseModel):
    id: str
    full_name: str
    email: str
    username: str | None = None
    student_pin: str | None = None
    grade_band: str
    coins: int = 0
    current_class_id: str | None = None
    current_class_name: str | None = None


class TeacherDirectoryItem(BaseModel):
    id: str
    full_name: str
    email: str
    grade_band: str | None = None
    students_count: int
    classes_count: int = 0
    classes: list[str] = []


class TeacherPasswordResetRequestCreate(BaseModel):
    email: str


class TeacherPasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class TeacherPasswordResetRequestSummary(BaseModel):
    id: str
    teacher_id: str
    teacher_name: str
    teacher_email: str
    status: Literal["pending", "approved", "completed"]
    requested_at: str
    approved_at: str | None = None
    completed_at: str | None = None
    approved_by_name: str | None = None
    temporary_password: str | None = None
    email_message: str | None = None


class TeacherPasswordResetApprovalResponse(BaseModel):
    message: str
    temporary_password: str
    email_message: str
    request: TeacherPasswordResetRequestSummary


class ClassSummary(BaseModel):
    id: str
    name: str
    grade_band: str
    school_name: str | None = None
    teacher_id: str | None = None
    teacher_name: str | None = None
    school_id: str | None = None
    invite_code: str
    students_count: int
    average_accuracy: int
    total_xp: int


class StudentMiniProfile(BaseModel):
    id: str
    full_name: str
    email: str
    username: str | None = None
    student_pin: str | None = None
    avatar_url: str
    grade_band: str
    level: int
    xp: int
    coins: int = 0
    streak: int
    accuracy: int
    study_minutes: int
    strong_areas: list[str]
    weak_areas: list[str]


class StudentReport(BaseModel):
    student: StudentMiniProfile
    performance_summary: str
    strengths: list[WeakPoint]
    weaknesses: list[WeakPoint]
    recent_activity: list[str]


class ClassRankingEntry(BaseModel):
    position: int
    student_id: str
    student_name: str
    xp: int
    accuracy: int
    streak: int


class ClassReport(BaseModel):
    class_info: ClassSummary
    ranking: list[ClassRankingEntry]
    top_strengths: list[str]
    top_weaknesses: list[str]
    students_needing_attention: list[StudentMiniProfile]


class ForumTopicSummary(BaseModel):
    id: str
    class_id: str | None = None
    author_id: str
    author_name: str
    title: str
    body: str
    tags: list[str]
    topic_type: Literal["discussion", "challenge", "activity"]
    due_at: str | None = None
    is_pinned: bool
    replies: int
    created_at: str


class ForumPostItem(BaseModel):
    id: str
    author_id: str
    author_name: str
    body: str
    created_at: str


class ForumTopicDetail(BaseModel):
    topic: ForumTopicSummary
    posts: list[ForumPostItem]


class ForumTopicCreate(BaseModel):
    class_id: str | None = None
    author_id: str
    title: str
    body: str
    tags: list[str] = []
    topic_type: Literal["discussion", "challenge", "activity"] = "discussion"
    due_at: str | None = None


class ForumTopicClassUpdateRequest(BaseModel):
    class_id: str


class ForumPostCreate(BaseModel):
    author_id: str
    body: str


class UserProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None


class CosmeticItem(BaseModel):
    id: str
    name: str
    category: Literal["avatar", "theme", "powerup", "frame"]
    rarity: Literal["comum", "raro", "epico"]
    asset_url: str
    description: str
    unlock_hint: str
    price: int = 0
    is_purchasable: bool = False
    unlocked: bool
    equipped: bool


class ProfileInventoryResponse(BaseModel):
    equipped_avatar_id: str | None = None
    equipped_frame_id: str | None = None
    items: list[CosmeticItem]


class EquipCosmeticRequest(BaseModel):
    item_id: str


class ShopItem(BaseModel):
    id: str
    name: str
    category: Literal["avatar", "theme", "powerup", "frame"]
    rarity: Literal["comum", "raro", "epico"]
    asset_url: str
    description: str
    unlock_hint: str
    price: int
    is_purchasable: bool
    owned: bool
    can_purchase: bool


class ShopResponse(BaseModel):
    coins_balance: int
    role: Literal["master", "teacher", "student"]
    items: list[ShopItem]


class ShopPurchaseRequest(BaseModel):
    item_id: str


class AchievementItem(BaseModel):
    id: str
    code: str
    name: str
    description: str
    icon: str
    unlocked: bool
    unlocked_at: str | None = None


class RewardUnlockItem(BaseModel):
    id: str
    kind: Literal["achievement", "cosmetic"]
    title: str
    description: str
    rarity: str
    unlocked_at: str


class RewardsOverviewResponse(BaseModel):
    achievements: list[AchievementItem]
    cosmetics: list[CosmeticItem]
    recent_unlocks: list[RewardUnlockItem]


class TeacherCreateStudentRequest(BaseModel):
    full_name: str
    email: str
    username: str
    pin: str
    grade_band: str
    bio: str | None = None
    class_id: str | None = None


class TeacherCreateClassRequest(BaseModel):
    name: str
    grade_band: str
    school_id: str
    teacher_id: str | None = None


class SchoolCreateRequest(BaseModel):
    name: str
    address: str | None = None
    director_name: str | None = None


class SchoolUpdateRequest(BaseModel):
    name: str
    address: str | None = None
    director_name: str | None = None


class ClassUpdateRequest(BaseModel):
    name: str
    grade_band: str
    school_id: str


class StudentCoinsUpdateRequest(BaseModel):
    coins: int = Field(ge=0, le=100000)


class StudentClassUpdateRequest(BaseModel):
    class_id: str


class TeacherClassAssignmentRequest(BaseModel):
    teacher_id: str


class TeacherAccessCodeResponse(BaseModel):
    access_code: str


class TeacherAccessCodeUpdateRequest(BaseModel):
    access_code: str


class PublicClassOption(BaseModel):
    id: str
    name: str
    grade_band: str
    teacher_name: str


class StudentSignupRequestCreate(BaseModel):
    class_id: str
    full_name: str
    email: str
    note: str | None = None


class StudentSignupRequestSummary(BaseModel):
    id: str
    class_id: str
    requested_teacher_id: str
    full_name: str
    email: str
    grade_band: str
    note: str | None = None
    status: Literal["pending", "approved", "rejected"]
    approved_student_id: str | None = None
    created_at: str
    reviewed_at: str | None = None


class ApproveSignupRequest(BaseModel):
    username: str
    pin: str
    class_id: str | None = None


class GenericMessage(BaseModel):
    message: str


class ResetPasswordResponse(BaseModel):
    message: str
    temporary_pin: str


class PublicProfileClassItem(BaseModel):
    id: str
    name: str
    grade_band: str


class ProfileViewResponse(BaseModel):
    profile: AuthUser
    classes: list[PublicProfileClassItem] = []
    student_report: StudentReport | None = None
    equipped_frame_id: str | None = None


class QuestionBankLessonOption(BaseModel):
    lesson_id: str
    lesson_title: str
    theme: str
    grade_band: str
    path_title: str
    default_skill: str


class QuestionBankItem(BaseModel):
    id: str
    lesson_id: str
    lesson_title: str
    theme: str
    grade_band: str
    path_title: str
    prompt: str
    exercise_type: ExerciseType
    difficulty: int = Field(ge=1, le=5)
    correct_answer: str
    explanation: str
    options: list[ExerciseOption] = []
    hints: list[str] = []
    estimated_seconds: int
    skill: str


class QuestionBankCreateRequest(BaseModel):
    lesson_id: str
    prompt: str
    exercise_type: ExerciseType
    difficulty: int = Field(ge=1, le=5)
    correct_answer: str
    explanation: str
    options: list[ExerciseOption] = []
    hints: list[str] = []
    estimated_seconds: int = Field(ge=10, le=180)
    skill: str | None = None


class QuestionBankUpdateRequest(BaseModel):
    lesson_id: str | None = None
    prompt: str | None = None
    exercise_type: ExerciseType | None = None
    difficulty: int | None = Field(default=None, ge=1, le=5)
    correct_answer: str | None = None
    explanation: str | None = None
    options: list[ExerciseOption] | None = None
    hints: list[str] | None = None
    estimated_seconds: int | None = Field(default=None, ge=10, le=180)
    skill: str | None = None
