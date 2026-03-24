-- ==========================================
-- MatGo MVP: Supabase PostgreSQL Schema
-- ==========================================
-- Este script reflete 100% da estrutura existente no db.py original
-- para garantir compatibilidade perfeita com os Models Pydantic do FastAPI.
-- Os IDs e Datas usam tipo TEXT para replicar o comportamento atual de SQLite + PsycoPG.

CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  director_name TEXT,
  updated_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id),
  role TEXT NOT NULL CHECK(role IN ('master','teacher','student')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  student_pin TEXT,
  avatar_url TEXT,
  grade_band TEXT,
  bio TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  lives INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_student_links (
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, student_id)
);

CREATE TABLE IF NOT EXISTS class_groups (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id),
  teacher_id TEXT REFERENCES users(id),
  school_name TEXT,
  name TEXT NOT NULL,
  grade_band TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS class_enrollments (
  class_id TEXT NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS learning_paths (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  grade_band TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  world_name TEXT NOT NULL,
  completion_rate INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  path_id TEXT NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL,
  sequence_order INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  hints_json TEXT NOT NULL DEFAULT '[]',
  estimated_seconds INTEGER NOT NULL,
  skill TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercise_attempts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  class_id TEXT REFERENCES class_groups(id),
  submitted_answer TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  elapsed_seconds INTEGER NOT NULL,
  topic TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id TEXT REFERENCES class_groups(id),
  minutes_studied INTEGER NOT NULL,
  completed_lessons INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_skill_metrics (
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  strength_score INTEGER NOT NULL,
  weakness_score INTEGER NOT NULL,
  last_accuracy INTEGER NOT NULL,
  recommendation TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (student_id, topic)
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TEXT NOT NULL,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS daily_missions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  xp_reward INTEGER NOT NULL,
  coin_reward INTEGER NOT NULL,
  goal INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_mission_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL REFERENCES daily_missions(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, mission_id)
);

CREATE TABLE IF NOT EXISTS daily_mission_assignments (
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_date TEXT NOT NULL,
  exercise_ids_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  PRIMARY KEY (student_id, mission_date)
);

CREATE TABLE IF NOT EXISTS forum_topics (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES class_groups(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '',
  topic_type TEXT NOT NULL DEFAULT 'discussion',
  due_at TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS signup_requests (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  requested_teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grade_band TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_student_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS teacher_password_resets (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_at TEXT NOT NULL,
  approved_at TEXT,
  completed_at TEXT,
  approved_by TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  temporary_password_plain TEXT,
  temporary_password_hash TEXT,
  email_message TEXT
);

CREATE TABLE IF NOT EXISTS cosmetic_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  rarity TEXT NOT NULL,
  asset_url TEXT NOT NULL,
  description TEXT NOT NULL,
  unlock_hint TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 0,
  price INTEGER NOT NULL DEFAULT 0,
  is_purchasable INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_cosmetics (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES cosmetic_items(id) ON DELETE CASCADE,
  unlocked_at TEXT NOT NULL,
  equipped INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS teacher_trails (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_trail_activities (
  id TEXT PRIMARY KEY,
  trail_id TEXT NOT NULL REFERENCES teacher_trails(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  difficulty INTEGER,
  estimated_minutes INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  source_exercise_id TEXT REFERENCES exercises(id),
  sequence_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_trail_classes (
  trail_id TEXT NOT NULL REFERENCES teacher_trails(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (trail_id, class_id)
);

CREATE TABLE IF NOT EXISTS student_trail_activity_progress (
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trail_activity_id TEXT NOT NULL REFERENCES teacher_trail_activities(id) ON DELETE CASCADE,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (student_id, trail_activity_id)
);

-- ==========================================
-- INSERÇÃO DO CONFIG INICIAL DE MASTER
-- ==========================================

INSERT INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('teacher_access_code', 'MASTER-MAT-2026', NOW())
ON CONFLICT(setting_key) DO NOTHING;
