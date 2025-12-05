# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""Tests for the wait time tracking feature."""

import pytest
from datetime import datetime, timedelta


def register_and_login(client, email, password, name="User", role="USER"):
    """Helper to register and login a user, returning auth headers."""
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def create_cafe_with_items(client, owner_hdr, cafe_name, lat=0.0, lng=0.0):
    """Helper to create a cafe with some items."""
    r = client.post("/cafes", json={"name": cafe_name, "address": "123 Test St", "lat": lat, "lng": lng}, headers=owner_hdr)
    assert r.status_code == 200
    cafe = r.json()
    cafe_id = cafe["id"]
    
    # Add a beverage (quick prep)
    r = client.post(f"/items/{cafe_id}", json={"name": "Coffee", "calories": 50, "price": 3.99, "kind": "beverage"}, headers=owner_hdr)
    assert r.status_code == 200
    beverage = r.json()
    
    # Add a main course (longer prep)
    r = client.post(f"/items/{cafe_id}", json={"name": "Pasta", "calories": 600, "price": 12.99, "kind": "main_course"}, headers=owner_hdr)
    assert r.status_code == 200
    main_course = r.json()
    
    return cafe, [beverage, main_course]


def place_order(client, user_hdr, cafe_id, item_id, quantity=1):
    """Helper to add item to cart and place order."""
    r = client.post("/cart/add", json={"item_id": item_id, "quantity": quantity}, headers=user_hdr)
    assert r.status_code == 200
    
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    assert r.status_code == 200
    return r.json()


class TestWaitTimeEndpoint:
    """Tests for the GET /orders/{order_id}/wait-time endpoint."""
    
    def test_get_wait_time_pending_order(self, client):
        """Test wait time estimate for a pending order."""
        # Setup: create owner, cafe, items
        owner_hdr, _ = register_and_login(client, "wt_owner1@example.com", "pass123", "Owner1", "OWNER")
        cafe, items = create_cafe_with_items(client, owner_hdr, "WaitTimeCafe1")
        
        # Create user and place order
        user_hdr, _ = register_and_login(client, "wt_user1@example.com", "pass123", "User1", "USER")
        order = place_order(client, user_hdr, cafe["id"], items[1]["id"])  # Order the main course
        
        # Get wait time
        r = client.get(f"/orders/{order['id']}/wait-time", headers=user_hdr)
        assert r.status_code == 200
        
        data = r.json()
        assert data["order_id"] == order["id"]
        assert data["status"] == "PENDING"
        assert data["estimated_prep_minutes"] is not None
        assert data["total_estimated_minutes"] is not None
    
    def test_get_wait_time_accepted_order(self, client):
        """Test wait time estimate for an accepted order with prep in progress."""
        # Setup
        owner_hdr, _ = register_and_login(client, "wt_owner2@example.com", "pass123", "Owner2", "OWNER")
        cafe, items = create_cafe_with_items(client, owner_hdr, "WaitTimeCafe2")
        
        user_hdr, _ = register_and_login(client, "wt_user2@example.com", "pass123", "User2", "USER")
        order = place_order(client, user_hdr, cafe["id"], items[0]["id"])  # Order the beverage
        
        # Accept the order
        r = client.post(f"/orders/{order['id']}/status?new_status=ACCEPTED", json={}, headers=owner_hdr)
        assert r.status_code == 200
        
        # Get wait time
        r = client.get(f"/orders/{order['id']}/wait-time", headers=user_hdr)
        assert r.status_code == 200
        
        data = r.json()
        assert data["status"] == "ACCEPTED"
        assert data["prep_started_at"] is not None
        assert data["estimated_prep_minutes"] is not None
    
    def test_get_wait_time_ready_order(self, client):
        """Test wait time estimate for a ready order."""
        # Setup
        owner_hdr, _ = register_and_login(client, "wt_owner3@example.com", "pass123", "Owner3", "OWNER")
        cafe, items = create_cafe_with_items(client, owner_hdr, "WaitTimeCafe3")
        
        user_hdr, _ = register_and_login(client, "wt_user3@example.com", "pass123", "User3", "USER")
        order = place_order(client, user_hdr, cafe["id"], items[0]["id"])
        
        # Accept then mark ready
        client.post(f"/orders/{order['id']}/status?new_status=ACCEPTED", json={}, headers=owner_hdr)
        client.post(f"/orders/{order['id']}/status?new_status=READY", json={}, headers=owner_hdr)
        
        # Get wait time
        r = client.get(f"/orders/{order['id']}/wait-time", headers=user_hdr)
        assert r.status_code == 200
        
        data = r.json()
        assert data["status"] == "READY"
        assert data["prep_remaining_minutes"] == 0
        assert data["ready_at"] is not None
    
    def test_wait_time_unauthorized_user(self, client):
        """Test that users cannot view wait time for orders they don't own."""
        # Setup
        owner_hdr, _ = register_and_login(client, "wt_owner4@example.com", "pass123", "Owner4", "OWNER")
        cafe, items = create_cafe_with_items(client, owner_hdr, "WaitTimeCafe4")
        
        user1_hdr, _ = register_and_login(client, "wt_user4a@example.com", "pass123", "User4a", "USER")
        user2_hdr, _ = register_and_login(client, "wt_user4b@example.com", "pass123", "User4b", "USER")
        
        # User1 places order
        order = place_order(client, user1_hdr, cafe["id"], items[0]["id"])
        
        # User2 tries to view wait time (should fail)
        r = client.get(f"/orders/{order['id']}/wait-time", headers=user2_hdr)
        assert r.status_code == 403
    
    def test_wait_time_order_not_found(self, client):
        """Test wait time for non-existent order."""
        user_hdr, _ = register_and_login(client, "wt_user5@example.com", "pass123", "User5", "USER")
        
        r = client.get("/orders/99999/wait-time", headers=user_hdr)
        assert r.status_code == 404


class TestSetPrepTimeEndpoint:
    """Tests for the PATCH /orders/{order_id}/prep-time endpoint."""
    
    def test_set_prep_time_as_owner(self, client):
        """Test owner can set estimated prep time."""
        owner_hdr, _ = register_and_login(client, "pt_owner1@example.com", "pass123", "Owner1", "OWNER")
        cafe, items = create_cafe_with_items(client, owner_hdr, "PrepTimeCafe1")
        
        user_hdr, _ = register_and_login(client, "pt_user1@example.com", "pass123", "User1", "USER")
        order = place_order(client, user_hdr, cafe["id"], items[0]["id"])
        
        # Set prep time
        r = client.patch(f"/orders/{order['id']}/prep-time", json={"estimated_prep_minutes": 20}, headers=owner_hdr)
        assert r.status_code == 200
        
        # Verify in wait time
        r = client.get(f"/orders/{order['id']}/wait-time", headers=user_hdr)
        assert r.json()["estimated_prep_minutes"] == 20
    
    def test_set_prep_time_validation_min(self, client):
        """Test that prep time must be at least 1 minute."""
        owner_hdr, _ = register_and_login(client, "pt_owner2@example.com", "pass123", "Owner2", "OWNER")
        cafe, items = create_cafe_with_items(client, owner_hdr, "PrepTimeCafe2")
        
        user_hdr, _ = register_and_login(client, "pt_user2@example.com", "pass123", "User2", "USER")
        order = place_order(client, user_hdr, cafe["id"], items[0]["id"])
        
        r = client.patch(f"/orders/{order['id']}/prep-time", json={"estimated_prep_minutes": 0}, headers=owner_hdr)
        assert r.status_code == 400
        assert "at least 1 minute" in r.json()["detail"]
    
    def test_set_prep_time_validation_max(self, client):
        """Test that prep time cannot exceed 120 minutes."""
        owner_hdr, _ = register_and_login(client, "pt_owner3@example.com", "pass123", "Owner3", "OWNER")
        cafe, items = create_cafe_with_items(client, owner_hdr, "PrepTimeCafe3")
        
        user_hdr, _ = register_and_login(client, "pt_user3@example.com", "pass123", "User3", "USER")
        order = place_order(client, user_hdr, cafe["id"], items[0]["id"])
        
        r = client.patch(f"/orders/{order['id']}/prep-time", json={"estimated_prep_minutes": 150}, headers=owner_hdr)
        assert r.status_code == 400
        assert "cannot exceed 120 minutes" in r.json()["detail"]
    
    def test_set_prep_time_user_forbidden(self, client):
        """Test that regular users cannot set prep time."""
        owner_hdr, _ = register_and_login(client, "pt_owner4@example.com", "pass123", "Owner4", "OWNER")
        cafe, items = create_cafe_with_items(client, owner_hdr, "PrepTimeCafe4")
        
        user_hdr, _ = register_and_login(client, "pt_user4@example.com", "pass123", "User4", "USER")
        order = place_order(client, user_hdr, cafe["id"], items[0]["id"])
        
        r = client.patch(f"/orders/{order['id']}/prep-time", json={"estimated_prep_minutes": 15}, headers=user_hdr)
        assert r.status_code == 403


class TestStatusTransitionTimestamps:
    """Test that status transitions set appropriate timestamps."""
    
    def test_accepted_sets_prep_started_at(self, client):
        """Test that transitioning to ACCEPTED sets prep_started_at."""
        owner_hdr, _ = register_and_login(client, "ts_owner1@example.com", "pass123", "Owner1", "OWNER")
        cafe, items = create_cafe_with_items(client, owner_hdr, "TimestampCafe1")
        
        user_hdr, _ = register_and_login(client, "ts_user1@example.com", "pass123", "User1", "USER")
        order = place_order(client, user_hdr, cafe["id"], items[0]["id"])
        
        # Accept order
        r = client.post(f"/orders/{order['id']}/status?new_status=ACCEPTED", json={}, headers=owner_hdr)
        assert r.status_code == 200
        
        # Check wait time has prep_started_at
        r = client.get(f"/orders/{order['id']}/wait-time", headers=user_hdr)
        assert r.status_code == 200
        assert r.json()["prep_started_at"] is not None
    
    def test_ready_sets_ready_at(self, client):
        """Test that transitioning to READY sets ready_at."""
        owner_hdr, _ = register_and_login(client, "ts_owner2@example.com", "pass123", "Owner2", "OWNER")
        cafe, items = create_cafe_with_items(client, owner_hdr, "TimestampCafe2")
        
        user_hdr, _ = register_and_login(client, "ts_user2@example.com", "pass123", "User2", "USER")
        order = place_order(client, user_hdr, cafe["id"], items[0]["id"])
        
        # Accept then ready
        client.post(f"/orders/{order['id']}/status?new_status=ACCEPTED", json={}, headers=owner_hdr)
        r = client.post(f"/orders/{order['id']}/status?new_status=READY", json={}, headers=owner_hdr)
        assert r.status_code == 200
        
        # Check wait time has ready_at
        r = client.get(f"/orders/{order['id']}/wait-time", headers=user_hdr)
        assert r.status_code == 200
        assert r.json()["ready_at"] is not None
    
    def test_full_order_lifecycle_timestamps(self, client):
        """Test that all timestamps are set through complete order lifecycle."""
        owner_hdr, _ = register_and_login(client, "ts_owner3@example.com", "pass123", "Owner3", "OWNER")
        cafe, items = create_cafe_with_items(client, owner_hdr, "TimestampCafe3")
        
        user_hdr, _ = register_and_login(client, "ts_user3@example.com", "pass123", "User3", "USER")
        order = place_order(client, user_hdr, cafe["id"], items[0]["id"])
        
        # PENDING -> ACCEPTED
        client.post(f"/orders/{order['id']}/status?new_status=ACCEPTED", json={}, headers=owner_hdr)
        
        # ACCEPTED -> READY
        client.post(f"/orders/{order['id']}/status?new_status=READY", json={}, headers=owner_hdr)
        
        # READY -> PICKED_UP
        client.post(f"/orders/{order['id']}/status?new_status=PICKED_UP", json={}, headers=owner_hdr)
        
        # PICKED_UP -> DELIVERED
        client.post(f"/orders/{order['id']}/status?new_status=DELIVERED", json={}, headers=owner_hdr)
        
        # Check final wait time state
        r = client.get(f"/orders/{order['id']}/wait-time", headers=user_hdr)
        assert r.status_code == 200
        data = r.json()
        
        assert data["status"] == "DELIVERED"
        assert data["prep_started_at"] is not None
        assert data["ready_at"] is not None
        assert data["picked_up_at"] is not None
        assert data["total_estimated_minutes"] == 0


class TestWaitTimeServiceUnit:
    """Unit tests for the WaitTimeService (no HTTP, just logic)."""
    
    def test_prep_time_by_kind_values(self):
        """Test that prep time defaults are reasonable."""
        from app.services.wait_time import PREP_TIME_BY_KIND
        
        assert PREP_TIME_BY_KIND["beverage"] < PREP_TIME_BY_KIND["main_course"]
        assert PREP_TIME_BY_KIND["dessert"] < PREP_TIME_BY_KIND["pizza"]
        assert PREP_TIME_BY_KIND["default"] > 0
    
    def test_estimate_delivery_time_basic(self):
        """Test delivery time estimate calculation."""
        from app.services.wait_time import WaitTimeService
        
        # Same location should give minimum time
        minutes, distance = WaitTimeService.estimate_delivery_time(0.0, 0.0, 0.0, 0.0)
        assert minutes >= 5  # Minimum delivery time
        assert distance == 0.0
    
    def test_estimate_delivery_time_with_distance(self):
        """Test delivery time increases with distance."""
        from app.services.wait_time import WaitTimeService
        
        # Short distance
        min1, dist1 = WaitTimeService.estimate_delivery_time(0.0, 0.0, 0.01, 0.01)
        
        # Longer distance
        min2, dist2 = WaitTimeService.estimate_delivery_time(0.0, 0.0, 0.1, 0.1)
        
        assert dist2 > dist1
        assert min2 >= min1
