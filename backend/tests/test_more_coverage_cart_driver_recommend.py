# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

from app.services.recommend import daily_calorie_recommendation


def test_recommend_basic():
    # Basic sanity checks for male/female and activity multipliers
    res_m = daily_calorie_recommendation(180, 80, "M", 30, "active")
    res_f = daily_calorie_recommendation(160, 60, "F", 30, "sedentary")
    assert isinstance(res_m, int)
    assert isinstance(res_f, int)
    assert res_m > res_f


def register_and_login(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}


def test_cart_update_remove_branch_and_assignee_errors(client):
    # Create owner/cafe/item then user add to cart
    owner_hdr = register_and_login(client, "owncov@example.com", "op", name="OwnCov", role="OWNER")
    r = client.post("/cafes", json={"name": "CovCafe", "address": "A", "lat": 1.0, "lng": 1.0}, headers=owner_hdr)
    assert r.status_code == 200
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "CovItem", "description": "d", "calories": 100, "price": 2.0}, headers=owner_hdr)
    assert r.status_code == 200
    item = r.json()

    user_hdr = register_and_login(client, "ucov@example.com", "up", name="UCov")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 2}, headers=user_hdr)
    assert r.status_code == 200
    cart_item_id = r.json().get("cart_item_id")

    # Update quantity to 0 -> should remove
    r2 = client.put(f"/cart/item/{cart_item_id}", json={"quantity": 0}, headers=user_hdr)
    assert r2.status_code == 200
    assert r2.json()["status"] == "removed"

    # Add back and try to set assignee to unknown email -> 400
    r3 = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    assert r3.status_code == 200
    cart_item_id2 = r3.json().get("cart_item_id")
    r4 = client.put(f"/cart/item/{cart_item_id2}", json={"assignee_email": "nope@example.com"}, headers=user_hdr)
    assert r4.status_code == 400


def test_driver_get_available_forbidden_for_user(client):
    # Non-admin/owner/staff should get 403 for /drivers/available
    user_hdr = register_and_login(client, "plainuser@example.com", "pw", name="Plain", role="USER")
    r = client.get("/drivers/available", headers=user_hdr)
    assert r.status_code == 403
