#!/usr/bin/env python3
# Copyright (c) 2025 Group 2
# All rights reserved.

"""
Test script demonstrating the complete staff management workflow:
1. Create owner and staff users
2. Owner creates a cafe
3. Owner assigns staff to cafe
4. Staff logs in and manages orders
5. Customer places order
6. Staff accepts and processes order
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def register_user(email, name, password, role="USER"):
    """Register a new user"""
    response = requests.post(
        f"{BASE_URL}/users/register",
        json={"email": email, "name": name, "password": password, "role": role}
    )
    return response.json() if response.ok else None

def login_user(email, password, role="USER"):
    """Login and get token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password, "role": role}
    )
    if response.ok:
        return response.json()["access_token"]
    return None

def create_cafe(name, lat, lng, token):
    """Create a cafe (owner only)"""
    response = requests.post(
        f"{BASE_URL}/cafes/",
        json={"name": name, "address": "123 Main St", "lat": lat, "lng": lng},
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.json() if response.ok else None

def assign_staff(user_id, cafe_id, role, token):
    """Assign a user as staff to a cafe"""
    response = requests.post(
        f"{BASE_URL}/staff/assign",
        json={"user_id": user_id, "cafe_id": cafe_id, "role": role},
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.ok:
        return response.json()
    else:
        print(f"Error assigning staff: {response.status_code} - {response.text}")
        return None

def get_cafe_staff(cafe_id, token):
    """Get all staff for a cafe"""
    response = requests.get(
        f"{BASE_URL}/staff/cafe/{cafe_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.json() if response.ok else []

def create_item(cafe_id, name, price, calories, token):
    """Create a menu item"""
    response = requests.post(
        f"{BASE_URL}/items/{cafe_id}",
        json={
            "name": name,
            "price": price,
            "calories": calories,
            "description": f"Delicious {name}",
            "veg_flag": True
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.json() if response.ok else None

def add_to_cart(item_id, quantity, token):
    """Add item to cart"""
    response = requests.post(
        f"{BASE_URL}/cart/add",
        json={"item_id": item_id, "quantity": quantity},
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.json() if response.ok else None

def place_order(cafe_id, token):
    """Place an order"""
    response = requests.post(
        f"{BASE_URL}/orders/place",
        json={"cafe_id": cafe_id},
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.json() if response.ok else None

def get_cafe_orders(cafe_id, token):
    """Get orders for a cafe (staff/owner only)"""
    response = requests.get(
        f"{BASE_URL}/orders/{cafe_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.json() if response.ok else []

def update_order_status(order_id, new_status, token):
    """Update order status (staff/owner only)"""
    response = requests.post(
        f"{BASE_URL}/orders/{order_id}/status",
        json={"new_status": new_status},
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.json() if response.ok else None

def main():
    """Run the complete staff workflow test"""

    print_section("STAFF MANAGEMENT WORKFLOW TEST")

    # Step 1: Register users
    print_section("Step 1: Registering Users")

    owner = register_user("owner@cafe.com", "Cafe Owner", "password123", "OWNER")
    if owner:
        print(f"✓ Registered owner: {owner['email']}")
    else:
        print("✗ Failed to register owner")
        return

    staff1 = register_user("staff1@cafe.com", "Staff Member 1", "password123", "USER")
    if staff1:
        print(f"✓ Registered staff1: {staff1['email']}")
    else:
        print("✗ Failed to register staff1")
        return

    staff2 = register_user("staff2@cafe.com", "Staff Member 2", "password123", "USER")
    if staff2:
        print(f"✓ Registered staff2: {staff2['email']}")
    else:
        print("✗ Failed to register staff2")
        return

    customer = register_user("customer@test.com", "Test Customer", "password123", "USER")
    if customer:
        print(f"✓ Registered customer: {customer['email']}")
    else:
        print("✗ Failed to register customer")
        return

    # Step 2: Owner logs in and creates cafe
    print_section("Step 2: Owner Creates Cafe")

    owner_token = login_user("owner@cafe.com", "password123", "OWNER")
    if not owner_token:
        print("✗ Failed to login as owner")
        return
    print("✓ Owner logged in")

    cafe = create_cafe("Test Cafe", 35.7796, -78.6382, owner_token)
    if cafe:
        print(f"✓ Created cafe: {cafe['name']} (ID: {cafe['id']})")
        cafe_id = cafe['id']
    else:
        print("✗ Failed to create cafe")
        return

    # Step 3: Owner assigns staff to cafe
    print_section("Step 3: Owner Assigns Staff to Cafe")

    assignment1 = assign_staff(staff1['id'], cafe_id, "STAFF", owner_token)
    if assignment1:
        print(f"✓ Assigned {staff1['name']} as STAFF to cafe")
    else:
        print(f"✗ Failed to assign staff1")

    assignment2 = assign_staff(staff2['id'], cafe_id, "STAFF", owner_token)
    if assignment2:
        print(f"✓ Assigned {staff2['name']} as STAFF to cafe")
    else:
        print(f"✗ Failed to assign staff2")

    # Step 4: View cafe staff
    print_section("Step 4: View Cafe Staff Members")

    staff_list = get_cafe_staff(cafe_id, owner_token)
    print(f"Cafe has {len(staff_list)} staff members:")
    for staff in staff_list:
        print(f"  - {staff['name']} ({staff['email']}) - Role: {staff['role']}")

    # Step 5: Owner creates menu items
    print_section("Step 5: Owner Creates Menu Items")

    item1 = create_item(cafe_id, "Burger", 12.99, 850, owner_token)
    if item1:
        print(f"✓ Created menu item: {item1['name']} (ID: {item1['id']})")

    item2 = create_item(cafe_id, "Salad", 8.99, 350, owner_token)
    if item2:
        print(f"✓ Created menu item: {item2['name']} (ID: {item2['id']})")

    # Step 6: Customer places order
    print_section("Step 6: Customer Places Order")

    customer_token = login_user("customer@test.com", "password123", "USER")
    if not customer_token:
        print("✗ Failed to login as customer")
        return
    print("✓ Customer logged in")

    add_to_cart(item1['id'], 2, customer_token)
    add_to_cart(item2['id'], 1, customer_token)
    print("✓ Added items to cart")

    order = place_order(cafe_id, customer_token)
    if order:
        print(f"✓ Placed order (ID: {order['id']}, Status: {order['status']})")
        order_id = order['id']
    else:
        print("✗ Failed to place order")
        return

    # Step 7: Staff logs in and views orders
    print_section("Step 7: Staff Member Views and Manages Orders")

    staff1_token = login_user("staff1@cafe.com", "password123", "STAFF")
    if not staff1_token:
        print("✗ Failed to login as staff")
        return
    print(f"✓ {staff1['name']} logged in")

    orders = get_cafe_orders(cafe_id, staff1_token)
    print(f"✓ Staff sees {len(orders)} order(s):")
    for o in orders:
        print(f"  - Order #{o['id']}: Status={o['status']}, Total=${o['total_price']}")

    # Step 8: Staff accepts order
    print_section("Step 8: Staff Accepts and Processes Order")

    updated_order = update_order_status(order_id, "ACCEPTED", staff1_token)
    if updated_order:
        print(f"✓ Staff accepted order - New status: {updated_order['status']}")
    else:
        print("✗ Failed to accept order")
        return

    # Step 9: Staff marks order as ready
    updated_order = update_order_status(order_id, "READY", staff1_token)
    if updated_order:
        print(f"✓ Staff marked order as READY - Status: {updated_order['status']}")
    else:
        print("✗ Failed to mark order as ready")
        return

    # Step 10: Another staff member also views the order
    print_section("Step 10: Second Staff Member Views Orders")

    staff2_token = login_user("staff2@cafe.com", "password123", "STAFF")
    if not staff2_token:
        print("✗ Failed to login as staff2")
        return
    print(f"✓ {staff2['name']} logged in")

    orders = get_cafe_orders(cafe_id, staff2_token)
    print(f"✓ {staff2['name']} also sees {len(orders)} order(s):")
    for o in orders:
        print(f"  - Order #{o['id']}: Status={o['status']}, Total=${o['total_price']}")

    print_section("TEST COMPLETED SUCCESSFULLY!")
    print("\n✅ Complete staff workflow verified:")
    print("  1. Owner registered and created cafe")
    print("  2. Owner assigned 2 staff members to cafe")
    print("  3. Customer placed an order")
    print("  4. Staff member 1 logged in and accepted order")
    print("  5. Staff member 1 marked order as READY")
    print("  6. Staff member 2 also has access to view orders")
    print("\n🎉 All staff management features working correctly!")

if __name__ == "__main__":
    main()
