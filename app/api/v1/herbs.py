"""
Herbs API — DJMEDI 외부 API 기반.

GET /herbs           : 전체 약재 목록
GET /herbs/{md_code} : 약재 상세
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.models.user import User
from app.services.djmedi_service import (
    get_maker_list,
    get_medicine_by_maker,
    smart_search,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/herbs", tags=["herbs"])


def _shape_list_item(med: dict, mm: dict | None = None) -> dict[str, Any]:
    return {
        "id": med.get("md_code", ""),
        "name": med.get("md_name", ""),
        "origin": (mm or {}).get("mm_origin", ""),
        "manufacturer": med.get("mk_name", ""),
    }


@router.get("")
async def list_herbs(user: User = Depends(get_current_user)) -> dict[str, Any]:
    """전체 약재 목록.

    cfcode 유무와 무관하게 herbmaker→herbmedicine 집계로 전체 목록 산출.
    원산지가 필요한 사용자는 상세 페이지에서 cfcode 기반 my_medicines 조회.
    """
    try:
        makers = await get_maker_list()
    except Exception as e:
        logger.exception("get_maker_list 실패")
        raise HTTPException(status_code=503, detail="약재 목록 조회에 실패했습니다.") from e

    mk_codes = [m.get("mk_code") for m in makers if m.get("mk_code")]
    results = await asyncio.gather(
        *(get_medicine_by_maker(c) for c in mk_codes),
        return_exceptions=True,
    )

    herbs: list[dict] = []
    seen_md: set[str] = set()
    for r in results:
        if isinstance(r, Exception):
            logger.warning("get_medicine_by_maker 실패: %s", r)
            continue
        for m in r:
            if m.get("_type") == "notice":
                continue
            key = m.get("md_code") or ""
            if not key or key in seen_md:
                continue
            seen_md.add(key)
            herbs.append(_shape_list_item(m))

    # null/빈 name 제외 + name 기준 정렬 (DJMEDI 응답에 null name 약재 다수 포함)
    herbs = [h for h in herbs if h.get("name")]
    herbs.sort(key=lambda h: h["name"])

    return {"herbs": herbs, "total": len(herbs)}


@router.get("/{md_code}")
async def get_herb_detail(md_code: str, user: User = Depends(get_current_user)) -> dict[str, Any]:
    """약재 상세.

    모든 제조사의 약재를 병렬 조회 후 md_code 매칭 1건 반환.
    cfcode가 있으면 my_medicines로 mm_origin 보강.
    """
    try:
        makers = await get_maker_list()
    except Exception as e:
        raise HTTPException(status_code=503, detail="약재 상세 조회 실패") from e

    mk_codes = [m.get("mk_code") for m in makers if m.get("mk_code")]
    results = await asyncio.gather(
        *(get_medicine_by_maker(c) for c in mk_codes),
        return_exceptions=True,
    )

    found: dict | None = None
    for r in results:
        if isinstance(r, Exception):
            continue
        for m in r:
            if m.get("md_code") == md_code:
                found = m
                break
        if found:
            break

    if not found:
        raise HTTPException(status_code=404, detail="해당 약재를 찾을 수 없습니다.")

    mm: dict | None = None
    if user.cfcode and found.get("md_medi"):
        try:
            _, mm_items = await smart_search(
                intent="get_my_medicines",
                herb_name=found.get("md_name"),
                cfcode=user.cfcode,
            )
            mm = next((x for x in mm_items if x.get("md_code") == md_code and x.get("_type") != "notice"), None)
        except Exception as e:
            logger.warning("my_medicines 보강 실패: %s", e)

    base = _shape_list_item(found, mm)
    base.update({
        "code": found.get("md_code", ""),
        "warehouseMaker": found.get("mk_name", ""),
        "warehouseOrigin": (mm or {}).get("mm_origin", ""),
    })
    return base
