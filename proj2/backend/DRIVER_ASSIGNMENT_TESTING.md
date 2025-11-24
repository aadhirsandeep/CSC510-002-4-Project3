<!--
Copyright (c) 2025 Group 2
All rights reserved.

This project and its source code are the property of Group 2:
- Aryan Tapkire
- Dilip Irala Narasimhareddy
- Sachi Vyas
- Supraj Gijre
-->

# Driver Assignment Feature - Testing Guide

This guide walks through end‑to‑end driver assignment: creating users, posting driver locations, accepting orders, auto/manual assignment, pickup, and delivery.

Notes:
- Backend must be running (SQLite default is fine). See `proj2/backend/README.md`.
- Use PostgreSQL only if needed (see `DBSetup.md`).
- On Windows PowerShell, keep the JSON quoting as shown (double quotes outside, single quotes inside).

## Prerequisites
1. Start the FastAPI backend server:
```bash
cd proj2/backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2. Make sure you have a test database with some cafes (or you'll create them in Step 5)

---

## Step 1: Create a Driver User Account

### Register a driver
```bash
curl -X POST "http://localhost:8000/drivers/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver1@test.com",
    "name": "John Driver",
    "password": "driver123"
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "email": "driver1@test.com",
  "name": "John Driver",
  "role": "DRIVER",
  "is_active": true
}
```

### Save the driver details
- Driver Email: `driver1@test.com`
- Driver Password: `driver123`
- Driver ID: `<save this from response>`

---

## Step 2: Create a Regular User Account (for placing orders)

```bash
curl -X POST "http://localhost:8000/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "name": "Test User",
    "password": "user123"
  }'
```

**Expected Response:**
```json
{
  "id": 2,
  "email": "user@test.com",
  "name": "Test User",
  "role": "USER",
  "is_active": true
}
```

---

## Step 3: Create a Cafe Owner Account

```bash
curl -X POST "http://localhost:8000/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@test.com",
    "name": "Cafe Owner",
    "password": "owner123",
    "role": "OWNER"
  }'
```

---

## Step 4: Login as Users and Get Tokens

### Login as driver
```bash
curl -X POST "http://localhost:8000/drivers/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver1@test.com",
    "password": "driver123"
  }'
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

**Save the driver's access_token as `DRIVER_TOKEN`**

### Login as regular user
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "user123"
  }'
```

**Save the user's access_token as `USER_TOKEN`**

### Login as cafe owner
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@test.com",
    "password": "owner123"
  }'
```

**Save the owner's access_token as `OWNER_TOKEN`**

---

## Step 5: Create a Cafe (as owner)

```bash
curl -X POST "http://localhost:8000/cafes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{
    "name": "Test Cafe",
    "address": "123 Main St",
    "lat": 37.7749,
    "lng": -122.4194
  }'
```

**Save the cafe ID as `CAFE_ID`** (e.g., `1`)

**Expected Response:**
```json
{
  "id": 1,
  "name": "Test Cafe",
  "address": "123 Main St",
  "active": true,
  "lat": 37.7749,
  "lng": -122.4194
}
```

---

## Step 6: Update Driver Location with Status (Initial IDLE)

```bash
curl -X POST "http://localhost:8000/drivers/1/location-status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{
    "lat": 37.7750,
    "lng": -122.4195,
    "status": "IDLE"
  }'
```

**Expected Response:**
```json
{
  "status": "ok",
  "location": {
    "id": 1,
    "driver_id": 1,
    "lat": 37.7750,
    "lng": -122.4195,
    "timestamp": "2024-01-15T10:30:00",
    "status": "IDLE"
  }
}
```

---

## Step 7: Create a Menu Item (as cafe owner)

```bash
curl -X POST "http://localhost:8000/cafes/$CAFE_ID/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{
    "name": "Burger",
    "description": "Delicious burger",
    "calories": 500,
    "price": 12.99,
    "veg_flag": false
  }'
```

**Save the item ID as `ITEM_ID`** (e.g., `1`)

---

## Step 8: Place an Order (as regular user)

First, add item to cart:
```bash
curl -X POST "http://localhost:8000/cart/add" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "item_id": 1,
    "quantity": 2
  }'
```

Then place the order:
```bash
curl -X POST "http://localhost:8000/orders/place" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "cafe_id": 1
  }'
```

**Save the order ID as `ORDER_ID`** (e.g., `1`)

**Expected Response:**
```json
{
  "id": 1,
  "cafe_id": 1,
  "status": "PENDING",
  "total_price": 25.98,
  "total_calories": 1000
}
```

---

## Step 9: Get Available Drivers (as cafe owner/staff)

```bash
curl -X GET "http://localhost:8000/drivers/available" \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

**Expected Response:**
```json
[
  {
    "driver_id": 1,
    "driver_name": "John Driver",
    "driver_email": "driver1@test.com",
    "lat": 37.7750,
    "lng": -122.4195,
    "status": "IDLE",
    "last_update": "2024-01-15T10:30:00"
  }
]
```

---

## Step 10: Accept Order (as cafe owner)

```bash
curl -X POST "http://localhost:8000/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '"ACCEPTED"'
```

**Expected Response:** Order with status "ACCEPTED"

---

## Step 11: Assign Driver to Order (Auto-assign nearest driver)

```bash
curl -X POST "http://localhost:8000/orders/$ORDER_ID/assign-driver" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{}'
```

**Expected Response:**
```json
{
  "id": 1,
  "cafe_id": 1,
  "driver_id": 1,
  "status": "ACCEPTED"
}
```

**Note:** Driver is automatically assigned based on shortest distance from cafe.

---

## Step 12: Verify Driver Status Changed to OCCUPIED

Update driver location again (should now be OCCUPIED):
```bash
curl -X POST "http://localhost:8000/drivers/1/location-status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{
    "lat": 37.7760,
    "lng": -122.4200,
    "status": "OCCUPIED"
  }'
```

Or check available drivers again (should be empty now):
```bash
curl -X GET "http://localhost:8000/drivers/available" \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

**Expected Response:** `[]` (empty array - no idle drivers)

---

## Step 13: Get Driver's Assigned Orders

```bash
curl -X GET "http://localhost:8000/drivers/1/assigned-orders" \
  -H "Authorization: Bearer $DRIVER_TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "cafe_id": 1,
    "status": "ACCEPTED",
    "driver_id": 1
  }
]
```

---

## Step 14: Mark Order as Ready (as cafe owner)

```bash
curl -X POST "http://localhost:8000/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '"READY"'
```

---

## Step 15: Driver Picks Up Order

```bash
curl -X POST "http://localhost:8000/drivers/1/orders/$ORDER_ID/pickup" \
  -H "Authorization: Bearer $DRIVER_TOKEN"
```

**Expected Response:** Order with status "PICKED_UP"

**Note:** Driver remains OCCUPIED at this point.

---

## Step 16: Driver Delivers Order

```bash
curl -X POST "http://localhost:8000/drivers/1/orders/$ORDER_ID/deliver" \
  -H "Authorization: Bearer $DRIVER_TOKEN"
```

**Expected Response:**
```json
{
  "id": 1,
  "status": "DELIVERED",
  "driver_id": 1
}
```

**Important:** Driver status is automatically set back to IDLE after delivery.

---

## Step 17: Verify Driver is Back to IDLE

```bash
curl -X GET "http://localhost:8000/drivers/available" \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

**Expected Response:** Driver should appear in the list again
```json
[
  {
    "driver_id": 1,
    "driver_name": "John Driver",
    "status": "IDLE"
  }
]
```

---

## Step 18: Test Manual Driver Assignment

Create a second driver:
```bash
curl -X POST "http://localhost:8000/drivers/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver2@test.com",
    "name": "Jane Driver",
    "password": "driver123"
  }'
```

Post driver 2 location:
```bash
curl -X POST "http://localhost:8000/drivers/2/location-status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER2_TOKEN" \
  -d '{
    "lat": 38.0000,
    "lng": -122.5000,
    "status": "IDLE"
  }'
```

Assign specific driver to an order:
```bash
curl -X POST "http://localhost:8000/orders/$ORDER_ID/assign-driver" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{
    "driver_id": 2
  }'
```

---

## Step 19: Test Error Cases

### Try to assign already-assigned order
```bash
curl -X POST "http://localhost:8000/orders/1/assign-driver" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{}'
```

**Expected Error:** `400 Bad Request - "Order already has a driver assigned"`

### Try to assign OCCUPIED driver
```bash
# First, assign driver 1 to an order (to make them OCCUPIED)
# Then try to assign driver 1 to another order
curl -X POST "http://localhost:8000/orders/2/assign-driver" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{
    "driver_id": 1
  }'
```

**Expected Error:** `400 Bad Request - "Driver is not available (not idle)"`

### Try to assign driver to PENDING order
```bash
# Create a new order
# Try to assign driver before accepting order
curl -X POST "http://localhost:8000/orders/3/assign-driver" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{}'
```

**Expected Error:** `400 Bad Request - "Order must be ACCEPTED or READY to assign a driver"`

---

## Step 20: Update Driver Status Manually

```bash
curl -X PUT "http://localhost:8000/drivers/1/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{
    "status": "OCCUPIED"
  }'
```

---

## Quick Test Script

Create `test_driver_assignment.sh` and run all tests:

```bash
#!/bin/bash

BASE_URL="http://localhost:8000"

# Step 1: Register driver
echo "Registering driver..."
DRIVER_RESPONSE=$(curl -s -X POST "$BASE_URL/drivers/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "driver1@test.com", "name": "John Driver", "password": "driver123"}')
echo "$DRIVER_RESPONSE"

# Step 2: Login driver
echo "Logging in driver..."
DRIVER_TOKEN=$(curl -s -X POST "$BASE_URL/drivers/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "driver1@test.com", "password": "driver123"}' | jq -r '.access_token')
echo "Driver Token: $DRIVER_TOKEN"

# Step 3: Post location
echo "Posting driver location..."
curl -X POST "$BASE_URL/drivers/1/location-status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"lat": 37.7750, "lng": -122.4195, "status": "IDLE"}'

echo "\n✅ All tests completed!"
```

---

## Notes

- Replace `$DRIVER_TOKEN`, `$USER_TOKEN`, `$OWNER_TOKEN` with actual tokens from your login responses
- Replace `$ORDER_ID`, `$CAFE_ID`, etc. with actual IDs from your responses
- The `-d` flag for PUT requests expects JSON body content
- Make sure your database is running and migrations are applied

Windows PowerShell tips:
- Use `$env:VAR = "value"` to set environment variables in the current shell if needed.
- If curl is aliased to `Invoke-WebRequest`, install curl or use `iwr` with `-Method`/`-Body`.

## Expected Behavior Summary

1. **IDLE → OCCUPIED**: When driver is assigned to an order
2. **Driver remains OCCUPIED**: When they pick up order
3. **OCCUPIED → IDLE**: When they deliver order
4. **Auto-assignment**: Selects nearest IDLE driver
5. **Manual assignment**: Can specify driver_id
6. **Distance calculation**: Uses Haversine formula for lat/lng coordinates

