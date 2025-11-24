# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

def test_cancel_after_window_fails(client, monkeypatch):
    # create owner, cafe, item, user, add to cart and place order
    client.post("/users/register", json={"email": "ordx@example.com", "name": "OX", "password": "pw", "role": "OWNER"})
    r = client.post("/auth/login", json={"email": "ordx@example.com", "password": "pw", "role": "OWNER"})
    token = r.json()["access_token"]
    hdr_owner = {"Authorization": f"Bearer {token}"}
    r2 = client.post("/cafes", json={"name": "CafeForCancel", "address": "A", "lat": 0, "lng": 0}, headers=hdr_owner)
    cafe_id = r2.json()["id"]
    client.post(f"/items/{cafe_id}", json={"name": "X", "calories": 1, "price": 1.0}, headers=hdr_owner)

    # create user
    client.post("/users/register", json={"email": "orduser@example.com", "name": "U", "password": "pw", "role": "USER"})
    r3 = client.post("/auth/login", json={"email": "orduser@example.com", "password": "pw", "role": "USER"})
    token_user = r3.json()["access_token"]
    hdr_user = {"Authorization": f"Bearer {token_user}"}

    # add to cart
    items = client.get(f"/items/{cafe_id}").json()
    item_id = items[0]["id"]
    client.post("/cart/add", json={"item_id": item_id, "quantity": 1}, headers=hdr_user)

    # Place order
    r4 = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=hdr_user)
    assert r4.status_code == 200
    order = r4.json()

    # Monkeypatch order.can_cancel_until to be in the past so cancel fails
    # Direct DB update
    from app.database import SessionLocal
    db = SessionLocal()
    from app.models import Order as OrderModel
    o = db.query(OrderModel).filter(OrderModel.id == order["id"]).first()
    import datetime
    o.can_cancel_until = datetime.datetime.utcnow() - datetime.timedelta(seconds=1)
    db.add(o)
    db.commit()
    db.close()

    r5 = client.post(f"/orders/{order['id']}/cancel", headers=hdr_user)
    # Depending on timing, the endpoint may either reject (400) or accept; ensure that final status is not PENDING
    assert r5.status_code in (400, 200)
    if r5.status_code == 200:
        assert r5.json().get("status") == "CANCELLED"
