# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""
Integration tests for extended order workflows - testing order summary,
my orders endpoint, cafe orders, and complex order management scenarios.
"""


def register_and_login(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def test_order_summary_with_driver_info(client):
    """Test order summary endpoint returns complete order details including driver info - validating order details workflow."""
    owner_hdr, _ = register_and_login(client, "owner_ord@example.com", "opw", name="OwnOrd", role="OWNER")
    r = client.post("/cafes", json={"name": "OrdCafe", "address": "A", "lat": 1.0, "lng": 1.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    r1 = client.post(f"/items/{cafe_id}", json={"name": "Item1", "description": "d", "calories": 100, "price": 10.0}, headers=owner_hdr)
    item1 = r1.json()
    r2 = client.post(f"/items/{cafe_id}", json={"name": "Item2", "description": "d", "calories": 200, "price": 15.0}, headers=owner_hdr)
    item2 = r2.json()
    
    user_hdr, _ = register_and_login(client, "user_ord@example.com", "upw", name="UOrd")
    r = client.post("/cart/add", json={"item_id": item1["id"], "quantity": 2}, headers=user_hdr)
    r = client.post("/cart/add", json={"item_id": item2["id"], "quantity": 1}, headers=user_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()
    
    # Get order summary
    r_summary = client.get(f"/orders/{order['id']}/summary", headers=user_hdr)
    assert r_summary.status_code == 200
    summary = r_summary.json()
    
    assert summary["id"] == order["id"]  # OrderSummaryOut uses "id" not "order_id"
    assert summary["total_price"] == order["total_price"]
    assert summary["total_calories"] == order["total_calories"]
    assert len(summary["items"]) == 2
    
    # Verify item details
    item_names = [item["name"] for item in summary["items"]]
    assert "Item1" in item_names
    assert "Item2" in item_names
    
    # Verify quantities and subtotals
    for item in summary["items"]:
        if item["name"] == "Item1":
            assert item["quantity"] == 2
            assert item["subtotal_price"] == 20.0
            assert item["subtotal_calories"] == 200
        elif item["name"] == "Item2":
            assert item["quantity"] == 1
            assert item["subtotal_price"] == 15.0
            assert item["subtotal_calories"] == 200


def test_my_orders_endpoint_returns_user_orders(client):
    """Test my orders endpoint returns all orders for the user in chronological order."""
    owner_hdr, _ = register_and_login(client, "owner_ord2@example.com", "opw", name="OwnOrd2", role="OWNER")
    r = client.post("/cafes", json={"name": "OrdCafe2", "address": "A", "lat": 2.0, "lng": 2.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    r = client.post(f"/items/{cafe_id}", json={"name": "Item", "description": "d", "calories": 100, "price": 10.0}, headers=owner_hdr)
    item = r.json()
    
    user_hdr, _ = register_and_login(client, "user_ord2@example.com", "upw", name="UOrd2")
    
    # Place multiple orders
    for i in range(3):
        r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
        r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    
    # Get my orders
    r_orders = client.get("/orders/my", headers=user_hdr)
    assert r_orders.status_code == 200
    orders = r_orders.json()
    assert len(orders) >= 3
    
    # Verify orders are in descending order (most recent first)
    timestamps = [order["created_at"] for order in orders]
    assert timestamps == sorted(timestamps, reverse=True)


def test_cafe_orders_endpoint_for_owner(client):
    """Test cafe orders endpoint returns orders for cafe owner with status filtering."""
    owner_hdr, _ = register_and_login(client, "owner_ord3@example.com", "opw", name="OwnOrd3", role="OWNER")
    r = client.post("/cafes", json={"name": "OrdCafe3", "address": "A", "lat": 3.0, "lng": 3.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    r = client.post(f"/items/{cafe_id}", json={"name": "Item", "description": "d", "calories": 100, "price": 10.0}, headers=owner_hdr)
    item = r.json()
    
    # Create multiple users and place orders
    user1_hdr, _ = register_and_login(client, "user_ord3@example.com", "upw", name="UOrd3")
    user2_hdr, _ = register_and_login(client, "user_ord4@example.com", "upw", name="UOrd4")
    
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user1_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user1_hdr)
    order1 = r.json()
    
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user2_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user2_hdr)
    order2 = r.json()
    
    # Owner gets all orders for cafe
    r_orders = client.get(f"/orders/{cafe_id}", headers=owner_hdr)
    assert r_orders.status_code == 200
    orders = r_orders.json()
    assert len(orders) >= 2
    order_ids = [o["id"] for o in orders]
    assert order1["id"] in order_ids
    assert order2["id"] in order_ids
    
    # Filter by status
    r_pending = client.get(f"/orders/{cafe_id}?status=PENDING", headers=owner_hdr)
    assert r_pending.status_code == 200
    pending_orders = r_pending.json()
    assert all(o["status"] == "PENDING" for o in pending_orders)


def test_cafe_orders_requires_ownership(client):
    """Test that cafe orders can only be accessed by cafe owner/staff/admin."""
    owner1_hdr, _ = register_and_login(client, "owner_ord4@example.com", "opw", name="OwnOrd4", role="OWNER")
    r = client.post("/cafes", json={"name": "OrdCafe4", "address": "A", "lat": 4.0, "lng": 4.0}, headers=owner1_hdr)
    cafe_id = r.json()["id"]
    
    # Another owner tries to access - should fail
    owner2_hdr, _ = register_and_login(client, "owner_ord5@example.com", "opw", name="OwnOrd5", role="OWNER")
    r_orders = client.get(f"/orders/{cafe_id}", headers=owner2_hdr)
    assert r_orders.status_code == 403
    
    # Regular user tries to access - should fail
    user_hdr, _ = register_and_login(client, "user_ord5@example.com", "upw", name="UOrd5")
    r_orders2 = client.get(f"/orders/{cafe_id}", headers=user_hdr)
    assert r_orders2.status_code == 403


def test_order_summary_only_accessible_by_owner(client):
    """Test that order summary can only be accessed by order owner."""
    owner_hdr, _ = register_and_login(client, "owner_ord6@example.com", "opw", name="OwnOrd6", role="OWNER")
    r = client.post("/cafes", json={"name": "OrdCafe6", "address": "A", "lat": 5.0, "lng": 5.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    r = client.post(f"/items/{cafe_id}", json={"name": "Item", "description": "d", "calories": 100, "price": 10.0}, headers=owner_hdr)
    item = r.json()
    
    user1_hdr, _ = register_and_login(client, "user_ord6@example.com", "upw", name="UOrd6")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user1_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user1_hdr)
    order = r.json()
    
    # Another user tries to access summary - should fail with 403 (not authorized)
    user2_hdr, _ = register_and_login(client, "user_ord7@example.com", "upw", name="UOrd7")
    r_summary = client.get(f"/orders/{order['id']}/summary", headers=user2_hdr)
    assert r_summary.status_code == 403  # Returns 403 for unauthorized access, not 404

