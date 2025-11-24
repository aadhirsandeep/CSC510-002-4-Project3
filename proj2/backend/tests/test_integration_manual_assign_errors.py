# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

def register_and_login(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def test_manual_assign_nonexistent_driver(client):
    owner_hdr, _ = register_and_login(client, "owner_err@example.com", "opw2", name="OwnErr", role="OWNER")
    r = client.post("/cafes", json={"name": "ErrCafe", "address": "A", "lat": 6.0, "lng": 6.0}, headers=owner_hdr)
    assert r.status_code == 200
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "Ierr", "description": "d", "calories": 100, "price": 2.0}, headers=owner_hdr)
    assert r.status_code == 200
    item = r.json()

    user_hdr, _ = register_and_login(client, "u_err@example.com", "upw2", name="UErr")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    assert r.status_code == 200
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    assert r.status_code == 200
    order = r.json()

    # Try to assign a driver id that doesn't exist
    ra = client.post(f"/orders/{order['id']}/assign-driver", json={"driver_id": 99999}, headers=owner_hdr)
    assert ra.status_code in (404, 400)
