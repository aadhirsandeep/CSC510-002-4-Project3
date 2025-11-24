# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

import os
from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import User, Role, DriverLocation, DriverStatus
from app.services import driver as driver_svc


TEST_DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db")
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def test_get_latest_driver_location_and_status_cycle():
    db = SessionLocal()
    try:
        # create a driver user
        user = User(email="unitdrv@example.com", name="UD", hashed_password="x", role=Role.DRIVER)
        db.add(user)
        db.commit()
        db.refresh(user)

        # no location yet
        assert driver_svc.get_latest_driver_location(user.id, db) is None

        # add a location IDLE
        l1 = DriverLocation(driver_id=user.id, lat=1.0, lng=1.0, timestamp=datetime.utcnow(), status=DriverStatus.IDLE)
        db.add(l1)
        db.commit()

        latest = driver_svc.get_latest_driver_location(user.id, db)
        assert latest is not None
        assert latest.status == DriverStatus.IDLE

        # update to OCCUPIED
        occ = driver_svc.update_driver_status_to_occupied(user.id, db)
        assert occ is not None
        assert occ.status == DriverStatus.OCCUPIED

        # now update back to IDLE
        idle = driver_svc.update_driver_status_to_idle(user.id, db)
        assert idle is not None
        assert idle.status == DriverStatus.IDLE
    finally:
        db.close()


def test_find_nearest_idle_driver_returns_driver():
    db = SessionLocal()
    try:
        # create a fresh driver and location near 0,0
        d = User(email="neardrv@example.com", name="ND", hashed_password="x", role=Role.DRIVER)
        db.add(d)
        db.commit()
        db.refresh(d)

        loc = DriverLocation(driver_id=d.id, lat=0.001, lng=0.001, timestamp=datetime.utcnow(), status=DriverStatus.IDLE)
        db.add(loc)
        db.commit()

        res = driver_svc.find_nearest_idle_driver(0.0, 0.0, db)
        assert res is not None
        driver, distance = res
        assert driver.id == d.id
        assert distance >= 0
    finally:
        db.close()
