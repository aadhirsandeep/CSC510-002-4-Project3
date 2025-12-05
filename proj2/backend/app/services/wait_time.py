# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""Service for calculating live wait time estimates for orders."""

from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from ..models import Order, OrderStatus, Cafe, DriverLocation, OrderItem, Item
from ..schemas import WaitTimeEstimate
from .driver import calculate_distance, get_latest_driver_location


# Default prep time estimates by item kind (in minutes)
PREP_TIME_BY_KIND = {
    "beverage": 3,
    "drink": 3,
    "milkshake": 5,
    "smoothie": 5,
    "dessert": 5,
    "snack": 7,
    "sandwich": 10,
    "salad": 8,
    "appetizer": 10,
    "main": 15,
    "main_course": 15,
    "entree": 15,
    "pizza": 20,
    "default": 12,
}

# Average delivery speed in km/h (accounts for traffic, stops, etc.)
AVERAGE_DELIVERY_SPEED_KMH = 25.0


class WaitTimeService:
    """Service for calculating and managing wait time estimates."""
    
    @staticmethod
    def estimate_prep_time_from_items(order_id: int, db: Session) -> int:
        """
        Estimate preparation time based on items in the order.
        Uses the longest item prep time + buffer for additional items.
        
        Returns estimated prep time in minutes.
        """
        # Get order items with their item details
        items = db.query(OrderItem, Item).join(
            Item, OrderItem.item_id == Item.id
        ).filter(OrderItem.order_id == order_id).all()
        
        if not items:
            return PREP_TIME_BY_KIND["default"]
        
        max_prep_time = 0
        additional_items_buffer = 0
        
        for order_item, item in items:
            kind = (item.kind or "default").lower()
            item_prep_time = PREP_TIME_BY_KIND.get(kind, PREP_TIME_BY_KIND["default"])
            
            # Track the max prep time (parallel preparation)
            if item_prep_time > max_prep_time:
                max_prep_time = item_prep_time
            
            # Add small buffer for quantity > 1 (extra items take some time)
            if order_item.quantity > 1:
                additional_items_buffer += (order_item.quantity - 1) * 2
        
        # Cap the buffer at 10 minutes
        additional_items_buffer = min(additional_items_buffer, 10)
        
        return max_prep_time + additional_items_buffer
    
    @staticmethod
    def estimate_delivery_time(
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
        driver_lat: Optional[float] = None,
        driver_lng: Optional[float] = None
    ) -> tuple[int, float]:
        """
        Estimate delivery time based on distance.
        
        If driver location is provided, calculates from driver to destination.
        Otherwise, calculates from origin (cafe) to destination.
        
        Returns (estimated_minutes, distance_km).
        """
        if driver_lat is not None and driver_lng is not None:
            # Use driver's current location
            distance_km = calculate_distance(driver_lat, driver_lng, dest_lat, dest_lng)
        else:
            # Use cafe location as origin
            distance_km = calculate_distance(origin_lat, origin_lng, dest_lat, dest_lng)
        
        # Calculate time based on average speed
        # time = distance / speed (in hours), convert to minutes
        estimated_minutes = int((distance_km / AVERAGE_DELIVERY_SPEED_KMH) * 60)
        
        # Minimum delivery time of 5 minutes
        estimated_minutes = max(estimated_minutes, 5)
        
        return estimated_minutes, distance_km
    
    @staticmethod
    def get_wait_time_estimate(order: Order, db: Session) -> WaitTimeEstimate:
        """
        Calculate the current wait time estimate for an order.
        
        This considers:
        - Current order status
        - Time elapsed since status changes
        - Estimated prep time
        - Driver location (if assigned)
        - Distance calculations for delivery
        """
        now = datetime.utcnow()
        
        # Initialize response with base data
        estimate = WaitTimeEstimate(
            order_id=order.id,
            status=order.status,
            prep_started_at=order.prep_started_at,
            estimated_prep_minutes=order.estimated_prep_minutes,
            ready_at=order.ready_at,
            picked_up_at=order.picked_up_at,
            estimated_delivery_minutes=order.estimated_delivery_minutes,
            updated_at=now
        )
        
        # Calculate based on current status
        if order.status == OrderStatus.PENDING:
            # Order not yet accepted - estimate based on items
            estimated_prep = order.estimated_prep_minutes or WaitTimeService.estimate_prep_time_from_items(order.id, db)
            estimate.estimated_prep_minutes = estimated_prep
            estimate.prep_remaining_minutes = estimated_prep
            # Add estimated delivery time (default 15 min if we don't have destination)
            estimate.estimated_delivery_minutes = 15
            estimate.total_estimated_minutes = estimated_prep + 15
            estimate.estimated_completion_time = datetime.utcnow()
            from datetime import timedelta
            estimate.estimated_completion_time = now + timedelta(minutes=estimate.total_estimated_minutes)
        
        elif order.status == OrderStatus.ACCEPTED:
            # Being prepared - calculate remaining prep time
            if order.prep_started_at:
                elapsed = (now - order.prep_started_at).total_seconds() / 60
                estimate.prep_elapsed_minutes = int(elapsed)
                
                estimated_prep = order.estimated_prep_minutes or WaitTimeService.estimate_prep_time_from_items(order.id, db)
                estimate.estimated_prep_minutes = estimated_prep
                
                remaining = max(0, estimated_prep - elapsed)
                estimate.prep_remaining_minutes = int(remaining)
            else:
                # Prep started at not set yet
                estimated_prep = order.estimated_prep_minutes or WaitTimeService.estimate_prep_time_from_items(order.id, db)
                estimate.estimated_prep_minutes = estimated_prep
                estimate.prep_remaining_minutes = estimated_prep
            
            # Add delivery estimate
            estimate.estimated_delivery_minutes = order.estimated_delivery_minutes or 15
            estimate.total_estimated_minutes = (estimate.prep_remaining_minutes or 0) + estimate.estimated_delivery_minutes
            from datetime import timedelta
            estimate.estimated_completion_time = now + timedelta(minutes=estimate.total_estimated_minutes)
        
        elif order.status == OrderStatus.READY:
            # Ready for pickup - waiting for driver
            estimate.prep_remaining_minutes = 0
            
            # Check if driver is assigned
            if order.driver_id:
                driver_location = get_latest_driver_location(order.driver_id, db)
                if driver_location:
                    estimate.driver_lat = driver_location.lat
                    estimate.driver_lng = driver_location.lng
                    
                    # Get cafe location for distance calc
                    cafe = db.query(Cafe).filter(Cafe.id == order.cafe_id).first()
                    if cafe:
                        # Calculate driver to cafe distance (pickup)
                        pickup_time, pickup_dist = WaitTimeService.estimate_delivery_time(
                            cafe.lat, cafe.lng,
                            cafe.lat, cafe.lng,  # Destination is same as cafe for now
                            driver_location.lat, driver_location.lng
                        )
                        estimate.driver_distance_km = round(pickup_dist, 2)
                        # Delivery time = pickup + actual delivery (estimate 10 min for now)
                        estimate.estimated_delivery_minutes = pickup_time + 10
            else:
                estimate.estimated_delivery_minutes = 20  # Waiting for driver assignment
            
            estimate.total_estimated_minutes = estimate.estimated_delivery_minutes
            from datetime import timedelta
            estimate.estimated_completion_time = now + timedelta(minutes=estimate.total_estimated_minutes or 20)
        
        elif order.status == OrderStatus.PICKED_UP:
            # In transit - calculate remaining delivery time
            estimate.prep_remaining_minutes = 0
            
            if order.driver_id:
                driver_location = get_latest_driver_location(order.driver_id, db)
                if driver_location:
                    estimate.driver_lat = driver_location.lat
                    estimate.driver_lng = driver_location.lng
                    
                    # For now, estimate based on elapsed time since pickup
                    if order.picked_up_at:
                        elapsed = (now - order.picked_up_at).total_seconds() / 60
                        initial_delivery_estimate = order.estimated_delivery_minutes or 15
                        remaining = max(0, initial_delivery_estimate - elapsed)
                        estimate.delivery_remaining_minutes = int(remaining)
                        estimate.total_estimated_minutes = int(remaining)
                    else:
                        estimate.delivery_remaining_minutes = order.estimated_delivery_minutes or 15
                        estimate.total_estimated_minutes = estimate.delivery_remaining_minutes
            else:
                estimate.delivery_remaining_minutes = 10
                estimate.total_estimated_minutes = 10
            
            from datetime import timedelta
            estimate.estimated_completion_time = now + timedelta(minutes=estimate.total_estimated_minutes or 10)
        
        elif order.status == OrderStatus.DELIVERED:
            # Completed
            estimate.prep_remaining_minutes = 0
            estimate.delivery_remaining_minutes = 0
            estimate.total_estimated_minutes = 0
            estimate.estimated_completion_time = order.delivered_at or now
        
        else:
            # CANCELLED, DECLINED, REFUNDED - no wait time applicable
            estimate.total_estimated_minutes = None
            estimate.estimated_completion_time = None
        
        return estimate
    
    @staticmethod
    def set_prep_time(order: Order, prep_minutes: int, db: Session) -> Order:
        """
        Set the estimated preparation time for an order.
        Called by cafe staff when accepting an order.
        """
        order.estimated_prep_minutes = prep_minutes
        db.add(order)
        db.commit()
        db.refresh(order)
        return order
