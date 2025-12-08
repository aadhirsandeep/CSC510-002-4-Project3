
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import User, Role, DriverLocation, DriverStatus
from app.auth import hash_password
from datetime import datetime

# Setup DB connection
SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def create_idle_drivers():
    print("=== Creating Idle Drivers ===")
    
    # Create Driver C
    email = "drivc@example.com"
    driver = db.query(User).filter(User.email == email).first()
    if not driver:
        print(f"Creating {email}")
        driver = User(
            email=email,
            name="Driver C",
            hashed_password=hash_password("pwd"),
            role=Role.DRIVER
        )
        db.add(driver)
        db.commit()
        db.refresh(driver)
    else:
        print(f"{email} already exists")

    # Set Location/Status to IDLE
    print(f"Setting {driver.name} to IDLE")
    loc = DriverLocation(
        driver_id=driver.id,
        lat=10.0,
        lng=10.0,
        status=DriverStatus.IDLE,
        timestamp=datetime.utcnow()
    )
    db.add(loc)
    db.commit()

    # Create Driver D
    email = "drivd@example.com"
    driver = db.query(User).filter(User.email == email).first()
    if not driver:
        print(f"Creating {email}")
        driver = User(
            email=email,
            name="Driver D",
            hashed_password=hash_password("pwd"),
            role=Role.DRIVER
        )
        db.add(driver)
        db.commit()
        db.refresh(driver)
    else:
        print(f"{email} already exists")

    # Set Location/Status to IDLE
    print(f"Setting {driver.name} to IDLE")
    loc = DriverLocation(
        driver_id=driver.id,
        lat=10.0,
        lng=10.0,
        status=DriverStatus.IDLE,
        timestamp=datetime.utcnow()
    )
    db.add(loc)
    db.commit()

    print("=== Done ===")

if __name__ == "__main__":
    create_idle_drivers()
