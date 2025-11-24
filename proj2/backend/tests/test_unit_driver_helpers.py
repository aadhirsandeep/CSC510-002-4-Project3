# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

import os
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.services import driver as driver_svc
from app.models import User, Role


TEST_DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db")
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def test_get_idle_drivers_with_locations_no_locations():
    db = SessionLocal()
    try:
        # create a driver user with a unique email to avoid collisions when running full suite
        unique_email = f"helperdrv-{uuid.uuid4().hex}@example.com"
        d = User(email=unique_email, name="HD", hashed_password="x", role=Role.DRIVER)
        db.add(d)
        db.commit()
        db.refresh(d)

        # No locations posted for this driver -> helper may return other idle drivers from the suite,
        # but it should not include our newly-created driver (since we didn't post any DriverLocation rows)
        res = driver_svc.get_idle_drivers_with_locations(db)
        assert isinstance(res, list)
        assert all(entry.get('driver_id') != d.id for entry in res)
    finally:
        db.close()