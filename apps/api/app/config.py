from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Matematica Todo Dia API"
    app_version: str = "1.0.0"
    environment: str = "development"
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ]
    cors_origin_regex: str = r"http://(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):3000"
    database_path: str = "data/matematica_todo_dia.db"
    database_url: str | None = None
    master_access_code: str = "MASTER-MAT-2026"

    model_config = SettingsConfigDict(env_file=".env", env_prefix="MTD_")


settings = Settings()
