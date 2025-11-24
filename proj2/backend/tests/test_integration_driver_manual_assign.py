# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

from datetime import datetime


def register_and_login(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def test_get_available_drivers_includes_idle_driver(client):
    # register driver and post idle location
    rdrv = client.post("/drivers/register", json={"email": "drv_avail@example.com", "name": "DA", "password": "dpwd"})
    assert rdrv.status_code == 200
    drv = rdrv.json()
    rlogin = client.post("/drivers/login", json={"email": "drv_avail@example.com", "password": "dpwd"})
    assert rlogin.status_code == 200
    drv_hdr = {"Authorization": f"Bearer {rlogin.json()['access_token']}"}

    now = datetime.utcnow().isoformat()
    r = client.post(f"/drivers/{drv['id']}/location-status", json={"lat": 5.0, "lng": 5.0, "timestamp": now, "status": "IDLE"}, headers=drv_hdr)
    assert r.status_code == 200

    # owner requests available drivers
    owner_hdr, _ = register_and_login(client, "owner_avail@example.com", "opwd", name="OwnAvail", role="OWNER")
    ra = client.get("/drivers/available", headers=owner_hdr)
    assert ra.status_code == 200
    items = ra.json()
    assert any(d.get("driver_id") == drv["id"] for d in items)


def test_manual_assign_fails_when_driver_not_idle(client):
    # owner creates cafe/item
    owner_hdr, _ = register_and_login(client, "owner_manual@example.com", "opwd2", name="OwnM", role="OWNER")
    r = client.post("/cafes", json={"name": "ManualCafe", "address": "Addr", "lat": 8.0, "lng": 8.0}, headers=owner_hdr)
    assert r.status_code == 200
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "Sand", "description": "d", "calories": 120, "price": 4.0}, headers=owner_hdr)
    assert r.status_code == 200
    item = r.json()

    # register driver and set OCCUPIED status
    rdrv = client.post("/drivers/register", json={"email": "drv_busy@example.com", "name": "DB", "password": "pwd"})
    assert rdrv.status_code == 200
    drv = rdrv.json()
    rlogin = client.post("/drivers/login", json={"email": "drv_busy@example.com", "password": "pwd"})
    assert rlogin.status_code == 200
    drv_hdr = {"Authorization": f"Bearer {rlogin.json()['access_token']}"}
    now = datetime.utcnow().isoformat()
    r = client.post(f"/drivers/{drv['id']}/location-status", json={"lat": 8.0, "lng": 8.0, "timestamp": now, "status": "OCCUPIED"}, headers=drv_hdr)
    assert r.status_code == 200

    # user places an order
    user_hdr, _ = register_and_login(client, "u_manual@example.com", "upwd", name="UM")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    assert r.status_code == 200
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    assert r.status_code == 200
    order = r.json()

    # owner moves order to ACCEPTED to allow assignment; server may return validation 422
    rs = client.post(f"/orders/{order['id']}/status", json={"new_status": "ACCEPTED"}, headers=owner_hdr)
    assert rs.status_code in (200, 422, 400)

    # owner tries manual assign with driver who is OCCUPIED -> should fail (400) or not-allowed (404)
    ra = client.post(f"/orders/{order['id']}/assign-driver", json={"driver_id": drv["id"]}, headers=owner_hdr)
    assert ra.status_code in (400, 404)
