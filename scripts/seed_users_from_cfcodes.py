"""
cfcode 기반 사용자 시드.

각 항목: username = cfcode, password = "1234", cfcode = cfcode, company_name = cf_company.
이미 username이 존재하면 skip (idempotent).

실행: python scripts/seed_users_from_cfcodes.py
EC2: docker compose exec web_app python scripts/seed_users_from_cfcodes.py
"""
from __future__ import annotations

import asyncio
import logging
from uuid import uuid4

from dotenv import load_dotenv
from sqlalchemy import select

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# (cfcode, company_name)
USERS = [
    ("ch", "채움생"),
    ("cy", "더한한의원 원외탕전실"),
    ("dh", "대구한의대한방병원"),
    ("dj", "DJ MEDI co.ltd"),
    ("dr", "다린 공동탕전원"),
    ("ds", "도솔"),
    ("hb", "누베베한의원원외탕전실"),
    ("hm", "해밀한의원 원외탕전실"),
    ("hp", "이성훈 원외탕전"),
    ("hs", "안심 원외탕전실"),
    ("ij", "임제당"),
    ("kd", "경산 동의한방촌"),
    ("kh", "경희대 한방병원"),
    ("kl", "기린한의원부설"),
    ("ms", "맑은샘 해피"),
    ("on", "따뜻할온원외탕전실"),
    ("pn", "부산대한방병원"),
    ("ws", "우소한제원"),
]


async def main() -> None:
    from app.core.database import async_session_maker
    from app.core.security import hash_password
    from app.models.user import User

    created = 0
    skipped = 0
    async with async_session_maker() as session:
        for cfcode, company in USERS:
            existing = await session.execute(select(User).where(User.username == cfcode))
            if existing.scalar_one_or_none():
                skipped += 1
                logger.info("skip (이미 존재): username=%s", cfcode)
                continue
            user = User(
                username=cfcode,
                hashed_password=hash_password("1234"),
                cfcode=cfcode,
                company_name=company,
                role="user",
                is_active=True,
                partner_token=str(uuid4()),
            )
            session.add(user)
            created += 1
            logger.info("created: username=%s cfcode=%s company=%s", cfcode, cfcode, company)
        await session.commit()
    logger.info("완료: 신규 %d명 / skip %d명 / 전체 %d명", created, skipped, len(USERS))


if __name__ == "__main__":
    asyncio.run(main())
