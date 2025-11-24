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
Test script for Driver Assignment Feature
Tests all driver-related endpoints and auto-assignment logic
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"

# Color codes for output (simplified for Windows compatibility)
try:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    RESET = '\033[0m'
except:
    GREEN = ''
    RED = ''
    YELLOW = ''
    RESET = ''

def print_success(msg):
    """Print a success message."""
    print(f"[OK] {msg}")

def print_error(msg):
    """Print an error message."""
    print(f"[FAIL] {msg}")

def print_info(msg):
    """Print an info message."""
    print(f"[TEST] {msg}")

def test_endpoint(name, func):
    """Test wrapper with error handling for API endpoints."""
    print_info(f"Testing: {name}")
    try:
        result = func()
        response = result[1]  # Get the response object
        
        # Check if response is successful
        if response.status_code == 200:
            try:
                data = response.json()
                print_success(f"{name} - Status Code: {response.status_code}")
                return data
            except:
                print_success(f"{name} - Status Code: {response.status_code}")
                return {"status": "OK"}
        else:
            print_error(f"{name} - Status Code: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        print_error(f"{name} - Exception: {str(e)}")
        return None

def main():
    """Main test function for driver assignment feature."""
    print("\n" + "="*60)
    print("DRIVER ASSIGNMENT FEATURE TEST SUITE")
    print("="*60 + "\n")
    
    # Storage for IDs and tokens
    test_data = {
        'driver_token': None,
        'user_token': None,
        'owner_token': None,
        'cafe_id': None,
        'item_id': None,
        'order_id': None,
        'driver_id': None
    }
    
    # STEP 1: Register Driver
    print("\n[STEP 1] Registering driver user...")
    driver_data = test_endpoint(
        "Register Driver",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/drivers/register",
                json={
                    "email": "test_driver@example.com",
                    "name": "Test Driver",
                    "password": "test123"
                }
            )
        )
    )
    
    if driver_data and 'id' in driver_data:
        test_data['driver_id'] = driver_data['id']
        print(f"Driver registered with ID: {test_data['driver_id']}")
    
    # STEP 2: Login as Driver
    print("\n[STEP 2] Logging in as driver...")
    driver_login = test_endpoint(
        "Driver Login",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/drivers/login",
                json={
                    "email": "test_driver@example.com",
                    "password": "test123"
                }
            )
        )
    )
    
    if driver_login and 'access_token' in driver_login:
        test_data['driver_token'] = driver_login['access_token']
        print_success(f"Driver logged in - Token: {test_data['driver_token'][:20]}...")
    
    # STEP 3: Update Driver Location
    print("\n[STEP 3] Posting driver location (IDLE status)...")
    location_data = test_endpoint(
        "Post Driver Location",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/drivers/{test_data['driver_id']}/location-status",
                headers={"Authorization": f"Bearer {test_data['driver_token']}"},
                json={
                    "lat": 37.7749,
                    "lng": -122.4194,
                    "status": "IDLE"
                }
            )
        )
    )
    
    # STEP 4: Get Available Drivers
    print("\n[STEP 4] Getting available (idle) drivers...")
    available_drivers = test_endpoint(
        "Get Available Drivers",
        lambda: (
            True,
            requests.get(
                f"{BASE_URL}/drivers/available",
                headers={"Authorization": f"Bearer {test_data['driver_token']}"}
            )
        )
    )
    
    if available_drivers and len(available_drivers) > 0:
        print(f"Found {len(available_drivers)} available driver(s)")
    
    # STEP 5: Register Regular User
    print("\n[STEP 5] Registering regular user...")
    user_data = test_endpoint(
        "Register User",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/users/register",
                json={
                    "email": "test_user@example.com",
                    "name": "Test User",
                    "password": "test123"
                }
            )
        )
    )
    
    # STEP 6: Register Cafe Owner
    print("\n[STEP 6] Registering cafe owner...")
    owner_data = test_endpoint(
        "Register Owner",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/users/register",
                json={
                    "email": "test_owner@example.com",
                    "name": "Test Owner",
                    "password": "test123",
                    "role": "OWNER"
                }
            )
        )
    )
    
    # STEP 7: Login as Owner
    print("\n[STEP 7] Logging in as owner...")
    owner_login = test_endpoint(
        "Owner Login",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": "test_owner@example.com",
                    "password": "test123"
                }
            )
        )
    )
    
    if owner_login and 'access_token' in owner_login:
        test_data['owner_token'] = owner_login['access_token']
    
    # STEP 8: Create Cafe
    print("\n[STEP 8] Creating cafe...")
    cafe_data = test_endpoint(
        "Create Cafe",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/cafes",
                headers={"Authorization": f"Bearer {test_data['owner_token']}"},
                json={
                    "name": "Test Cafe",
                    "address": "123 Test St",
                    "lat": 37.7849,
                    "lng": -122.4094
                }
            )
        )
    )
    
    if cafe_data and 'id' in cafe_data:
        test_data['cafe_id'] = cafe_data['id']
        print(f"Cafe created with ID: {test_data['cafe_id']}")
    
    # STEP 9: Create Menu Item
    print("\n[STEP 9] Creating menu item...")
    item_data = test_endpoint(
        "Create Menu Item",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/cafes/{test_data['cafe_id']}/items",
                headers={"Authorization": f"Bearer {test_data['owner_token']}"},
                json={
                    "name": "Test Burger",
                    "description": "Delicious burger",
                    "calories": 500,
                    "price": 12.99,
                    "veg_flag": False
                }
            )
        )
    )
    
    if item_data and 'id' in item_data:
        test_data['item_id'] = item_data['id']
        print(f"Item created with ID: {test_data['item_id']}")
    
    # STEP 10: Login as User
    print("\n[STEP 10] Logging in as regular user...")
    user_login = test_endpoint(
        "User Login",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": "test_user@example.com",
                    "password": "test123"
                }
            )
        )
    )
    
    if user_login and 'access_token' in user_login:
        test_data['user_token'] = user_login['access_token']
    
    # STEP 11: Add Item to Cart
    print("\n[STEP 11] Adding item to cart...")
    cart_data = test_endpoint(
        "Add to Cart",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/cart/add",
                headers={"Authorization": f"Bearer {test_data['user_token']}"},
                json={
                    "item_id": test_data['item_id'],
                    "quantity": 2
                }
            )
        )
    )
    
    # STEP 12: Place Order
    print("\n[STEP 12] Placing order...")
    order_data = test_endpoint(
        "Place Order",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/orders/place",
                headers={"Authorization": f"Bearer {test_data['user_token']}"},
                json={"cafe_id": test_data['cafe_id']}
            )
        )
    )
    
    if order_data and 'id' in order_data:
        test_data['order_id'] = order_data['id']
        print(f"Order created with ID: {test_data['order_id']}")
        print(f"Order status: {order_data.get('status')}")
    
    # STEP 13: Accept Order (as cafe owner)
    print("\n[STEP 13] Accepting order...")
    accept_response = test_endpoint(
        "Accept Order",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/orders/{test_data['order_id']}/status",
                headers={"Authorization": f"Bearer {test_data['owner_token']}"},
                json="ACCEPTED"
            )
        )
    )
    
    # STEP 14: Assign Driver to Order (AUTO-ASSIGN)
    print("\n[STEP 14] Assigning driver to order (auto-assign nearest)...")
    assign_response = test_endpoint(
        "Assign Driver",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/orders/{test_data['order_id']}/assign-driver",
                headers={"Authorization": f"Bearer {test_data['owner_token']}"},
                json={}
            )
        )
    )
    
    if assign_response:
        if 'driver_id' in assign_response:
            print(f"Driver assigned: {assign_response['driver_id']}")
        if 'status' in assign_response:
            print(f"Order status: {assign_response['status']}")
    
    # STEP 15: Get Assigned Orders for Driver
    print("\n[STEP 15] Getting driver's assigned orders...")
    assigned_orders = test_endpoint(
        "Get Assigned Orders",
        lambda: (
            True,
            requests.get(
                f"{BASE_URL}/drivers/{test_data['driver_id']}/assigned-orders",
                headers={"Authorization": f"Bearer {test_data['driver_token']}"}
            )
        )
    )
    
    if assigned_orders:
        print(f"Driver has {len(assigned_orders)} assigned order(s)")
    
    # STEP 16: Check Driver Status (should be OCCUPIED now)
    print("\n[STEP 16] Checking available drivers (should be empty)...")
    available_drivers_after = test_endpoint(
        "Get Available Drivers (after assignment)",
        lambda: (
            True,
            requests.get(
                f"{BASE_URL}/drivers/available",
                headers={"Authorization": f"Bearer {test_data['owner_token']}"}
            )
        )
    )
    
    if available_drivers_after and len(available_drivers_after) == 0:
        print_success("No available drivers (expected - driver is OCCUPIED)")
    else:
        print_error("Driver should be OCCUPIED but still showing as available!")
    
    # STEP 17: Mark Order as Ready
    print("\n[STEP 17] Marking order as ready...")
    ready_response = test_endpoint(
        "Mark Order Ready",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/orders/{test_data['order_id']}/status",
                headers={"Authorization": f"Bearer {test_data['owner_token']}"},
                json="READY"
            )
        )
    )
    
    # STEP 18: Driver Picks Up Order
    print("\n[STEP 18] Driver picking up order...")
    pickup_response = test_endpoint(
        "Pickup Order",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/drivers/{test_data['driver_id']}/orders/{test_data['order_id']}/pickup",
                headers={"Authorization": f"Bearer {test_data['driver_token']}"}
            )
        )
    )
    
    if pickup_response and 'status' in pickup_response:
        print(f"Order status after pickup: {pickup_response['status']}")
        if pickup_response['status'] == 'PICKED_UP':
            print_success("Order successfully picked up")
    
    # STEP 19: Driver Delivers Order
    print("\n[STEP 19] Driver delivering order...")
    deliver_response = test_endpoint(
        "Deliver Order",
        lambda: (
            True,
            requests.post(
                f"{BASE_URL}/drivers/{test_data['driver_id']}/orders/{test_data['order_id']}/deliver",
                headers={"Authorization": f"Bearer {test_data['driver_token']}"}
            )
        )
    )
    
    if deliver_response and 'status' in deliver_response:
        print(f"Order status after delivery: {deliver_response['status']}")
        if deliver_response['status'] == 'DELIVERED':
            print_success("Order successfully delivered")
    
    # STEP 20: Verify Driver is Back to IDLE
    print("\n[STEP 20] Verifying driver is back to IDLE...")
    final_available = test_endpoint(
        "Get Available Drivers (final check)",
        lambda: (
            True,
            requests.get(
                f"{BASE_URL}/drivers/available",
                headers={"Authorization": f"Bearer {test_data['owner_token']}"}
            )
        )
    )
    
    if final_available and len(final_available) > 0:
        print_success("Driver is back to IDLE status!")
    else:
        print_error("Driver should be IDLE after delivery")
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"{GREEN}✓ All driver assignment endpoints tested{RESET}")
    print(f"Driver ID: {test_data['driver_id']}")
    print(f"Order ID: {test_data['order_id']}")
    print(f"Cafe ID: {test_data['cafe_id']}")
    print("\n✅ Driver Assignment Feature Test Suite Completed!")
    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

