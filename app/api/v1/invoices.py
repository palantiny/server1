"""
세금계산서 / 입금내역 API
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.invoice import Payment, TaxInvoice

router = APIRouter(prefix="/invoices", tags=["invoices"])


class TaxInvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    amount: int
    status: str
    created_at: datetime


class PaymentResponse(BaseModel):
    id: str
    order_number: str
    amount: int
    method: str
    status: str
    created_at: datetime


@router.get("/tax", response_model=list[TaxInvoiceResponse])
async def get_tax_invoices(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaxInvoice).where(TaxInvoice.user_id == user_id).order_by(TaxInvoice.created_at.desc())
    )
    return result.scalars().all()


@router.get("/payments", response_model=list[PaymentResponse])
async def get_payments(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Payment).where(Payment.user_id == user_id).order_by(Payment.created_at.desc())
    )
    return result.scalars().all()
