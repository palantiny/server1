"""
Palantiny Web Server DB 연결 모듈
"""
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.security import hash_password
from app.models import Base
from app.models.user import User

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.APP_ENV == "development",
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def ensure_default_admin() -> None:
    """환경변수 ADMIN_ID/ADMIN_PASSWORD로 기본 관리자 계정이 없으면 생성."""
    async with async_session_maker() as session:
        admin_id = settings.ADMIN_ID.strip()
        result = await session.execute(select(User).where(User.username == admin_id))
        if result.scalar_one_or_none() is not None:
            return
        session.add(
            User(
                username=admin_id,
                company_name="Administrator",
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                role="admin",
                is_active=True,
                partner_token=str(uuid4()),
            ),
        )
        await session.commit()


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await ensure_default_admin()


async def close_db() -> None:
    await engine.dispose()
