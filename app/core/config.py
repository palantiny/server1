"""
Palantiny Web Server 설정 모듈
"""
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # 데이터베이스
    DATABASE_URL: str = "postgresql+asyncpg://palantiny:palantiny_secret@localhost:5432/palantiny_db"

    # 앱 환경
    APP_ENV: Literal["development", "staging", "production"] = "development"
    LOG_LEVEL: str = "INFO"

    # CORS
    ALLOWED_ORIGINS: str = "*"

    # Neo4j AuraDB
    NEO4J_URI: str = ""
    NEO4J_USERNAME: str = ""
    NEO4J_PASSWORD: str = ""
    NEO4J_DATABASE: str = ""

    # MVP 로그인 (admin / 1234 등)
    ADMIN_ID: str = "admin"
    ADMIN_PASSWORD: str = "1234"
    JWT_SECRET: str = "change-me-in-production"
    JWT_EXPIRE_HOURS: int = 24


@lru_cache
def get_settings() -> Settings:
    return Settings()
