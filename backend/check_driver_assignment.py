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
Quick script to check driver assignment in the database.
Usage: python check_driver_assignment.py [order_id]
"""

import sqlite3
import sys
import os

# Database path
DB_PATH = "app.db"

def check_order_driver(order_id=None):
    """Check driver assignment for orders."""
    if not os.path.exists(DB_PATH):
        print(f"❌ Database file {DB_PATH} not found!")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("=" * 60)
    print("DRIVER ASSIGNMENT CHECK")
    print("=" * 60)
    
    if order_id:
        # Check specific order
        cursor.execute("""
            SELECT o.id, o.user_id, o.cafe_id, o.driver_id, o.status, o.total_price, o.pickup_code,
                   u.name as driver_name, u.email as driver_email
            FROM orders o
            LEFT JOIN users u ON o.driver_id = u.id
            WHERE o.id = ?
        """, (order_id,))
        
        result = cursor.fetchone()
        if result:
            print(f"\n📦 Order #{result[0]}:")
            print(f"   User ID: {result[1]}")
            print(f"   Cafe ID: {result[2]}")
            print(f"   Driver ID: {result[3] if result[3] else '❌ NOT ASSIGNED'}")
            print(f"   Status: {result[4]}")
            print(f"   Total Price: ${result[5]:.2f}")
            print(f"   Pickup Code: {result[6]}")
            if result[7]:
                print(f"   Driver Name: {result[7]}")
                print(f"   Driver Email: {result[8]}")
        else:
            print(f"\n❌ Order #{order_id} not found!")
    else:
        # Show recent orders
        cursor.execute("""
            SELECT o.id, o.cafe_id, o.driver_id, o.status,
                   u.name as driver_name, c.name as cafe_name
            FROM orders o
            LEFT JOIN users u ON o.driver_id = u.id
            LEFT JOIN cafes c ON o.cafe_id = c.id
            ORDER BY o.id DESC
            LIMIT 10
        """)
        
        results = cursor.fetchall()
        print(f"\n📦 Recent Orders (Last 10):")
        print("-" * 60)
        print(f"{'Order ID':<10} {'Cafe':<20} {'Driver ID':<12} {'Status':<15} {'Driver Name':<20}")
        print("-" * 60)
        
        for row in results:
            order_id, cafe_id, driver_id, status, driver_name, cafe_name = row
            driver_display = f"✓ {driver_id}" if driver_id else "❌ None"
            driver_name_display = driver_name if driver_name else "—"
            print(f"{order_id:<10} {cafe_name or f'Cafe #{cafe_id}':<20} {driver_display:<12} {status:<15} {driver_name_display:<20}")
    
    print("\n" + "=" * 60)
    
    # Check driver locations
    cursor.execute("""
        SELECT driver_id, lat, lng, status, timestamp
        FROM driver_locations
        WHERE driver_id IN (
            SELECT DISTINCT driver_id FROM orders WHERE driver_id IS NOT NULL
        )
        ORDER BY timestamp DESC
        LIMIT 5
    """)
    
    driver_locations = cursor.fetchall()
    if driver_locations:
        print("\n🚗 Recent Driver Locations (Assigned Drivers):")
        print("-" * 60)
        print(f"{'Driver ID':<12} {'Lat':<12} {'Lng':<12} {'Status':<12} {'Last Update':<20}")
        print("-" * 60)
        for loc in driver_locations:
            driver_id, lat, lng, status, timestamp = loc
            print(f"{driver_id:<12} {lat:<12.6f} {lng:<12.6f} {status:<12} {timestamp:<20}")
    
    # Count idle drivers (get latest status for each driver)
    cursor.execute("""
        SELECT DISTINCT 
            d1.driver_id, 
            u.name, 
            u.email, 
            d1.status, 
            d1.timestamp
        FROM driver_locations d1
        JOIN users u ON d1.driver_id = u.id
        WHERE d1.timestamp = (
            SELECT MAX(d2.timestamp)
            FROM driver_locations d2
            WHERE d2.driver_id = d1.driver_id
        )
        AND d1.status = 'IDLE'
        ORDER BY d1.driver_id
    """)
    
    idle_drivers = cursor.fetchall()
    print(f"\n✅ Available Idle Drivers: {len(idle_drivers)}")
    if idle_drivers:
        print("-" * 60)
        for driver in idle_drivers:
            driver_id, name, email, status, timestamp = driver
            print(f"   Driver #{driver_id}: {name} ({email}) - {status}")
    
    conn.close()

if __name__ == "__main__":
    order_id = int(sys.argv[1]) if len(sys.argv) > 1 else None
    check_order_driver(order_id)

