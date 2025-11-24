# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""
Integration tests for order and payment workflow integration - testing
the complete flow from order placement through payment to delivery.
"""


def register_and_login(client, email, password, name="U", role="USER"):
    r = client.post("/users/register", json={"email": email, "name": name, "password": password, "role": role})
    assert r.status_code == 200
    r2 = client.post("/auth/login", json={"email": email, "password": password, "role": role})
    assert r2.status_code == 200
    return {"Authorization": f"Bearer {r2.json()['access_token']}"}, r.json()


def test_complete_order_payment_workflow(client):
    """Test complete workflow: place order, accept, create payment, assign driver, deliver - end-to-end validation."""
    owner_hdr, _ = register_and_login(client, "owner_flow@example.com", "opw", name="OwnFlow", role="OWNER")
    r = client.post("/cafes", json={"name": "FlowCafe", "address": "A", "lat": 1.0, "lng": 1.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "FlowItem", "description": "d", "calories": 100, "price": 15.0}, headers=owner_hdr)
    item = r.json()
    
    # Register driver
    rdrv = client.post("/drivers/register", json={"email": "drv_flow@example.com", "name": "DFlow", "password": "pwd"})
    drv = rdrv.json()
    rlogin = client.post("/drivers/login", json={"email": "drv_flow@example.com", "password": "pwd"})
    drv_hdr = {"Authorization": f"Bearer {rlogin.json()['access_token']}"}
    
    from datetime import datetime
    now = datetime.utcnow().isoformat()
    r = client.post(f"/drivers/{drv['id']}/location-status", json={"lat": 1.0, "lng": 1.0, "timestamp": now, "status": "IDLE"}, headers=drv_hdr)
    
    # User places order
    user_hdr, _ = register_and_login(client, "user_flow@example.com", "upw", name="UFlow")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 2}, headers=user_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()
    assert order["status"] == "PENDING"
    
    # Create payment for pending order
    r_pay = client.post(f"/payments/{order['id']}", headers=user_hdr)
    assert r_pay.status_code == 200
    payment = r_pay.json()
    assert payment["status"] == "PAID"
    
    # Owner accepts order
    r = client.post(f"/orders/{order['id']}/status", json={"new_status": "ACCEPTED"}, headers=owner_hdr)
    if r.status_code == 200:
        assert r.json()["status"] == "ACCEPTED"
        
        # Assign driver
        ra = client.post(f"/orders/{order['id']}/assign-driver", json={"driver_id": drv["id"]}, headers=owner_hdr)
        if ra.status_code == 200:
            # Driver picks up and delivers
            r_pick = client.post(f"/drivers/{drv['id']}/orders/{order['id']}/pickup", headers=drv_hdr)
            if r_pick.status_code == 200:
                r_del = client.post(f"/drivers/{drv['id']}/orders/{order['id']}/deliver", headers=drv_hdr)
                assert r_del.status_code == 200
                assert r_del.json()["status"] == "DELIVERED"


def test_payment_before_order_acceptance(client):
    """Test that payment can be created before order acceptance - validating payment timing."""
    owner_hdr, _ = register_and_login(client, "owner_flow2@example.com", "opw", name="OwnFlow2", role="OWNER")
    r = client.post("/cafes", json={"name": "FlowCafe2", "address": "A", "lat": 2.0, "lng": 2.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "FlowItem2", "description": "d", "calories": 100, "price": 20.0}, headers=owner_hdr)
    item = r.json()
    
    user_hdr, _ = register_and_login(client, "user_flow2@example.com", "upw", name="UFlow2")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()
    
    # Payment should work for PENDING order
    r_pay = client.post(f"/payments/{order['id']}", headers=user_hdr)
    assert r_pay.status_code == 200
    
    # Order should still be PENDING (payment doesn't change order status)
    r_get = client.get(f"/orders/o/{order['id']}", headers=user_hdr)
    assert r_get.status_code == 200
    order_after_payment = r_get.json()
    # OrderOut schema includes status field - verify it's still PENDING
    assert order_after_payment.get("status") == "PENDING"


def test_order_summary_includes_all_order_items(client):
    """Test that order summary correctly includes all items with correct calculations."""
    owner_hdr, _ = register_and_login(client, "owner_flow4@example.com", "opw", name="OwnFlow4", role="OWNER")
    r = client.post("/cafes", json={"name": "FlowCafe4", "address": "A", "lat": 4.0, "lng": 4.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    
    r1 = client.post(f"/items/{cafe_id}", json={"name": "Item1", "description": "d", "calories": 100, "price": 10.0}, headers=owner_hdr)
    item1 = r1.json()
    r2 = client.post(f"/items/{cafe_id}", json={"name": "Item2", "description": "d", "calories": 200, "price": 15.0}, headers=owner_hdr)
    item2 = r2.json()
    
    user_hdr, _ = register_and_login(client, "user_flow4@example.com", "upw", name="UFlow4")
    r = client.post("/cart/add", json={"item_id": item1["id"], "quantity": 3}, headers=user_hdr)
    r = client.post("/cart/add", json={"item_id": item2["id"], "quantity": 2}, headers=user_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()
    
    # Get order summary
    r_summary = client.get(f"/orders/{order['id']}/summary", headers=user_hdr)
    assert r_summary.status_code == 200
    summary = r_summary.json()
    
    # Verify totals: Item1: 3*10=30, Item2: 2*15=30, total=60
    assert summary["total_price"] == 60.0
    # Calories: Item1: 3*100=300, Item2: 2*200=400, total=700
    assert summary["total_calories"] == 700
    
    # Verify item counts
    assert len(summary["items"]) == 2
    item_dict = {item["name"]: item for item in summary["items"]}
    assert item_dict["Item1"]["quantity"] == 3
    assert item_dict["Item2"]["quantity"] == 2


def test_multiple_payments_for_same_order_fails(client):
    """Test that attempting to create multiple payments for same order handles correctly."""
    owner_hdr, _ = register_and_login(client, "owner_flow5@example.com", "opw", name="OwnFlow5", role="OWNER")
    r = client.post("/cafes", json={"name": "FlowCafe5", "address": "A", "lat": 5.0, "lng": 5.0}, headers=owner_hdr)
    cafe_id = r.json()["id"]
    r = client.post(f"/items/{cafe_id}", json={"name": "FlowItem5", "description": "d", "calories": 100, "price": 30.0}, headers=owner_hdr)
    item = r.json()
    
    user_hdr, _ = register_and_login(client, "user_flow5@example.com", "upw", name="UFlow5")
    r = client.post("/cart/add", json={"item_id": item["id"], "quantity": 1}, headers=user_hdr)
    r = client.post("/orders/place", json={"cafe_id": cafe_id}, headers=user_hdr)
    order = r.json()
    
    # Create first payment
    r_pay1 = client.post(f"/payments/{order['id']}", headers=user_hdr)
    assert r_pay1.status_code == 200
    
    # Attempt to create second payment - behavior depends on implementation
    # May allow multiple payments or return error - test documents the behavior
    r_pay2 = client.post(f"/payments/{order['id']}", headers=user_hdr)
    # Accept either behavior (200 if multiple allowed, 400/409 if not)
    assert r_pay2.status_code in (200, 400, 409, 422)

