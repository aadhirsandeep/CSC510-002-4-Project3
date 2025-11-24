# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

def test_place_order_empty_cart_rejected(client):
    # register user and attempt to place order without cart
    client.post("/users/register", json={"email": "ord1@example.com", "name": "O", "password": "pw", "role": "USER"})
    r = client.post("/auth/login", json={"email": "ord1@example.com", "password": "pw", "role": "USER"})
    token = r.json()["access_token"]
    hdr = {"Authorization": f"Bearer {token}"}
    r2 = client.post("/orders/place", json={"cafe_id": 999}, headers=hdr)
    assert r2.status_code == 400
