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

from app.models import Order, OrderStatus, User, Role


def register_and_login(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def test_drivers_me_and_post_location_forbidden_for_plain_user(client):
    hdr, _ = register_and_login(client, "plain2@example.com", "pw", name="Plain2")
    r = client.get('/drivers/me', headers=hdr)
    assert r.status_code == 403

    # attempt to post location for driver id 1 as plain user
    r2 = client.post('/drivers/1/location', json={"lat": 1.0, "lng": 2.0, "timestamp": datetime.utcnow().isoformat()}, headers=hdr)
    assert r2.status_code == 403


def test_driver_update_order_status_delivered_without_pickup_returns_400(client):
    # create driver
    rdrv = client.post('/drivers/register', json={"email": "drv_stat2@example.com", "name": "DS2", "password": "pwd"})
    assert rdrv.status_code == 200
    drv = rdrv.json()
    rlogin = client.post('/drivers/login', json={"email": "drv_stat2@example.com", "password": "pwd"})
    assert rlogin.status_code == 200
    drv_hdr = {"Authorization": f"Bearer {rlogin.json()['access_token']}"}

    # create cafe/item and order
    owner_hdr, _ = register_and_login(client, "own_stat2@example.com", "opw", name="Own2", role="OWNER")
    r = client.post('/cafes', json={"name": "C2", "address": "A", "lat": 2.0, "lng": 2.0}, headers=owner_hdr)
    cafe_id = r.json()['id']
    r = client.post(f'/items/{cafe_id}', json={"name": "It2", "description": "d", "calories": 100, "price": 3.0}, headers=owner_hdr)
    item = r.json()
    user_hdr, _ = register_and_login(client, 'u_stat2@example.com', 'upw', name='U2')
    r = client.post('/cart/add', json={"item_id": item['id'], "quantity": 1}, headers=user_hdr)
    assert r.status_code == 200
    r = client.post('/orders/place', json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()

    # assign order to driver directly in DB without setting status to PICKED_UP
    TEST_DB_URL = os.environ.get('DATABASE_URL', 'sqlite:///./test.db')
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        db_order = db.query(Order).filter(Order.id == order['id']).first()
        db_order.driver_id = drv['id']
        db.add(db_order)
        db.commit()
    finally:
        db.close()

    # Driver attempts to set status to DELIVERED without pickup -> should be 400 (or 422 if validation differs)
    rstat = client.post(f"/drivers/{drv['id']}/orders/{order['id']}/status", json="DELIVERED", headers=drv_hdr)
    assert rstat.status_code in (400, 422)


def test_pickup_unassigned_order_returns_404(client):
    # create driver and order not assigned
    rdrv = client.post('/drivers/register', json={"email": "drv_unassigned@example.com", "name": "DU", "password": "pwd"})
    drv = rdrv.json()
    rlogin = client.post('/drivers/login', json={"email": "drv_unassigned@example.com", "password": "pwd"})
    drv_hdr = {"Authorization": f"Bearer {rlogin.json()['access_token']}"}

    owner_hdr, _ = register_and_login(client, 'own_un@example.com', 'opw', name='OwnU', role='OWNER')
    r = client.post('/cafes', json={"name": "CUn", "address": "A", "lat": 7.0, "lng": 7.0}, headers=owner_hdr)
    cafe_id = r.json()['id']
    r = client.post(f'/items/{cafe_id}', json={"name": "ItUn", "description": "d", "calories": 100, "price": 3.0}, headers=owner_hdr)
    item = r.json()
    user_hdr, _ = register_and_login(client, 'u_un@example.com', 'upw', name='Un')
    r = client.post('/cart/add', json={"item_id": item['id'], "quantity": 1}, headers=user_hdr)
    r = client.post('/orders/place', json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()

    # driver attempts pickup for unassigned order -> 404
    rp = client.post(f"/drivers/{drv['id']}/orders/{order['id']}/pickup", headers=drv_hdr)
    assert rp.status_code == 404


def test_orders_update_status_invalid_transition_returns_400(client):
    owner_hdr, _ = register_and_login(client, 'own_ti@example.com', 'opw', name='OwnTI', role='OWNER')
    r = client.post('/cafes', json={"name": "CTI", "address": "A", "lat": 9.0, "lng": 9.0}, headers=owner_hdr)
    cafe_id = r.json()['id']
    r = client.post(f'/items/{cafe_id}', json={"name": "ItTI", "description": "d", "calories": 100, "price": 3.0}, headers=owner_hdr)
    item = r.json()
    user_hdr, _ = register_and_login(client, 'u_ti@example.com', 'upw', name='UTI')
    r = client.post('/cart/add', json={"item_id": item['id'], "quantity": 1}, headers=user_hdr)
    r = client.post('/orders/place', json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()

    # owner tries to transition PENDING -> DELIVERED directly -> should be 400 (or 422 if validation differs)
    rtrans = client.post(f"/orders/{order['id']}/status", json="DELIVERED", headers=owner_hdr)
    assert rtrans.status_code in (400, 422)


def test_assign_driver_when_already_assigned_returns_400(client):
    # create owner, driver1, driver2, order and assign driver1 directly then try assign driver2
    owner_hdr, _ = register_and_login(client, 'own_as@example.com', 'opw', name='OwnAS', role='OWNER')
    r = client.post('/cafes', json={"name": "CAS", "address": "A", "lat": 11.0, "lng": 11.0}, headers=owner_hdr)
    cafe_id = r.json()['id']
    r = client.post(f'/items/{cafe_id}', json={"name": "Ias", "description": "d", "calories": 100, "price": 3.0}, headers=owner_hdr)
    item = r.json()
    user_hdr, _ = register_and_login(client, 'u_as@example.com', 'upw', name='UAS')
    r = client.post('/cart/add', json={"item_id": item['id'], "quantity": 1}, headers=user_hdr)
    r = client.post('/orders/place', json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()

    # create two drivers
    r1 = client.post('/drivers/register', json={"email": "drv1_as@example.com", "name": "D1", "password": "pwd"})
    drv1 = r1.json()
    r2 = client.post('/drivers/register', json={"email": "drv2_as@example.com", "name": "D2", "password": "pwd"})
    drv2 = r2.json()

    # assign drv1 directly in DB
    TEST_DB_URL = os.environ.get('DATABASE_URL', 'sqlite:///./test.db')
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        db_order = db.query(Order).filter(Order.id == order['id']).first()
        db_order.driver_id = drv1['id']
        db_order.status = OrderStatus.ACCEPTED
        db.add(db_order)
        db.commit()
    finally:
        db.close()

    # owner tries to assign drv2 -> should return 400
    ra = client.post(f"/orders/{order['id']}/assign-driver", json={"driver_id": drv2['id']}, headers=owner_hdr)
    assert ra.status_code == 400
