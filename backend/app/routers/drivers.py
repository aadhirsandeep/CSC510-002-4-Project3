# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas import DriverLoginRequest, Token, AssignedOrderOut, DriverLocationIn, DriverStatusUpdate, DriverLocationWithStatus, IdleDriverInfo
from ..models import User, Order, OrderStatus, DriverLocation, DriverStatus, Role
from ..auth import verify_password, create_token
from ..auth import hash_password
from ..schemas import UserCreate, UserOut
from ..deps import get_current_user
from datetime import timedelta, datetime
from ..config import settings
from ..services.driver import update_driver_status_to_occupied, update_driver_status_to_idle, get_idle_drivers_with_locations

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.post("/login", response_model=Token)
def driver_login(data: DriverLoginRequest, db: Session = Depends(get_db)):
    """Authenticate a driver and return access/refresh tokens."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password) or user.role != user.role.__class__.DRIVER:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access = create_token(user.id, user.email, user.role, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh = create_token(user.id, user.email, user.role, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    return Token(access_token=access, refresh_token=refresh)


@router.post("/register", response_model=UserOut)
def driver_register(data: UserCreate, db: Session = Depends(get_db)):
    """Register a new driver account (role preset to DRIVER)."""
    # reuse user creation flow but set role to DRIVER
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=data.email, name=data.name, hashed_password=hash_password(data.password), role=Role.DRIVER)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
def get_current_driver(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the current authenticated driver's information."""
    if current.role != Role.DRIVER:
        raise HTTPException(status_code=403, detail="Not a driver account")
    return current


@router.get("/{driver_id}/assigned-orders", response_model=list[AssignedOrderOut])
def get_assigned_orders(driver_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """List orders assigned to a driver (driver can only view own, admin can view any)."""
    # allow drivers to fetch their own assigned orders; admins allowed
    if current.role != Role.DRIVER and current.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Insufficient role")
    if current.role == Role.DRIVER and current.id != driver_id:
        raise HTTPException(status_code=403, detail="Can only fetch own assignments")
    orders = db.query(Order).filter(Order.driver_id == driver_id).order_by(Order.created_at.desc()).all()
    return orders


@router.post("/{driver_id}/location")
def post_location(driver_id: int, loc: DriverLocationIn, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Post a driver's current location (driver/admin only)."""
    if current.role != Role.DRIVER and current.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Insufficient role")
    if current.role == Role.DRIVER and current.id != driver_id:
        raise HTTPException(status_code=403, detail="Can only post own location")
    dl = DriverLocation(driver_id=driver_id, lat=loc.lat, lng=loc.lng, timestamp=loc.timestamp)
    db.add(dl)
    db.commit()
    # TODO: push websocket notification to any interested parties about location update
    return {"status": "ok"}


@router.post("/{driver_id}/location-status")
def post_location_with_status(driver_id: int, loc: DriverLocationWithStatus, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Update driver location and status in one call."""
    if current.role != Role.DRIVER and current.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Insufficient role")
    if current.role == Role.DRIVER and current.id != driver_id:
        raise HTTPException(status_code=403, detail="Can only post own location")
    
    timestamp = loc.timestamp if loc.timestamp else datetime.utcnow()
    dl = DriverLocation(driver_id=driver_id, lat=loc.lat, lng=loc.lng, timestamp=timestamp, status=loc.status)
    db.add(dl)
    db.commit()
    db.refresh(dl)
    # TODO: push websocket notification to any interested parties about location update
    return {"status": "ok", "location": dl}


@router.put("/{driver_id}/status")
def update_driver_status(driver_id: int, status_update: DriverStatusUpdate, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Update driver status (IDLE or OCCUPIED)."""
    if current.role != Role.DRIVER and current.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Insufficient role")
    if current.role == Role.DRIVER and current.id != driver_id:
        raise HTTPException(status_code=403, detail="Can only update own status")
    
    # Get the latest location to maintain location data
    latest_location = db.query(DriverLocation).filter(
        DriverLocation.driver_id == driver_id
    ).order_by(DriverLocation.timestamp.desc()).first()
    
    if not latest_location:
        raise HTTPException(status_code=404, detail="Driver location not found. Please post location first.")
    
    # Create new location record with updated status
    new_location = DriverLocation(
        driver_id=driver_id,
        lat=latest_location.lat,
        lng=latest_location.lng,
        status=status_update.status
    )
    db.add(new_location)
    db.commit()
    db.refresh(new_location)
    
    return {"status": "ok", "new_status": status_update.status.value}


@router.get("/available", response_model=list[IdleDriverInfo])
def get_available_drivers(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Get all idle drivers available for assignment."""
    if current.role not in [Role.ADMIN, Role.OWNER, Role.STAFF]:
        raise HTTPException(status_code=403, detail="Only admins, owners, and staff can view available drivers")
    
    idle_drivers = get_idle_drivers_with_locations(db)
    return idle_drivers


@router.post("/{driver_id}/orders/{order_id}/pickup", response_model=AssignedOrderOut)
def pickup_order(driver_id: int, order_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Mark an assigned order as picked up (driver/admin only, driver remains OCCUPIED)."""
    if current.role != Role.DRIVER and current.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Insufficient role")
    order = db.query(Order).filter(Order.id == order_id, Order.driver_id == driver_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or not assigned to this driver")
    if order.status not in [OrderStatus.READY, OrderStatus.ACCEPTED]:
        raise HTTPException(status_code=400, detail="Order not ready for pickup")
    order.status = OrderStatus.PICKED_UP
    db.add(order)
    db.commit()
    db.refresh(order)
    
    # Driver remains OCCUPIED after pickup
    return order


@router.post("/{driver_id}/orders/{order_id}/deliver", response_model=AssignedOrderOut)
def deliver_order(driver_id: int, order_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Mark an assigned order as delivered and set driver status back to IDLE (driver/admin only)."""
    if current.role != Role.DRIVER and current.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Insufficient role")
    order = db.query(Order).filter(Order.id == order_id, Order.driver_id == driver_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or not assigned to this driver")
    if order.status != OrderStatus.PICKED_UP:
        raise HTTPException(status_code=400, detail="Order must be picked up before delivery")
    order.status = OrderStatus.DELIVERED
    db.add(order)
    db.commit()
    db.refresh(order)
    
    # Driver becomes IDLE after delivery
    update_driver_status_to_idle(driver_id, db)
    
    return order


@router.post("/{driver_id}/orders/{order_id}/status", response_model=AssignedOrderOut)
def driver_update_order_status(driver_id: int, order_id: int, new_status: OrderStatus, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Allow a driver to update the status of an order assigned to them.
    This endpoint is driver-scoped and will validate assignment and valid transitions.
    """
    if current.role != Role.DRIVER and current.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Insufficient role")
    if current.role == Role.DRIVER and current.id != driver_id:
        raise HTTPException(status_code=403, detail="Can only update own orders")

    order = db.query(Order).filter(Order.id == order_id, Order.driver_id == driver_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or not assigned to this driver")

    # Allowed transitions for driver actions
    if new_status == OrderStatus.PICKED_UP:
        if order.status not in [OrderStatus.READY, OrderStatus.ACCEPTED]:
            raise HTTPException(status_code=400, detail="Order not ready for pickup")
        order.status = OrderStatus.PICKED_UP
    elif new_status == OrderStatus.DELIVERED:
        if order.status != OrderStatus.PICKED_UP:
            raise HTTPException(status_code=400, detail="Order must be picked up before delivery")
        order.status = OrderStatus.DELIVERED
        # set driver idle after delivery
        update_driver_status_to_idle(driver_id, db)
    else:
        raise HTTPException(status_code=400, detail="Unsupported status update from driver")

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.websocket("/driver/{driver_id}/ws")
async def driver_ws(websocket: WebSocket, driver_id: int):
    """WebSocket endpoint for driver real-time messaging (minimal demo implementation)."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # echo for now
            await websocket.send_text(f"received: {data}")
    except WebSocketDisconnect:
        return
