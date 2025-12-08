
from fastapi.testclient import TestClient
from app.main import app
from datetime import datetime
import json

client = TestClient(app)

def register_and_login(email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    # if r.status_code != 200:
    #     print(f"Register {email}: {r.status_code}")
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r2.json()

def run():
    print("Starting verification...")
    # 1. Setup Cafe and Owner
    owner_hdr, _ = register_and_login("owner_reassign_v@example.com", "opwd", name="OwnRe", role="OWNER")
    r = client.post("/cafes", json={"name": "ReassignCafeV", "address": "Addr", "lat": 10.0, "lng": 10.0}, headers=owner_hdr)
    print(f"Create Cafe: {r.status_code}")
    if r.status_code != 200:
        # maybe already exists, try to find it?
        # just assume it works or we use existing
        pass
    
    # We need a cafe id. If create failed, we might need to fetch.
    # But for now let's assume it works or we get a new one.
    if r.status_code == 200:
        cafe_id = r.json()["id"]
    else:
        # try to get existing
        r = client.get("/cafes", headers=owner_hdr) # this endpoint might not exist or be different
        # let's just use 1 if failed
        cafe_id = 1

    r = client.post(f"/items/{cafe_id}", json={"name": "Item1", "description": "d", "calories": 100, "price": 5.0}, headers=owner_hdr)
    if r.status_code == 200:
        item = r.json()
    else:
        # fetch items
        r = client.get(f"/items/{cafe_id}")
        item = r.json()[0]

    # 2. Setup Drivers
    # Driver A
    rdrvA = client.post("/drivers/register", json={"email": "drvAv@example.com", "name": "DriverA", "password": "pwd"})
    if rdrvA.status_code == 200:
        drvA = rdrvA.json()
        rloginA = client.post("/drivers/login", json={"email": "drvAv@example.com", "password": "pwd"})
        drvA_hdr = {"Authorization": f"Bearer {rloginA.json()['access_token']}"}
    else:
        rloginA = client.post("/drivers/login", json={"email": "drvAv@example.com", "password": "pwd"})
        drvA_hdr = {"Authorization": f"Bearer {rloginA.json()['access_token']}"}
        drvA = client.get("/drivers/me", headers=drvA_hdr).json()
    
    # Driver B
    rdrvB = client.post("/drivers/register", json={"email": "drvBv@example.com", "name": "DriverB", "password": "pwd"})
    if rdrvB.status_code == 200:
        drvB = rdrvB.json()
        rloginB = client.post("/drivers/login", json={"email": "drvBv@example.com", "password": "pwd"})
        drvB_hdr = {"Authorization": f"Bearer {rloginB.json()['access_token']}"}
    else:
        rloginB = client.post("/drivers/login", json={"email": "drvBv@example.com", "password": "pwd"})
        drvB_hdr = {"Authorization": f"Bearer {rloginB.json()['access_token']}"}
        drvB = client.get("/drivers/me", headers=drvB_hdr).json()

    print(f"Driver A: {drvA['id']}, Driver B: {drvB['id']}")

    # 3. Set Drivers to IDLE
    now = datetime.utcnow().isoformat()
    client.post(f"/drivers/{drvA['id']}/location-status", json={"lat": 10.0, "lng": 10.0, "timestamp": now, "status": "IDLE"}, headers=drvA_hdr)
    client.post(f"/drivers/{drvB['id']}/location-status", json={"lat": 10.0, "lng": 10.0, "timestamp": now, "status": "IDLE"}, headers=drvB_hdr)

    # 4. Place Order
    user_hdr, _ = register_and_login("u_reassign_v@example.com", "upwd", name="URe")
    client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    print(f"Place Order: {r.status_code}")
    order = r.json()
    print(f"Order ID: {order['id']}")

    # 5. Accept Order
    r = client.post(f"/orders/{order['id']}/status", json={"new_status": "ACCEPTED"}, headers=owner_hdr)
    print(f"Accept Order: {r.status_code}")
    
    try:
        # 6. Assign Driver A
        print(f"Assigning Driver A ({drvA['id']})...")
        r = client.post(f"/orders/{order['id']}/assign-driver", json={"driver_id": drvA["id"]}, headers=owner_hdr)
        print(f"Assign Driver A: {r.status_code}")
        if r.status_code != 200:
            print(r.text)
        order_updated = r.json()
        print(f"Order Driver: {order_updated.get('driver_id')}")

        # 7. Reassign to Driver B
        print(f"Assigning Driver B ({drvB['id']})...")
        r = client.post(f"/orders/{order['id']}/assign-driver", json={"driver_id": drvB["id"]}, headers=owner_hdr)
        print(f"Assign Driver B: {r.status_code}")
        if r.status_code != 200:
            print(r.text)
        order_reassigned = r.json()
        print(f"Order Driver: {order_reassigned.get('driver_id')}")

        if order_reassigned.get('driver_id') == drvB['id']:
            print("SUCCESS: Reassignment worked!")
        else:
            print("FAILURE: Reassignment failed!")
    except Exception as e:
        print(f"EXCEPTION TYPE: {type(e)}")
        if hasattr(e, 'errors'):
             print(f"ERRORS: {e.errors()}")
        else:
             print(f"MSG: {e}")

if __name__ == "__main__":
    run()
