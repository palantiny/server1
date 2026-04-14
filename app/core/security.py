"""
JWT 유틸 및 비밀번호 해시
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt  # pylint: disable=import-error
from passlib.context import CryptContext

from app.core.config import get_settings

ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """비밀번호 해시 (bcrypt)."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """평문 비밀번호와 해시 일치 여부."""
    return pwd_context.verify(plain, hashed)


def create_access_token(*, user_id: str, username: str, role: str) -> str:
    """액세스 토큰 발급 (user_id, username, role 클레임 포함)."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    to_encode: dict[str, Any] = {
        "sub": username,
        "user_id": user_id,
        "username": username,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """토큰 검증. 실패 시 None."""
    settings = get_settings()
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None
