"""
MVP 로그인 API
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest) -> LoginResponse:
    """관리자 ID/비밀번호 검증 후 JWT 발급."""
    settings = get_settings()
    if (
        body.username.strip() != settings.ADMIN_ID
        or body.password != settings.ADMIN_PASSWORD
    ):
        raise HTTPException(
            status_code=401,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
        )
    token = create_access_token(subject=settings.ADMIN_ID)
    return LoginResponse(access_token=token)
