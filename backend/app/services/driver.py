# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

import math
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models import DriverLocation, User, Role, Order, DriverStatus

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the distance between two points using the Haversine formula.
    Returns distance in kilometers.
    """
    # Radius of the Earth in kilometers
    R = 6371.0
    
    # Convert latitude and longitude from degrees to radians
    lat1_rad = math.radians(lat1)
    lng1_rad = math.radians(lng1)
    lat2_rad = math.radians(lat2)
    lng2_rad = math.radians(lng2)
    
    # Differences in coordinates
    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad
    
    # Haversine formula
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    # Distance in kilometers
    distance = R * c
    
    return distance

def get_latest_driver_location(driver_id: int, db: Session) -> DriverLocation | None:
    """
    Get the most recent location for a driver.
    """
    return db.query(DriverLocation).filter(
        DriverLocation.driver_id == driver_id
    ).order_by(DriverLocation.timestamp.desc()).first()

def find_nearest_idle_driver(cafe_lat: float, cafe_lng: float, db: Session) -> tuple[User, float] | None:
    """
    Find the nearest idle driver to a cafe location.
    Returns (driver_user, distance_in_km) or None if no idle drivers found.
    """
    # Get all drivers
    drivers = db.query(User).filter(User.role == Role.DRIVER).all()
    
    if not drivers:
        return None
    
    nearest_driver = None
    min_distance = float('inf')
    
    for driver in drivers:
        # Get the latest location for this driver
        latest_location = get_latest_driver_location(driver.id, db)
        
        if not latest_location:
            continue
        
        # Check if driver is idle
        if latest_location.status != DriverStatus.IDLE:
            continue
        
        # Calculate distance
        distance = calculate_distance(cafe_lat, cafe_lng, latest_location.lat, latest_location.lng)
        
        if distance < min_distance:
            min_distance = distance
            nearest_driver = driver
    
    if nearest_driver is None:
        return None
    
    return (nearest_driver, min_distance)

def get_driver_current_location(driver_id: int, db: Session) -> DriverLocation | None:
    """
    Get the current location and status of a driver.
    """
    return db.query(DriverLocation).filter(
        DriverLocation.driver_id == driver_id
    ).order_by(DriverLocation.timestamp.desc()).first()

def update_driver_status_to_occupied(driver_id: int, db: Session) -> DriverLocation | None:
    """
    Update the driver's status to OCCUPIED when they take an order.
    Creates a new location record with OCCUPIED status.
    """
    latest_location = get_latest_driver_location(driver_id, db)
    
    if not latest_location:
        return None
    
    # Create new location record with OCCUPIED status
    new_location = DriverLocation(
        driver_id=driver_id,
        lat=latest_location.lat,
        lng=latest_location.lng,
        status=DriverStatus.OCCUPIED
    )
    db.add(new_location)
    db.commit()
    db.refresh(new_location)
    
    return new_location

def update_driver_status_to_idle(driver_id: int, db: Session) -> DriverLocation | None:
    """
    Update the driver's status to IDLE when they complete a delivery.
    Creates a new location record with IDLE status.
    """
    latest_location = get_latest_driver_location(driver_id, db)
    
    if not latest_location:
        return None
    
    # Create new location record with IDLE status
    new_location = DriverLocation(
        driver_id=driver_id,
        lat=latest_location.lat,
        lng=latest_location.lng,
        status=DriverStatus.IDLE
    )
    db.add(new_location)
    db.commit()
    db.refresh(new_location)
    
    return new_location

def get_idle_drivers_with_locations(db: Session) -> list[dict]:
    """
    Get all idle drivers with their current locations.
    Returns list of dictionaries with driver info and location.
    """
    # Get all drivers
    drivers = db.query(User).filter(User.role == Role.DRIVER).all()
    
    idle_drivers = []
    
    for driver in drivers:
        latest_location = get_latest_driver_location(driver.id, db)
        
        if latest_location and latest_location.status == DriverStatus.IDLE:
            idle_drivers.append({
                'driver_id': driver.id,
                'driver_name': driver.name,
                'driver_email': driver.email,
                'lat': latest_location.lat,
                'lng': latest_location.lng,
                'status': latest_location.status.value,
                'last_update': latest_location.timestamp
            })
    
    return idle_drivers

