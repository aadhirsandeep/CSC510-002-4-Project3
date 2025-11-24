#!/usr/bin/env python3
# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""
create_and_accept_order.py

Flow:
  1) Ensure an OWNER exists -> login as owner -> create a cafe -> create an item for that cafe
  2) Ensure a USER exists -> login as user -> add the item to cart -> place an order
  3) As OWNER list PENDING orders for the cafe and accept the created order

Adjust BASE_URL to point to your server (or /api/v1 if your app uses that prefix).
"""
import requests
import time
from datetime import datetime
import sys
import uuid

BASE_URL = "http://localhost:8000"  # change to "http://localhost:8000/api/v1" if needed
HEADERS_JSON = {"Content-Type": "application/json"}

def post(endpoint, body=None, token=None):
    """Make a POST request to the API endpoint."""
    headers = dict(HEADERS_JSON)
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.post(f"{BASE_URL}{endpoint}", json=body or {}, headers=headers)
    return r

def get(endpoint, token=None, params=None):
    """Make a GET request to the API endpoint."""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.get(f"{BASE_URL}{endpoint}", headers=headers, params=params)
    return r

def register_user(email, name, password, role="USER"):
    """Register a new user account."""
    payload = {"email": email, "name": name, "password": password, "role": role}
    r = post("/users/register", payload)
    if r.ok:
        print(f"[register_user] Registered {email} as {role}")
        return True
    print(f"[register_user] Register returned {r.status_code}: {r.text}")
    return False

def login(email, password, role="USER"):
    """Login a user and return access token."""
    payload = {"email": email, "password": password, "role": role}
    r = post("/auth/login", payload)
    if not r.ok:
        print(f"[login] Login failed ({email},{role}): {r.status_code} {r.text}")
        return None
    data = r.json()
    token = data.get("access_token")
    print(f"[login] Logged in {email} as {role} (token truncated: {token[:20]+'...' if token else 'None'})")
    return token

def create_cafe(token, name, address, lat=0.0, lng=0.0):
    """Create a new cafe."""
    payload = {"name": name, "address": address, "lat": lat, "lng": lng}
    r = post("/cafes", payload, token)
    if r.ok:
        cafe = r.json()
        print(f"[create_cafe] Created cafe {cafe.get('name') or cafe.get('id')} id={cafe.get('id')}")
        return cafe
    print(f"[create_cafe] Failed: {r.status_code} {r.text}")
    return None

def create_item(cafe_id, token, name="Demo Item", price=5.00, calories=100):
    """Create a menu item for a cafe."""
    payload = {
        "name": name,
        "description": "Seeded item",
        "ingredients": "demo",
        "calories": calories,
        "price": price,
        "quantity": "1 serving",
        "servings": 1.0,
        "veg_flag": True,
        "kind": "meal",
        "active": True
    }
    r = post(f"/items/{cafe_id}", payload, token)
    if r.ok:
        item = r.json()
        print(f"[create_item] Created item id={item.get('id')} name={item.get('name')}")
        return item
    print(f"[create_item] Failed: {r.status_code} {r.text}")
    return None

def add_to_cart(item_id, quantity, token):
    """Add an item to the shopping cart."""
    payload = {"item_id": item_id, "quantity": quantity}
    r = post("/cart/add", payload, token)
    if r.ok:
        print(f"[add_to_cart] Added item {item_id} x{quantity} to cart")
        return True
    print(f"[add_to_cart] Failed: {r.status_code} {r.text}")
    return False

def place_order(cafe_id, token):
    """Place an order from the cart."""
    payload = {"cafe_id": cafe_id}
    r = post("/orders/place", payload, token)
    if r.ok:
        order = r.json()
        print(f"[place_order] Placed order id={order.get('id')} status={order.get('status')}")
        return order
    print(f"[place_order] Failed: {r.status_code} {r.text}")
    return None

def list_cafe_orders(cafe_id, token, status="PENDING"):
    """List orders for a cafe filtered by status."""
    params = {"status": status}
    r = get(f"/orders/{cafe_id}", token, params=params)
    if r.ok:
        print(f"[list_cafe_orders] Found {len(r.json())} orders with status={status}")
        return r.json()
    print(f"[list_cafe_orders] Failed: {r.status_code} {r.text}")
    return []

def accept_order(order_id, token):
    """Accept an order (change status to ACCEPTED)."""
    headers = {"Authorization": f"Bearer {token}"}  # no JSON body
    # send new_status as query parameter (API expects it in query)
    r = requests.post(f"{BASE_URL}/orders/{order_id}/status", headers=headers, params={"new_status": "ACCEPTED"})
    if r.ok:
        print(f"[accept_order] Accepted order id={order_id}")
        return r.json()
    print(f"[accept_order] Failed to accept: {r.status_code} {r.text}")
    return None

def register_driver(email, name, password):
    """Register a new driver account."""
    payload = {"email": email, "name": name, "password": password}
    r = post("/drivers/register", payload)
    if r.ok:
        print(f"[register_driver] Created driver: {email}")
        return r.json()
    print(f"[register_driver] Register returned {r.status_code}: {r.text}")
    return None

def login_driver(email, password):
    """Login a driver and return access token."""
    payload = {"email": email, "password": password}
    r = post("/drivers/login", payload)
    if r.ok:
        data = r.json()
        token = data.get("access_token")
        print(f"[login_driver] Driver logged in {email} (token truncated: {token[:20]+'...' if token else 'None'})")
        return token
    print(f"[login_driver] Login failed: {r.status_code} {r.text}")
    return None

def post_driver_location(driver_id, token, lat, lng):
    """Post driver's current location."""
    payload = {"lat": lat, "lng": lng, "timestamp": datetime.utcnow().isoformat()}
    r = post(f"/drivers/{driver_id}/location", payload, token)
    if r.ok:
        print(f"[post_driver_location] Posted location for driver {driver_id}: ({lat},{lng})")
        return True
    print(f"[post_driver_location] Failed to post location: {r.status_code} {r.text}")
    return False

def get_driver_me(token):
    """Get current driver's profile information."""
    r = get("/drivers/me", token)
    if r.ok:
        return r.json()
    print(f"[get_driver_me] Failed: {r.status_code} {r.text}")
    return None

def assign_driver_to_order(order_id, token, driver_id=None):
    """Assign a driver to an order (auto-assign if driver_id is None)."""
    payload = {"driver_id": driver_id} if driver_id is not None else None
    r = post(f"/orders/{order_id}/assign-driver", payload, token)
    if r.ok:
        print(f"[assign_driver_to_order] Assigned driver {driver_id} to order {order_id}")
        return r.json()
    print(f"[assign_driver_to_order] Failed: {r.status_code} {r.text}")
    return None

def my_orders(token):
    """Get current user's orders."""
    r = get("/orders/my", token)
    if r.ok:
        return r.json()
    return []

def main():
    """Main function demonstrating order creation and driver assignment workflow."""
    # unique suffix to avoid collisions
    suffix = uuid.uuid4().hex[:6]
    owner_email = f"owner_{suffix}@example.com"
    owner_name = "Demo Owner"
    owner_pass = "OwnerPass123!"
    user_email = f"user_{suffix}@example.com"
    user_name = "Demo User"
    user_pass = "UserPass123!"
    # driver credentials
    driver_email = f"driver_{suffix}@deliveryapp.com"
    driver_name = "Demo Driver"
    driver_pass = "DriverPass123!"

    # 1) OWNER flow: register/login and create cafe + item
    register_user(owner_email, owner_name, owner_pass, role="OWNER")
    owner_token = login(owner_email, owner_pass, role="OWNER")
    if not owner_token:
        print("Owner login failed; aborting.")
        return

    cafe = create_cafe(owner_token, name=f"Demo Cafe {suffix}", address="123 Demo St", lat=35.0, lng=-78.0)
    if not cafe:
        print("Cafe creation failed; aborting.")
        return
    cafe_id = cafe.get("id")

    # create an item in that cafe
    item = create_item(cafe_id, owner_token, name=f"Demo Item {suffix}", price=9.99, calories=450)
    if not item:
        print("Item creation failed; aborting.")
        return
    item_id = item.get("id")

    # 2) USER flow: register/login, add to cart, place order
    register_user(user_email, user_name, user_pass, role="USER")
    user_token = login(user_email, user_pass, role="USER")
    if not user_token:
        print("User login failed; aborting.")
        return

    # add item to cart and place order
    ok = add_to_cart(item_id, 1, user_token)
    if not ok:
        print("Failed to add to cart; aborting.")
        return

    order = place_order(cafe_id, user_token)
    if not order:
        print("Failed to place order; aborting.")
        return
    order_id = order.get("id")

    # show user's orders
    print("User's current orders:")
    for o in my_orders(user_token):
        print("-", o.get("id"), o.get("status"))

    # 3) OWNER accepts the order
    # list pending orders at cafe and accept the matching order
    pending = list_cafe_orders(cafe_id, owner_token, status="PENDING")
    # find our order
    found = [o for o in pending if o.get("id") == order_id]
    if not found:
        print(f"Order {order_id} not found in PENDING list (owner). Aborting accept.")
        return

    accept_res = accept_order(order_id, owner_token)
    if accept_res:
        print("After accept, owner sees order status:", accept_res.get("status"))

    # 4) Register and login a driver, then assign to the order using owner token
    print("\n-- Driver setup and assignment --")
    dr = register_driver(driver_email, driver_name, driver_pass)
    # If register returned None, the driver might exist; try login and get profile
    driver_token = None
    driver_id = None
    if dr and isinstance(dr, dict) and dr.get('id'):
        driver_id = dr.get('id')
        print(f"Driver created with id={driver_id}")
        # try logging in to show credentials work
        driver_token = login_driver(driver_email, driver_pass)
    else:
        print("Driver may already exist, attempting login and profile fetch...")
        driver_token = login_driver(driver_email, driver_pass)
        if driver_token:
            me = get_driver_me(driver_token)
            if me and isinstance(me, dict):
                driver_id = me.get('id')

    if not driver_id:
        print("Could not obtain driver id; aborting assign step.")
    else:
        # post a driver location immediately after login so the system can consider
        # this driver for assignment based on proximity/availability
        if driver_token:
            print("Posting driver location to enable assignment...")
            posted = post_driver_location(driver_id, driver_token, lat=35.0, lng=-78.0)
            if not posted:
                print("Warning: failed to post driver location; assignment may fail.")
            # short delay to let backend process the location
            time.sleep(0.2)

        print(f"Assigning driver id={driver_id} to order id={order_id}")
        assign_res = assign_driver_to_order(order_id, owner_token, driver_id=driver_id)
        if assign_res:
            print("Assign result order id", assign_res.get('id'), "driver_id", assign_res.get('driver_id'), "status", assign_res.get('status'))
        else:
            print("Failed to assign driver to order")

    # final: show user order status again
    time.sleep(0.5)
    print("Final user orders:")
    for o in my_orders(user_token):
        print("-", o.get("id"), o.get("status"))

if __name__ == "__main__":
    main()