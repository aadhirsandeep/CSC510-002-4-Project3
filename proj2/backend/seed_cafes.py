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
Enhanced seed data via FastAPI endpoints.
Creates:
- 5 OWNERS (each with their own cafe)
- 10 regular USERS
- 10 DRIVERS
- Menu items for each cafe
- 100+ orders across all cafes
- Reviews for orders
"""

import requests
import json
import random
import time
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1" if "/api/v1" in BASE_URL else BASE_URL

# Sample coordinates around a city center (e.g., Raleigh, NC)
BASE_LAT = 35.7796
BASE_LNG = -78.6382

# Cuisines to assign to cafes (cycled)
CUISINES = [
    "Italian",
    "Chinese",
    "Indian",
    "Mexican",
    "American",
    "Thai",
    "Japanese",
    "Mediterranean",
]

# Sample opening hours to assign to cafes (cycled)
TIMINGS = [
    "Mon-Fri 09:00-17:00",
    "Mon-Sun 08:00-20:00",
    "Tue-Sun 11:00-22:00",
    "Mon-Sat 10:00-22:00",
    "Weekdays 07:00-15:00",
]

# Phone numbers to assign to seeded cafes (one per cafe)
PHONE_NUMBERS = [
    "(555) 101-0001",
    "(555) 101-0002",
    "(555) 101-0003",
    "(555) 101-0004",
    "(555) 101-0005",
]

# Test data - 5 OWNERS
OWNERS = [
    {
        "email": f"owner{i+1}@example.com",
        "name": f"Owner {i+1}",
        "password": "Password123!",
        "role": "OWNER"
    }
    for i in range(5)
]

# 10 regular USERS
USERS = [
    {
        "email": f"user{i+1}@example.com",
        "name": f"User {i+1}",
        "password": "Password123!",
        "role": "USER"
    }
    for i in range(10)
]

# 10 DRIVERS
DRIVERS = [
    {
        "email": f"driver{i+1}@deliveryapp.com",
        "name": f"Driver {i+1}",
        "password": "Password123!",
    }
    for i in range(10)
]

# Cafe names and types
CAFE_NAMES = [
    "The Morning Brew",
    "Green Leaf Bistro",
    "Sunset Grill",
    "Urban Kitchen",
    "Coastal Cafe"
]

CAFE_TYPES = ["Coffee Shop", "Bistro", "Grill", "Fast Casual", "Seafood"]

# Menu item templates
MENU_TEMPLATES = {
    "Coffee Shop": [
        {"name": "Espresso", "price": 3.50, "calories": 5, "veg": True, "kind": "beverage"},
        {"name": "Cappuccino", "price": 4.50, "calories": 120, "veg": True, "kind": "beverage"},
        {"name": "Latte", "price": 5.00, "calories": 190, "veg": True, "kind": "beverage"},
        {"name": "Croissant", "price": 3.00, "calories": 231, "veg": True, "kind": "snack"},
        {"name": "Blueberry Muffin", "price": 3.50, "calories": 426, "veg": True, "kind": "snack"},
        {"name": "Avocado Toast", "price": 8.50, "calories": 320, "veg": True, "kind": "meal"},
        {"name": "Breakfast Sandwich", "price": 7.00, "calories": 450, "veg": False, "kind": "meal"},
    ],
    "Bistro": [
        {"name": "Caesar Salad", "price": 12.00, "calories": 350, "veg": False, "kind": "meal"},
        {"name": "Grilled Chicken", "price": 16.00, "calories": 420, "veg": False, "kind": "meal"},
        {"name": "Pasta Primavera", "price": 14.00, "calories": 580, "veg": True, "kind": "meal"},
        {"name": "Tomato Soup", "price": 6.00, "calories": 180, "veg": True, "kind": "meal"},
        {"name": "French Fries", "price": 4.50, "calories": 365, "veg": True, "kind": "side"},
        {"name": "Garlic Bread", "price": 5.00, "calories": 280, "veg": True, "kind": "side"},
    ],
    "Grill": [
        {"name": "Burger Deluxe", "price": 13.00, "calories": 680, "veg": False, "kind": "meal"},
        {"name": "BBQ Ribs", "price": 18.00, "calories": 750, "veg": False, "kind": "meal"},
        {"name": "Grilled Salmon", "price": 20.00, "calories": 450, "veg": False, "kind": "meal"},
        {"name": "Veggie Burger", "price": 11.00, "calories": 420, "veg": True, "kind": "meal"},
        {"name": "Coleslaw", "price": 3.50, "calories": 150, "veg": True, "kind": "side"},
        {"name": "Onion Rings", "price": 5.50, "calories": 410, "veg": True, "kind": "side"},
    ],
    "Fast Casual": [
        {"name": "Chicken Wrap", "price": 9.00, "calories": 520, "veg": False, "kind": "meal"},
        {"name": "Bowl with Rice", "price": 10.50, "calories": 600, "veg": True, "kind": "meal"},
        {"name": "Quesadilla", "price": 8.00, "calories": 510, "veg": True, "kind": "meal"},
        {"name": "Nachos", "price": 7.50, "calories": 570, "veg": True, "kind": "snack"},
        {"name": "Tacos (3pc)", "price": 9.50, "calories": 480, "veg": False, "kind": "meal"},
        {"name": "Chips & Salsa", "price": 4.00, "calories": 220, "veg": True, "kind": "side"},
    ],
    "Seafood": [
        {"name": "Fish & Chips", "price": 15.00, "calories": 850, "veg": False, "kind": "meal"},
        {"name": "Shrimp Scampi", "price": 17.00, "calories": 520, "veg": False, "kind": "meal"},
        {"name": "Clam Chowder", "price": 8.00, "calories": 380, "veg": False, "kind": "meal"},
        {"name": "Lobster Roll", "price": 22.00, "calories": 550, "veg": False, "kind": "meal"},
        {"name": "Crab Cakes", "price": 16.00, "calories": 460, "veg": False, "kind": "meal"},
        {"name": "House Salad", "price": 6.00, "calories": 120, "veg": True, "kind": "side"},
    ]
}

# Review templates
REVIEW_TEMPLATES = [
    "Great food and excellent service!",
    "Loved the atmosphere and the quality of food.",
    "Quick delivery and food was still hot!",
    "The portion sizes were generous.",
    "Will definitely order again!",
    "Food was okay, but could be better.",
    "Delivery took a bit long but food was good.",
    "Amazing taste and presentation!",
    "Best cafe in the area!",
    "Good value for money.",
]

def make_request(method, endpoint, data=None, headers=None):
    """Make HTTP request and return response."""
    url = f"{API_BASE}{endpoint}"
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=headers)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error {method} {endpoint}: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        return None

def register_user(user_data):
    """Register a new user."""
    payload = dict(user_data)
    payload.setdefault('role', 'USER')
    payload['role'] = str(payload['role']).upper()
    return make_request("POST", "/users/register", payload)

def login_user(email, password, role: str = 'USER'):
    """Login user and return token."""
    login_data = {"email": email, "password": password, "role": str(role).upper()}
    response = make_request("POST", "/auth/login", login_data)
    if response and "access_token" in response:
        return response["access_token"]
    return None

def create_cafe(cafe_data, token):
    """Create a new cafe (requires owner/admin role)."""
    headers = {"Authorization": f"Bearer {token}"}
    return make_request("POST", "/cafes", cafe_data, headers)

def create_item(cafe_id, item_data, token):
    """Create a menu item for a specific cafe."""
    headers = {"Authorization": f"Bearer {token}"}
    return make_request("POST", f"/items/{cafe_id}", item_data, headers)

def add_to_cart(item_id, quantity, token):
    """Add item to cart."""
    headers = {"Authorization": f"Bearer {token}"}
    data = {"item_id": item_id, "quantity": quantity}
    return make_request("POST", "/cart/add", data, headers)

def place_order(cafe_id, token):
    """Place an order from cart."""
    headers = {"Authorization": f"Bearer {token}"}
    data = {"cafe_id": cafe_id}
    return make_request("POST", "/orders/place", data, headers)

def create_review(cafe_id, user_id, rating, comment, token):
    """Create a review for a cafe."""
    headers = {"Authorization": f"Bearer {token}"}
    data = {"cafe_id": cafe_id, "user_id": user_id, "rating": rating, "text": comment}
    return make_request("POST", f"/cafes/{cafe_id}/reviews", data, headers)

def get_current_user(token):
    """Get current user info."""
    headers = {"Authorization": f"Bearer {token}"}
    endpoints = ["/users/me", "/me", "/user/profile"]
    for endpoint in endpoints:
        response = make_request("GET", endpoint, headers=headers)
        if response:
            return response
    return None

def register_driver(driver_data):
    """Register a new driver."""
    return make_request("POST", "/drivers/register", driver_data)

def login_driver(email, password):
    """Login driver and return token (drivers login endpoint)."""
    login_data = {"email": email, "password": password}
    response = make_request("POST", "/drivers/login", login_data)
    if response and "access_token" in response:
        return response["access_token"]
    return None

def post_driver_location_with_status(driver_id, lat, lng, token):
    """Post driver location with IDLE status."""
    from datetime import datetime
    now = datetime.utcnow().isoformat() + "Z"
    location_data = {
        "lat": lat,
        "lng": lng,
        "timestamp": now,
        "status": "IDLE"
    }
    headers = {"Authorization": f"Bearer {token}"}
    return make_request("POST", f"/drivers/{driver_id}/location-status", location_data, headers)

def get_driver_id(token):
    """Get driver ID from token."""
    headers = {"Authorization": f"Bearer {token}"}
    # Try /drivers/me endpoint
    response = make_request("GET", "/drivers/me", headers=headers)
    if response and "id" in response:
        return response["id"]
    return None

def seed_admin_user():
    """Create admin user using the seed_user endpoint."""
    # The seed_user endpoint expects query parameters, not JSON body
    params = {
        "email": "admin@example.com",
        "name": "Admin User", 
        "password": "admin123",
        "role": "ADMIN"
    }
    # Build query string
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    endpoint = f"/auth/seed_user?{query_string}"
    return make_request("POST", endpoint)

def seed_owners_and_cafes():
    """Create owners and their cafes."""
    print("Creating owners and their cafes...")
    owners_data = []
    
    for i, owner_data in enumerate(OWNERS):
        # Register owner
        response = register_user(owner_data)
        if response:
            print(f"✓ Created owner: {owner_data['email']}")
            owner_info = response
        else:
            print(f"Owner {owner_data['email']} might exist, logging in...")
            token = login_user(owner_data['email'], owner_data['password'], 'OWNER')
            if token:
                owner_info = get_current_user(token)
                print(f"✓ Logged in owner: {owner_data['email']}")
            else:
                print(f"✗ Failed for owner: {owner_data['email']}")
                continue
        
        # Login as owner to create cafe
        owner_token = login_user(owner_data['email'], owner_data['password'], 'OWNER')
        if not owner_token:
            print(f"✗ Failed to login owner: {owner_data['email']}")
            continue
        
        # Create cafe for this owner
        cafe_data = {
            "name": CAFE_NAMES[i],
            "address": f"{100 + i * 10} Main St, Raleigh, NC",
            "cuisine": CUISINES[i % len(CUISINES)],
            "timings": TIMINGS[i % len(TIMINGS)],
            "phone": PHONE_NUMBERS[i % len(PHONE_NUMBERS)],
            "lat": BASE_LAT + (random.random() - 0.5) * 0.05,
            "lng": BASE_LNG + (random.random() - 0.5) * 0.05
        }
        
        cafe = create_cafe(cafe_data, owner_token)
        if cafe:
            print(f"✓ Created cafe: {cafe_data['name']}")
            owners_data.append({
                "owner": owner_info,
                "token": owner_token,
                "cafe": cafe,
                "cafe_type": CAFE_TYPES[i],
                "cuisine": cafe_data.get("cuisine")
            })
        else:
            print(f"✗ Failed to create cafe for {owner_data['email']}")
    
    return owners_data

def seed_menu_items(owners_data):
    """Create menu items for each cafe."""
    print("Creating menu items...")
    all_items = []
    
    for owner_data in owners_data:
        cafe = owner_data['cafe']
        cafe_type = owner_data['cafe_type']
        token = owner_data['token']
        
        # Get menu template for this cafe type
        menu_template = MENU_TEMPLATES.get(cafe_type, MENU_TEMPLATES["Fast Casual"])
        
        for item_template in menu_template:
            item_data = {
                "name": item_template["name"],
                "description": f"Delicious {item_template['name']} from {cafe['name']}",
                "ingredients": "Various fresh ingredients",
                "calories": item_template["calories"],
                "price": item_template["price"],
                "quantity": "1 serving",
                "servings": 1.0,
                "veg_flag": item_template["veg"],
                "kind": item_template["kind"],
                "active": True
            }
            
            response = create_item(cafe["id"], item_data, token)
            if response:
                all_items.append({
                    "item": response,
                    "cafe_id": cafe["id"]
                })
                print(f"✓ Created item: {item_data['name']} for {cafe['name']}")
            else:
                print(f"✗ Failed to create item: {item_data['name']}")
    
    return all_items

def seed_users():
    """Register regular users."""
    print("Creating regular users...")
    users = []
    
    for user_data in USERS:
        response = register_user(user_data)
        if response:
            users.append(response)
            print(f"✓ Created user: {user_data['email']}")
        else:
            print(f"User {user_data['email']} might exist, logging in...")
            token = login_user(user_data['email'], user_data['password'])
            if token:
                user_info = get_current_user(token)
                if user_info:
                    users.append(user_info)
                    print(f"✓ Logged in user: {user_data['email']}")
    
    return users

def seed_drivers():
    """Register all drivers, set their locations, and mark them as IDLE."""
    print("Creating/checking drivers...")
    drivers = []
    
    for i, driver_data in enumerate(DRIVERS):
        response = register_driver(driver_data)
        if response:
            drivers.append(response)
            print(f"✓ Created driver: {driver_data['email']}")
        else:
            print(f"Driver {driver_data['email']} might already exist, trying to login...")
            token = login_driver(driver_data['email'], driver_data['password'])
            if token:
                driver_info = get_current_user(token)
                if driver_info:
                    drivers.append(driver_info)
                    print(f"✓ Logged in existing driver: {driver_data['email']}")
                else:
                    drivers.append({"email": driver_data['email'], "name": driver_data['name']})
                    print(f"✓ Logged in existing driver (fallback): {driver_data['email']}")
            else:
                print(f"✗ Failed to create or login driver: {driver_data['email']}")
                continue
        
        # After registration/login, post location and set to IDLE
        token = login_driver(driver_data['email'], driver_data['password'])
        if token:
            driver_id = get_driver_id(token)
            if not driver_id:
                # Fallback: try to get from driver_info
                if drivers and isinstance(drivers[-1], dict) and "id" in drivers[-1]:
                    driver_id = drivers[-1]["id"]
                else:
                    print(f"⚠️ Could not get driver ID for {driver_data['email']}, skipping location setup")
                    continue
            
            # Calculate location (spread drivers around base location)
            random.seed(i + 1)  # Consistent locations per driver
            lat = BASE_LAT + (random.random() - 0.5) * 0.1  # ~10km spread
            lng = BASE_LNG + (random.random() - 0.5) * 0.1
            
            location_response = post_driver_location_with_status(driver_id, lat, lng, token)
            if location_response:
                print(f"  ✓ Set location and IDLE status for driver {driver_data['email']} (ID: {driver_id})")
            else:
                print(f"  ⚠️ Failed to set location for driver {driver_data['email']}")
        else:
            print(f"  ⚠️ Could not login driver {driver_data['email']} to set location")
    
    return drivers

def seed_orders_and_reviews(users, all_items, owners_data):
    """Create orders and reviews."""
    print("Creating orders and reviews...")
    orders = []
    reviews = []
    
    # Group items by cafe
    cafe_items = {}
    for item_data in all_items:
        cafe_id = item_data['cafe_id']
        if cafe_id not in cafe_items:
            cafe_items[cafe_id] = []
        cafe_items[cafe_id].append(item_data['item'])
    
    # Each user makes 10-15 orders
    for user in users:
        user_token = login_user(user["email"], "Password123!")
        if not user_token:
            print(f"✗ Failed to login user: {user['email']}")
            continue
        
        num_orders = random.randint(3, 7)
        for order_num in range(num_orders):
            # Pick random cafe
            owner_data = random.choice(owners_data)
            cafe = owner_data['cafe']
            cafe_id = cafe['id']
            
            # Pick 1-4 items from this cafe
            available_items = cafe_items.get(cafe_id, [])
            if not available_items:
                continue
            
        
            chosen_items = random.sample(
                available_items,
                k=min(len(available_items), random.randint(1, 4))
            )
            
            # Add items to cart
            for item in chosen_items:
                quantity = random.randint(1, 3)
                cart_response = add_to_cart(item["id"], quantity, user_token)
                if not cart_response:
                    print(f"✗ Failed to add item to cart")
            
            # Place order
            order = place_order(cafe_id, user_token)
            if order:
                orders.append(order)
                print(f"✓ Created order #{order['id']} for {user['email']} at {cafe['name']}")
                
                # 70% chance to add a review
                if random.random() < 0.7:
                    rating = random.randint(3, 5)  # Most reviews are positive
                    comment = random.choice(REVIEW_TEMPLATES)
                    
                    try:
                        review = create_review(cafe_id, user['id'], rating, comment, user_token)
                        if review:
                            reviews.append(review)
                            print(f"  ✓ Created review (rating: {rating}) for cafe #{cafe_id}")
                        else:
                            print(f"  ✗ Failed to create review for cafe #{cafe_id}")
                    except Exception as e:
                        print(f"  ✗ Review error: {e}")
            else:
                print(f"✗ Failed to create order for {user['email']}")
    
    return orders, reviews

def main():
    """Main seeding function."""
    print("🌱 Starting enhanced API-based seeding...")
    print(f"Target API: {API_BASE}")
    
    # Check if API is running
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code != 200:
            print(f"❌ API not responding at {BASE_URL}")
            return
    except requests.exceptions.RequestException:
        print(f"❌ Cannot connect to API at {BASE_URL}")
        print("Make sure your FastAPI server is running on localhost:8000")
        return
    
    print("✓ API is responding\n")
    
    # Step 0: Create admin user (optional, for admin features)
    print("Creating admin user...")
    admin_response = seed_admin_user()
    if admin_response:
        print("✓ Created admin user")
    else:
        print("⚠️ Admin user might already exist")
    print()
    
    # Step 1: Create owners and their cafes
    owners_data = seed_owners_and_cafes()
    if not owners_data:
        print("❌ No owners/cafes created, aborting")
        return
    print(f"\n✓ Created {len(owners_data)} owners with cafes\n")
    
    # Step 2: Create menu items for each cafe
    all_items = seed_menu_items(owners_data)
    if not all_items:
        print("❌ No items created, aborting")
        return
    print(f"\n✓ Created {len(all_items)} menu items\n")
    
    # Step 3: Create regular users
    users = seed_users()
    if not users:
        print("❌ No users created, aborting")
        return
    print(f"\n✓ Created {len(users)} regular users\n")
    
    # Step 4: Create drivers
    drivers = seed_drivers()
    print(f"\n✓ Created {len(drivers)} drivers\n")
    
    # Step 5: Create orders and reviews
    orders, reviews = seed_orders_and_reviews(users, all_items, owners_data)
    
    # Summary
    print("\n" + "="*60)
    print("🎉 Seeding completed!")
    print("="*60)
    print(f"✓ Owners created: {len(owners_data)}")
    print(f"✓ Cafes created: {len(owners_data)}")
    print(f"✓ Menu items created: {len(all_items)}")
    print(f"✓ Regular users created: {len(users)}")
    print(f"✓ Drivers created: {len(drivers)}")
    print(f"✓ Orders created: {len(orders)}")
    print(f"✓ Reviews created: {len(reviews)}")
    print("="*60)
    
    # Test credentials
    print("\n📋 Test Credentials:")
    print("\n🏪 OWNERS (can access restaurant dashboard):")
    for i, owner_data in enumerate(owners_data):
        print(f"  {i+1}. Email: owner{i+1}@example.com | Password: Password123!")
        print(f"     Cafe: {owner_data['cafe']['name']}")
    
    print("\n👥 USERS:")
    for i in range(min(3, len(users))):
        print(f"  {i+1}. Email: user{i+1}@example.com | Password: Password123!")
    
    print("\n🚗 DRIVERS:")
    for i in range(min(3, len(drivers))):
        print(f"  {i+1}. Email: driver{i+1}@deliveryapp.com | Password: Password123!")
    
    print("\n👑 ADMIN:")
    print("  Email: admin@example.com | Password: admin123")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    main()