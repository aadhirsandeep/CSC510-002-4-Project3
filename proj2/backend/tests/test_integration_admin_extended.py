# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

from app.database import SessionLocal
from app.auth import hash_password
from app.models import User, Role


def test_owner_create_cafe_and_admin_block_protected(client):
    # create an owner via public API and use it to create cafe
    r = client.post("/users/register", json={"email": "owneradmin@example.com", "name": "Own", "password": "pw", "role": "OWNER"})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": "owneradmin@example.com", "password": "pw", "role": "OWNER"})
    token = r2.json()["access_token"]
    hdr = {"Authorization": f"Bearer {token}"}
    r3 = client.post("/cafes", json={"name": "COwner", "address": "A", "lat": 0, "lng": 0}, headers=hdr)
    assert r3.status_code == 200

    # Owner should not be allowed to call admin block_user
    r4 = client.post("/users/register", json={"email": "toblock@example.com", "name": "TB", "password": "pw", "role": "USER"})
    user_id = r4.json()["id"]
    r5 = client.post(f"/admin/block_user/{user_id}", headers=hdr)
    assert r5.status_code == 403
