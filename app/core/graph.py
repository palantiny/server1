"""
Palantiny Web Server — Neo4j AuraDB 연결 모듈
"""
import logging

from neo4j import AsyncGraphDatabase

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_driver = None


async def get_neo4j_driver():
    """Neo4j 비동기 드라이버 반환 (지연 초기화)."""
    global _driver
    if _driver is None and settings.NEO4J_URI:
        _driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
        )
    return _driver


async def close_neo4j() -> None:
    """Neo4j 드라이버 종료."""
    global _driver
    if _driver:
        await _driver.close()
        _driver = None
