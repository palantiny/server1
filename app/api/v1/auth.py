"""
기업 계정 등록·로그인 API
"""
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1)
    company_name: str | None = Field(None, max_length=255)
    email: EmailStr | None = None
    cfcode: str | None = Field(None, max_length=10, description="DJMEDI 업체 코드")


class RegisterResponse(BaseModel):
    user_id: str
    username: str
    message: str = "가입이 완료되었습니다."


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> RegisterResponse:
    """기업 계정 등록."""
    username = body.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="사용자명을 입력하세요.")

    user = User(
        username=username,
        company_name=body.company_name.strip() if body.company_name else None,
        email=str(body.email) if body.email else None,
        hashed_password=hash_password(body.password),
        cfcode=body.cfcode.strip() if body.cfcode else None,
        role="user",
        is_active=True,
        partner_token=str(uuid4()),
    )
    db.add(user)
    try:
        await db.flush()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="이미 사용 중인 사용자명입니다.",
        ) from None

    return RegisterResponse(user_id=user.user_id, username=user.username)


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    """DB 사용자 검증 후 JWT 발급."""
    username = body.username.strip()
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="비활성화된 계정입니다.")

    token = create_access_token(
        user_id=user.user_id,
        username=user.username,
        role=user.role,
    )
    return LoginResponse(access_token=token)
