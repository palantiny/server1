"""
DJMEDI 약재 연동 API 프록시 (herbmaker / herbmedicine / membermedicine)
"""
import logging
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/djmedi", tags=["djmedi"])


async def _call_djmedi(params: dict[str, str]) -> dict[str, Any]:
    settings = get_settings()
    key = (settings.DJMEDI_CFAUTHKEY or "").strip()
    if not key:
        raise HTTPException(
            status_code=503,
            detail="DJMEDI API 키(DJMEDI_CFAUTHKEY)가 설정되지 않았습니다.",
        )
    base = settings.DJMEDI_BASE_URL.rstrip("/") + "/"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                base,
                params=params,
                headers={"cfauthkey": key},
                timeout=60.0,
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.warning("DJMEDI HTTP 오류: %s %s", e.response.status_code, e.response.text[:500])
        raise HTTPException(
            status_code=502,
            detail=f"DJMEDI API 오류: HTTP {e.response.status_code}",
        ) from e
    except httpx.RequestError as e:
        logger.exception("DJMEDI 연결 실패")
        raise HTTPException(
            status_code=503,
            detail="DJMEDI API에 연결할 수 없습니다.",
        ) from e


@router.get("/makers")
async def djmedi_makers(
    _current_user: User = Depends(get_current_user),
    language: str = Query("kor", min_length=3, max_length=3, description="kor, chn, eng"),
    return_data: str | None = Query(None, alias="returnData"),
):
    """제조사 목록 조회 (apiCode=herbmaker)."""
    params: dict[str, str] = {"apiCode": "herbmaker", "language": language}
    if return_data is not None:
        params["returnData"] = return_data
    return await _call_djmedi(params)


@router.get("/medicines")
async def djmedi_medicines(
    _current_user: User = Depends(get_current_user),
    search: str = Query(..., min_length=1, description="제조사 코드 (mk_code)"),
    language: str = Query("kor", min_length=3, max_length=3),
    return_data: str | None = Query(None, alias="returnData"),
):
    """약재 목록 조회 (apiCode=herbmedicine)."""
    params: dict[str, str] = {
        "apiCode": "herbmedicine",
        "language": language,
        "search": search,
    }
    if return_data is not None:
        params["returnData"] = return_data
    return await _call_djmedi(params)


@router.get("/member-medicines")
async def djmedi_member_medicines(
    current_user: User = Depends(get_current_user),
    search: str = Query(..., min_length=1, description="주성분 코드 (md_medi)"),
    language: str = Query("kor", min_length=3, max_length=3),
    return_data: str | None = Query(None, alias="returnData"),
):
    """사용 약재 목록 (apiCode=membermedicine). cfcode는 로그인 사용자 프로필에서 주입."""
    cfcode = (current_user.cfcode or "").strip()
    if not cfcode:
        raise HTTPException(
            status_code=400,
            detail="계정에 DJMEDI 업체 코드(cfcode)가 등록되어 있지 않습니다. 관리자에게 문의하거나 프로필을 수정하세요.",
        )
    params: dict[str, str] = {
        "apiCode": "membermedicine",
        "language": language,
        "search": search,
        "cfcode": cfcode,
    }
    if return_data is not None:
        params["returnData"] = return_data
    return await _call_djmedi(params)
