# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

def register_and_login_user(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def test_assign_driver_no_idle_available(client):
    # owner creates cafe and item
    owner_hdr, _ = register_and_login_user(client, "owner2edge@example.com", "op", name="O2", role="OWNER")
    r = client.post("/cafes", json={"name": "Cedge", "address": "A", "lat": 20.0, "lng": 20.0}, headers=owner_hdr)
    assert r.status_code == 200
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "I", "description": "d", "calories": 100, "price": 2.0}, headers=owner_hdr)
    assert r.status_code == 200
    item = r.json()

    # user adds to cart and places order
    user_hdr, _ = register_and_login_user(client, "u_edge@example.com", "up", name="UE")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    assert r.status_code == 200
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    assert r.status_code == 200
    order = r.json()

    # Attempt to assign driver when none registered -> should be 404 No idle drivers
    ra = client.post(f"/orders/{order['id']}/assign-driver", headers=owner_hdr)
    assert ra.status_code in (404, 400)

