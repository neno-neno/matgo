CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  school_id UUID REFERENCES schools(id),
  role VARCHAR(20) NOT NULL CHECK (role IN ('master', 'teacher', 'student')),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  grade_band VARCHAR(40),
  bio TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  lives INTEGER NOT NULL DEFAULT 5,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_student_links (
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, student_id)
);

CREATE TABLE IF NOT EXISTS class_groups (
  id UUID PRIMARY KEY,
  school_id UUID REFERENCES schools(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(120) NOT NULL,
  grade_band VARCHAR(40) NOT NULL,
  invite_code VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_enrollments (
  class_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  grade_band VARCHAR(40) NOT NULL,
  category VARCHAR(40) NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  world_name VARCHAR(120) NOT NULL,
  completion_rate INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY,
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  summary TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL,
  sequence_order INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  exercise_type VARCHAR(40) NOT NULL,
  difficulty INTEGER NOT NULL,
  correct_answer VARCHAR(120) NOT NULL,
  explanation TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  hints JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_seconds INTEGER NOT NULL,
  skill VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS exercise_attempts (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  class_id UUID REFERENCES class_groups(id),
  submitted_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  elapsed_seconds INTEGER NOT NULL,
  topic VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES class_groups(id),
  minutes_studied INTEGER NOT NULL,
  completed_lessons INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_skill_metrics (
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic VARCHAR(120) NOT NULL,
  strength_score INTEGER NOT NULL,
  weakness_score INTEGER NOT NULL,
  last_accuracy INTEGER NOT NULL,
  recommendation TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, topic)
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY,
  code VARCHAR(60) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS daily_missions (
  id UUID PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  xp_reward INTEGER NOT NULL,
  coin_reward INTEGER NOT NULL,
  goal INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_mission_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES daily_missions(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, mission_id)
);

CREATE TABLE IF NOT EXISTS forum_topics (
  id UUID PRIMARY KEY,
  class_id UUID REFERENCES class_groups(id),
  author_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '',
  topic_type VARCHAR(20) NOT NULL DEFAULT 'discussion',
  due_at TIMESTAMP,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS signup_requests (
  id UUID PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  requested_teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  grade_band VARCHAR(40) NOT NULL,
  note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_student_id UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_class_groups_teacher_id ON class_groups(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student_id ON exercise_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_class_id ON exercise_attempts(class_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_class_id ON forum_topics(class_id);
