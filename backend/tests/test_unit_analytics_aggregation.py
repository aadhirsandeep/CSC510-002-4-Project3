# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""
Unit tests for analytics aggregation logic - testing data aggregation
and calculation correctness for cafe analytics.
"""

import os
from datetime import datetime, date
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

from app.models import User, Role, Order, OrderStatus, OrderItem, Item, Cafe


TEST_DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db")
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def test_orders_per_day_aggregation():
    """Test that orders are correctly aggregated by date."""
    db = SessionLocal()
    try:
        user = User(email="anal_user@example.com", name="AnalUser", hashed_password="x", role=Role.USER)
        db.add(user)
        cafe = Cafe(name="AnalCafe", address="A", lat=1.0, lng=1.0)
        db.add(cafe)
        db.commit()
        db.refresh(user)
        db.refresh(cafe)
        
        # Create orders on same day
        today = datetime.utcnow()
        order1 = Order(user_id=user.id, cafe_id=cafe.id, status=OrderStatus.PENDING, total_price=10.0, total_calories=100, created_at=today)
        order2 = Order(user_id=user.id, cafe_id=cafe.id, status=OrderStatus.ACCEPTED, total_price=20.0, total_calories=200, created_at=today)
        db.add_all([order1, order2])
        db.commit()
        
        # Aggregate orders per day
        orders_per_day = db.query(func.date(Order.created_at), func.count()).\
            filter(Order.cafe_id == cafe.id).group_by(func.date(Order.created_at)).all()
        
        assert len(orders_per_day) >= 1
        # Check that we have orders aggregated (SQLite date() function may work differently)
        # Count total orders to verify aggregation worked
        total_count = sum(count for _, count in orders_per_day)
        assert total_count >= 2
    finally:
        db.close()


def test_revenue_only_counts_accepted_orders():
    """Test that revenue calculation only includes orders in payable statuses."""
    db = SessionLocal()
    try:
        user = User(email="anal_user2@example.com", name="AnalUser2", hashed_password="x", role=Role.USER)
        db.add(user)
        cafe = Cafe(name="AnalCafe2", address="A", lat=2.0, lng=2.0)
        db.add(cafe)
        db.commit()
        db.refresh(user)
        db.refresh(cafe)
        
        # Create orders with different statuses
        order1 = Order(user_id=user.id, cafe_id=cafe.id, status=OrderStatus.PENDING, total_price=10.0, total_calories=100)
        order2 = Order(user_id=user.id, cafe_id=cafe.id, status=OrderStatus.ACCEPTED, total_price=20.0, total_calories=200)
        order3 = Order(user_id=user.id, cafe_id=cafe.id, status=OrderStatus.READY, total_price=30.0, total_calories=300)
        order4 = Order(user_id=user.id, cafe_id=cafe.id, status=OrderStatus.CANCELLED, total_price=40.0, total_calories=400)
        db.add_all([order1, order2, order3, order4])
        db.commit()
        
        # Calculate revenue (should only include ACCEPTED, READY, PICKED_UP)
        revenue = db.query(func.sum(Order.total_price)).\
            filter(Order.cafe_id == cafe.id, Order.status.in_([OrderStatus.ACCEPTED, OrderStatus.READY, OrderStatus.PICKED_UP])).scalar()
        
        # Revenue should be 20 + 30 = 50 (not including PENDING or CANCELLED)
        assert revenue == 50.0
    finally:
        db.close()


def test_top_items_aggregation():
    """Test that top items correctly sum quantities across orders."""
    db = SessionLocal()
    try:
        user = User(email="anal_user3@example.com", name="AnalUser3", hashed_password="x", role=Role.USER)
        db.add(user)
        cafe = Cafe(name="AnalCafe3", address="A", lat=3.0, lng=3.0)
        db.add(cafe)
        item1 = Item(cafe_id=cafe.id, name="Item1", description="d", calories=100, price=10.0, active=True)
        item2 = Item(cafe_id=cafe.id, name="Item2", description="d", calories=200, price=20.0, active=True)
        db.add_all([user, cafe, item1, item2])
        db.commit()
        db.refresh(user)
        db.refresh(cafe)
        db.refresh(item1)
        db.refresh(item2)
        
        # Create orders with items
        order1 = Order(user_id=user.id, cafe_id=cafe.id, status=OrderStatus.ACCEPTED, total_price=30.0, total_calories=300)
        order2 = Order(user_id=user.id, cafe_id=cafe.id, status=OrderStatus.ACCEPTED, total_price=40.0, total_calories=400)
        db.add_all([order1, order2])
        db.commit()
        db.refresh(order1)
        db.refresh(order2)
        
        # Add order items
        oi1 = OrderItem(order_id=order1.id, item_id=item1.id, quantity=2, subtotal_price=20.0, subtotal_calories=200)
        oi2 = OrderItem(order_id=order1.id, item_id=item2.id, quantity=1, subtotal_price=20.0, subtotal_calories=200)
        oi3 = OrderItem(order_id=order2.id, item_id=item1.id, quantity=3, subtotal_price=30.0, subtotal_calories=300)
        db.add_all([oi1, oi2, oi3])
        db.commit()
        
        # Aggregate top items
        top_items = db.query(Item.name, func.sum(OrderItem.quantity)).\
            join(OrderItem, OrderItem.item_id == Item.id).\
            join(Order, Order.id == OrderItem.order_id).\
            filter(Order.cafe_id == cafe.id).\
            group_by(Item.name).order_by(func.sum(OrderItem.quantity).desc()).all()
        
        # Item1 should have quantity 5 (2 + 3), Item2 should have 1
        item_dict = {name: qty for name, qty in top_items}
        assert item_dict.get("Item1") == 5
        assert item_dict.get("Item2") == 1
        # Item1 should be first (higher quantity)
        assert top_items[0][0] == "Item1"
    finally:
        db.close()

