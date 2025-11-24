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
from datetime import date
from ..database import get_db
from ..schemas import GoalSet, GoalOut, GoalRecommendationRequest
from ..models import CalorieGoal, User, Order, OrderItem, OrderStatus
from ..deps import get_current_user
from ..services.recommend import daily_calorie_recommendation

router = APIRouter(prefix="/goals", tags=["goals"])

@router.post("/set", response_model=GoalOut)
def set_goal(data: GoalSet, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Create a calorie goal for the authenticated user (daily/weekly/monthly)."""
    g = CalorieGoal(user_id=current.id, period=data.period, target_calories=data.target_calories, start_date=data.start_date)
    db.add(g)
    db.commit()
    db.refresh(g)
    return g

@router.get("/current", response_model=list[GoalOut])
def current_goals(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """List all calorie goals for the authenticated user."""
    return db.query(CalorieGoal).filter(CalorieGoal.user_id == current.id).all()

@router.get("/intake/today", response_model=dict)
def today_intake(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Calculate today's calorie intake from completed orders for the authenticated user."""
    today = date.today()
    rows = db.query(OrderItem.subtotal_calories).join(Order, OrderItem.order_id == Order.id).\
        filter(
            Order.user_id == current.id,
            OrderItem.assignee_user_id == current.id,
            Order.created_at >= today,
            Order.status != OrderStatus.CANCELLED,
        ).all()
    total = sum(v[0] for v in rows) if rows else 0
    return {"date": str(today), "calories": total}

@router.post("/recommend", response_model=dict)
def recommend(req: GoalRecommendationRequest):
    """Compute daily calorie recommendation using Harris-Benedict BMR formula with activity multiplier."""
    daily = daily_calorie_recommendation(req.height_cm, req.weight_kg, req.sex, req.age_years, req.activity)
    print("User details - Height(cm):", req.height_cm, "Weight(kg):", req.weight_kg, "Sex:", req.sex, "Age(years):", req.age_years, "Activity Level:", req.activity)
    print("Recommended daily calorie intake:", daily)
    return {"daily_calorie_goal": daily}
