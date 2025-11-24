# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

def auth_header(client, email, password, name="Bob"):
    # ensure user exists
    client.post("/users/register", json={"email": email, "name": name, "password": password, "role": "USER"})
    # login
    r = client.post("/auth/login", json={"email": email, "password": password, "role": "USER"})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_cart_lifecycle(client):
    hdrs = auth_header(client, "bob@example.com", "s3cret")
    # list cart items (expect empty)
    r = client.get("/cart/", headers=hdrs)

    assert r.status_code == 200
    assert r.json().get("items") == None

    # clear (idempotent)
    r = client.delete("/cart/clear", headers=hdrs)
    assert r.status_code == 200
    assert r.json()["status"] == "cleared"
