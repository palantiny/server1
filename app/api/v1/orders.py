"""
주문 / 취소·반품·교환·환불 API
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.order import Order, OrderCancellation
from app.models.user import User

router = APIRouter(prefix="/orders", tags=["orders"])


# ── 요청/응답 스키마 ──────────────────────────────────────
class OrderCreate(BaseModel):
    product_name: str
    price: int
    quantity: int = 1
    status: str = "주문완료"


class OrderResponse(BaseModel):
    id: str
    product_name: str
    price: int
    quantity: int
    status: str
    created_at: datetime


class CancellationCreate(BaseModel):
    type: str
    product_name: str
    price: int
    quantity: int = 1
    status: str
    reason: str = ""


class CancellationResponse(BaseModel):
    id: str
    type: str
    product_name: str
    price: int
    quantity: int
    status: str
    reason: str
    created_at: datetime


# ── 엔드포인트 ────────────────────────────────────────────
@router.get("", response_model=list[OrderResponse])
async def get_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.user_id
    result = await db.execute(
        select(Order).where(Order.user_id == user_id).order_by(Order.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=OrderResponse)
async def create_order(
    body: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.user_id
    order = Order(user_id=user_id, **body.model_dump())
    db.add(order)
    await db.flush()
    await db.refresh(order)
    return order


@router.get("/cancellations", response_model=list[CancellationResponse])
async def get_cancellations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.user_id
    result = await db.execute(
        select(OrderCancellation)
        .where(OrderCancellation.user_id == user_id)
        .order_by(OrderCancellation.created_at.desc())
    )
    return result.scalars().all()


@router.post("/cancellations", response_model=CancellationResponse)
async def create_cancellation(
    body: CancellationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.user_id
    item = OrderCancellation(user_id=user_id, **body.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item
