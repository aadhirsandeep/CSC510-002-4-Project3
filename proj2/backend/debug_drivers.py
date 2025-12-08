
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import User, Role, DriverLocation, DriverStatus
from app.services.driver import get_idle_drivers_with_locations, get_latest_driver_location

# Setup DB connection
SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def debug_drivers():
    print("=== Debugging Drivers ===")
    drivers = db.query(User).filter(User.role == Role.DRIVER).all()
    print(f"Total Drivers: {len(drivers)}")
    for driver in drivers:
        latest_loc = get_latest_driver_location(driver.id, db)
        status = latest_loc.status if latest_loc else "None"
        print(f"D:{driver.id} S:{status}")

    print("Idle:")
    idle_drivers = get_idle_drivers_with_locations(db)
    print(len(idle_drivers))

if __name__ == "__main__":
    debug_drivers()
