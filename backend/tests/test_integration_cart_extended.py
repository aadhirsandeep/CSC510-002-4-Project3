# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

import pytest


def register_and_login(client, email, password, name="User", role="USER"):
    # register
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    # login
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    token = r2.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_cart_merge_and_single_restaurant_enforcement(client):
    # Create admin and two cafes + items
    # create an owner account and create cafes as owner
    owner_hdr = register_and_login(client, "owner1@example.com", "ownerpass", name="Owner1", role="OWNER")

    # Create two cafes via owner API
    r = client.post("/cafes", json={"name": "CafeA", "address": "Addr A", "lat": 1.0, "lng": 1.0}, headers=owner_hdr)
    assert r.status_code == 200
    cafe_a_id = r.json()["id"]

    r = client.post("/cafes", json={"name": "CafeB", "address": "Addr B", "lat": 2.0, "lng": 2.0}, headers=owner_hdr)
    assert r.status_code == 200
    cafe_b_id = r.json()["id"]

    # Add items to cafes as the owner who owns cafe_a and cafe_b (owner will be owner of both)
    item_payload = {"name": "Toast", "description": "Tasty", "calories": 200, "price": 3.5}
    r = client.post(f"/items/{cafe_a_id}", json=item_payload, headers=owner_hdr)
    assert r.status_code == 200
    item_a = r.json()

    r = client.post(f"/items/{cafe_b_id}", json={**item_payload, "name": "Salad"}, headers=owner_hdr)
    assert r.status_code == 200
    item_b = r.json()

    # Register a normal user
    user_hdr = register_and_login(client, "bob2@example.com", "s3cret", name="Bob")

    # Add item A twice -> should merge into single cart item with quantity 2
    r = client.post("/cart/add", json={"item_id": item_a["id"], "quantity": 1}, headers=user_hdr)
    assert r.status_code == 200
    assert r.json()["status"] in ("added", "updated")

    r = client.post("/cart/add", json={"item_id": item_a["id"], "quantity": 1}, headers=user_hdr)
    assert r.status_code == 200
    # Fetch cart items
    r = client.get("/cart/items", headers=user_hdr)
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list)
    # single row for item_a with quantity 2
    matches = [row for row in rows if row["item"]["id"] == item_a["id"]]
    assert len(matches) == 1
    assert matches[0]["quantity"] == 2

    # Try to add an item from cafe B -> should be rejected (400)
    r = client.post("/cart/add", json={"item_id": item_b["id"], "quantity": 1}, headers=user_hdr)
    assert r.status_code == 400

    # Decrement quantity using update endpoint: set quantity 1
    cart_item_id = matches[0]["id"]
    r = client.put(f"/cart/item/{cart_item_id}", json={"quantity": 1}, headers=user_hdr)
    assert r.status_code == 200
    assert r.json()["status"] == "updated"

    r = client.get("/cart/items", headers=user_hdr)
    rows = r.json()
    matches = [row for row in rows if row["item"]["id"] == item_a["id"]]
    assert matches[0]["quantity"] == 1


def test_place_order_and_cancel_clears_cart(client):
    # Setup: admin creates cafe and item, user adds to cart
    owner_hdr = register_and_login(client, "owner2@example.com", "ownerpass2", name="Owner2", role="OWNER")
    r = client.post("/cafes", json={"name": "CafeC", "address": "Addr C", "lat": 3.0, "lng": 3.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]

    r = client.post(f"/items/{cafe_id}", json={"name": "Burger", "description": "Yum", "calories": 500, "price": 7.5}, headers=owner_hdr)
    item = r.json()

    user_hdr = register_and_login(client, "carol@example.com", "pw12345", name="Carol")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 2}, headers=user_hdr)
    assert r.status_code == 200

    # Place order
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    assert r.status_code == 200
    order = r.json()
    assert order["cafe_id"] == cafe_id

    # Cart should be cleared by server
    r = client.get("/cart/items", headers=user_hdr)
    assert r.status_code == 200
    assert r.json() == []

    # Cancel the order (should succeed if within cancel window)
    r = client.post(f"/orders/{order['id']}/cancel", headers=user_hdr)
    assert r.status_code == 200
    canceled = r.json()
    assert canceled["status"] == "CANCELLED"
