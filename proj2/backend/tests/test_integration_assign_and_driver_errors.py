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


def register_and_login(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def test_assign_driver_auto_fails_when_no_idle(client):
    # create owner, cafe and item, user, place order
    owner_hdr, _ = register_and_login(client, 'own_noidle@example.com', 'opw', name='OwnNoIdle', role='OWNER')
    r = client.post('/cafes', json={"name": "CafeNoIdle", "address": "A", "lat": 30.0, "lng": 30.0}, headers=owner_hdr)
    cafe_id = r.json()['id']
    r = client.post(f'/items/{cafe_id}', json={"name": "NoIdleItem", "description": "d", "calories": 10, "price": 2.0}, headers=owner_hdr)
    item = r.json()
    user_hdr, _ = register_and_login(client, 'user_noidle@example.com', 'upw', name='UNoIdle')
    # add to cart and place order
    r = client.post('/cart/add', json={"item_id": item['id'], "quantity": 1}, headers=user_hdr)
    assert r.status_code == 200
    r = client.post('/orders/place', json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()

    # attempt to auto-assign driver (no drivers registered/idle) -> should return 404
    ra = client.post(f"/orders/{order['id']}/assign-driver", headers=owner_hdr)
    assert ra.status_code in (404, 400)


def test_driver_status_update_without_location_returns_404(client):
    # register driver but do not post location
    rdrv = client.post('/drivers/register', json={"email": "drv_noloc@example.com", "name": "DNL", "password": "pwd"})
    assert rdrv.status_code == 200
    drv = rdrv.json()
    rlogin = client.post('/drivers/login', json={"email": "drv_noloc@example.com", "password": "pwd"})
    assert rlogin.status_code == 200
    drv_hdr = {"Authorization": f"Bearer {rlogin.json()['access_token']}"}

    # attempt to update status without posting a location -> endpoint returns 404
    r = client.put(f"/drivers/{drv['id']}/status", json={"status": "IDLE"}, headers=drv_hdr)
    assert r.status_code == 404