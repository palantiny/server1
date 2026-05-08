import os
import pytest
from dotenv import load_dotenv

load_dotenv()


@pytest.fixture(scope="session", autouse=True)
def _ensure_env():
    os.environ.setdefault("OPENAI_API_KEY", "test-key")
    os.environ.setdefault("DJMEDI_BASE_URL", "https://example.invalid")
    os.environ.setdefault("DJMEDI_CFAUTHKEY", "test")
    os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")
    os.environ.setdefault("ADMIN_ID", "admin")
    os.environ.setdefault("ADMIN_PASSWORD", "admin")
    os.environ.setdefault("JWT_SECRET", "test-secret")
