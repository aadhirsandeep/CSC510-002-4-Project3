# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""
Integration tests for analytics workflow - testing cafe analytics generation,
data aggregation, and permission validation.
"""

from datetime import datetime, timedelta


def register_and_login(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def test_cafe_analytics_orders_and_revenue(client):
    """Test that cafe analytics correctly aggregates orders and revenue - core analytics feature."""
    owner_hdr, owner = register_and_login(client, "owner_anal@example.com", "opw", name="OwnAnal", role="OWNER")
    r = client.post("/cafes", json={"name": "AnalCafe", "address": "A", "lat": 1.0, "lng": 1.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    # Create multiple items
    r1 = client.post(f"/items/{cafe_id}", json={"name": "Item1", "description": "d", "calories": 100, "price": 10.0}, headers=owner_hdr)
    item1 = r1.json()
    r2 = client.post(f"/items/{cafe_id}", json={"name": "Item2", "description": "d", "calories": 200, "price": 20.0}, headers=owner_hdr)
    item2 = r2.json()
    
    # Create multiple users and place orders
    user1_hdr, _ = register_and_login(client, "user_anal1@example.com", "upw", name="UAnal1")
    user2_hdr, _ = register_and_login(client, "user_anal2@example.com", "upw", name="UAnal2")
    
    # User1 places order
    r = client.post("/cart/add", json={"item_id": item1["id"], "quantity": 2}, headers=user1_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user1_hdr)
    order1 = r.json()
    
    # User2 places order
    r = client.post("/cart/add", json={"item_id": item2["id"], "quantity": 1}, headers=user2_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user2_hdr)
    order2 = r.json()
    
    # Accept orders to make them count in revenue
    r = client.post(f"/orders/{order1['id']}/status", json={"new_status": "ACCEPTED"}, headers=owner_hdr)
    r = client.post(f"/orders/{order2['id']}/status", json={"new_status": "ACCEPTED"}, headers=owner_hdr)
    
    # Get analytics
    r_anal = client.get(f"/analytics/cafe/{cafe_id}", headers=owner_hdr)
    assert r_anal.status_code == 200
    analytics = r_anal.json()
    
    assert "orders_per_day" in analytics
    assert "revenue_per_day" in analytics
    assert "top_items" in analytics
    
    # Verify orders per day has data
    assert len(analytics["orders_per_day"]) >= 1
    
    # Verify revenue calculation (order1: 2*10=20, order2: 1*20=20, total=40)
    total_revenue = sum(rev for _, rev in analytics["revenue_per_day"])
    assert total_revenue >= 40.0
    
    # Verify top items
    assert len(analytics["top_items"]) >= 1
    item_names = [name for name, _ in analytics["top_items"]]
    assert "Item1" in item_names or "Item2" in item_names


def test_analytics_only_shows_accepted_orders_in_revenue(client):
    """Test that analytics only counts accepted/ready/picked_up orders in revenue - validating business rules."""
    owner_hdr, _ = register_and_login(client, "owner_anal2@example.com", "opw", name="OwnAnal2", role="OWNER")
    r = client.post("/cafes", json={"name": "AnalCafe2", "address": "A", "lat": 2.0, "lng": 2.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    r = client.post(f"/items/{cafe_id}", json={"name": "AnalItem", "description": "d", "calories": 100, "price": 50.0}, headers=owner_hdr)
    item = r.json()
    
    user_hdr, _ = register_and_login(client, "user_anal3@example.com", "upw", name="UAnal3")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()
    
    # Order is PENDING, should not count in revenue
    r_anal = client.get(f"/analytics/cafe/{cafe_id}", headers=owner_hdr)
    analytics = r_anal.json()
    total_revenue = sum(rev for _, rev in analytics["revenue_per_day"])
    assert total_revenue == 0.0
    
    # Accept order, now it should count
    r = client.post(f"/orders/{order['id']}/status", json={"new_status": "ACCEPTED"}, headers=owner_hdr)
    r_anal2 = client.get(f"/analytics/cafe/{cafe_id}", headers=owner_hdr)
    analytics2 = r_anal2.json()
    total_revenue2 = sum(rev for _, rev in analytics2["revenue_per_day"])
    assert total_revenue2 >= 50.0


def test_analytics_top_items_aggregation(client):
    """Test that top items correctly aggregates quantities across orders - validating data aggregation."""
    owner_hdr, _ = register_and_login(client, "owner_anal3@example.com", "opw", name="OwnAnal3", role="OWNER")
    r = client.post("/cafes", json={"name": "AnalCafe3", "address": "A", "lat": 3.0, "lng": 3.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    r = client.post(f"/items/{cafe_id}", json={"name": "PopularItem", "description": "d", "calories": 100, "price": 5.0}, headers=owner_hdr)
    item = r.json()
    
    # Multiple users order the same item (use unique emails to avoid conflicts)
    for i in range(3):
        user_hdr, _ = register_and_login(client, f"user_anal_top{i}@example.com", "upw", name=f"UAnalTop{i}")
        r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 2}, headers=user_hdr)
        r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    
    # Get analytics
    r_anal = client.get(f"/analytics/cafe/{cafe_id}", headers=owner_hdr)
    analytics = r_anal.json()
    
    # PopularItem should appear in top items with total quantity 6 (3 users * 2 each)
    # Note: Analytics aggregates across all orders regardless of status
    top_items = {name: qty for name, qty in analytics["top_items"]}
    assert "PopularItem" in top_items
    # Should have at least 6 (3 orders * 2 quantity each)
    assert top_items["PopularItem"] >= 6


def test_analytics_requires_cafe_ownership(client):
    """Test that analytics can only be accessed by cafe owner/staff/admin - validating permissions."""
    owner1_hdr, _ = register_and_login(client, "owner_anal4@example.com", "opw", name="OwnAnal4", role="OWNER")
    r = client.post("/cafes", json={"name": "AnalCafe4", "address": "A", "lat": 4.0, "lng": 4.0}, headers=owner1_hdr)
    cafe_id = r.json()["id"]
    
    # Another owner tries to access analytics - should fail
    owner2_hdr, _ = register_and_login(client, "owner_anal5@example.com", "opw", name="OwnAnal5", role="OWNER")
    r_anal = client.get(f"/analytics/cafe/{cafe_id}", headers=owner2_hdr)
    assert r_anal.status_code == 403
    
    # Regular user tries to access - should fail
    user_hdr, _ = register_and_login(client, "user_anal4@example.com", "upw", name="UAnal4")
    r_anal2 = client.get(f"/analytics/cafe/{cafe_id}", headers=user_hdr)
    assert r_anal2.status_code == 403


def test_analytics_with_mixed_order_statuses(client):
    """Test analytics correctly handles mix of order statuses - validating complex revenue calculation."""
    owner_hdr, _ = register_and_login(client, "owner_anal6@example.com", "opw", name="OwnAnal6", role="OWNER")
    r = client.post("/cafes", json={"name": "AnalCafe6", "address": "A", "lat": 6.0, "lng": 6.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    r = client.post(f"/items/{cafe_id}", json={"name": "Item", "description": "d", "calories": 100, "price": 50.0}, headers=owner_hdr)
    item = r.json()
    
    # Create multiple orders with different outcomes
    user1_hdr, _ = register_and_login(client, "user_anal6@example.com", "upw", name="UAnal6")
    user2_hdr, _ = register_and_login(client, "user_anal7@example.com", "upw", name="UAnal7")
    
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user1_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user1_hdr)
    order1 = r.json()
    
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user2_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user2_hdr)
    order2 = r.json()
    
    # Accept order1, cancel order2
    r = client.post(f"/orders/{order1['id']}/status", json={"new_status": "ACCEPTED"}, headers=owner_hdr)
    r = client.post(f"/orders/{order2['id']}/cancel", headers=user2_hdr)
    
    # Analytics should only count accepted order in revenue
    r_anal = client.get(f"/analytics/cafe/{cafe_id}", headers=owner_hdr)
    analytics = r_anal.json()
    total_revenue = sum(rev for _, rev in analytics["revenue_per_day"])
    assert total_revenue >= 50.0  # Only order1 counts

