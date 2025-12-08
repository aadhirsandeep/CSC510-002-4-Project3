# Copyright (c) 2025 Group 2
# All rights reserved.
#
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..schemas import PlaceOrderRequest, OrderOut, AssignDriverRequest, OrderSummaryOut, CancelAndReassignResponse, WaitTimeEstimate, SetPrepTimeRequest
from ..models import Cart, CartItem, Item, Order, OrderItem, OrderStatus, User, Cafe
from ..deps import get_current_user, require_cafe_staff_or_owner
from ..services.driver import find_nearest_idle_driver, update_driver_status_to_occupied
from ..services.refund import create_refund, get_refund_amount_for_cancellation
from ..models import RefundCategory
from ..services.wait_time import WaitTimeService
import secrets

router = APIRouter(prefix="/orders", tags=["orders"])

@router.post("/place", response_model=OrderOut)
def place_order(data: PlaceOrderRequest, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Create an order from the user's cart for a single cafe, then clear the cart."""
    cart = db.query(Cart).filter(Cart.user_id == current.id).first()
    if not cart:
        raise HTTPException(status_code=400, detail="Empty cart")
    rows = db.query(CartItem, Item).join(Item, CartItem.item_id == Item.id).filter(CartItem.cart_id == cart.id).all()
    if not rows:
        raise HTTPException(status_code=400, detail="Empty cart")
    if any(it.cafe_id != data.cafe_id for _, it in rows):
        raise HTTPException(status_code=400, detail="All items must be from the same cafe")

    total_price = round(sum(it.price * ci.quantity for ci, it in rows), 2)
    total_calories = sum(it.calories * ci.quantity for ci, it in rows)

    order = Order(user_id=current.id, cafe_id=data.cafe_id, status=OrderStatus.PENDING, total_price=total_price, total_calories=total_calories)
    db.add(order)
    db.commit()
    db.refresh(order)

    for ci, it in rows:
        oi = OrderItem(order_id=order.id, item_id=it.id, quantity=ci.quantity, assignee_user_id=ci.assignee_user_id,
                       subtotal_price=round(it.price * ci.quantity, 2), subtotal_calories=it.calories * ci.quantity)
        db.add(oi)
    order.pickup_code = secrets.token_hex(3).upper()
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

@router.get("/o/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Fetch a single order if requester is owner, cafe staff/owner, or admin."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    # Check if the current user is either the order owner, cafe staff/owner, or admin
    if order.user_id != current.id:
        try:
            require_cafe_staff_or_owner(order.cafe_id, db, current)
        except HTTPException:
            raise HTTPException(status_code=403, detail="Not authorized to view this order")
    return order

@router.get("/{order_id}/summary", response_model=OrderSummaryOut)
def order_summary(order_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Return order with item breakdown and (if any) minimal driver info."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check authorization: either order owner OR cafe staff/owner
    if order.user_id != current.id:
        try:
            require_cafe_staff_or_owner(order.cafe_id, db, current)
        except HTTPException:
            raise HTTPException(status_code=403, detail="Not authorized to view this order")
    
    items = db.query(OrderItem, Item).join(Item, OrderItem.item_id == Item.id).filter(OrderItem.order_id == order.id).all()
    item_summaries = [
        {
            "item_id": it.id,
            "name": it.name,
            "quantity": oi.quantity,
            "subtotal_price": oi.subtotal_price,
            "subtotal_calories": oi.subtotal_calories
        }
        for oi, it in items
    ]
    driver_id = order.driver_id
    if driver_id:
        driver = db.query(User).filter(User.id == driver_id).first()
        driver_info = {"driver_id": driver.id, "driver_email": driver.email} if driver else None
    else:
        driver_info = None
    return OrderSummaryOut(
        id=order.id,
        cafe_id=order.cafe_id,
        status=order.status,
        created_at=order.created_at,
        total_price=order.total_price,
        total_calories=order.total_calories,
        items=item_summaries,
        driver_info=driver_info
    )


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(order_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Cancel own order within allowed window when in cancellable statuses. Frees up assigned driver if any."""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if datetime.utcnow() > order.can_cancel_until:
        raise HTTPException(status_code=400, detail="Cancellation window passed")
    if order.status not in [OrderStatus.PENDING, OrderStatus.ACCEPTED]:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled in current status")

    # Calculate refund amount before cancelling
    refund_amount = get_refund_amount_for_cancellation(order, db)

    # Cancel the order
    # If a driver was assigned, set them back to IDLE
    if order.driver_id:
        from ..services.driver import update_driver_status_to_idle
        update_driver_status_to_idle(order.driver_id, db)

    order.status = OrderStatus.CANCELLED
    db.add(order)
    db.commit()
    db.refresh(order)

    # Create refund if eligible
    if refund_amount > 0:
        try:
            create_refund(
                order_id=order.id,
                reason_category=RefundCategory.CUSTOMER_ISSUE,
                initiated_by_user_id=current.id,
                db=db,
                reason_code="USER_CANCEL",
                reason_description="User-initiated cancellation within allowed window",
                refund_amount=refund_amount,
            )
        except ValueError as e:
            # Log error but don't fail the cancellation
            print(f"Failed to create refund for cancelled order {order.id}: {e}")

    return order

@router.get("/my", response_model=list[OrderOut])
def my_orders(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """List the authenticated user's orders, newest first."""
    return db.query(Order).filter(Order.user_id == current.id).order_by(Order.created_at.desc()).all()

@router.get("/{cafe_id}", response_model=list[OrderOut])
def cafe_orders(cafe_id: int, status: OrderStatus | None = None, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """List cafe orders for staff/owners, optionally filtered by status."""
    require_cafe_staff_or_owner(cafe_id, db, current)
    q = db.query(Order).filter(Order.cafe_id == cafe_id)
    if status:
        q = q.filter(Order.status == status)
    return q.order_by(Order.created_at.desc()).all()

def _try_auto_assign_driver(order: Order, db: Session) -> bool:
    """
    Helper function to automatically assign the nearest idle driver to an order.
    Returns True if assignment was successful, False otherwise.
    """
    # Skip if order already has a driver
    if order.driver_id:
        return False
    
    # Only auto-assign for ACCEPTED or READY status
    if order.status not in [OrderStatus.ACCEPTED, OrderStatus.READY]:
        return False
    
    try:
        # Get cafe location
        cafe = db.query(Cafe).filter(Cafe.id == order.cafe_id).first()
        if not cafe:
            return False
        
        # Find nearest idle driver using Haversine distance
        result = find_nearest_idle_driver(cafe.lat, cafe.lng, db)
        if not result:
            return False
        
        driver, distance = result
        driver_id = driver.id
        
        # Assign driver to order
        order.driver_id = driver_id
        db.add(order)
        db.commit()
        
        # Update driver status to OCCUPIED
        update_driver_status_to_occupied(driver_id, db)
        
        db.refresh(order)
        return True
    except Exception:
        # If auto-assignment fails, don't fail the status update
        # Just log or silently continue
        db.rollback()
        return False

@router.post("/{order_id}/status", response_model=OrderOut)
def update_status(
    order_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
    new_status: str | None = Query(None),
    status_body: str | dict = Body(...)
):
    """
    Update order status. 
    Accepts new_status as:
    - Query parameter: ?new_status=ACCEPTED (from demo scripts)  
    - JSON body: "ACCEPTED" (as string directly from frontend) or {"new_status": "ACCEPTED"}
    
    Automatically sets timestamps for wait time tracking:
    - ACCEPTED: sets prep_started_at
    - READY: sets ready_at
    - PICKED_UP: sets picked_up_at
    - DELIVERED: sets delivered_at
    """
    # Determine which status value to use
    status_str = None
    
    # Priority 1: Query parameter (for demo scripts)
    if new_status:
        status_str = new_status
    # Priority 2: Body parameter
    elif status_body:
        if isinstance(status_body, dict):
            status_str = status_body.get("new_status", status_body.get("status"))
        else:
            status_str = str(status_body)
    
    if not status_str:
        raise HTTPException(status_code=400, detail="new_status is required")
    
    # Convert to OrderStatus enum
    try:
        new_status_enum = OrderStatus(status_str.upper())
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail=f"Invalid status: {status_str}")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    require_cafe_staff_or_owner(order.cafe_id, db, current)
    valid_transitions = {
        OrderStatus.PENDING: {OrderStatus.ACCEPTED, OrderStatus.DECLINED},
        OrderStatus.ACCEPTED: {OrderStatus.READY, OrderStatus.CANCELLED},
        OrderStatus.READY: {OrderStatus.PICKED_UP},
        OrderStatus.PICKED_UP: {OrderStatus.DELIVERED},
    }
    if order.status in valid_transitions and new_status_enum in valid_transitions[order.status]:
        now = datetime.utcnow()
        order.status = new_status_enum
        
        # Set timestamps for wait time tracking
        if new_status_enum == OrderStatus.ACCEPTED:
            order.prep_started_at = now
            # Set default prep time if not already set
            if not order.estimated_prep_minutes:
                order.estimated_prep_minutes = WaitTimeService.estimate_prep_time_from_items(order.id, db)
        elif new_status_enum == OrderStatus.READY:
            order.ready_at = now
        elif new_status_enum == OrderStatus.PICKED_UP:
            order.picked_up_at = now
        elif new_status_enum == OrderStatus.DELIVERED:
            order.delivered_at = now
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        # Automatically try to assign a driver when order reaches ACCEPTED or READY status
        if new_status_enum in [OrderStatus.ACCEPTED, OrderStatus.READY] and not order.driver_id:
            _try_auto_assign_driver(order, db)
            # Refresh order to get updated driver_id
            db.refresh(order)
        
        # If order is delivered, set driver back to IDLE
        if new_status_enum == OrderStatus.DELIVERED and order.driver_id:
            from ..services.driver import update_driver_status_to_idle
            update_driver_status_to_idle(order.driver_id, db)
        
        return order
    raise HTTPException(status_code=400, detail="Invalid status transition")


@router.post("/{order_id}/assign-driver", response_model=OrderOut)
def assign_driver(order_id: int, assignment: AssignDriverRequest = None, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """
    Assign a driver to an order.
    If driver_id is not provided, automatically selects the nearest idle driver.
    Only cafe staff/owners and admins can assign drivers.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check permissions
    require_cafe_staff_or_owner(order.cafe_id, db, current)
    
    # If order already has a driver, unassign them first (allow reassignment)
    if order.driver_id:
        # If manual assignment to the SAME driver, just return
        if assignment and assignment.driver_id and assignment.driver_id == order.driver_id:
            return order

        from ..services.driver import update_driver_status_to_idle
        update_driver_status_to_idle(order.driver_id, db)
        order.driver_id = None
        db.add(order)
        db.commit()
        db.refresh(order)
    
    # Check if order status allows driver assignment
    if order.status not in [OrderStatus.ACCEPTED, OrderStatus.READY]:
        raise HTTPException(status_code=400, detail="Order must be ACCEPTED or READY to assign a driver")
    
    driver_id = None
    distance = None
    
    if assignment and assignment.driver_id:
        # Manually assign specific driver
        driver_id = assignment.driver_id
        
        # Check if driver exists and is actually a driver
        driver = db.query(User).filter(User.id == driver_id).first()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver not found")
        
        # Verify driver is idle
        from ..services.driver import get_latest_driver_location
        from ..models import DriverStatus
        latest_location = get_latest_driver_location(driver_id, db)
        if not latest_location or latest_location.status != DriverStatus.IDLE:
            raise HTTPException(status_code=400, detail="Driver is not available (not idle)")
    else:
        # Auto-assign nearest idle driver
        cafe = db.query(Cafe).filter(Cafe.id == order.cafe_id).first()
        if not cafe:
            raise HTTPException(status_code=404, detail="Cafe not found")
        
        result = find_nearest_idle_driver(cafe.lat, cafe.lng, db)
        if not result:
            raise HTTPException(status_code=404, detail="No idle drivers available")
        
        driver, distance = result
        driver_id = driver.id
    
    # Assign driver to order
    order.driver_id = driver_id
    db.add(order)
    db.commit()
    
    # Update driver status to OCCUPIED
    update_driver_status_to_occupied(driver_id, db)

    db.refresh(order)

    return order


# ============ Wait Time Tracking Endpoints ============

@router.get("/{order_id}/wait-time", response_model=WaitTimeEstimate)
def get_wait_time(
    order_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user)
):
    """
    Get the current wait time estimate for an order.
    
    Returns estimated prep time, delivery time, and total wait time.
    Updates dynamically based on order status and driver location.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check authorization: order owner, cafe staff/owner, driver, or admin
    is_authorized = (
        order.user_id == current.id or
        order.driver_id == current.id or
        current.role.value == "ADMIN"
    )
    
    if not is_authorized:
        try:
            require_cafe_staff_or_owner(order.cafe_id, db, current)
        except HTTPException:
            raise HTTPException(status_code=403, detail="Not authorized to view this order's wait time")
    
    return WaitTimeService.get_wait_time_estimate(order, db)


@router.patch("/{order_id}/prep-time", response_model=OrderOut)
def set_order_prep_time(
    order_id: int,
    prep_data: SetPrepTimeRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user)
):
    """
    Set the estimated preparation time for an order.
    
    Only cafe staff/owners can set this, typically when accepting an order.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Only cafe staff/owners can set prep time
    require_cafe_staff_or_owner(order.cafe_id, db, current)
    
    # Validate prep time
    if prep_data.estimated_prep_minutes < 1:
        raise HTTPException(status_code=400, detail="Prep time must be at least 1 minute")
    if prep_data.estimated_prep_minutes > 120:
        raise HTTPException(status_code=400, detail="Prep time cannot exceed 120 minutes")
    
    order.estimated_prep_minutes = prep_data.estimated_prep_minutes
    db.add(order)
    db.commit()
    db.refresh(order)
    
    return order
def retry_driver_assignment(
    order_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user)
):
    """
    Retry driver assignment for an order.
    - If NO driver is assigned: Finds and assigns nearest idle driver
    - If driver IS assigned: Cancels current assignment and reassigns to different driver

    This is a unified endpoint that handles both initial assignment failures and reassignments.
    Can be called by cafe staff/owners to ensure orders have drivers or to reroute orders.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check permissions - only cafe staff/owners can assign/reassign
    require_cafe_staff_or_owner(order.cafe_id, db, current)

    # Check if order status allows driver assignment
    if order.status not in [OrderStatus.ACCEPTED, OrderStatus.READY]:
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be assigned in {order.status.value} status. Must be ACCEPTED or READY."
        )

    previous_driver_id = order.driver_id

    # If there's a current driver, free them up
    if previous_driver_id:
        from ..services.driver import update_driver_status_to_idle
        update_driver_status_to_idle(previous_driver_id, db)
        order.driver_id = None
        db.add(order)
        db.commit()
        db.refresh(order)

    # Find nearest idle driver (excluding previous driver if there was one)
    cafe = db.query(Cafe).filter(Cafe.id == order.cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")

    result = find_nearest_idle_driver(cafe.lat, cafe.lng, db, exclude_driver_id=previous_driver_id)

    if not result:
        # No driver available
        if previous_driver_id:
            # Had a driver before - reassign back to them
            order.driver_id = previous_driver_id
            db.add(order)
            db.commit()
            update_driver_status_to_occupied(previous_driver_id, db)
            db.refresh(order)

            previous_driver = db.query(User).filter(User.id == previous_driver_id).first()
            return CancelAndReassignResponse(
                order_id=order.id,
                previous_driver_id=previous_driver_id,
                new_driver_id=previous_driver_id,
                new_driver_email=previous_driver.email if previous_driver else None,
                message="No other drivers available - order kept with current driver"
            )
        else:
            # Never had a driver - can't assign anyone
            raise HTTPException(status_code=404, detail="No idle drivers available for assignment")

    # Found a driver - assign them
    new_driver, distance = result
    new_driver_id = new_driver.id

    order.driver_id = new_driver_id
    db.add(order)
    db.commit()
    update_driver_status_to_occupied(new_driver_id, db)
    db.refresh(order)

    if previous_driver_id:
        message = f"Order reassigned from driver {previous_driver_id} to driver {new_driver_id}"
    else:
        message = f"Driver {new_driver_id} assigned to order (was unassigned)"

    return CancelAndReassignResponse(
        order_id=order.id,
        previous_driver_id=previous_driver_id,
        new_driver_id=new_driver_id,
        new_driver_email=new_driver.email,
        message=message
    )


@router.post("/{order_id}/cancel-and-reassign", response_model=CancelAndReassignResponse)
def cancel_and_reassign_driver(
    order_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user)
):
    """
    Cancel the current driver assignment and automatically reassign to another driver.
    Can be called by cafe staff/owners to reroute orders to a different driver.
    The previous driver is set back to IDLE status, and a new nearest idle driver is assigned.

    Note: This endpoint requires a driver to be assigned. Use /retry-assignment for a more
    flexible option that works with or without an existing driver.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check permissions - only cafe staff/owners can reassign
    require_cafe_staff_or_owner(order.cafe_id, db, current)

    # Check if order has a driver assigned
    if not order.driver_id:
        raise HTTPException(status_code=400, detail="Order does not have a driver assigned")

    # Check if order status allows reassignment (must be ACCEPTED or READY, not yet PICKED_UP)
    if order.status not in [OrderStatus.ACCEPTED, OrderStatus.READY]:
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be reassigned in {order.status.value} status. Must be ACCEPTED or READY."
        )

    # Store the previous driver ID
    previous_driver_id = order.driver_id

    # Set the previous driver back to IDLE
    from ..services.driver import update_driver_status_to_idle
    update_driver_status_to_idle(previous_driver_id, db)

    # Remove driver assignment from order
    order.driver_id = None
    db.add(order)
    db.commit()
    db.refresh(order)

    # Find nearest idle driver (excluding the previous driver)
    cafe = db.query(Cafe).filter(Cafe.id == order.cafe_id).first()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")

    result = find_nearest_idle_driver(cafe.lat, cafe.lng, db, exclude_driver_id=previous_driver_id)

    if not result:
        # No other driver available - reassign back to the previous driver
        order.driver_id = previous_driver_id
        db.add(order)
        db.commit()

        # Set previous driver back to OCCUPIED
        update_driver_status_to_occupied(previous_driver_id, db)

        db.refresh(order)

        # Get driver info for response
        previous_driver = db.query(User).filter(User.id == previous_driver_id).first()

        return CancelAndReassignResponse(
            order_id=order.id,
            previous_driver_id=previous_driver_id,
            new_driver_id=previous_driver_id,
            new_driver_email=previous_driver.email if previous_driver else None,
            message="No other drivers available - order kept with current driver"
        )

    new_driver, distance = result
    new_driver_id = new_driver.id

    # Assign new driver to order
    order.driver_id = new_driver_id
    db.add(order)
    db.commit()

    # Update new driver status to OCCUPIED
    update_driver_status_to_occupied(new_driver_id, db)

    db.refresh(order)

    return CancelAndReassignResponse(
        order_id=order.id,
        previous_driver_id=previous_driver_id,
        new_driver_id=new_driver_id,
        new_driver_email=new_driver.email,
        message=f"Order reassigned from driver {previous_driver_id} to driver {new_driver_id}"
    )