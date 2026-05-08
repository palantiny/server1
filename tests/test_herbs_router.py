"""/herbs 라우터 단위 테스트 — DJMEDI 함수 mock."""
from unittest.mock import patch
import pytest
from httpx import AsyncClient, ASGITransport


@pytest.fixture
def auth_token(monkeypatch):
    """단일 admin 로그인 우회: 인증 의존성 mock."""
    from app.api import deps
    from app.models.user import User

    async def fake_get_current_user():
        return User(user_id="admin", cfcode="dj", role="admin", partner_token="x")

    monkeypatch.setattr(deps, "get_current_user", fake_get_current_user)


@pytest.mark.asyncio
async def test_get_herbs_returns_djmedi_aggregated_list(auth_token):
    fake_makers = [{"mk_code": "0606", "mk_name": "(주)신흥제약"}]
    fake_meds = [{"md_code": "HD1", "md_medi": "M1", "md_name": "감초", "mk_code": "0606", "mk_name": "(주)신흥제약"}]

    async def fake_get_maker_list():
        return fake_makers

    async def fake_get_medicine_by_maker(mk_code):
        return fake_meds if mk_code == "0606" else []

    from app.web_main import app
    with patch("app.api.v1.herbs.get_maker_list", side_effect=fake_get_maker_list), \
         patch("app.api.v1.herbs.get_medicine_by_maker", side_effect=fake_get_medicine_by_maker):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/v1/herbs", headers={"Authorization": "Bearer x"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert any(h["name"] == "감초" for h in data["herbs"])


@pytest.mark.asyncio
async def test_get_herb_detail_returns_djmedi_item(auth_token):
    fake_makers = [{"mk_code": "0606", "mk_name": "씨케이"}]
    fake_meds = [{"md_code": "HD1", "md_medi": "M1", "md_name": "감초", "mk_code": "0606", "mk_name": "씨케이"}]

    async def fake_get_maker_list():
        return fake_makers

    async def fake_get_medicine_by_maker(mk_code):
        return fake_meds if mk_code == "0606" else []

    async def fake_smart_search(intent, **kwargs):
        return ("membermedicine", [])

    from app.web_main import app
    with patch("app.api.v1.herbs.get_maker_list", side_effect=fake_get_maker_list), \
         patch("app.api.v1.herbs.get_medicine_by_maker", side_effect=fake_get_medicine_by_maker), \
         patch("app.api.v1.herbs.smart_search", side_effect=fake_smart_search):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/v1/herbs/HD1", headers={"Authorization": "Bearer x"})
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "HD1"
    assert data["name"] == "감초"
