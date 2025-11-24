# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Order, OrderItem, Item, OrderStatus, User
from ..deps import get_current_user, require_cafe_staff_or_owner

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/cafe/{cafe_id}", response_model=dict)
def cafe_analytics(cafe_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Return cafe analytics: orders per day, top-selling items, and revenue per day (staff/owner/admin only)."""
    require_cafe_staff_or_owner(cafe_id, db, current)
    orders_per_day = (
        db.query(func.date(Order.created_at).label("date"), func.count().label("count"))
        .filter(Order.cafe_id == cafe_id)
        .group_by(func.date(Order.created_at))
        .all()
    )
    top_items = db.query(Item.name, func.sum(OrderItem.quantity)).\
        join(OrderItem, OrderItem.item_id == Item.id).\
        join(Order, Order.id == OrderItem.order_id).\
        filter(Order.cafe_id == cafe_id).\
        group_by(Item.name).order_by(func.sum(OrderItem.quantity).desc()).limit(10).all()
    revenue_per_day = (
        db.query(func.date(Order.created_at).label("date"), func.sum(Order.total_price).label("revenue"))
        .filter(
            Order.cafe_id == cafe_id,
            Order.status.in_([OrderStatus.ACCEPTED, OrderStatus.READY, OrderStatus.PICKED_UP]),
        )
        .group_by(func.date(Order.created_at))
        .all()
    )
    return {
        "orders_per_day": [(str(d), int(c)) for d, c in orders_per_day],
        "top_items": [(n, int(q)) for n, q in top_items],
        "revenue_per_day": [(str(d), float(s or 0.0)) for d, s in revenue_per_day],
    }
