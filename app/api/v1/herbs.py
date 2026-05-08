"""
Herbs API — DJMEDI 외부 API 기반.

GET /herbs           : cfcode 사용자가 등록한 약재 목록
GET /herbs/{md_code} : 약재 상세 (약재명/원산지/제조사 3필드)
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.models.user import User
from app.services.djmedi_service import list_user_medicines

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/herbs", tags=["herbs"])


def _shape_list_item(med: dict) -> dict[str, Any]:
    """membermedicine API 응답 한 건 → frontend HerbItem 형식.

    name = md_name (제조사 prefix 없는 깨끗한 약재명, 예: '감초')
    origin = mm_origin (cfcode 사용자가 등록한 변종의 원산지)
    manufacturer = mk_name
    id = md_code
    """
    return {
        "id": med.get("md_code", ""),
        "name": med.get("md_name", ""),
        "origin": med.get("mm_origin", ""),
        "manufacturer": med.get("mk_name", ""),
    }


@router.get("")
async def list_herbs(user: User = Depends(get_current_user)) -> dict[str, Any]:
    """사용자(cfcode)에게 등록된 약재 목록.

    cfcode가 없으면 빈 목록 반환. admin role은 ADMIN_CFCODE fallback.
    """
    settings = get_settings()
    effective_cfcode = user.cfcode or (settings.ADMIN_CFCODE if user.role == "admin" else None)
    if not effective_cfcode:
        return {"herbs": [], "total": 0}

    try:
        items = await list_user_medicines(effective_cfcode)
    except Exception:
        logger.exception("list_user_medicines 실패 (cfcode=%s)", effective_cfcode)
        raise HTTPException(status_code=503, detail="약재 목록 조회에 실패했습니다.")

    herbs = [_shape_list_item(item) for item in items if item.get("md_name")]
    herbs.sort(key=lambda h: h["name"])
    return {"herbs": herbs, "total": len(herbs)}


@router.get("/{md_code}")
async def get_herb_detail(md_code: str, user: User = Depends(get_current_user)) -> dict[str, Any]:
    """약재 상세 — 약재명/원산지/제조사 3가지만."""
    settings = get_settings()
    effective_cfcode = user.cfcode or (settings.ADMIN_CFCODE if user.role == "admin" else None)
    if not effective_cfcode:
        raise HTTPException(status_code=404, detail="해당 약재를 찾을 수 없습니다.")

    try:
        items = await list_user_medicines(effective_cfcode)
    except Exception:
        logger.exception("get_herb_detail: list_user_medicines 실패")
        raise HTTPException(status_code=503, detail="약재 상세 조회 실패")

    found = next((it for it in items if it.get("md_code") == md_code), None)
    if not found:
        raise HTTPException(status_code=404, detail="해당 약재를 찾을 수 없습니다.")

    return _shape_list_item(found)
