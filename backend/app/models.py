# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""SQLAlchemy ORM models for users, cafes, items, orders, payments, goals, drivers, and reviews."""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, DateTime, Enum, Text, Date, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from .database import Base
import enum
class Role(str, enum.Enum):
    """User role enumeration defining access levels in the system."""
    USER = "USER"
    OWNER = "OWNER"
    STAFF = "STAFF"
    ADMIN = "ADMIN"
    DRIVER = "DRIVER"

class User(Base):
    """User model representing a user account in the system."""
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(Role), default=Role.USER, nullable=False)
    is_active = Column(Boolean, default=True)
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    gender = Column(String, nullable=True)  # "M"/"F"/"X"
    dob = Column(Date, nullable=True)
    #age = Column(Integer, nullable=True)
    activity_level = Column(String, nullable=True)  # sedentary/light/moderate/active/very_active
    owned_cafes = relationship("Cafe", back_populates="owner")

class Cafe(Base):
    """Cafe model representing a restaurant/cafe in the system."""
    __tablename__ = "cafes"
    id = Column(Integer, primary_key=True)
    name = Column(String, index=True, nullable=False)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    active = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    # Cuisine for the cafe (e.g., Italian, Chinese, Indian, etc.)
    cuisine = Column(String, nullable=True)
    # Human-readable opening hours / timings (e.g., "Mon-Fri 09:00-17:00")
    timings = Column(String, nullable=True)
    owner = relationship("User", back_populates="owned_cafes")
    items = relationship("Item", back_populates="cafe")
    reviews = relationship("Review", back_populates="cafe", cascade="all, delete-orphan")
    review_summary = relationship("ReviewSummary", back_populates="cafe", uselist=False)

class Review(Base):
    """Review model representing a customer review for a cafe."""
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    cafe_id = Column(Integer, ForeignKey("cafes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Float, nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    cafe = relationship("Cafe", back_populates="reviews")
    user = relationship("User")

class ReviewSummary(Base):
    """ReviewSummary model storing AI-generated summary of reviews for a cafe."""
    __tablename__ = "review_summaries"
    id = Column(Integer, primary_key=True, index=True)
    cafe_id = Column(Integer, ForeignKey("cafes.id"), unique=True, nullable=False)
    summary_text = Column(Text, nullable=False)
    review_count = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    cafe = relationship("Cafe", back_populates="review_summary")

class StaffAssignment(Base):
    """StaffAssignment model linking users to cafes as staff members."""
    __tablename__ = "staff_assignments"
    __table_args__ = (UniqueConstraint('user_id', 'cafe_id', name='uq_staff_cafe'),)
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cafe_id = Column(Integer, ForeignKey("cafes.id"), nullable=False)
    role = Column(Enum(Role), default=Role.STAFF, nullable=False)

class Item(Base):
    """Item model representing a menu item/food product in a cafe."""
    __tablename__ = "items"
    id = Column(Integer, primary_key=True)
    cafe_id = Column(Integer, ForeignKey("cafes.id"), index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    ingredients = Column(Text, nullable=True)
    calories = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    quantity = Column(String, nullable=True)  # e.g., "350ml" or "1 slice"
    servings = Column(Float, nullable=True)   # per item
    veg_flag = Column(Boolean, default=True)
    kind = Column(String, nullable=True)  # dessert, milkshake, etc.
    active = Column(Boolean, default=True)
    cafe = relationship("Cafe", back_populates="items")

class Cart(Base):
    """Cart model representing a user's shopping cart."""
    __tablename__ = "carts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class CartItem(Base):
    """CartItem model representing an item in a user's shopping cart."""
    __tablename__ = "cart_items"
    id = Column(Integer, primary_key=True)
    cart_id = Column(Integer, ForeignKey("carts.id"), index=True)
    item_id = Column(Integer, ForeignKey("items.id"))
    quantity = Column(Integer, default=1)
    assignee_user_id = Column(Integer, ForeignKey("users.id"))  # who will consume

class OrderStatus(str, enum.Enum):
    """Order status enumeration defining the lifecycle states of an order."""
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    READY = "READY"
    PICKED_UP = "PICKED_UP"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"
    DELIVERED = "DELIVERED"

class Order(Base):
    """Order model representing a customer order placed at a cafe."""
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    cafe_id = Column(Integer, ForeignKey("cafes.id"), index=True)
    driver_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)
    can_cancel_until = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(minutes=15))
    pickup_code = Column(String, nullable=True)
    total_price = Column(Float, default=0.0)
    total_calories = Column(Integer, default=0)

class OrderItem(Base):
    """OrderItem model representing an individual item within an order."""
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True)
    item_id = Column(Integer, ForeignKey("items.id"))
    quantity = Column(Integer, default=1)
    assignee_user_id = Column(Integer, ForeignKey("users.id"))
    subtotal_price = Column(Float, default=0.0)
    subtotal_calories = Column(Integer, default=0)

class PaymentStatus(str, enum.Enum):
    """Payment status enumeration defining the states of a payment transaction."""
    CREATED = "CREATED"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"

class DriverStatus(str, enum.Enum):
    """Driver status enumeration defining the availability state of a driver."""
    IDLE = "IDLE"
    OCCUPIED = "OCCUPIED"

class Payment(Base):
    """Payment model representing a payment transaction for an order."""
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True)
    provider = Column(String, default="MOCK")
    amount = Column(Float, default=0.0)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.CREATED)
    created_at = Column(DateTime, default=datetime.utcnow)

class CalorieGoal(Base):
    """CalorieGoal model representing a user's calorie tracking goal."""
    __tablename__ = "calorie_goals"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    period = Column(String)  # daily/weekly/monthly
    target_calories = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)

class RefundRequest(Base):
    """RefundRequest model representing a refund request for an order."""
    __tablename__ = "refund_requests"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True)
    reason = Column(Text)
    status = Column(String, default="PENDING")  # APPROVED/REJECTED

class DriverLocation(Base):
    """DriverLocation model storing the current location and status of a driver."""
    __tablename__ = "driver_locations"
    id = Column(Integer, primary_key=True)
    driver_id = Column(Integer, ForeignKey("users.id"), index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum(DriverStatus), default=DriverStatus.IDLE, nullable=False)
