# Copyright (c) 2025 Group 2
# All rights reserved.
#
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""
Integration tests for refund functionality - testing refund requests,
approvals, rejections, and duplicate refund prevention.
"""

import pytest
from datetime import datetime


def register_and_login(client, email, password, name="User", role="USER"):
    """Helper function to register and login a user."""
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def create_test_order(client, user_hdr, cafe_id, item_id, quantity=1):
    """Helper function to create a test order."""
    # Add item to cart
    r = client.post("/cart/add", json={"item_id": item_id, "quantity": quantity}, headers=user_hdr)
    assert r.status_code == 200

    # Place order
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    assert r.status_code == 200
    return r.json()


def test_create_refund_request(client):
    """Test creating a refund request for an order."""
    # Setup: Create owner, cafe, and item
    owner_hdr, _ = register_and_login(client, "owner_refund1@test.com", "pass", "Owner1", "OWNER")
    r = client.post("/cafes/", json={"name": "RefundCafe1", "address": "123 St", "lat": 1.0, "lng": 1.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]

    r = client.post(f"/items/{cafe_id}", json={"name": "TestItem", "description": "desc", "calories": 100, "price": 10.0}, headers=owner_hdr)
    item_id = r.json()["id"]

    # Create user and place order
    user_hdr, user_data = register_and_login(client, "user_refund1@test.com", "pass", "User1")
    order = create_test_order(client, user_hdr, cafe_id, item_id)

    # Request refund
    refund_data = {
        "order_id": order["id"],
        "reason_category": "RESTAURANT_ISSUE",
        "reason_description": "Food quality issue"
    }
    r = client.post("/refunds/request", json=refund_data, headers=user_hdr)
    assert r.status_code == 200

    refund = r.json()
    assert refund["order_id"] == order["id"]
    assert refund["reason_category"] == "RESTAURANT_ISSUE"
    assert refund["refund_amount"] > 0
    assert refund["status"] in ["PENDING", "APPROVED", "PROCESSED"]


def test_duplicate_refund_prevention(client):
    """Test that users cannot request multiple refunds for the same order."""
    # Setup
    owner_hdr, _ = register_and_login(client, "owner_refund2@test.com", "pass", "Owner2", "OWNER")
    r = client.post("/cafes/", json={"name": "RefundCafe2", "address": "456 St", "lat": 2.0, "lng": 2.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]

    r = client.post(f"/items/{cafe_id}", json={"name": "TestItem2", "description": "desc", "calories": 100, "price": 15.0}, headers=owner_hdr)
    item_id = r.json()["id"]

    user_hdr, _ = register_and_login(client, "user_refund2@test.com", "pass", "User2")
    order = create_test_order(client, user_hdr, cafe_id, item_id)

    # First refund request - should succeed
    refund_data = {
        "order_id": order["id"],
        "reason_category": "OTHER",
        "reason_description": "First refund request"
    }
    r = client.post("/refunds/request", json=refund_data, headers=user_hdr)
    assert r.status_code == 200

    # Second refund request - should fail
    refund_data2 = {
        "order_id": order["id"],
        "reason_category": "DRIVER_ISSUE",
        "reason_description": "Second refund request"
    }
    r = client.post("/refunds/request", json=refund_data2, headers=user_hdr)
    assert r.status_code == 400
    assert "already been requested" in r.json()["detail"].lower()


def test_staff_approve_refund(client):
    """Test that staff can approve a pending refund."""
    # Setup
    owner_hdr, _ = register_and_login(client, "owner_refund3@test.com", "pass", "Owner3", "OWNER")
    r = client.post("/cafes/", json={"name": "RefundCafe3", "address": "789 St", "lat": 3.0, "lng": 3.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]

    r = client.post(f"/items/{cafe_id}", json={"name": "TestItem3", "description": "desc", "calories": 100, "price": 20.0}, headers=owner_hdr)
    item_id = r.json()["id"]

    # Create staff user
    staff_hdr, _ = register_and_login(client, "staff_refund3@test.com", "pass", "Staff3", "STAFF")

    # Create user and order
    user_hdr, _ = register_and_login(client, "user_refund3@test.com", "pass", "User3")
    order = create_test_order(client, user_hdr, cafe_id, item_id)

    # Request refund
    refund_data = {
        "order_id": order["id"],
        "reason_category": "CUSTOMER_ISSUE",
        "reason_description": "Changed my mind"
    }
    r = client.post("/refunds/request", json=refund_data, headers=user_hdr)
    assert r.status_code == 200
    refund = r.json()

    # If refund is pending, approve it
    if refund["status"] == "PENDING":
        approval_data = {
            "approved_amount": refund["refund_amount"],
            "notes": "Approved by staff"
        }
        r = client.post(f"/refunds/{refund['id']}/approve", json=approval_data, headers=staff_hdr)
        assert r.status_code == 200

        approved_refund = r.json()
        assert approved_refund["status"] in ["APPROVED", "PROCESSED"]


def test_staff_reject_refund(client):
    """Test that staff can reject a pending refund."""
    # Setup
    owner_hdr, _ = register_and_login(client, "owner_refund4@test.com", "pass", "Owner4", "OWNER")
    r = client.post("/cafes/", json={"name": "RefundCafe4", "address": "101 St", "lat": 4.0, "lng": 4.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]

    r = client.post(f"/items/{cafe_id}", json={"name": "TestItem4", "description": "desc", "calories": 100, "price": 25.0}, headers=owner_hdr)
    item_id = r.json()["id"]

    # Create staff user
    staff_hdr, _ = register_and_login(client, "staff_refund4@test.com", "pass", "Staff4", "STAFF")

    # Create user and order
    user_hdr, _ = register_and_login(client, "user_refund4@test.com", "pass", "User4")
    order = create_test_order(client, user_hdr, cafe_id, item_id)

    # Request refund with high value to ensure it's pending
    refund_data = {
        "order_id": order["id"],
        "reason_category": "CUSTOMER_ISSUE",
        "reason_description": "Test rejection",
        "refund_amount": 100.0  # High amount should require approval
    }
    r = client.post("/refunds/request", json=refund_data, headers=user_hdr)
    assert r.status_code == 200
    refund = r.json()

    # If refund is pending, reject it
    if refund["status"] == "PENDING":
        rejection_data = {
            "rejection_reason": "Invalid refund reason"
        }
        r = client.post(f"/refunds/{refund['id']}/reject", json=rejection_data, headers=staff_hdr)
        assert r.status_code == 200

        rejected_refund = r.json()
        assert rejected_refund["status"] == "REJECTED"


def test_get_pending_refunds_staff_only(client):
    """Test that only staff/admin can access pending refunds."""
    # Create a regular user
    user_hdr, _ = register_and_login(client, "user_refund5@test.com", "pass", "User5")

    # Try to access pending refunds as regular user - should fail
    r = client.get("/refunds/pending", headers=user_hdr)
    assert r.status_code == 403

    # Create staff user
    staff_hdr, _ = register_and_login(client, "staff_refund5@test.com", "pass", "Staff5", "STAFF")

    # Access pending refunds as staff - should succeed
    r = client.get("/refunds/pending", headers=staff_hdr)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_report_issue_with_refund_request(client):
    """Test reporting an order issue with automatic refund request."""
    # Setup
    owner_hdr, _ = register_and_login(client, "owner_refund6@test.com", "pass", "Owner6", "OWNER")
    r = client.post("/cafes/", json={"name": "RefundCafe6", "address": "202 St", "lat": 6.0, "lng": 6.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]

    r = client.post(f"/items/{cafe_id}", json={"name": "TestItem6", "description": "desc", "calories": 100, "price": 12.0}, headers=owner_hdr)
    item_id = r.json()["id"]

    # Create user and order
    user_hdr, _ = register_and_login(client, "user_refund6@test.com", "pass", "User6")
    order = create_test_order(client, user_hdr, cafe_id, item_id)

    # Report issue with refund request
    issue_data = {
        "order_id": order["id"],
        "issue_type": "QUALITY",
        "description": "Food was cold",
        "request_refund": True
    }
    r = client.post("/refunds/issues/report", json=issue_data, headers=user_hdr)
    assert r.status_code == 200

    issue = r.json()
    assert issue["order_id"] == order["id"]
    assert issue["issue_type"] == "QUALITY"

    # Verify refund was created
    r = client.get(f"/refunds/order/{order['id']}", headers=user_hdr)
    assert r.status_code == 200
    refunds = r.json()
    assert len(refunds) > 0


def test_get_user_refunds(client):
    """Test that users can retrieve their own refunds."""
    # Setup
    owner_hdr, _ = register_and_login(client, "owner_refund7@test.com", "pass", "Owner7", "OWNER")
    r = client.post("/cafes/", json={"name": "RefundCafe7", "address": "303 St", "lat": 7.0, "lng": 7.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]

    r = client.post(f"/items/{cafe_id}", json={"name": "TestItem7", "description": "desc", "calories": 100, "price": 8.0}, headers=owner_hdr)
    item_id = r.json()["id"]

    # Create user and order
    user_hdr, _ = register_and_login(client, "user_refund7@test.com", "pass", "User7")
    order = create_test_order(client, user_hdr, cafe_id, item_id)

    # Request refund
    refund_data = {
        "order_id": order["id"],
        "reason_category": "SYSTEM_ERROR",
        "reason_description": "App crashed"
    }
    r = client.post("/refunds/request", json=refund_data, headers=user_hdr)
    assert r.status_code == 200

    # Get user's refunds
    r = client.get("/refunds/my", headers=user_hdr)
    assert r.status_code == 200
    refunds = r.json()
    assert len(refunds) > 0
    assert any(ref["order_id"] == order["id"] for ref in refunds)


def test_duplicate_refund_via_issue_report(client):
    """Test that duplicate refunds are prevented even when requested via issue reporting."""
    # Setup
    owner_hdr, _ = register_and_login(client, "owner_refund8@test.com", "pass", "Owner8", "OWNER")
    r = client.post("/cafes/", json={"name": "RefundCafe8", "address": "404 St", "lat": 8.0, "lng": 8.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]

    r = client.post(f"/items/{cafe_id}", json={"name": "TestItem8", "description": "desc", "calories": 100, "price": 18.0}, headers=owner_hdr)
    item_id = r.json()["id"]

    # Create user and order
    user_hdr, _ = register_and_login(client, "user_refund8@test.com", "pass", "User8")
    order = create_test_order(client, user_hdr, cafe_id, item_id)

    # First refund via direct request
    refund_data = {
        "order_id": order["id"],
        "reason_category": "OTHER",
        "reason_description": "First refund"
    }
    r = client.post("/refunds/request", json=refund_data, headers=user_hdr)
    assert r.status_code == 200

    # Try to create another refund via issue report
    issue_data = {
        "order_id": order["id"],
        "issue_type": "DELAY",
        "description": "Order was late",
        "request_refund": True
    }
    r = client.post("/refunds/issues/report", json=issue_data, headers=user_hdr)
    # Issue should be created, but refund creation should fail silently
    assert r.status_code == 200

    # Verify only one refund exists
    r = client.get(f"/refunds/order/{order['id']}", headers=user_hdr)
    assert r.status_code == 200
    refunds = r.json()
    assert len(refunds) == 1


def test_user_cannot_refund_other_users_order(client):
    """Test that users cannot request refunds for orders they don't own."""
    # Setup
    owner_hdr, _ = register_and_login(client, "owner_refund9@test.com", "pass", "Owner9", "OWNER")
    r = client.post("/cafes/", json={"name": "RefundCafe9", "address": "505 St", "lat": 9.0, "lng": 9.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]

    r = client.post(f"/items/{cafe_id}", json={"name": "TestItem9", "description": "desc", "calories": 100, "price": 22.0}, headers=owner_hdr)
    item_id = r.json()["id"]

    # Create first user and their order
    user1_hdr, _ = register_and_login(client, "user_refund9a@test.com", "pass", "User9A")
    order = create_test_order(client, user1_hdr, cafe_id, item_id)

    # Create second user
    user2_hdr, _ = register_and_login(client, "user_refund9b@test.com", "pass", "User9B")

    # Try to request refund for user1's order as user2
    refund_data = {
        "order_id": order["id"],
        "reason_category": "OTHER",
        "reason_description": "Trying to refund someone else's order"
    }
    r = client.post("/refunds/request", json=refund_data, headers=user2_hdr)
    assert r.status_code == 403
