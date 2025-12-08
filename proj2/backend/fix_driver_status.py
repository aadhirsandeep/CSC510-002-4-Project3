
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import User, Role, DriverLocation, DriverStatus, Order, OrderStatus
from app.services.driver import update_driver_status_to_idle, update_driver_status_to_occupied
from datetime import datetime

# Setup DB connection
SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def fix_driver_statuses():
    print("=== Fixing Driver Statuses ===")
    
    # Get all drivers
    drivers = db.query(User).filter(User.role == Role.DRIVER).all()
    print(f"Found {len(drivers)} drivers.")

    # Get drivers currently assigned to active orders
    active_statuses = [OrderStatus.ACCEPTED, OrderStatus.READY, OrderStatus.PICKED_UP]
    active_orders = db.query(Order).filter(Order.status.in_(active_statuses), Order.driver_id.isnot(None)).all()
    
    busy_driver_ids = {order.driver_id for order in active_orders}
    print(f"Drivers currently assigned to active orders: {busy_driver_ids}")

    for driver in drivers:
        if driver.id in busy_driver_ids:
            print(f"Setting Driver {driver.id} ({driver.name}) to OCCUPIED")
            update_driver_status_to_occupied(driver.id, db)
        else:
            print(f"Setting Driver {driver.id} ({driver.name}) to IDLE")
            # Ensure they have a location if they don't
            update_driver_status_to_idle(driver.id, db)
            
            # If update_driver_status_to_idle returned None (no previous location), create one
            # This handles the case where a driver was created but never logged in/posted location
            from app.services.driver import get_latest_driver_location
            if not get_latest_driver_location(driver.id, db):
                print(f"  Creating default location for Driver {driver.id}")
                loc = DriverLocation(
                    driver_id=driver.id,
                    lat=0.0,
                    lng=0.0,
                    status=DriverStatus.IDLE,
                    timestamp=datetime.utcnow()
                )
                db.add(loc)
                db.commit()

    print("=== Done ===")

if __name__ == "__main__":
    fix_driver_statuses()
