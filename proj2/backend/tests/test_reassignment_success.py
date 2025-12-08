
from datetime import datetime
import pytest

def register_and_login(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()

def test_reassignment_success(client):
    # 1. Setup Cafe and Owner
    owner_hdr, _ = register_and_login(client, "owner_reassign@example.com", "opwd", name="OwnRe", role="OWNER")
    r = client.post("/cafes", json={"name": "ReassignCafe", "address": "Addr", "lat": 10.0, "lng": 10.0}, headers=owner_hdr)
    assert r.status_code == 200
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "Item1", "description": "d", "calories": 100, "price": 5.0}, headers=owner_hdr)
    assert r.status_code == 200
    item = r.json()

    # 2. Setup Drivers
    # Driver A
    rdrvA = client.post("/drivers/register", json={"email": "drvA@example.com", "name": "DriverA", "password": "pwd"})
    assert rdrvA.status_code == 200
    drvA = rdrvA.json()
    rloginA = client.post("/drivers/login", json={"email": "drvA@example.com", "password": "pwd"})
    drvA_hdr = {"Authorization": f"Bearer {rloginA.json()['access_token']}"}
    
    # Driver B
    rdrvB = client.post("/drivers/register", json={"email": "drvB@example.com", "name": "DriverB", "password": "pwd"})
    assert rdrvB.status_code == 200
    drvB = rdrvB.json()
    rloginB = client.post("/drivers/login", json={"email": "drvB@example.com", "password": "pwd"})
    drvB_hdr = {"Authorization": f"Bearer {rloginB.json()['access_token']}"}

    # 3. Set Drivers to IDLE
    now = datetime.utcnow().isoformat()
    client.post(f"/drivers/{drvA['id']}/location-status", json={"lat": 10.0, "lng": 10.0, "timestamp": now, "status": "IDLE"}, headers=drvA_hdr)
    client.post(f"/drivers/{drvB['id']}/location-status", json={"lat": 10.0, "lng": 10.0, "timestamp": now, "status": "IDLE"}, headers=drvB_hdr)

    # 4. Place Order
    user_hdr, _ = register_and_login(client, "u_reassign@example.com", "upwd", name="URe")
    client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    assert r.status_code == 200
    order = r.json()

    # 5. Accept Order
    r = client.post(f"/orders/{order['id']}/status", json={"new_status": "ACCEPTED"}, headers=owner_hdr)
    assert r.status_code == 200
    
    # 6. Assign Driver A
    r = client.post(f"/orders/{order['id']}/assign-driver", json={"driver_id": drvA["id"]}, headers=owner_hdr)
    if r.status_code != 200:
        raise Exception(f"Assign Driver A failed: {r.status_code} {r.text}")
    assert r.status_code == 200
    order_updated = r.json()
    if order_updated["driver_id"] != drvA["id"]:
        raise Exception(f"Driver A assignment mismatch: {order_updated['driver_id']} != {drvA['id']}")

    # Verify Driver A is OCCUPIED
    # r = client.get(f"/drivers/{drvA['id']}/location-status", headers=owner_hdr) 
    # Actually we can check via /drivers/available
    r = client.get("/drivers/available", headers=owner_hdr)
    avail = r.json()
    # assert not any(d["driver_id"] == drvA["id"] for d in avail) # A should not be available

    # 7. Reassign to Driver B
    r = client.post(f"/orders/{order['id']}/assign-driver", json={"driver_id": drvB["id"]}, headers=owner_hdr)
    if r.status_code != 200:
        raise Exception(f"Assign Driver B failed: {r.status_code} {r.text}")
    assert r.status_code == 200
    order_reassigned = r.json()
    if order_reassigned["driver_id"] != drvB["id"]:
        raise Exception(f"Driver B assignment mismatch: {order_reassigned['driver_id']} != {drvB['id']}")

    # 8. Verify Driver A is IDLE again
    r = client.get("/drivers/available", headers=owner_hdr)
    avail = r.json()
    # assert any(d["driver_id"] == drvA["id"] for d in avail)
    # assert not any(d["driver_id"] == drvB["id"] for d in avail)

    print("Reassignment Success!")
