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


@lru_cache
def get_settings() -> Settings:
    return Settings()
