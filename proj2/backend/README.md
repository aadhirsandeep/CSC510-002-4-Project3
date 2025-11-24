<!--
Copyright (c) 2025 Group 2
All rights reserved.

This project and its source code are the property of Group 2:
- Aryan Tapkire
- Dilip Irala Narasimhareddy
- Sachi Vyas
- Supraj Gijre
-->

# Cafe Calories Backend API

A FastAPI backend for cafe ordering, delivery (driver assignment), payments, analytics, and calorie goals.

## Intended users
- Consumers: browse cafes, manage carts, place and track orders, set calorie goals.
- Cafe owners/staff: manage cafes, items, orders, and view analytics.
- Drivers: update location/status, receive assignments, pickup and deliver orders.
- Admins: manage users/cafes and enforce platform policies.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip

### Dependencies

The following dependencies are required and will be installed via `requirements.txt`:

**Core Framework:**
- `fastapi` - Modern, fast web framework for building APIs
- `uvicorn` - ASGI server for running FastAPI applications

**Database:**
- `sqlalchemy` - SQL toolkit and ORM
- `psycopg[binary]` - PostgreSQL adapter for Python

**Authentication & Security:**
- `pydantic[email]` - Data validation using Python type annotations
- `bcrypt == 4.0.1` - Password hashing library
- `passlib[bcrypt] == 1.7.4` - Password hashing library with bcrypt support
- `python-jose[cryptography]` - JWT implementation for Python
- `PyJWT` - JSON Web Token implementation

**File Handling:**
- `python-multipart` - Multipart form data parser
- `aiofiles` - Async file operations
- `PyPDF2` - PDF file manipulation library

**AI/ML:**
- `mistralai>=1.0.0` - Mistral AI SDK for AI integrations

**HTTP Client:**
- `httpx>=0.27.2` - Async HTTP client
- `requests` - HTTP library for making requests
- `anyio>=4.3.0` - Async compatibility library

**Testing:**
- `pytest>=8.3.0` - Testing framework
- `pytest-cov>=4.1.0` - Coverage plugin for pytest

**Configuration:**
- `python-dotenv` - Load environment variables from .env files

### Installation

1. **Clone and enter backend**
   ```bash
   git clone <repository-url>
   cd proj2/backend
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application (SQLite default)**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Access the API**
   - API Base URL: `http://127.0.0.1:8000`
   - Interactive API docs: `http://127.0.0.1:8000/docs`
   - Alternative docs: `http://127.0.0.1:8000/redoc`

Note: To use PostgreSQL instead of SQLite, set `POSTGRES_DATABASE_URL` or `DATABASE_URL`. See `DBSetup.md`.

## 📚 API Documentation

### Base URL
```
http://127.0.0.1:8000
```

### Authentication
Most endpoints require JWT. Include the token in the Authorization header:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 🔐 Authentication APIs (`/auth`)

### Login
**POST** `/auth/login`

Login with email and password to get access and refresh tokens.

```bash
curl -X POST "http://127.0.0.1:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer"
}
```

### Refresh Token
**GET** `/auth/refresh_token`

Refresh your access token using the refresh token.

```bash
curl -X GET "http://127.0.0.1:8000/auth/refresh_token"
```

### Validate Token
**POST** `/auth/validate`

Validate if your current token is still valid.

```bash
curl -X POST "http://127.0.0.1:8000/auth/validate" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Seed User (Development)
**POST** `/auth/seed_user`

Create a test user for development purposes.

```bash
curl -X POST "http://127.0.0.1:8000/auth/seed_user?email=admin@example.com&name=Admin&password=admin123&role=ADMIN"
```

**Query Parameters:**
- `email`: User email
- `name`: User name
- `password`: User password
- `role`: User role (USER, OWNER, ADMIN)

---

## 👥 User Management APIs (`/users`)

### Register User
**POST** `/users/register`

Register a new user account.

```bash
curl -X POST "http://127.0.0.1:8000/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "name": "New User",
    "password": "password123"
  }'
```

### Delete Self
**DELETE** `/users/me`

Deactivate your own account.

```bash
curl -X DELETE "http://127.0.0.1:8000/users/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🏪 Cafe Management APIs (`/cafes`)

### Create Cafe
**POST** `/cafes/`

Create a new cafe (Owner/Admin only).

```bash
curl -X POST "http://127.0.0.1:8000/cafes/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "My Cafe",
    "address": "123 Main St, City"
  }'
```

### List Cafes
**GET** `/cafes/`

Get a list of all active cafes.

```bash
curl -X GET "http://127.0.0.1:8000/cafes/?q=search_term"
```

**Query Parameters:**
- `q`: Optional search term to filter cafes by name

### Upload Menu PDF
**POST** `/cafes/{cafe_id}/menu/upload`

Upload a PDF menu for OCR processing (Owner/Admin only).

```bash
curl -X POST "http://127.0.0.1:8000/cafes/1/menu/upload" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "pdf=@/path/to/menu.pdf"
```

---

## 🍽️ Menu Items APIs (`/items`)

### Add Item to Cafe
**POST** `/items/{cafe_id}`

Add a new menu item to a cafe (Owner/Admin only).

```bash
curl -X POST "http://127.0.0.1:8000/items/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Chicken Burger",
    "description": "Delicious chicken burger",
    "ingredients": "Chicken, lettuce, tomato",
    "calories": 450,
    "price": 12.99,
    "quantity": "1 piece",
    "servings": 1.0,
    "veg_flag": false,
    "kind": "main"
  }'
```

### List Items from Cafe
**GET** `/items/{cafe_id}`

Get all menu items from a specific cafe.

```bash
curl -X GET "http://127.0.0.1:8000/items/1?q=burger"
```

**Query Parameters:**
- `q`: Optional search term to filter items by name

---

## 🛒 Shopping Cart APIs (`/cart`)

### Add Item to Cart
**POST** `/cart/add`

Add an item to your shopping cart.

```bash
curl -X POST "http://127.0.0.1:8000/cart/add" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "item_id": 1,
    "quantity": 2,
    "assignee_email": "friend@example.com"
  }'
```

**Request Body:**
- `item_id`: ID of the menu item
- `quantity`: Number of items (default: 1)
- `assignee_email`: Optional email of person the item is for

### Get Cart Summary
**GET** `/cart/summary`

Get a summary of your current cart with calories and prices.

```bash
curl -X GET "http://127.0.0.1:8000/cart/summary" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Clear Cart
**DELETE** `/cart/clear`

Remove all items from your cart.

```bash
curl -X DELETE "http://127.0.0.1:8000/cart/clear" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📦 Order Management APIs (`/orders`)

### Place Order
**POST** `/orders/place`

Place an order from your current cart.

```bash
curl -X POST "http://127.0.0.1:8000/orders/place" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "cafe_id": 1
  }'
```

### Cancel Order
**POST** `/orders/{order_id}/cancel`

Cancel a pending or accepted order.

```bash
curl -X POST "http://127.0.0.1:8000/orders/1/cancel" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get My Orders
**GET** `/orders/my`

Get all your orders.

```bash
curl -X GET "http://127.0.0.1:8000/orders/my" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Cafe Orders
**GET** `/orders/{cafe_id}`

Get orders for a specific cafe (Staff/Owner only).

```bash
curl -X GET "http://127.0.0.1:8000/orders/1?status=PENDING" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Query Parameters:**
- `status`: Optional order status filter

### Update Order Status
**POST** `/orders/{order_id}/status`

Update the status of an order (Staff/Owner only).

```bash
curl -X POST "http://127.0.0.1:8000/orders/1/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '"ACCEPTED"'
```

**Valid Status Values:**
- `PENDING` → `ACCEPTED`, `DECLINED`
- `ACCEPTED` → `READY`, `CANCELLED`
- `READY` → `PICKED_UP`

---

## 💳 Payment APIs (`/payments`)

### Create Payment
**POST** `/payments/{order_id}`

Process payment for an order.

```bash
curl -X POST "http://127.0.0.1:8000/payments/1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🎯 Goal Management APIs (`/goals`)

### Set Calorie Goal
**POST** `/goals/set`

Set a calorie goal for tracking.

```bash
curl -X POST "http://127.0.0.1:8000/goals/set" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "period": "daily",
    "target_calories": 2000,
    "start_date": "2024-01-01"
  }'
```

### Get Current Goals
**GET** `/goals/current`

Get your current calorie goals.

```bash
curl -X GET "http://127.0.0.1:8000/goals/current" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Today's Calorie Intake
**GET** `/goals/intake/today`

Get your calorie intake for today.

```bash
curl -X GET "http://127.0.0.1:8000/goals/intake/today" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Calorie Recommendation
**POST** `/goals/recommend`

Get personalized calorie recommendations.

```bash
curl -X POST "http://127.0.0.1:8000/goals/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "height_cm": 175,
    "weight_kg": 70,
    "sex": "M",
    "age_years": 25,
    "activity": "moderate"
  }'
```

**Activity Levels:**
- `sedentary`: Little to no exercise
- `light`: Light exercise 1-3 days/week
- `moderate`: Moderate exercise 3-5 days/week
- `active`: Heavy exercise 6-7 days/week
- `very_active`: Very heavy exercise, physical job

---

## 👨‍💼 Admin APIs (`/admin`)

### Block User
**POST** `/admin/block_user/{user_id}`

Block a user account (Admin only).

```bash
curl -X POST "http://127.0.0.1:8000/admin/block_user/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Create Cafe as Admin
**POST** `/admin/cafes`

Create a cafe with admin privileges (Admin only).

```bash
curl -X POST "http://127.0.0.1:8000/admin/cafes?name=Admin%20Cafe&address=Admin%20Street&owner_id=1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Query Parameters:**
- `name`: Cafe name
- `address`: Cafe address (optional)
- `owner_id`: Owner user ID (optional)

### Delete Cafe
**DELETE** `/admin/cafes/{cafe_id}`

Delete a cafe (Admin only).

```bash
curl -X DELETE "http://127.0.0.1:8000/admin/cafes/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 📊 Analytics APIs (`/analytics`)

### Get Cafe Analytics
**GET** `/analytics/cafe/{cafe_id}`

Get analytics data for a cafe (Staff/Owner only).

```bash
curl -X GET "http://127.0.0.1:8000/analytics/cafe/1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response includes:**
- Orders per day
- Top selling items
- Revenue per day

---

## 🏠 Health Check

### Root Endpoint
**GET** `/`

Check if the API is running.

```bash
curl -X GET "http://127.0.0.1:8000/"
```

---

## 🔑 Authentication & Authorization

### User Roles
- **USER**: Regular customers
- **OWNER**: Cafe owners
- **ADMIN**: System administrators

### JWT Token Structure
```json
{
  "sub": "user_email",
  "uid": 123,
  "role": "USER",
  "exp": 1234567890
}
```

### Protected Endpoints
- Most endpoints require authentication
- Admin-only endpoints require `ADMIN` role
- Owner/Staff endpoints require `OWNER` role or cafe ownership

---

## 📝 Data Models

### Order Status Flow
```
PENDING → ACCEPTED → READY → PICKED_UP
    ↓         ↓
DECLINED   CANCELLED
```

### Payment Status
- `PENDING`: Payment not yet processed
- `PAID`: Payment completed
- `FAILED`: Payment failed
- `REFUNDED`: Payment refunded

---

## 🛠️ Development

### Project Structure
```
proj2/backend/
├── app/
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database configuration
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # Authentication helpers
│   ├── config.py            # Configuration
│   ├── deps.py              # Dependencies
│   ├── routers/             # API route handlers
│   │   ├── auth.py, users.py, cafes.py, items.py, cart.py,
│   │   ├── orders.py, payments.py, goals.py, admin.py, analytics.py,
│   │   └── drivers.py, reviews.py, ocr.py
│   └── services/            # Business logic
│       ├── driver.py, ocr.py, recommend.py, review_summarizer.py
├── requirements.txt
└── README.md
```

### Database
Default: SQLite file `app.db` in this directory. Optional: PostgreSQL (see `DBSetup.md`).

### Environment Variables
The backend reads, in priority order:
- `POSTGRES_DATABASE_URL` (e.g., `postgresql+psycopg://user:pass@localhost:5432/cafe_calories`)
- `DATABASE_URL` (generic SQLAlchemy URL)
- fallback to SQLite in `config.py`

More: `DBSetup.md` and `docs/openapi.md`.

### Related docs
- Database setup: `DBSetup.md`
- Driver flow: `DRIVER_ASSIGNMENT_TESTING.md`
- OCR ingestion: `OCR_README.md`
---

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🆘 Support

For support and questions, please open an issue in the repository.
