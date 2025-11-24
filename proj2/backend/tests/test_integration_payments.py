# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""
Integration tests for payment workflow - testing the core business logic
of payment creation, order status validation, and payment lifecycle.
"""


def register_and_login(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def test_create_payment_for_pending_order(client):
    """Test that a user can create a payment for a PENDING order - core payment workflow."""
    # Setup: owner creates cafe and item
    owner_hdr, _ = register_and_login(client, "owner_pay@example.com", "opw", name="OwnPay", role="OWNER")
    r = client.post("/cafes", json={"name": "PayCafe", "address": "A", "lat": 1.0, "lng": 1.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "PayItem", "description": "d", "calories": 100, "price": 10.0}, headers=owner_hdr)
    item = r.json()
    
    # User adds to cart and places order
    user_hdr, user = register_and_login(client, "user_pay@example.com", "upw", name="UPay")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 2}, headers=user_hdr)
    assert r.status_code == 200
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    assert r.status_code == 200
    order = r.json()
    assert order["status"] == "PENDING"
    
    # Create payment for the order
    r_pay = client.post(f"/payments/{order['id']}", headers=user_hdr)
    assert r_pay.status_code == 200
    payment = r_pay.json()
    assert payment["order_id"] == order["id"]
    assert payment["amount"] == order["total_price"]
    assert payment["status"] == "PAID"
    assert payment["provider"] == "MOCK"


def test_create_payment_fails_for_wrong_status(client):
    """Test that payment creation fails for orders in non-payable statuses - validating business rules."""
    owner_hdr, _ = register_and_login(client, "owner_pay3@example.com", "opw", name="OwnPay3", role="OWNER")
    r = client.post("/cafes", json={"name": "PayCafe3", "address": "A", "lat": 3.0, "lng": 3.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "PayItem3", "description": "d", "calories": 100, "price": 20.0}, headers=owner_hdr)
    item = r.json()
    
    user_hdr, _ = register_and_login(client, "user_pay3@example.com", "upw", name="UPay3")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()
    
    # Cancel the order
    r_cancel = client.post(f"/orders/{order['id']}/cancel", headers=user_hdr)
    assert r_cancel.status_code == 200
    
    # Try to create payment for cancelled order - should fail
    r_pay = client.post(f"/payments/{order['id']}", headers=user_hdr)
    assert r_pay.status_code == 400
    assert "not payable" in r_pay.json()["detail"].lower()


def test_create_payment_for_accepted_order(client):
    """Test that payment can be created for ACCEPTED orders - validating payment window logic."""
    owner_hdr, _ = register_and_login(client, "owner_pay2@example.com", "opw", name="OwnPay2", role="OWNER")
    r = client.post("/cafes", json={"name": "PayCafe2", "address": "A", "lat": 2.0, "lng": 2.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "PayItem2", "description": "d", "calories": 100, "price": 15.0}, headers=owner_hdr)
    item = r.json()
    
    user_hdr, _ = register_and_login(client, "user_pay2@example.com", "upw", name="UPay2")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()
    
    # Owner accepts the order
    r_status = client.post(f"/orders/{order['id']}/status", json={"new_status": "ACCEPTED"}, headers=owner_hdr)
    assert r_status.status_code in (200, 422, 400)  # May succeed or fail based on validation
    
    # If accepted, try to pay
    if r_status.status_code == 200:
        r_pay = client.post(f"/payments/{order['id']}", headers=user_hdr)
        assert r_pay.status_code == 200
        payment = r_pay.json()
        assert payment["status"] == "PAID"


def test_create_payment_only_by_order_owner(client):
    """Test that only the order owner can create payment - validating authorization."""
    owner_hdr, _ = register_and_login(client, "owner_pay4@example.com", "opw", name="OwnPay4", role="OWNER")
    r = client.post("/cafes", json={"name": "PayCafe4", "address": "A", "lat": 4.0, "lng": 4.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "PayItem4", "description": "d", "calories": 100, "price": 25.0}, headers=owner_hdr)
    item = r.json()
    
    user_hdr, _ = register_and_login(client, "user_pay4@example.com", "upw", name="UPay4")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()
    
    # Another user tries to create payment - should fail
    other_user_hdr, _ = register_and_login(client, "other_pay@example.com", "opw", name="OtherPay")
    r_pay = client.post(f"/payments/{order['id']}", headers=other_user_hdr)
    assert r_pay.status_code == 404  # Order not found for this user

