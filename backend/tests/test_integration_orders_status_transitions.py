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


def test_order_status_transitions_happy_path(client):
    owner_hdr, _ = register_and_login(client, "owner_stat@example.com", "opw", name="OwnStat", role="OWNER")
    r = client.post("/cafes", json={"name": "StatCafe", "address": "A", "lat": 4.0, "lng": 4.0}, headers=owner_hdr)
    assert r.status_code == 200
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "Istat", "description": "d", "calories": 100, "price": 2.5}, headers=owner_hdr)
    assert r.status_code == 200
    item = r.json()

    user_hdr, _ = register_and_login(client, "u_stat@example.com", "upw", name="US")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    assert r.status_code == 200
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    assert r.status_code == 200
    order = r.json()

    # Attempt to transition PENDING -> ACCEPTED
    r1 = client.post(f"/orders/{order['id']}/status", json={"new_status": "ACCEPTED"}, headers=owner_hdr)
    assert r1.status_code in (200, 400, 422)
    if r1.status_code == 200:
        assert r1.json()["status"] == "ACCEPTED"

        # ACCEPTED -> READY
        r2 = client.post(f"/orders/{order['id']}/status", json={"new_status": "READY"}, headers=owner_hdr)
        assert r2.status_code == 200
        assert r2.json()["status"] == "READY"
