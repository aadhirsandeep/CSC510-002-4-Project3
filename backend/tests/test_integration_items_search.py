# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

def test_list_all_items_and_search(client):
    # create owner and cafe and items
    client.post("/users/register", json={"email": "ownsearch@example.com", "name": "O", "password": "pw", "role": "OWNER"})
    r = client.post("/auth/login", json={"email": "ownsearch@example.com", "password": "pw", "role": "OWNER"})
    token = r.json()["access_token"]
    hdr = {"Authorization": f"Bearer {token}"}
    r2 = client.post("/cafes", json={"name": "SearchCafe", "address": "A", "lat": 0, "lng": 0}, headers=hdr)
    cafe_id = r2.json()["id"]
    client.post(f"/items/{cafe_id}", json={"name": "Alpha", "calories": 10, "price": 1.0}, headers=hdr)
    client.post(f"/items/{cafe_id}", json={"name": "Beta", "calories": 20, "price": 2.0}, headers=hdr)

    # list all
    r3 = client.get("/items")
    assert r3.status_code == 200
    all_items = r3.json()
    assert any(i["name"] == "Alpha" for i in all_items)

    # search q param
    r4 = client.get(f"/items?q=Alpha")
    assert r4.status_code == 200
    assert len(r4.json()) >= 1
