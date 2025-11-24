# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

def test_root_ok(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json().get("ok") is True

def test_register_and_login_and_me(client):
    # register
    payload = {"email": "alice@example.com", "name": "Alice", "password": "secret123", "role": "USER"}
    r = client.post("/users/register", json=payload)
    assert r.status_code == 200, r.text
    assert r.json()["email"] == payload["email"]

    # login
    r2 = client.post("/auth/login", json={"email": payload["email"], "password": payload["password"], "role": "USER"})
    assert r2.status_code == 200, r2.text
    token = r2.json()["access_token"]
    assert token

    # token-based auth check
    header = {"Authorization": f"Bearer {token}"}
    r3 = client.get("/users/me", headers=header)
    assert r3.status_code == 200
    assert r3.json()["email"] == payload["email"]
