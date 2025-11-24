from datetime import date


def register_and_login(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def test_today_intake_excludes_cancelled_orders(client):
    # Owner creates cafe and item
    owner_hdr, _ = register_and_login(client, "owner_cancel@example.com", "opw", name="OwnerC", role="OWNER")
    r = client.post("/cafes", json={"name": "CancelCafe", "address": "A", "lat": 1.0, "lng": 1.0}, headers=owner_hdr)
    assert r.status_code == 200
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "CancelItem", "description": "d", "calories": 400, "price": 9.0}, headers=owner_hdr)
    assert r.status_code == 200
    item = r.json()

    # User places order
    user_hdr, user = register_and_login(client, "user_cancel@example.com", "upw", name="UCancel")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    assert r.status_code == 200
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    assert r.status_code == 200
    order = r.json()

    # Verify intake counts the order initially
    r_intake = client.get("/goals/intake/today", headers=user_hdr)
    assert r_intake.status_code == 200
    assert r_intake.json()["calories"] == 400

    # Cancel the order via status endpoint
    r_cancel = client.post(f"/orders/{order['id']}/cancel", headers=user_hdr)
    # cancel endpoint may return 200 or 202 depending on implementation
    assert r_cancel.status_code in (200, 202)

    # Now intake should exclude the cancelled order
    r_intake2 = client.get("/goals/intake/today", headers=user_hdr)
    assert r_intake2.status_code == 200
    assert r_intake2.json()["calories"] == 0
