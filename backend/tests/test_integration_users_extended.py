# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "name": "Dup", "password": "p1", "role": "USER"}
    r = client.post("/users/register", json=payload)
    assert r.status_code == 200
    r2 = client.post("/users/register", json=payload)
    assert r2.status_code == 400


def test_get_me_requires_token(client):
    r = client.get("/users/me")
    assert r.status_code == 401


def test_delete_self_deactivates(client):
    # register and login
    payload = {"email": "delme@example.com", "name": "Del", "password": "pw", "role": "USER"}
    r = client.post("/users/register", json=payload)
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": payload["email"], "password": payload["password"], "role": "USER"})
    token = r2.json()["access_token"]
    hdr = {"Authorization": f"Bearer {token}"}
    r3 = client.delete("/users/me", headers=hdr)
    assert r3.status_code == 200
    assert r3.json()["status"] == "deactivated"
