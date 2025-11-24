# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""Pydantic schemas for request/response validation and serialization."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime, date
from .models import Role, OrderStatus, PaymentStatus, DriverStatus

class Token(BaseModel):
    """Schema for JWT token response containing access and refresh tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    """Schema for decoded JWT token payload."""
    sub: str
    uid: int
    role: Role
    exp: int

class UserBase(BaseModel):
    """Base schema for user data containing common fields."""
    email: EmailStr
    name: str

class UserCreate(UserBase):
    """Schema for creating a new user account."""
    email: EmailStr
    name: str
    password: str
    role: str = "User"  # Default role is User
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    activity_level: Optional[str] = None
    daily_calorie_goal: Optional[int] = None

class UserOut(UserBase):
    """Schema for user data returned in API responses."""
    id: int
    role: Role
    is_active: bool
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    """Schema for user login request."""
    email: EmailStr
    password: str
    role: str

class CafeCreate(BaseModel):
    """Schema for creating a new cafe."""
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    cuisine: Optional[str] = None
    timings: Optional[str] = None
    lat: float
    lng: float

class CafeOut(BaseModel):
    """Schema for cafe data returned in API responses."""
    id: int
    name: str
    address: Optional[str]
    phone: Optional[str]
    cuisine: Optional[str]
    timings: Optional[str]
    active: bool
    lat: float
    lng: float
    class Config:
        from_attributes = True

class ItemCreate(BaseModel):
    """Schema for creating a new menu item."""
    name: str
    description: Optional[str] = None
    ingredients: Optional[str] = None
    calories: int
    price: float
    quantity: Optional[str] = None
    servings: Optional[float] = None
    veg_flag: bool = True
    kind: Optional[str] = None

class ItemOut(ItemCreate):
    """Schema for menu item data returned in API responses."""
    id: int
    cafe_id: int
    active: bool
    class Config:
        from_attributes = True

class CartAddItem(BaseModel):
    """Schema for adding an item to the shopping cart."""
    item_id: int
    quantity: int = Field(ge=1, default=1)
    assignee_email: Optional[EmailStr] = None

class CartSummary(BaseModel):
    """Schema for cart summary showing calories and prices grouped by person."""
    by_person: Dict[str, Dict[str, float]]
    total_calories: int
    total_price: float

class PlaceOrderRequest(BaseModel):
    """Schema for placing an order from the cart."""
    cafe_id: int

class OrderOut(BaseModel):
    """Schema for order data returned in API responses."""
    id: int
    cafe_id: int
    status: OrderStatus
    created_at: datetime
    total_price: float
    total_calories: int
    can_cancel_until: datetime
    class Config:
        from_attributes = True

class PaymentOut(BaseModel):
    """Schema for payment data returned in API responses."""
    id: int
    order_id: int
    amount: float
    status: PaymentStatus
    provider: str
    class Config:
        from_attributes = True

class GoalSet(BaseModel):
    """Schema for setting a calorie goal."""
    period: str  # daily/weekly/monthly
    target_calories: int
    start_date: date

class GoalOut(GoalSet):
    """Schema for calorie goal data returned in API responses."""
    id: int
    class Config:
        from_attributes = True

class GoalRecommendationRequest(BaseModel):
    """Schema for requesting calorie goal recommendations based on user profile."""
    height_cm: float
    weight_kg: float
    sex: str = "M"
    age_years: int = 25
    activity: str = "moderate"  # sedentary/light/moderate/active/very_active

class OCRMenuItem(BaseModel):
    """Schema for a menu item extracted via OCR processing."""
    name: str
    description: Optional[str] = None
    calories: int
    price: float
    ingredients: Optional[str] = None
    quantity: Optional[str] = None
    servings: Optional[float] = None
    veg_flag: bool = True
    kind: Optional[str] = None

class OCRResult(BaseModel):
    """Schema for OCR processing result containing extracted menu items."""
    items: List[OCRMenuItem]

class MenuTextRequest(BaseModel):
    """Schema for submitting menu text content for OCR processing."""
    text_content: str

class DriverLocationIn(BaseModel):
    """Schema for submitting driver location update."""
    lat: float
    lng: float
    timestamp: datetime

class AssignedOrderOut(OrderOut):
    """Schema for order data with driver assignment information."""
    driver_id: Optional[int]

class DriverLocationOut(BaseModel):
    """Schema for driver location data returned in API responses."""
    driver_id: int
    lat: float
    lng: float
    timestamp: datetime
    status: DriverStatus

class DriverStatusUpdate(BaseModel):
    """Schema for updating driver status."""
    status: DriverStatus

class DriverLocationWithStatus(BaseModel):
    """Schema for driver location with status information."""
    lat: float
    lng: float
    status: DriverStatus
    timestamp: Optional[datetime] = None

class AssignDriverRequest(BaseModel):
    """Schema for assigning a driver to an order (auto-assign if driver_id is None)."""
    driver_id: Optional[int] = None  # If None, auto-assign nearest driver

class IdleDriverInfo(BaseModel):
    """Schema for idle driver information."""
    driver_id: int
    driver_name: str
    driver_email: str
    lat: float
    lng: float
    status: str
    last_update: datetime

class DriverLoginRequest(BaseModel):
    """Schema for driver login request."""
    email: EmailStr
    password: str

class CartOut(BaseModel):
    """Schema for cart data returned in API responses."""
    id: int
    user_id: int
    created_at: datetime
    class Config:
        from_attributes = True

# CAFE REVIEW SUMMARIZER
class ReviewBase(BaseModel):
    """Base schema for review data containing common fields."""
    rating: Optional[float] = None
    text: str

class ReviewCreate(ReviewBase):
    """Schema for creating a new review."""
    cafe_id: int
    user_id: int

class ReviewOut(ReviewBase):
    """Schema for review data returned in API responses."""
    id: int
    cafe_id: int
    user_id: int
    created_at: datetime  # ✅ timezone-aware datetime expected
    class Config:
        from_attributes = True

class OrderSummaryOut(BaseModel):
    """Schema for detailed order summary including items and driver information."""
    id: int
    cafe_id: int
    status: OrderStatus
    created_at: datetime
    total_price: float
    total_calories: int
    driver_info: Optional[dict] = None
    # include item-level details so frontend can render order contents
    class OrderItemSummary(BaseModel):
        """Nested schema for individual item details within an order summary."""
        item_id: int
        name: str
        quantity: int
        subtotal_price: float
        subtotal_calories: int

    items: Optional[List[OrderItemSummary]] = []
    class Config:
        from_attributes = True