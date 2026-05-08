"""
Herbs API — DJMEDI 외부 API 기반.

GET /herbs           : 전체 약재 목록
GET /herbs/{md_code} : 약재 상세
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.models.user import User
from app.services.djmedi_service import smart_search

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/herbs", tags=["herbs"])


def _shape_list_item(med: dict, mm: dict | None = None) -> dict[str, Any]:
    """DJMEDI 응답 한 건 → frontend HerbItem 호환 형식.
    Phase 3에서 frontend HerbItem이 단순화되면 이 함수도 단순화 가능.
    """
    return {
        "id": med.get("md_code", ""),
        "name": med.get("md_name", ""),
        "name_chn": "",
        "name_eng": "",
        "origin": (mm or {}).get("mm_origin", ""),
        "price": 0,
        "stockStatus": "high",
        "qty": 0,
        "description": "",
        "feature": "",
        "note": "",
        "interaction": "",
        "related": "",
        "property": "",
        "manufacturer": med.get("mk_name", ""),
        "packagingUnitG": "",
        "boxQuantity": "",
        "subscriptionPrice": "",
        "discountRate": "",
        "grade": "",
        "marketType": "",
    }


@router.get("")
async def list_herbs(user: User = Depends(get_current_user)) -> dict[str, Any]:
    """전체 약재 목록.

    cfcode 유무와 무관하게 herbmaker→herbmedicine 집계로 전체 목록 산출.
    원산지가 필요한 사용자는 상세 페이지에서 cfcode 기반 my_medicines 조회.
    """
    try:
        _, makers = await smart_search(intent="get_maker_list")
    except Exception as e:
        logger.exception("get_maker_list 실패")
        raise HTTPException(status_code=503, detail="약재 목록 조회에 실패했습니다.") from e

    herbs: list[dict] = []
    seen_md: set[str] = set()
    for maker in makers:
        mk_code = maker.get("mk_code")
        if not mk_code:
            continue
        try:
            _, meds = await smart_search(intent="get_herb_by_maker", maker_name=maker.get("mk_name"))
        except Exception as e:
            logger.warning("get_herb_by_maker 실패 (mk=%s): %s", mk_code, e)
            continue
        for m in meds:
            if m.get("_type") == "notice":
                continue
            key = m.get("md_code") or ""
            if not key or key in seen_md:
                continue
            seen_md.add(key)
            herbs.append(_shape_list_item(m))

    return {"herbs": herbs, "total": len(herbs)}


@router.get("/{md_code}")
async def get_herb_detail(md_code: str, user: User = Depends(get_current_user)) -> dict[str, Any]:
    """약재 상세.

    md_code로 herbmedicine 전수 조회 후 매칭 1건 반환.
    cfcode가 있으면 my_medicines로 mm_origin 보강.
    """
    try:
        _, makers = await smart_search(intent="get_maker_list")
    except Exception as e:
        raise HTTPException(status_code=503, detail="약재 상세 조회 실패") from e

    found: dict | None = None
    for maker in makers:
        try:
            _, meds = await smart_search(intent="get_herb_by_maker", maker_name=maker.get("mk_name"))
        except Exception:
            continue
        for m in meds:
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
    # HerbDetail 추가 필드 (Phase 3에서 단순화)
    base.update({
        "status": "",
        "code": found.get("md_code", ""),
        "pricePerGeun": "",
        "nature": "",
        "taste": "",
        "meridian": "",
        "constitution": "",
        "warehouseMaker": found.get("mk_name", ""),
        "warehouseOrigin": (mm or {}).get("mm_origin", ""),
        "warehouseDate": "",
        "warehouseExpired": "",
    })
    return base
