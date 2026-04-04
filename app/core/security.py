"""
JWT 유틸 (MVP 로그인)
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt  # pylint: disable=import-error

from app.core.config import get_settings

ALGORITHM = "HS256"


def create_access_token(subject: str) -> str:
    """액세스 토큰 발급."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    to_encode: dict[str, Any] = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """토큰 검증. 실패 시 None."""
    settings = get_settings()
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None
