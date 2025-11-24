# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Payment, PaymentStatus, Order, OrderStatus, User
from ..deps import get_current_user

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/{order_id}")
def create_payment(order_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Create a mock payment record for an order (order owner only, payable statuses only)."""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in [OrderStatus.PENDING, OrderStatus.ACCEPTED]:
        raise HTTPException(status_code=400, detail="Order not payable in current status")
    p = Payment(order_id=order.id, amount=order.total_price, status=PaymentStatus.PAID, provider="MOCK")
    db.add(p)
    db.commit()
    db.refresh(p)
    return p
