"""/herbs 라우터 단위 테스트 — list_user_medicines mock."""
from unittest.mock import patch
import pytest
from httpx import AsyncClient, ASGITransport


def _override_user(cfcode: str | None, role: str = "admin"):
    """app.dependency_overrides에 넣을 fake get_current_user 팩토리."""
    from app.models.user import User

    async def fake_get_current_user():
        return User(
            user_id="admin",
            username="admin",
            cfcode=cfcode,
            role=role,
            partner_token="x",
            hashed_password="x",
        )

    return fake_get_current_user


@pytest.fixture
def auth_token():
    """단일 admin 로그인 우회: dependency_overrides로 인증 의존성 교체."""
    from app.api.deps import get_current_user
    from app.web_main import app

    app.dependency_overrides[get_current_user] = _override_user("dj")
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def auth_token_no_cfcode():
    """cfcode 없는 비-admin 사용자 (admin은 ADMIN_CFCODE fallback이 있어 별도 테스트)."""
    from app.api.deps import get_current_user
    from app.web_main import app

    app.dependency_overrides[get_current_user] = _override_user(None, role="user")
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_get_herbs_returns_user_medicines_for_cfcode(auth_token):
    fake_user_meds = [
        {"md_code": "M1", "md_name": "감초", "mm_origin": "한국", "mk_name": "디제이허브"},
        {"md_code": "M2", "md_name": "황기", "mm_origin": "수입", "mk_name": "디제이허브"},
    ]

    async def fake_list_user_medicines(cfcode):
        assert cfcode == "dj"
        return fake_user_meds

    from app.web_main import app
    with patch("app.api.v1.herbs.list_user_medicines", side_effect=fake_list_user_medicines):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/v1/herbs", headers={"Authorization": "Bearer x"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    names = {h["name"] for h in data["herbs"]}
    assert names == {"감초", "황기"}
    감초 = next(h for h in data["herbs"] if h["name"] == "감초")
    assert 감초["origin"] == "한국"
    assert 감초["manufacturer"] == "디제이허브"


@pytest.mark.asyncio
async def test_get_herbs_returns_empty_when_no_cfcode(auth_token_no_cfcode):
    """cfcode가 None인 user는 빈 목록 반환."""
    from app.web_main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/herbs", headers={"Authorization": "Bearer x"})
    assert res.status_code == 200
    assert res.json() == {"herbs": [], "total": 0}


@pytest.mark.asyncio
async def test_get_herb_detail_returns_three_fields(auth_token):
    fake_user_meds = [
        {"md_code": "M1", "md_name": "감초", "mm_origin": "한국", "mk_name": "디제이허브"},
    ]

    async def fake_list_user_medicines(cfcode):
        return fake_user_meds

    from app.web_main import app
    with patch("app.api.v1.herbs.list_user_medicines", side_effect=fake_list_user_medicines):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/v1/herbs/M1", headers={"Authorization": "Bearer x"})
    assert res.status_code == 200
    data = res.json()
    # 정확히 4개 키만 (id 포함)
    assert set(data.keys()) == {"id", "name", "origin", "manufacturer"}
    assert data["name"] == "감초"
    assert data["origin"] == "한국"
    assert data["manufacturer"] == "디제이허브"


@pytest.mark.asyncio
async def test_get_herb_detail_returns_404_when_not_in_user_inventory(auth_token):
    async def fake_list_user_medicines(cfcode):
        return []  # 사용자 미보유

    from app.web_main import app
    with patch("app.api.v1.herbs.list_user_medicines", side_effect=fake_list_user_medicines):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/v1/herbs/M1", headers={"Authorization": "Bearer x"})
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_get_herbs_uses_admin_cfcode_fallback_when_admin_has_no_cfcode():
    """admin role + cfcode=None → ADMIN_CFCODE("dj") fallback 사용."""
    from app.api.deps import get_current_user
    from app.web_main import app

    app.dependency_overrides[get_current_user] = _override_user(None, role="admin")

    async def fake_list_user_medicines(cfcode):
        # admin fallback이 적용됐다면 cfcode == "dj"
        assert cfcode == "dj"
        return [{"md_code": "M1", "md_name": "감초", "mm_origin": "한국", "mk_name": "디제이허브"}]

    try:
        with patch("app.api.v1.herbs.list_user_medicines", side_effect=fake_list_user_medicines):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.get("/api/v1/herbs", headers={"Authorization": "Bearer x"})
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert data["herbs"][0]["name"] == "감초"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
