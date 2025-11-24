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

from app.models import Order, OrderStatus


def register_and_login(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def test_manual_assign_success_when_driver_idle(client):
    # owner creates cafe and item
    owner_hdr, _ = register_and_login(client, "owner_succ@example.com", "opwd", name="OwnS", role="OWNER")
    r = client.post("/cafes", json={"name": "SuccCafe", "address": "Addr", "lat": 3.0, "lng": 3.0}, headers=owner_hdr)
    assert r.status_code == 200
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "Toast2", "description": "d", "calories": 100, "price": 3.5}, headers=owner_hdr)
    assert r.status_code == 200
    item = r.json()

    # create driver and set IDLE
    rdrv = client.post("/drivers/register", json={"email": "drv_succ@example.com", "name": "DS", "password": "pwd"})
    assert rdrv.status_code == 200
    drv = rdrv.json()
    rlogin = client.post("/drivers/login", json={"email": "drv_succ@example.com", "password": "pwd"})
    assert rlogin.status_code == 200
    drv_hdr = {"Authorization": f"Bearer {rlogin.json()['access_token']}"}
    now = datetime.utcnow().isoformat()
    r = client.post(f"/drivers/{drv['id']}/location-status", json={"lat": 3.01, "lng": 3.01, "timestamp": now, "status": "IDLE"}, headers=drv_hdr)
    assert r.status_code == 200

    # user places order
    user_hdr, _ = register_and_login(client, "u_succ@example.com", "upwd", name="US")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    assert r.status_code == 200
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    assert r.status_code == 200
    order = r.json()

    # Bypass API to set order to ACCEPTED directly in DB (avoid validation variability)
    TEST_DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db")
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        db_order = db.query(Order).filter(Order.id == order["id"]).first()
        assert db_order is not None
        db_order.status = OrderStatus.ACCEPTED
        db.add(db_order)
        db.commit()
    finally:
        db.close()

    # owner performs manual assign to the idle driver
    ra = client.post(f"/orders/{order['id']}/assign-driver", json={"driver_id": drv["id"]}, headers=owner_hdr)
    assert ra.status_code == 200
    # The assign endpoint returns an OrderOut which doesn't include driver_id in the schema.
    # Verify assignment by asking the driver for their assigned orders.
    assert ra.status_code == 200
    r_list = client.get(f"/drivers/{drv['id']}/assigned-orders", headers=drv_hdr)
    assert r_list.status_code == 200
    assigned_orders = r_list.json()
    matches = [o for o in assigned_orders if o["id"] == order["id"]]
    assert len(matches) == 1
    assert matches[0].get("driver_id") == drv["id"]

    # driver picks up
    r_pick = client.post(f"/drivers/{drv['id']}/orders/{order['id']}/pickup", headers=drv_hdr)
    assert r_pick.status_code == 200
    assert r_pick.json()["status"] == "PICKED_UP"

    # driver delivers
    r_del = client.post(f"/drivers/{drv['id']}/orders/{order['id']}/deliver", headers=drv_hdr)
    assert r_del.status_code == 200
    assert r_del.json()["status"] == "DELIVERED"
