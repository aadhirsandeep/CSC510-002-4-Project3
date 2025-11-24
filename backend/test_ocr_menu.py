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
OCR Testing Script
Automatically tests OCR service with menu1.png
"""

import requests
import os
import sys
import json
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "test123"
TEST_USER_NAME = "Test User"
MENU_FILE = "menu1.png"

def check_server():
    """Check if the server is running"""
    try:
        response = requests.get(f"{BASE_URL}/", timeout=2)
        return response.status_code == 200
    except:
        return False

def register_user():
    """Register a test user"""
    try:
        # Try using /users/register endpoint
        response = requests.post(
            f"{BASE_URL}/users/register",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_USER_NAME,
                "role": "User"
            }
        )
        if response.status_code == 200:
            print("✓ Test user registered successfully")
            return True
        elif response.status_code == 400:
            print("✓ Test user already exists")
            return True
        else:
            print(f"⚠ Registration response: {response.status_code}")
            print(f"  Trying seed_user endpoint instead...")
            # Try seed_user as fallback
            return seed_user()
    except Exception as e:
        print(f"✗ Registration failed: {e}")
        print(f"  Trying seed_user endpoint instead...")
        return seed_user()

def seed_user():
    """Use seed_user endpoint as fallback"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/seed_user",
            params={
                "email": TEST_EMAIL,
                "name": TEST_USER_NAME,
                "password": TEST_PASSWORD,
                "role": "USER"
            }
        )
        if response.status_code == 200:
            result = response.json()
            if result.get("status") == "created":
                print("✓ Test user created via seed_user")
            elif result.get("status") == "exists":
                print("✓ Test user already exists")
            return True
        else:
            print(f"⚠ Seed user response: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Seed user failed: {e}")
        return False

def login():
    """Login and get access token"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "role": "USER"  # Note: uppercase "USER"
            }
        )
        if response.status_code == 200:
            token = response.json()["access_token"]
            print("✓ Login successful")
            return token
        else:
            print(f"✗ Login failed: {response.status_code}")
            print(f"  Response: {response.text}")
            if response.status_code == 401:
                print("\n  Tip: Make sure the user exists and password is correct")
                print("  Try creating user manually via /auth/seed_user endpoint")
            return None
    except Exception as e:
        print(f"✗ Login error: {e}")
        return None

def test_health():
    """Test OCR health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/ocr/health")
        if response.status_code == 200:
            health = response.json()
            print(f"✓ Health check: {health.get('status', 'unknown')}")
            return True
        else:
            print(f"✗ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Health check error: {e}")
        return False

def test_ocr_with_menu(token, menu_file):
    """Test OCR with menu image"""
    if not Path(menu_file).exists():
        print(f"✗ File not found: {menu_file}")
        return None
    
    try:
        print(f"\n📤 Uploading {menu_file}...")
        with open(menu_file, "rb") as f:
            files = {"file": (menu_file, f, "image/png")}
            headers = {"Authorization": f"Bearer {token}"}
            
            response = requests.post(
                f"{BASE_URL}/ocr/parse-menu",
                files=files,
                headers=headers,
                timeout=60  # OCR can take time
            )
        
        if response.status_code == 200:
            result = response.json()
            items = result.get("items", [])
            print(f"\n✅ Success! Parsed {len(items)} menu items\n")
            
            # Display results
            print("=" * 60)
            print("EXTRACTED MENU ITEMS:")
            print("=" * 60)
            for i, item in enumerate(items, 1):
                print(f"\n{i}. {item.get('name', 'N/A')}")
                print(f"   Price: ${item.get('price', 0):.2f}")
                print(f"   Calories: {item.get('calories', 0)}")
                print(f"   Vegetarian: {'Yes' if item.get('veg_flag', True) else 'No'}")
                if item.get('kind'):
                    print(f"   Category: {item.get('kind')}")
                if item.get('description'):
                    print(f"   Description: {item.get('description')}")
                if item.get('ingredients'):
                    print(f"   Ingredients: {item.get('ingredients')}")
            
            print("\n" + "=" * 60)
            print("\nFull JSON Response:")
            print(json.dumps(result, indent=2))
            
            return result
        else:
            print(f"✗ OCR failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ OCR error: {e}")
        return None

def main():
    """Main testing flow"""
    print("=" * 60)
    print("OCR Service Testing Script")
    print("=" * 60)
    
    # Check server
    print("\n1. Checking if server is running...")
    if not check_server():
        print("✗ Server is not running!")
        print("\nPlease start the server first:")
        print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        sys.exit(1)
    print("✓ Server is running")
    
    # Test health
    print("\n2. Testing OCR health endpoint...")
    test_health()
    
    # Register user
    print("\n3. Registering test user...")
    register_user()
    
    # Login
    print("\n4. Logging in...")
    token = login()
    if not token:
        print("\n✗ Cannot proceed without authentication token")
        sys.exit(1)
    
    # Test OCR
    print("\n5. Testing OCR with menu image...")
    result = test_ocr_with_menu(token, MENU_FILE)
    
    if result:
        print("\n✅ All tests completed successfully!")
    else:
        print("\n✗ OCR test failed")
        sys.exit(1)

if __name__ == "__main__":
    main()

