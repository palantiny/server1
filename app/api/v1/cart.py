"""
장바구니 API
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.cart import CartItem
from app.models.user import User

router = APIRouter(prefix="/cart", tags=["cart"])


class CartItemCreate(BaseModel):
    product_id: str
    product_name: str
    price: int
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    price: int
    quantity: int


@router.get("", response_model=list[CartItemResponse])
async def get_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.user_id
    result = await db.execute(select(CartItem).where(CartItem.user_id == user_id))
    return result.scalars().all()


@router.post("", response_model=CartItemResponse)
async def add_to_cart(
    body: CartItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.user_id
    # 동일 product_id 이미 있으면 수량만 증가
    result = await db.execute(
        select(CartItem).where(CartItem.user_id == user_id, CartItem.product_id == body.product_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.quantity += body.quantity
        await db.flush()
        await db.refresh(existing)
        return existing

    item = CartItem(user_id=user_id, **body.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.put("/{item_id}", response_model=CartItemResponse)
async def update_cart_item(
    item_id: str,
    body: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.user_id
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.user_id == user_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="장바구니 항목을 찾을 수 없습니다.")
    item.quantity = body.quantity
    await db.flush()
    await db.refresh(item)
    return item


@router.delete("/{item_id}")
async def delete_cart_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.user_id
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.user_id == user_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="장바구니 항목을 찾을 수 없습니다.")
    await db.delete(item)
    return {"ok": True}
