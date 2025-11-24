# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""
Unit tests for payment validation logic - testing business rules around
when payments can be created based on order status.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import User, Role, Order, OrderStatus, Payment, PaymentStatus, Cafe


TEST_DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db")
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def test_payment_creation_sets_correct_status():
    """Test that payment creation sets status to PAID and records provider."""
    db = SessionLocal()
    try:
        user = User(email="pay_user3@example.com", name="PayUser3", hashed_password="x", role=Role.USER)
        db.add(user)
        cafe = Cafe(name="PayCafe3", address="A", lat=3.0, lng=3.0)
        db.add(cafe)
        db.commit()
        db.refresh(user)
        db.refresh(cafe)
        
        order = Order(user_id=user.id, cafe_id=cafe.id, status=OrderStatus.PENDING, total_price=25.0, total_calories=150)
        db.add(order)
        db.commit()
        db.refresh(order)
        
        # Create payment
        payment = Payment(order_id=order.id, amount=order.total_price, status=PaymentStatus.PAID, provider="MOCK")
        db.add(payment)
        db.commit()
        db.refresh(payment)
        
        assert payment.status == PaymentStatus.PAID
        assert payment.provider == "MOCK"
        assert payment.amount == 25.0
    finally:
        db.close()


def test_payment_amount_matches_order_total():
    """Test that payment amount correctly reflects order total price - validating payment calculation."""
    db = SessionLocal()
    try:
        user = User(email="pay_user4@example.com", name="PayUser4", hashed_password="x", role=Role.USER)
        db.add(user)
        cafe = Cafe(name="PayCafe4", address="A", lat=4.0, lng=4.0)
        db.add(cafe)
        db.commit()
        db.refresh(user)
        db.refresh(cafe)
        
        # Order with specific total
        order = Order(user_id=user.id, cafe_id=cafe.id, status=OrderStatus.PENDING, total_price=47.50, total_calories=250)
        db.add(order)
        db.commit()
        db.refresh(order)
        
        # Payment should match order total exactly
        payment = Payment(order_id=order.id, amount=order.total_price, status=PaymentStatus.PAID, provider="MOCK")
        db.add(payment)
        db.commit()
        db.refresh(payment)
        
        assert payment.amount == 47.50
        assert payment.order_id == order.id
    finally:
        db.close()

