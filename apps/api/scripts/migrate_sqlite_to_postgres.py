from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from app.config import settings
from app.db import _ensure_database_directory, initialize_database


TABLE_MIGRATION_ORDER = [
    "schools",
    "users",
    "teacher_student_links",
    "class_groups",
    "class_enrollments",
    "learning_paths",
    "lessons",
    "exercises",
    "exercise_attempts",
    "study_sessions",
    "student_skill_metrics",
    "achievements",
    "user_achievements",
    "daily_missions",
    "user_mission_progress",
    "daily_mission_assignments",
    "forum_topics",
    "forum_posts",
    "auth_sessions",
    "app_settings",
    "signup_requests",
    "teacher_password_resets",
    "cosmetic_items",
    "user_cosmetics",
    "teacher_trails",
    "teacher_trail_activities",
    "teacher_trail_classes",
    "student_trail_activity_progress",
]


def _sqlite_db_path(custom_path: str | None) -> Path:
    if custom_path:
        db_path = Path(custom_path)
        if not db_path.is_absolute():
            db_path = Path.cwd() / db_path
        return db_path
    return _ensure_database_directory()


def _sqlite_columns(connection: sqlite3.Connection, table_name: str) -> list[str]:
    rows = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    return [row["name"] for row in rows]


def _postgres_columns(connection: psycopg.Connection, table_name: str) -> list[str]:
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
            """,
            (table_name,),
        )
        return [row["column_name"] for row in cursor.fetchall()]


def _truncate_tables(connection: psycopg.Connection) -> None:
    tables = ", ".join(TABLE_MIGRATION_ORDER[::-1])
    with connection.cursor() as cursor:
        cursor.execute(f"TRUNCATE TABLE {tables} CASCADE")


def _copy_table(sqlite_connection: sqlite3.Connection, postgres_connection: psycopg.Connection, table_name: str) -> int:
    sqlite_columns = _sqlite_columns(sqlite_connection, table_name)
    postgres_columns = _postgres_columns(postgres_connection, table_name)
    shared_columns = [column for column in sqlite_columns if column in postgres_columns]
    if not shared_columns:
        return 0

    select_columns = ", ".join(shared_columns)
    sqlite_rows = sqlite_connection.execute(f"SELECT {select_columns} FROM {table_name}").fetchall()
    if not sqlite_rows:
        return 0

    placeholders = ", ".join(["%s"] * len(shared_columns))
    insert_columns = ", ".join(shared_columns)
    insert_sql = f"INSERT INTO {table_name} ({insert_columns}) VALUES ({placeholders})"

    with postgres_connection.cursor() as cursor:
        cursor.executemany(
            insert_sql,
            [tuple(row[column] for column in shared_columns) for row in sqlite_rows],
        )
    return len(sqlite_rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrar dados do SQLite local para PostgreSQL.")
    parser.add_argument("--sqlite-path", help="Caminho do arquivo .db local. Usa o padrao da aplicacao se omitido.")
    parser.add_argument("--skip-truncate", action="store_true", help="Nao limpa as tabelas do Postgres antes de importar.")
    args = parser.parse_args()

    if not settings.database_url:
        raise SystemExit("Defina MTD_DATABASE_URL antes de rodar a migracao.")

    sqlite_path = _sqlite_db_path(args.sqlite_path)
    if not sqlite_path.exists():
        raise SystemExit(f"Banco SQLite nao encontrado em: {sqlite_path}")

    initialize_database()

    sqlite_connection = sqlite3.connect(sqlite_path)
    sqlite_connection.row_factory = sqlite3.Row
    postgres_connection = psycopg.connect(settings.database_url)

    try:
        if not args.skip_truncate:
            _truncate_tables(postgres_connection)

        migrated_counts: list[tuple[str, int]] = []
        for table_name in TABLE_MIGRATION_ORDER:
            count = _copy_table(sqlite_connection, postgres_connection, table_name)
            migrated_counts.append((table_name, count))

        postgres_connection.commit()

        print("Migracao concluida com sucesso.")
        for table_name, count in migrated_counts:
            print(f"- {table_name}: {count} registro(s)")
    finally:
        sqlite_connection.close()
        postgres_connection.close()


if __name__ == "__main__":
    main()
