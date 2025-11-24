# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

from datetime import datetime


def test_driver_register_and_location_and_status(client):
    # register driver via drivers/register
    r = client.post("/drivers/register", json={"email": "drv1@example.com", "name": "D1", "password": "drvpass"})
    assert r.status_code == 200
    # login
    r2 = client.post("/drivers/login", json={"email": "drv1@example.com", "password": "drvpass"})
    assert r2.status_code == 200
    token = r2.json()["access_token"]
    hdr = {"Authorization": f"Bearer {token}"}

    # post location
    now = datetime.utcnow().isoformat()
    driver_id = r.json()["id"]
    r3 = client.post(f"/drivers/{driver_id}/location", json={"lat": 1.0, "lng": 2.0, "timestamp": now}, headers=hdr)
    assert r3.status_code == 200

    # update status should succeed now
    r4 = client.put(f"/drivers/{driver_id}/status", json={"status": "IDLE"}, headers=hdr)
    assert r4.status_code == 200

def test_driver_status_requires_location(client):
    # register second driver but don't post location
    r = client.post("/drivers/register", json={"email": "drv2@example.com", "name": "D2", "password": "drvpass2"})
    assert r.status_code == 200
    r2 = client.post("/drivers/login", json={"email": "drv2@example.com", "password": "drvpass2"})
    token = r2.json()["access_token"]
    hdr = {"Authorization": f"Bearer {token}"}

    driver2_id = r.json()["id"]
    r3 = client.put(f"/drivers/{driver2_id}/status", json={"status": "OCCUPIED"}, headers=hdr)
    # Without a posted location the endpoint should return 404
    assert r3.status_code == 404
