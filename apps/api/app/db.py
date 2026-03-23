from __future__ import annotations

import hashlib
import hmac
import json
import re
import secrets
import sqlite3
import unicodedata
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Iterator

import psycopg
from psycopg.rows import dict_row

from app.config import settings
from app.cosmetics import COSMETIC_CATALOG
from app.question_bank import QUESTION_BANK_LESSONS, QUESTION_BANK_PATHS, build_question_bank


SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
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
  teacher_id TEXT NOT NULL REFERENCES users(id),
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
"""


def now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat()


def _ensure_database_directory() -> Path:
    db_path = Path(settings.database_path)
    if not db_path.is_absolute():
        db_path = Path(__file__).resolve().parent.parent / db_path
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return db_path


def make_password_hash(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    salt, digest = stored_hash.split("$", 1)
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000).hex()
    return hmac.compare_digest(candidate, digest)


def using_postgres() -> bool:
    return bool(settings.database_url)


def _normalize_query(query: str) -> str:
    if not using_postgres():
        return query
    return query.replace("%", "%%").replace("?", "%s")


def _normalize_script(script: str) -> str:
    if not using_postgres():
        return script
    lines = [line for line in script.splitlines() if not line.strip().upper().startswith("PRAGMA ")]
    return "\n".join(lines)


class QueryResult:
    def __init__(self, cursor: Any):
        self._cursor = cursor

    def fetchone(self) -> Any:
        return self._cursor.fetchone()

    def fetchall(self) -> list[Any]:
        return self._cursor.fetchall()


class DatabaseConnection:
    def __init__(self, raw_connection: Any, *, backend: str):
        self.raw_connection = raw_connection
        self.backend = backend

    def execute(self, query: str, params: tuple[Any, ...] = ()) -> QueryResult:
        cursor = self.raw_connection.cursor()
        cursor.execute(_normalize_query(query), params)
        return QueryResult(cursor)

    def executemany(self, query: str, params_seq: list[tuple[Any, ...]] | tuple[tuple[Any, ...], ...]) -> None:
        cursor = self.raw_connection.cursor()
        cursor.executemany(_normalize_query(query), params_seq)
        cursor.close()

    def executescript(self, script: str) -> None:
        normalized_script = _normalize_script(script)
        if self.backend == "sqlite":
            self.raw_connection.executescript(normalized_script)
            return
        cursor = self.raw_connection.cursor()
        cursor.execute(normalized_script)
        cursor.close()

    def commit(self) -> None:
        self.raw_connection.commit()

    def close(self) -> None:
        self.raw_connection.close()


@contextmanager
def get_connection() -> Iterator[DatabaseConnection]:
    if using_postgres():
        raw_connection = psycopg.connect(settings.database_url, row_factory=dict_row)
        connection = DatabaseConnection(raw_connection, backend="postgres")
    else:
        db_path = _ensure_database_directory()
        raw_connection = sqlite3.connect(db_path)
        raw_connection.row_factory = sqlite3.Row
        raw_connection.execute("PRAGMA foreign_keys = ON;")
        connection = DatabaseConnection(raw_connection, backend="sqlite")
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def initialize_database() -> None:
    with get_connection() as connection:
        connection.executescript(SCHEMA_SQL)
        _run_migrations(connection)
        _seed_database(connection)


def _table_columns(connection: DatabaseConnection, table_name: str) -> set[str]:
    if connection.backend == "postgres":
        rows = connection.execute(
            """
            SELECT column_name AS name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ?
            """,
            (table_name,),
        ).fetchall()
    else:
        rows = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {row["name"] for row in rows}


def _table_exists(connection: DatabaseConnection, table_name: str) -> bool:
    if connection.backend == "postgres":
        row = connection.execute(
            """
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = ?
            ) AS exists
            """,
            (table_name,),
        ).fetchone()
        return bool(row["exists"])
    row = connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", (table_name,)).fetchone()
    return row is not None


def _add_column_if_missing(connection: DatabaseConnection, table_name: str, column_name: str, definition: str) -> None:
    if column_name in _table_columns(connection, table_name):
        return
    statement = f"ALTER TABLE {table_name} ADD COLUMN {definition}"
    if connection.backend == "postgres":
        statement = f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {definition}"
    try:
        connection.execute(statement)
    except Exception as error:
        if connection.backend == "sqlite" and "duplicate column name" in str(error).lower():
            return
        raise


def _run_migrations(connection: DatabaseConnection) -> None:
    user_columns = _table_columns(connection, "users")
    if "username" not in user_columns:
        _add_column_if_missing(connection, "users", "username", "username TEXT")
    if "student_pin" not in user_columns:
        _add_column_if_missing(connection, "users", "student_pin", "student_pin TEXT")
    connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username) WHERE username IS NOT NULL")
    class_columns = _table_columns(connection, "class_groups")
    if "school_name" not in class_columns:
        _add_column_if_missing(connection, "class_groups", "school_name", "school_name TEXT")
    forum_columns = _table_columns(connection, "forum_topics")
    if "topic_type" not in forum_columns:
        _add_column_if_missing(connection, "forum_topics", "topic_type", "topic_type TEXT NOT NULL DEFAULT 'discussion'")
    if "due_at" not in forum_columns:
        _add_column_if_missing(connection, "forum_topics", "due_at", "due_at TEXT")
    if not _table_exists(connection, "signup_requests"):
        connection.execute(
            """
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
            )
            """
        )
    if not _table_exists(connection, "teacher_password_resets"):
        connection.execute(
            """
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
            )
            """
        )
    if not _table_exists(connection, "cosmetic_items"):
        connection.execute(
            """
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
            )
            """
        )
    cosmetic_columns = _table_columns(connection, "cosmetic_items")
    if "price" not in cosmetic_columns:
        _add_column_if_missing(connection, "cosmetic_items", "price", "price INTEGER NOT NULL DEFAULT 0")
    if "is_purchasable" not in cosmetic_columns:
        _add_column_if_missing(connection, "cosmetic_items", "is_purchasable", "is_purchasable INTEGER NOT NULL DEFAULT 0")
    teacher_trail_activity_columns = _table_columns(connection, "teacher_trail_activities")
    if "source_exercise_id" not in teacher_trail_activity_columns:
        _add_column_if_missing(
            connection,
            "teacher_trail_activities",
            "source_exercise_id",
            "source_exercise_id TEXT REFERENCES exercises(id)",
        )
    if not _table_exists(connection, "user_cosmetics"):
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS user_cosmetics (
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              item_id TEXT NOT NULL REFERENCES cosmetic_items(id) ON DELETE CASCADE,
              unlocked_at TEXT NOT NULL,
              equipped INTEGER NOT NULL DEFAULT 0,
              PRIMARY KEY (user_id, item_id)
            )
            """
        )
    if not _table_exists(connection, "daily_mission_assignments"):
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS daily_mission_assignments (
              student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              mission_date TEXT NOT NULL,
              exercise_ids_json TEXT NOT NULL DEFAULT '[]',
              created_at TEXT NOT NULL,
              PRIMARY KEY (student_id, mission_date)
            )
            """
        )
    if not _table_exists(connection, "teacher_trails"):
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS teacher_trails (
              id TEXT PRIMARY KEY,
              teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              title TEXT NOT NULL,
              description TEXT NOT NULL DEFAULT '',
              created_at TEXT NOT NULL
            )
            """
        )
    if not _table_exists(connection, "teacher_trail_activities"):
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS teacher_trail_activities (
              id TEXT PRIMARY KEY,
              trail_id TEXT NOT NULL REFERENCES teacher_trails(id) ON DELETE CASCADE,
              title TEXT NOT NULL,
              activity_type TEXT NOT NULL,
              difficulty INTEGER,
              estimated_minutes INTEGER NOT NULL,
              xp_reward INTEGER NOT NULL,
              sequence_order INTEGER NOT NULL
            )
            """
        )
    if not _table_exists(connection, "teacher_trail_classes"):
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS teacher_trail_classes (
              trail_id TEXT NOT NULL REFERENCES teacher_trails(id) ON DELETE CASCADE,
              class_id TEXT NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
              PRIMARY KEY (trail_id, class_id)
            )
            """
        )
    if not _table_exists(connection, "student_trail_activity_progress"):
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS student_trail_activity_progress (
              student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              trail_activity_id TEXT NOT NULL REFERENCES teacher_trail_activities(id) ON DELETE CASCADE,
              completed_at TEXT NOT NULL,
              PRIMARY KEY (student_id, trail_activity_id)
            )
            """
        )
    if not _table_exists(connection, "app_settings"):
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS app_settings (
              setting_key TEXT PRIMARY KEY,
              setting_value TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
            """
        )
    connection.execute(
        """
        INSERT INTO app_settings (setting_key, setting_value, updated_at)
        VALUES ('teacher_access_code', ?, ?)
        ON CONFLICT(setting_key) DO NOTHING
        """,
        (settings.master_access_code, now_iso()),
    )
    _ensure_student_credentials(connection)


def normalize_username(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii").lower()
    normalized = re.sub(r"[^a-z0-9._-]+", "", normalized)
    return normalized.strip("._-")


def _unique_username(connection: DatabaseConnection, base_value: str, exclude_user_id: str | None = None) -> str:
    base_username = normalize_username(base_value) or f"aluno{secrets.randbelow(9000) + 1000}"
    candidate = base_username
    suffix = 1
    while True:
        if exclude_user_id:
            row = connection.execute(
                "SELECT id FROM users WHERE username = ? AND id <> ?",
                (candidate, exclude_user_id),
            ).fetchone()
        else:
            row = connection.execute("SELECT id FROM users WHERE username = ?", (candidate,)).fetchone()
        if row is None:
            return candidate
        suffix += 1
        candidate = f"{base_username}{suffix}"


def _default_student_pin(index: int) -> str:
    seeded_pins = ["1234", "2345", "3456", "4567", "5678", "6789", "7890", "8901", "9012"]
    if index < len(seeded_pins):
        return seeded_pins[index]
    return f"{1000 + index:04d}"[-4:]


def _ensure_student_credentials(connection: DatabaseConnection) -> None:
    student_rows = connection.execute(
        """
        SELECT id, full_name, email, username, student_pin
        FROM users
        WHERE role = 'student'
        ORDER BY created_at, id
        """
    ).fetchall()
    for index, row in enumerate(student_rows):
        next_username = row["username"]
        next_pin = row["student_pin"]
        updates: list[str] = []
        params: list[Any] = []

        if not next_username:
            base_source = row["email"].split("@", 1)[0] if row["email"] else row["full_name"]
            next_username = _unique_username(connection, base_source, row["id"])
            updates.append("username = ?")
            params.append(next_username)

        if not next_pin or not str(next_pin).isdigit() or len(str(next_pin)) != 4:
            next_pin = _default_student_pin(index)
            updates.extend(["student_pin = ?", "password_hash = ?"])
            params.extend([next_pin, make_password_hash(next_pin)])

        if updates:
            updates.append("updated_at = ?")
            params.append(now_iso())
            params.append(row["id"])
            connection.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
                tuple(params),
            )


def _has_data(connection: DatabaseConnection, table: str) -> bool:
    row = connection.execute(f"SELECT 1 FROM {table} LIMIT 1").fetchone()
    return row is not None


def _ensure_cosmetic_catalog(connection: DatabaseConnection) -> None:
    created_at = now_iso()
    connection.executemany(
        """
        INSERT INTO cosmetic_items (
          id, name, category, rarity, asset_url, description, unlock_hint, requirement_type, requirement_value, price, is_purchasable, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          category = excluded.category,
          rarity = excluded.rarity,
          asset_url = excluded.asset_url,
          description = excluded.description,
          unlock_hint = excluded.unlock_hint,
          requirement_type = excluded.requirement_type,
          requirement_value = excluded.requirement_value,
          price = excluded.price,
          is_purchasable = excluded.is_purchasable
        """,
        [
            (
                item.id,
                item.name,
                item.category,
                item.rarity,
                item.asset_url,
                item.description,
                item.unlock_hint,
                item.requirement_type,
                item.requirement_value,
                item.price,
                1 if item.is_purchasable else 0,
                created_at,
            )
            for item in COSMETIC_CATALOG
        ],
    )


def _ensure_achievement_catalog(connection: DatabaseConnection) -> None:
    achievements = [
        ("achievement-001", "streak_7", "Fogo Constante", "Estude por 7 dias seguidos", "flame"),
        ("achievement-002", "accuracy_master", "Mira Perfeita", "Acerte 10 questoes seguidas", "target"),
        ("achievement-003", "forum_helper", "Tutor da Turma", "Responda 10 mensagens no forum", "messages-square"),
        ("achievement-004", "mission_daily", "Missao Cumprida", "Conclua a missao diaria completa", "sparkles"),
        ("achievement-005", "coins_400", "Colecionador", "Junte 400 moedas na plataforma", "gem"),
    ]
    connection.executemany(
        """
        INSERT INTO achievements (id, code, name, description, icon)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(code) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          icon = excluded.icon
        """,
        achievements,
    )


def _unlocks_for_user(connection: DatabaseConnection, user_id: str) -> set[str]:
    user = connection.execute("SELECT level, xp, coins, streak FROM users WHERE id = ?", (user_id,)).fetchone()
    if user is None:
        return set()
    unlocked: set[str] = set()
    for item in COSMETIC_CATALOG:
        if item.requirement_type == "default":
            unlocked.add(item.id)
        elif item.requirement_type == "level" and int(user["level"]) >= item.requirement_value:
            unlocked.add(item.id)
        elif item.requirement_type == "streak" and int(user["streak"]) >= item.requirement_value:
            unlocked.add(item.id)
        elif item.requirement_type == "coins" and int(user["coins"]) >= item.requirement_value:
            unlocked.add(item.id)
        elif item.requirement_type == "xp_streak_combo" and int(user["xp"]) >= item.requirement_value and int(user["streak"]) >= 7:
            unlocked.add(item.id)
    return unlocked


def _sync_user_cosmetics(connection: DatabaseConnection, user_id: str) -> None:
    unlocked_ids = _unlocks_for_user(connection, user_id)
    if not unlocked_ids:
        return
    existing_rows = connection.execute(
        "SELECT item_id, equipped FROM user_cosmetics WHERE user_id = ?",
        (user_id,),
    ).fetchall()
    existing_ids = {row["item_id"] for row in existing_rows}
    created_at = now_iso()
    for item_id in unlocked_ids - existing_ids:
        connection.execute(
            "INSERT INTO user_cosmetics (user_id, item_id, unlocked_at, equipped) VALUES (?, ?, ?, 0)",
            (user_id, item_id, created_at),
        )
    equipped_item = next((row["item_id"] for row in existing_rows if int(row["equipped"]) == 1), None)
    if equipped_item is None:
        preferred_item = "avatar-matgo-owl"
        if preferred_item not in unlocked_ids:
            preferred_item = next(iter(unlocked_ids))
        connection.execute("UPDATE user_cosmetics SET equipped = 0 WHERE user_id = ?", (user_id,))
        connection.execute(
            "UPDATE user_cosmetics SET equipped = 1 WHERE user_id = ? AND item_id = ?",
            (user_id, preferred_item),
        )
        avatar_row = connection.execute("SELECT asset_url FROM cosmetic_items WHERE id = ?", (preferred_item,)).fetchone()
        if avatar_row is not None:
            connection.execute("UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?", (avatar_row["asset_url"], now_iso(), user_id))


def _seed_database(connection: DatabaseConnection) -> None:
    created_at = now_iso()
    if not _has_data(connection, "users"):
        school_id = "school-001"
        master_id = "master-001"
        teacher_id = "teacher-001"
        teacher2_id = "teacher-002"
        students = [
            ("student-001", "Ana Carolina", "ana@matematica.local", "ana", "1234", "8o ano", 12, 1860, 940, 9, 4),
            ("student-002", "Pedro Henrique", "pedro@matematica.local", "pedro", "2345", "8o ano", 11, 1650, 820, 6, 5),
            ("student-003", "Marcos Vinicius", "marcos@matematica.local", "marcos", "3456", "8o ano", 7, 990, 410, 3, 3),
            ("student-004", "Julia Santos", "julia@matematica.local", "julia", "4567", "1o EM", 8, 1180, 500, 5, 4),
        ]

        connection.execute(
            "INSERT INTO schools (id, name, created_at) VALUES (?, ?, ?)",
            (school_id, "Colegio Matematica Todo Dia", created_at),
        )

        users = [
            (
                master_id,
                school_id,
                "master",
                "Administrador Master",
                "master@matematica.local",
                make_password_hash("Master@123"),
                "https://api.dicebear.com/8.x/adventurer/svg?seed=Master",
                None,
                "Acesso total da plataforma",
                99,
                99999,
                9999,
                365,
                99,
            ),
            (
                teacher_id,
                school_id,
                "teacher",
                "Prof. Carla Menezes",
                "carla@matematica.local",
                make_password_hash("Professor@123"),
                "https://api.dicebear.com/8.x/adventurer/svg?seed=Carla",
                "8o ano",
                "Especialista em aprendizagem adaptativa.",
                24,
                4600,
                2100,
                22,
                5,
            ),
            (
                teacher2_id,
                school_id,
                "teacher",
                "Prof. Ricardo Alves",
                "ricardo@matematica.local",
                make_password_hash("Professor@123"),
                "https://api.dicebear.com/8.x/adventurer/svg?seed=Ricardo",
                "1o EM",
                "Professor de algebra e funcoes.",
                21,
                4180,
                1800,
                18,
                5,
            ),
        ]

        connection.executemany(
            """
            INSERT INTO users (
              id, school_id, role, full_name, email, password_hash, avatar_url, grade_band, bio,
              level, xp, coins, streak, lives, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (*user, created_at, created_at) for user in users
            ],
        )

        connection.executemany(
            """
            INSERT INTO users (
              id, school_id, role, full_name, email, username, password_hash, student_pin, avatar_url, grade_band, bio,
              level, xp, coins, streak, lives, created_at, updated_at
            ) VALUES (?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    student_id,
                    school_id,
                    name,
                    email,
                    username,
                    make_password_hash(student_pin),
                    student_pin,
                    f"https://api.dicebear.com/8.x/adventurer/svg?seed={name.split()[0]}",
                    grade_band,
                    "Aluno ativo na plataforma.",
                    level,
                    xp,
                    coins,
                    streak,
                    lives,
                    created_at,
                    created_at,
                )
                for student_id, name, email, username, student_pin, grade_band, level, xp, coins, streak, lives in students
            ],
        )
        connection.executemany(
            "INSERT INTO teacher_student_links (teacher_id, student_id) VALUES (?, ?)",
            [
                (teacher_id, "student-001"),
                (teacher_id, "student-002"),
                (teacher_id, "student-003"),
                (teacher2_id, "student-004"),
            ],
        )

        classes = [
            ("class-001", school_id, teacher_id, "Domingos Fco - Matematica", "8o Ano A", "8o ano", "8A2026"),
            ("class-002", school_id, teacher2_id, "Domingos Fco - Matematica", "1o EM B", "1o EM", "1EMB26"),
        ]
        connection.executemany(
            "INSERT INTO class_groups (id, school_id, teacher_id, school_name, name, grade_band, invite_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [(*item, created_at) for item in classes],
        )

        enrollments = [
            ("class-001", "student-001"),
            ("class-001", "student-002"),
            ("class-001", "student-003"),
            ("class-002", "student-004"),
        ]
        connection.executemany(
            "INSERT INTO class_enrollments (class_id, student_id, joined_at) VALUES (?, ?, ?)",
            [(*item, created_at) for item in enrollments],
        )

    _ensure_cosmetic_catalog(connection)
    _ensure_achievement_catalog(connection)
    user_rows = connection.execute("SELECT id FROM users").fetchall()
    for user_row in user_rows:
        _sync_user_cosmetics(connection, user_row["id"])

    paths = [
        ("path-001", "Mundo das Fracoes", "Fracoes", "6o ao 8o ano", "iniciante", "Ilhas das Partes", 76),
        ("path-002", "Liga da Algebra", "Algebra", "8o ano ao 1o EM", "intermediario", "Cidade das Equacoes", 48),
        ("path-003", "Laboratorio das Funcoes", "Funcoes", "1o ao 3o EM", "avancado", "Orbita dos Graficos", 22),
    ]
    for path in paths:
        connection.execute(
            """
            INSERT INTO learning_paths (id, title, category, grade_band, difficulty, world_name, completion_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING
            """,
            path,
        )
    for path in QUESTION_BANK_PATHS:
        connection.execute(
            """
            INSERT INTO learning_paths (id, title, category, grade_band, difficulty, world_name, completion_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING
            """,
            path,
        )

    lessons = [
        ("lesson-001", "path-001", "Fracoes equivalentes e soma", "Domine representacoes equivalentes e operacoes basicas.", 8, 1, 40),
        ("lesson-002", "path-001", "Comparacao e simplificacao", "Compare fracoes e simplifique respostas com confianca.", 7, 2, 45),
        ("lesson-003", "path-002", "Equacoes do 1o grau", "Resolva incognitas com equilibrio e raciocinio.", 10, 1, 55),
        ("lesson-004", "path-003", "Leitura de graficos lineares", "Conecte taxa de variacao e interpretacao visual.", 12, 1, 70),
    ]
    for lesson in lessons:
        connection.execute(
            """
            INSERT INTO lessons (id, path_id, title, summary, estimated_minutes, sequence_order, xp_reward)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING
            """,
            lesson,
        )
    for lesson in QUESTION_BANK_LESSONS:
        connection.execute(
            """
            INSERT INTO lessons (id, path_id, title, summary, estimated_minutes, sequence_order, xp_reward)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING
            """,
            lesson,
        )

    exercises = [
        (
            "ex-001",
            "lesson-001",
            "Qual e a fracao equivalente a 3/4?",
            "multiple_choice",
            2,
            "6/8",
            "Multiplicando numerador e denominador por 2, 3/4 vira 6/8.",
            '[{"id":"a","label":"6/8","value":"6/8"},{"id":"b","label":"4/7","value":"4/7"},{"id":"c","label":"9/16","value":"9/16"},{"id":"d","label":"12/20","value":"12/20"}]',
            '["Pense em multiplicar numerador e denominador pelo mesmo numero."]',
            35,
            "fracoes equivalentes",
        ),
        (
            "ex-002",
            "lesson-001",
            "Digite o resultado: 2/3 + 1/6",
            "input",
            3,
            "5/6",
            "MMC entre 3 e 6 e 6. Assim, 2/3 vira 4/6 e 4/6 + 1/6 = 5/6.",
            "[]",
            '["Transforme as fracoes para o mesmo denominador."]',
            40,
            "soma de fracoes",
        ),
        (
            "ex-003",
            "lesson-003",
            "Resolva 4x + 3 = 19",
            "timed",
            4,
            "4",
            "Subtraia 3 dos dois lados e depois divida por 4.",
            "[]",
            '["Isole o termo com x em duas etapas."]',
            45,
            "equacoes do 1o grau",
        ),
        (
            "ex-004",
            "lesson-001",
            "Qual fracao e maior: 2/5 ou 3/5?",
            "multiple_choice",
            1,
            "3/5",
            "Quando os denominadores sao iguais, a maior fracao e a de maior numerador.",
            '[{"id":"a","label":"2/5","value":"2/5"},{"id":"b","label":"3/5","value":"3/5"},{"id":"c","label":"sao iguais","value":"sao iguais"},{"id":"d","label":"nenhuma","value":"nenhuma"}]',
            '["Compare apenas os numeradores."]',
            25,
            "comparacao de fracoes",
        ),
        (
            "ex-005",
            "lesson-002",
            "Simplifique a fracao 12/18.",
            "input",
            2,
            "2/3",
            "Divida numerador e denominador por 6 para obter a forma irredutivel.",
            "[]",
            '["Procure o maior divisor comum entre 12 e 18."]',
            35,
            "simplificacao de fracoes",
        ),
        (
            "ex-006",
            "lesson-003",
            "Resolva 2x = 18.",
            "input",
            2,
            "9",
            "Divida os dois lados da equacao por 2.",
            "[]",
            '["Isole o x dividindo pelo coeficiente."]',
            25,
            "equacoes do 1o grau",
        ),
        (
            "ex-007",
            "lesson-003",
            "Qual valor de x satisfaz x - 7 = 5?",
            "multiple_choice",
            2,
            "12",
            "Some 7 aos dois lados para isolar x.",
            '[{"id":"a","label":"10","value":"10"},{"id":"b","label":"11","value":"11"},{"id":"c","label":"12","value":"12"},{"id":"d","label":"13","value":"13"}]',
            '["Desfaca a subtracao somando 7."]',
            30,
            "equacoes do 1o grau",
        ),
        (
            "ex-008",
            "lesson-004",
            "Em um grafico linear crescente, a variacao de y quando x aumenta tende a ser:",
            "multiple_choice",
            3,
            "positiva",
            "Uma reta crescente indica taxa de variacao positiva.",
            '[{"id":"a","label":"negativa","value":"negativa"},{"id":"b","label":"nula","value":"nula"},{"id":"c","label":"positiva","value":"positiva"},{"id":"d","label":"aleatoria","value":"aleatoria"}]',
            '["Observe o comportamento de subida da reta."]',
            30,
            "leitura de graficos",
        ),
        (
            "ex-009",
            "lesson-004",
            "Se um produto custa 100 reais e recebe desconto de 20%, qual o novo preco?",
            "input",
            3,
            "80",
            "Vinte por cento de 100 e 20. Entao 100 - 20 = 80.",
            "[]",
            '["Calcule primeiro o valor do desconto."]',
            40,
            "porcentagem",
        ),
        (
            "ex-010",
            "lesson-004",
            "Uma moeda foi lancada 10 vezes e caiu cara 7 vezes. A frequencia observada de cara foi:",
            "multiple_choice",
            2,
            "70%",
            "Sete em dez corresponde a 70%.",
            '[{"id":"a","label":"7%","value":"7%"},{"id":"b","label":"17%","value":"17%"},{"id":"c","label":"70%","value":"70%"},{"id":"d","label":"0,7%","value":"0,7%"}]',
            '["Transforme 7/10 em porcentagem."]',
            30,
            "probabilidade",
        ),
    ]
    for exercise in exercises:
        connection.execute(
            """
            INSERT INTO exercises (
              id, lesson_id, prompt, exercise_type, difficulty, correct_answer, explanation,
              options_json, hints_json, estimated_seconds, skill
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING
            """,
            exercise,
        )
    connection.execute("DELETE FROM exercises WHERE id LIKE 'qb-%'")
    for seed in build_question_bank():
        connection.execute(
            """
            INSERT INTO exercises (
              id, lesson_id, prompt, exercise_type, difficulty, correct_answer, explanation,
              options_json, hints_json, estimated_seconds, skill
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              lesson_id = excluded.lesson_id,
              prompt = excluded.prompt,
              exercise_type = excluded.exercise_type,
              difficulty = excluded.difficulty,
              correct_answer = excluded.correct_answer,
              explanation = excluded.explanation,
              options_json = excluded.options_json,
              hints_json = excluded.hints_json,
              estimated_seconds = excluded.estimated_seconds,
              skill = excluded.skill
            """,
            (
                seed.id,
                seed.lesson_id,
                seed.prompt,
                seed.exercise_type,
                seed.difficulty,
                seed.correct_answer,
                seed.explanation,
                seed.options_json,
                seed.hints_json,
                seed.estimated_seconds,
                seed.skill,
            ),
        )

    if _has_data(connection, "student_skill_metrics"):
        return

    metrics = [
        ("student-001", "MMC em fracoes", 82, 18, 84, "Pode avancar para problemas contextualizados."),
        ("student-001", "Equacoes", 60, 40, 61, "Reforcar isolamento da incognita."),
        ("student-002", "Fracoes", 75, 25, 78, "Revisar simplificacao com maior frequencia."),
        ("student-003", "Fracoes", 45, 55, 52, "Retomar base de equivalencia e comparacao."),
        ("student-004", "Funcoes", 58, 42, 60, "Praticar leitura de graficos e variacao linear."),
    ]
    connection.executemany(
        """
        INSERT INTO student_skill_metrics (
          student_id, topic, strength_score, weakness_score, last_accuracy, recommendation, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(student_id, topic) DO NOTHING
        """,
        [(*metric, created_at) for metric in metrics],
    )

    attempts = [
        ("attempt-001", "student-001", "ex-001", "class-001", "6/8", 1, 31, "Fracoes", (datetime.utcnow() - timedelta(days=1)).isoformat()),
        ("attempt-002", "student-001", "ex-002", "class-001", "4/6", 0, 44, "Fracoes", (datetime.utcnow() - timedelta(days=1)).isoformat()),
        ("attempt-003", "student-002", "ex-001", "class-001", "6/8", 1, 29, "Fracoes", now_iso()),
        ("attempt-004", "student-003", "ex-002", "class-001", "5/6", 1, 39, "Fracoes", now_iso()),
        ("attempt-005", "student-004", "ex-003", "class-002", "4", 1, 37, "Algebra", now_iso()),
    ]
    connection.executemany(
        """
        INSERT INTO exercise_attempts (
          id, student_id, exercise_id, class_id, submitted_answer, is_correct, elapsed_seconds, topic, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
        """,
        attempts,
    )

    sessions = [
        ("session-001", "student-001", "class-001", 118, 6, 320, now_iso()),
        ("session-002", "student-002", "class-001", 104, 5, 260, now_iso()),
        ("session-003", "student-003", "class-001", 42, 2, 90, now_iso()),
        ("session-004", "student-004", "class-002", 96, 4, 230, now_iso()),
    ]
    connection.executemany(
        """
        INSERT INTO study_sessions (id, student_id, class_id, minutes_studied, completed_lessons, xp_earned, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
        """,
        sessions,
    )

    achievements = [
        ("achievement-001", "streak_7", "Fogo Constante", "Estude por 7 dias seguidos", "flame"),
        ("achievement-002", "accuracy_master", "Mira Perfeita", "Acerte 20 questoes seguidas", "target"),
        ("achievement-003", "forum_helper", "Tutor da Turma", "Responda 10 duvidas no forum", "messages-square"),
    ]
    connection.executemany(
        """
        INSERT INTO achievements (id, code, name, description, icon) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(code) DO NOTHING
        """,
        achievements,
    )
    connection.executemany(
        """
        INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)
        ON CONFLICT(user_id, achievement_id) DO NOTHING
        """,
        [
            ("student-001", "achievement-001", created_at),
            ("teacher-001", "achievement-003", created_at),
        ],
    )

    missions = [
        ("mission-001", "Aquecimento Diario", "Resolva 5 exercicios hoje", 35, 20, 5),
        ("mission-002", "Velocidade Matematica", "Complete um desafio cronometrado", 50, 35, 1),
        ("mission-003", "Ajudante do Forum", "Responda uma pergunta no forum", 20, 10, 1),
    ]
    connection.executemany(
        """
        INSERT INTO daily_missions (id, title, description, xp_reward, coin_reward, goal) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
        """,
        missions,
    )
    connection.executemany(
        """
        INSERT INTO user_mission_progress (user_id, mission_id, progress, completed) VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, mission_id) DO NOTHING
        """,
        [
            ("student-001", "mission-001", 3, 0),
            ("student-001", "mission-002", 1, 1),
            ("student-001", "mission-003", 0, 0),
        ],
    )

    topics = [
        ("topic-001", "class-001", "student-001", "Duvida em fracoes equivalentes", "Nao entendi por que 3/4 e igual a 6/8.", "fracoes,duvida", "discussion", None, 1, created_at),
        ("topic-002", "class-001", "teacher-001", "Desafio relampago da semana", "Resolva os tres itens sobre fracoes equivalentes e explique sua estrategia.", "desafio,fracoes", "challenge", (datetime.utcnow() + timedelta(days=3)).replace(microsecond=0).isoformat(), 1, created_at),
        ("topic-003", "class-001", "teacher-001", "Revisao para a prova da semana", "Postem aqui as duvidas sobre fracoes e MMC.", "revisao,prova", "discussion", None, 0, created_at),
    ]
    connection.executemany(
        """
        INSERT INTO forum_topics (id, class_id, author_id, title, body, tags, topic_type, due_at, is_pinned, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
        """,
        topics,
    )
    posts = [
        ("post-001", "topic-001", "teacher-001", "Porque voce multiplicou numerador e denominador pelo mesmo numero, preservando o valor da fracao.", created_at),
        ("post-002", "topic-001", "student-002", "Eu pensei em pizza cortada em mais partes. Isso ajudou.", created_at),
        ("post-003", "topic-002", "teacher-001", "Entreguem a resposta comentando neste topico ate o prazo.", created_at),
        ("post-004", "topic-003", "teacher-001", "Vou publicar uma lista extra hoje ate 18h.", created_at),
    ]
    connection.executemany(
        """
        INSERT INTO forum_posts (id, topic_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
        """,
        posts,
    )


def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    created_at = now_iso()
    expires_at = (datetime.utcnow() + timedelta(days=7)).replace(microsecond=0).isoformat()
    with get_connection() as connection:
        connection.execute(
            "INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_id, created_at, expires_at),
        )
    return token


def get_user_by_token(token: str) -> Any | None:
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT u.*
            FROM auth_sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ? AND s.expires_at > ?
            """,
            (token, now_iso()),
        ).fetchone()


def get_user_by_email(email: str) -> Any | None:
    with get_connection() as connection:
        return connection.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()


def get_user_by_username(username: str) -> Any | None:
    with get_connection() as connection:
        return connection.execute("SELECT * FROM users WHERE username = ?", (normalize_username(username),)).fetchone()


def fetch_one(query: str, params: tuple[Any, ...] = ()) -> Any | None:
    with get_connection() as connection:
        return connection.execute(query, params).fetchone()


def fetch_all(query: str, params: tuple[Any, ...] = ()) -> list[Any]:
    with get_connection() as connection:
        return connection.execute(query, params).fetchall()


def execute(query: str, params: tuple[Any, ...] = ()) -> None:
    with get_connection() as connection:
        connection.execute(query, params)


def get_setting_value(setting_key: str, default: str | None = None) -> str | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT setting_value FROM app_settings WHERE setting_key = ?",
            (setting_key,),
        ).fetchone()
    if row is None:
        return default
    return row["setting_value"]


def set_setting_value(setting_key: str, setting_value: str) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO app_settings (setting_key, setting_value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(setting_key) DO UPDATE SET
              setting_value = excluded.setting_value,
              updated_at = excluded.updated_at
            """,
            (setting_key, setting_value, now_iso()),
        )


def import_question_bank_csv(csv_path: str, *, dry_run: bool = False) -> int:
    from app.question_import import parse_question_import_csv

    questions = parse_question_import_csv(csv_path)
    if dry_run:
        return len(questions)

    with get_connection() as connection:
        for question in questions:
            connection.execute(
                """
                INSERT INTO exercises (
                  id, lesson_id, prompt, exercise_type, difficulty, correct_answer, explanation,
                  options_json, hints_json, estimated_seconds, skill
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  lesson_id = excluded.lesson_id,
                  prompt = excluded.prompt,
                  exercise_type = excluded.exercise_type,
                  difficulty = excluded.difficulty,
                  correct_answer = excluded.correct_answer,
                  explanation = excluded.explanation,
                  options_json = excluded.options_json,
                  hints_json = excluded.hints_json,
                  estimated_seconds = excluded.estimated_seconds,
                  skill = excluded.skill
                """,
                (
                    question.id,
                    question.lesson_id,
                    question.prompt,
                    question.exercise_type,
                    question.difficulty,
                    question.correct_answer,
                    question.explanation,
                    question.options_json,
                    question.hints_json,
                    question.estimated_seconds,
                    question.skill,
                ),
            )
    return len(questions)
