# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""
Integration tests for extended cart workflows - testing complex scenarios
like cart summary with multiple assignees, item deletion, and edge cases.
"""


def register_and_login(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def test_cart_summary_with_multiple_assignees(client):
    """Test cart summary correctly calculates calories and prices per assignee - validating multi-person cart logic."""
    owner_hdr, _ = register_and_login(client, "owner_cart@example.com", "opw", name="OwnCart", role="OWNER")
    r = client.post("/cafes", json={"name": "CartCafe", "address": "A", "lat": 1.0, "lng": 1.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    r1 = client.post(f"/items/{cafe_id}", json={"name": "Item1", "description": "d", "calories": 200, "price": 10.0}, headers=owner_hdr)
    item1 = r1.json()
    r2 = client.post(f"/items/{cafe_id}", json={"name": "Item2", "description": "d", "calories": 300, "price": 15.0}, headers=owner_hdr)
    item2 = r2.json()
    
    # Create multiple users
    user1_hdr, user1 = register_and_login(client, "user_cart1@example.com", "upw", name="UCart1")
    user2_hdr, user2 = register_and_login(client, "user_cart2@example.com", "upw", name="UCart2")
    
    # User1 adds items for themselves and for user2
    r = client.post("/cart/add", json={"item_id": item1["id"], "quantity": 2}, headers=user1_hdr)  # For user1
    r = client.post("/cart/add", json={"item_id": item2["id"], "quantity": 1, "assignee_email": user2["email"]}, headers=user1_hdr)  # For user2
    
    # Get cart summary
    r_summary = client.get("/cart/summary", headers=user1_hdr)
    assert r_summary.status_code == 200
    summary = r_summary.json()
    
    assert "by_person" in summary
    assert "total_calories" in summary
    assert "total_price" in summary
    
    # Verify totals: user1: 2*200=400 cal, 2*10=20 price; user2: 1*300=300 cal, 1*15=15 price
    assert summary["total_calories"] == 700
    assert summary["total_price"] == 35.0
    
    # Verify per-person breakdown
    assert user1["email"] in summary["by_person"]
    assert user2["email"] in summary["by_person"]
    assert summary["by_person"][user1["email"]]["calories"] == 400
    assert summary["by_person"][user2["email"]]["calories"] == 300


def test_delete_cart_item(client):
    """Test deleting a specific cart item - validating item removal workflow."""
    owner_hdr, _ = register_and_login(client, "owner_cart2@example.com", "opw", name="OwnCart2", role="OWNER")
    r = client.post("/cafes", json={"name": "CartCafe2", "address": "A", "lat": 2.0, "lng": 2.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    r1 = client.post(f"/items/{cafe_id}", json={"name": "Item1", "description": "d", "calories": 100, "price": 5.0}, headers=owner_hdr)
    item1 = r1.json()
    r2 = client.post(f"/items/{cafe_id}", json={"name": "Item2", "description": "d", "calories": 200, "price": 10.0}, headers=owner_hdr)
    item2 = r2.json()
    
    user_hdr, _ = register_and_login(client, "user_cart3@example.com", "upw", name="UCart3")
    r = client.post("/cart/add", json={"item_id": item1["id"], "quantity": 1}, headers=user_hdr)
    cart_item_id1 = r.json()["cart_item_id"]
    r = client.post("/cart/add", json={"item_id": item2["id"], "quantity": 1}, headers=user_hdr)
    cart_item_id2 = r.json()["cart_item_id"]
    
    # Verify both items are in cart
    r_items = client.get("/cart/items", headers=user_hdr)
    assert len(r_items.json()) == 2
    
    # Delete one item
    r_del = client.delete(f"/cart/item/{cart_item_id1}", headers=user_hdr)
    assert r_del.status_code == 200
    assert r_del.json()["status"] == "deleted"
    
    # Verify only one item remains
    r_items2 = client.get("/cart/items", headers=user_hdr)
    remaining_items = r_items2.json()
    assert len(remaining_items) == 1
    assert remaining_items[0]["item"]["id"] == item2["id"]


def test_delete_cart_item_from_other_user_fails(client):
    """Test that users can only delete their own cart items - validating authorization."""
    owner_hdr, _ = register_and_login(client, "owner_cart3@example.com", "opw", name="OwnCart3", role="OWNER")
    r = client.post("/cafes", json={"name": "CartCafe3", "address": "A", "lat": 3.0, "lng": 3.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    r = client.post(f"/items/{cafe_id}", json={"name": "Item", "description": "d", "calories": 100, "price": 5.0}, headers=owner_hdr)
    item = r.json()
    
    user1_hdr, _ = register_and_login(client, "user_cart5@example.com", "upw", name="UCart5")
    user2_hdr, _ = register_and_login(client, "user_cart6@example.com", "upw", name="UCart6")
    
    # User1 adds item to cart
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user1_hdr)
    cart_item_id = r.json()["cart_item_id"]
    
    # User2 tries to delete user1's item - should fail
    r_del = client.delete(f"/cart/item/{cart_item_id}", headers=user2_hdr)
    assert r_del.status_code == 404  # Not found for user2


def test_cart_items_endpoint_returns_detailed_info(client):
    """Test that cart items endpoint returns complete item details - validating response structure."""
    owner_hdr, _ = register_and_login(client, "owner_cart4@example.com", "opw", name="OwnCart4", role="OWNER")
    r = client.post("/cafes", json={"name": "CartCafe4", "address": "A", "lat": 4.0, "lng": 4.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    r = client.post(f"/items/{cafe_id}", json={"name": "DetailedItem", "description": "Test desc", "calories": 250, "price": 12.5}, headers=owner_hdr)
    item = r.json()
    
    user_hdr, _ = register_and_login(client, "user_cart8@example.com", "upw", name="UCart8")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 3}, headers=user_hdr)
    
    r_items = client.get("/cart/items", headers=user_hdr)
    assert r_items.status_code == 200
    items = r_items.json()
    assert len(items) == 1
    
    cart_item = items[0]
    assert cart_item["quantity"] == 3
    assert cart_item["item"]["name"] == "DetailedItem"
    assert cart_item["item"]["description"] == "Test desc"
    assert cart_item["item"]["calories"] == 250
    assert cart_item["item"]["price"] == 12.5


def test_cart_summary_updates_after_item_modification(client):
    """Test that cart summary correctly updates when items are modified - validating dynamic calculations."""
    owner_hdr, _ = register_and_login(client, "owner_cart5@example.com", "opw", name="OwnCart5", role="OWNER")
    r = client.post("/cafes", json={"name": "CartCafe5", "address": "A", "lat": 5.0, "lng": 5.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    r = client.post(f"/items/{cafe_id}", json={"name": "ModItem", "description": "d", "calories": 200, "price": 10.0}, headers=owner_hdr)
    item = r.json()
    
    user_hdr, _ = register_and_login(client, "user_cart9@example.com", "upw", name="UCart9")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 2}, headers=user_hdr)
    cart_item_id = r.json()["cart_item_id"]
    
    # Check initial summary
    r_summary1 = client.get("/cart/summary", headers=user_hdr)
    assert r_summary1.json()["total_calories"] == 400  # 2 * 200
    
    # Update quantity
    r = client.put(f"/cart/item/{cart_item_id}", json={"quantity": 5}, headers=user_hdr)
    assert r.status_code == 200
    
    # Summary should reflect new quantity
    r_summary2 = client.get("/cart/summary", headers=user_hdr)
    assert r_summary2.json()["total_calories"] == 1000  # 5 * 200

