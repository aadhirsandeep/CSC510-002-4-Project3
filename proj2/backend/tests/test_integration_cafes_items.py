# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

def register_and_token(client, email, role="USER"):
    client.post("/users/register", json={"email": email, "name": "Name", "password": "pw", "role": role})
    r = client.post("/auth/login", json={"email": email, "password": "pw", "role": role})
    return r.json()["access_token"]


def test_owner_can_create_cafe_and_items(client):
    token = register_and_token(client, "ownerx@example.com", role="OWNER")
    hdr = {"Authorization": f"Bearer {token}"}
    r = client.post("/cafes", json={"name": "TestCafe", "address": "X", "lat": 0.0, "lng": 0.0}, headers=hdr)
    assert r.status_code == 200
    cafe = r.json()
    # Owner can add item
    r2 = client.post(f"/items/{cafe['id']}", json={"name": "I1", "calories": 100, "price": 1.0}, headers=hdr)
    assert r2.status_code == 200


def test_non_owner_cannot_add_item(client):
    # create owner cafe
    owner_token = register_and_token(client, "ownerz@example.com", role="OWNER")
    hdr_owner = {"Authorization": f"Bearer {owner_token}"}
    r = client.post("/cafes", json={"name": "C2", "address": "A", "lat": 0, "lng": 0}, headers=hdr_owner)
    cafe_id = r.json()["id"]

    # normal user tries to add item
    user_token = register_and_token(client, "norm@example.com", role="USER")
    hdr_user = {"Authorization": f"Bearer {user_token}"}
    r2 = client.post(f"/items/{cafe_id}", json={"name": "Ibad", "calories": 1, "price": 0.5}, headers=hdr_user)
    assert r2.status_code == 403
