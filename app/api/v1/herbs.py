"""
Herbs API — Neo4j AuraDB Product 노드에서 약재 목록/상세 조회
GET /herbs             : 전체 Product 목록 (id = product_id)
GET /herbs/{herb_id}   : Product 상세 (herb_id = product_id)
"""
import logging

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.graph import get_neo4j_driver
from app.models.user import User

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/herbs", tags=["herbs"])

_LIST_QUERY = """
MATCH (h:Herb)-[:HAS_PRODUCT]->(p:Product)
OPTIONAL MATCH (p)-[:MANUFACTURED_BY]->(mk:Maker)
OPTIONAL MATCH (p)-[:ORIGINATES_FROM]->(o:Origin)
OPTIONAL MATCH (h)-[:HAS_EFFICACY]->(e:Efficacy)
OPTIONAL MATCH (h)-[:HAS_TEMP]->(t:NatureTemp)
OPTIONAL MATCH (h)-[:HAS_TASTE]->(ta:NatureTaste)
WITH h, p, mk, o,
     COLLECT(DISTINCT e.name) AS efficacies,
     COLLECT(DISTINCT t.name) AS natures,
     COLLECT(DISTINCT ta.name) AS tastes
OPTIONAL MATCH (p)-[:HAS_PRICE_HISTORY]->(pr:PriceRecord)
WITH h, p, mk, o, efficacies, natures, tastes, pr
ORDER BY pr.month DESC
WITH h, p, mk, o, efficacies, natures, tastes, COLLECT(pr)[0] AS latest
RETURN
  p.product_id AS id,
  h.name AS name,
  p.type AS type,
  p.pack_unit AS pack_unit,
  p.pack_price AS pack_price,
  p.box_qty AS box_qty,
  latest.price_per_geun AS price_per_geun,
  latest.status AS status,
  mk.name AS maker,
  o.name AS origin,
  efficacies,
  natures,
  tastes
ORDER BY h.name
"""

_DETAIL_QUERY = """
MATCH (h:Herb)-[:HAS_PRODUCT]->(p:Product {product_id: $product_id})
OPTIONAL MATCH (p)-[:MANUFACTURED_BY]->(mk:Maker)
OPTIONAL MATCH (p)-[:ORIGINATES_FROM]->(o:Origin)
OPTIONAL MATCH (h)-[:HAS_EFFICACY]->(e:Efficacy)
OPTIONAL MATCH (h)-[:HAS_TEMP]->(t:NatureTemp)
OPTIONAL MATCH (h)-[:HAS_TASTE]->(ta:NatureTaste)
OPTIONAL MATCH (h)-[:ACTS_ON]->(m:Meridian)
OPTIONAL MATCH (h)-[:TREATS]->(s:Symptom)
OPTIONAL MATCH (h)-[:CONTRAINDICATES]->(c)
WITH h, p, mk, o,
     COLLECT(DISTINCT e.name) AS efficacies,
     COLLECT(DISTINCT t.name) AS natures,
     COLLECT(DISTINCT ta.name) AS tastes,
     COLLECT(DISTINCT m.name) AS meridians,
     COLLECT(DISTINCT s.name) AS symptoms,
     COLLECT(DISTINCT c.name) AS contraindications
OPTIONAL MATCH (p)-[:HAS_PRICE_HISTORY]->(pr:PriceRecord)
WITH h, p, mk, o, efficacies, natures, tastes, meridians, symptoms, contraindications, pr
ORDER BY pr.month DESC
WITH h, p, mk, o, efficacies, natures, tastes, meridians, symptoms, contraindications,
     COLLECT(pr)[0] AS latest
RETURN
  p.product_id AS id,
  h.name AS name,
  h.synonyms AS synonyms,
  h.toxicity AS toxicity,
  p.type AS type,
  p.pack_unit AS pack_unit,
  p.pack_price AS pack_price,
  p.box_qty AS box_qty,
  latest.price_per_geun AS price_per_geun,
  latest.status AS status,
  mk.name AS maker,
  o.name AS origin,
  efficacies,
  natures,
  tastes,
  meridians,
  symptoms,
  contraindications
"""


def _parse_price(value) -> int:
    """콤마 포함 가격 문자열 → int."""
    if value is None:
        return 0
    try:
        return int(str(value).replace(",", "").strip())
    except (ValueError, TypeError):
        return 0


def _stock_status(status: str | None) -> str:
    if not status:
        return "high"
    s = str(status).strip()
    if s in ("품절", "soldout"):
        return "out"
    if s in ("부족", "low"):
        return "low"
    if s in ("보통", "medium"):
        return "medium"
    return "high"  # '정상' 포함


def _market_type(origin_name: str | None) -> str:
    if not origin_name:
        return ""
    if origin_name.strip() in ("한국", "국내", "대한민국"):
        return "domestic"
    return "imported"


def _clean_list(lst) -> list[str]:
    return [s for s in (lst or []) if s]


@router.get("")
async def get_herbs(_current_user: User = Depends(get_current_user)):
    driver = await get_neo4j_driver()
    if not driver:
        raise HTTPException(status_code=503, detail="Neo4j 연결이 설정되지 않았습니다.")

    try:
        async with driver.session(database=settings.NEO4J_DATABASE) as session:
            result = await session.run(_LIST_QUERY)
            records = [r.data() async for r in result]
    except Exception as e:
        logger.exception("get_herbs: Neo4j 조회 실패")
        raise HTTPException(status_code=503, detail=f"약재 목록 조회 실패: {e}") from e

    herbs = []
    for r in records:
        efficacies = _clean_list(r.get("efficacies"))
        natures = _clean_list(r.get("natures"))
        tastes = _clean_list(r.get("tastes"))
        origin = r.get("origin") or ""

        herbs.append({
            "id": r["id"],
            "name": r.get("name", ""),
            "name_chn": "",
            "name_eng": "",
            "origin": origin,
            "price": _parse_price(r.get("pack_price")),
            "stockStatus": _stock_status(r.get("status")),
            "qty": 0,
            "description": ", ".join(efficacies),
            "feature": ", ".join(efficacies),
            "property": " ".join(natures + tastes),
            "manufacturer": r.get("maker") or "",
            "packagingUnitG": str(r.get("pack_unit") or "").replace(",", "").strip(),
            "boxQuantity": str(r.get("box_qty") or "").strip(),
            "subscriptionPrice": "",
            "discountRate": "",
            "grade": r.get("type") or "",
            "marketType": _market_type(origin),
        })

    return {"herbs": herbs, "total": len(herbs)}


@router.get("/{herb_id}")
async def get_herb_detail(herb_id: str, _current_user: User = Depends(get_current_user)):
    driver = await get_neo4j_driver()
    if not driver:
        raise HTTPException(status_code=503, detail="Neo4j 연결이 설정되지 않았습니다.")

    try:
        async with driver.session(database=settings.NEO4J_DATABASE) as session:
            result = await session.run(_DETAIL_QUERY, product_id=herb_id)
            record = await result.single()
    except Exception as e:
        logger.exception("get_herb_detail: Neo4j 조회 실패")
        raise HTTPException(status_code=503, detail=f"약재 상세 조회 실패: {e}") from e

    if not record:
        raise HTTPException(status_code=404, detail="약재를 찾을 수 없습니다.")

    r = record.data()
    efficacies = _clean_list(r.get("efficacies"))
    natures = _clean_list(r.get("natures"))
    tastes = _clean_list(r.get("tastes"))
    meridians = _clean_list(r.get("meridians"))
    contraindications = _clean_list(r.get("contraindications"))
    synonyms = _clean_list(r.get("synonyms"))
    origin = r.get("origin") or ""

    price_per_geun = r.get("price_per_geun")
    try:
        price_per_geun_str = str(int(price_per_geun)) if price_per_geun is not None else ""
    except (ValueError, TypeError):
        price_per_geun_str = ""

    return {
        "id": r["id"],
        "name": r.get("name", ""),
        "name_chn": "",
        "name_eng": "",
        "origin": origin,
        "price": _parse_price(r.get("pack_price")),
        "stockStatus": _stock_status(r.get("status")),
        "qty": 0,
        "status": "use",
        "description": ", ".join(efficacies),
        "feature": ", ".join(efficacies),
        "property": " ".join(natures + tastes),
        "note": r.get("toxicity") or "",
        "interaction": ", ".join(contraindications),
        "related": ", ".join(synonyms[:5]),
        "code": r["id"],
        "manufacturer": r.get("maker") or "",
        "packagingUnitG": str(r.get("pack_unit") or "").replace(",", "").strip(),
        "pricePerGeun": price_per_geun_str,
        "boxQuantity": str(r.get("box_qty") or "").strip(),
        "subscriptionPrice": "",
        "discountRate": "",
        "grade": r.get("type") or "",
        "marketType": _market_type(origin),
        "nature": ", ".join(natures),
        "taste": ", ".join(tastes),
        "meridian": ", ".join(meridians),
        "constitution": "",
        "warehouseMaker": "",
        "warehouseOrigin": "",
        "warehouseDate": "",
        "warehouseExpired": "",
    }
