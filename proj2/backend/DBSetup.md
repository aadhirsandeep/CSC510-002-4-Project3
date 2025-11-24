<!--
Copyright (c) 2025 Group 2
All rights reserved.

This project and its source code are the property of Group 2:
- Aryan Tapkire
- Dilip Irala Narasimhareddy
- Sachi Vyas
- Supraj Gijre
-->

# Database Setup Guide

This document outlines the setup process for using PostgreSQL with Cafe Calories. By default, the app uses SQLite (`app.db`) and needs no DB setup. Use this guide only if you want PostgreSQL.

## Prerequisites

- PostgreSQL server running on localhost:5432
- Access to a superuser account (e.g., `<your_user_name>`)
- Python environment with required dependencies

## Step 1: Create Database

```bash
# Connect to PostgreSQL as superuser
psql -h localhost -p 5432 -U <your_user_name> -d postgres

# Create the database
CREATE DATABASE cafe_calories;
```

## Step 2: Create Application User

```bash
# Create a dedicated application user
psql -h localhost -p 5432 -U <your_user_name> -d postgres -c "CREATE ROLE app_user WITH LOGIN PASSWORD 'app_password';"
```

## Step 3: Grant Database Permissions

```bash
# Grant full access to the database
psql -h localhost -p 5432 -U <your_user_name> -d cafe_calories -c "GRANT ALL PRIVILEGES ON DATABASE cafe_calories TO app_user;"

# Grant schema usage
psql -h localhost -p 5432 -U <your_user_name> -d cafe_calories -c "GRANT USAGE ON SCHEMA public TO app_user;"

# Grant table permissions
psql -h localhost -p 5432 -U <your_user_name> -d cafe_calories -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;"

# Grant sequence permissions (for auto-increment IDs)
psql -h localhost -p 5432 -U <your_user_name> -d cafe_calories -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;"
```

## Step 4: Create Required Enum Types

```bash
# Connect to the cafe_calories database
psql -h localhost -p 5432 -U <your_user_name> -d cafe_calories

# Create enum types required by the application
CREATE TYPE role AS ENUM ('USER', 'OWNER', 'STAFF', 'ADMIN');
CREATE TYPE orderstatus AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'READY', 'PICKED_UP', 'CANCELLED', 'REFUNDED');
CREATE TYPE paymentstatus AS ENUM ('CREATED', 'PAID', 'FAILED', 'REFUNDED');
```

## Step 5: Create Tables

### Option A: Using SQLAlchemy (Recommended)
```bash
# Set environment variable and run the application
cd <path-to-repo>/proj2/backend
POSTGRES_DATABASE_URL="postgresql+psycopg://app_user:app_password@localhost:5432/cafe_calories" \
  python -m uvicorn app.main:app --reload
```

The application will automatically create all tables on startup via `Base.metadata.create_all(bind=engine)`.

### Option B: Using SQL Script
```bash
# Run the provided SQL script
psql -h localhost -p 5432 -U <your_user_name> -d cafe_calories -f create_tables.sql
```

## Step 6: Verify Setup

### Test Application User Connection
```bash
# Test connection with app_user
psql -h localhost -p 5432 -U app_user -d cafe_calories -c "SELECT current_user, current_database();"
```

Expected output:
```
 current_user | current_database 
--------------+------------------
 app_user     | cafe_calories
```

### Verify Tables Created
```bash
# List all tables
psql -h localhost -p 5432 -U app_user -d cafe_calories -c "\dt"
```

Expected tables:
- users
- cafes
- staff_assignments
- items
- carts
- cart_items
- orders
- order_items
- payments
- calorie_goals
- refund_requests

## Step 7: Seed Data (Optional)

### Using API Endpoints
```bash
# Run the seed script
cd <path-to-repo>/proj2/backend
POSTGRES_DATABASE_URL="postgresql+psycopg://app_user:app_password@localhost:5432/cafe_calories" python3 seed_via_api.py
```

### Using Direct Database Access
```bash
# Run the direct database seed script
POSTGRES_DATABASE_URL="postgresql+psycopg://app_user:app_password@localhost:5432/cafe_calories" python3 seed_data.py
```

## Step 8: Start the Application

```bash
# Start FastAPI server with PostgreSQL
cd <path-to-repo>/proj2/backend
POSTGRES_DATABASE_URL="postgresql+psycopg://app_user:app_password@localhost:5432/cafe_calories" \
  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Variables

The application supports multiple database configurations through environment variables:

### Priority Order:
1. `POSTGRES_DATABASE_URL` - Explicit PostgreSQL override
2. `DATABASE_URL` - Generic SQLAlchemy URL
3. `settings.SQLALCHEMY_DATABASE_URI` - Default (SQLite)

### Example Environment Variables:
```bash
# PostgreSQL (Production)
export POSTGRES_DATABASE_URL="postgresql+psycopg://app_user:app_password@localhost:5432/cafe_calories"

# Generic database URL
export DATABASE_URL="postgresql+psycopg://app_user:app_password@localhost:5432/cafe_calories"

# SQLite (Development)
# No environment variable needed - uses default SQLite
```

### Windows PowerShell examples
```powershell
# One-time for current shell
$env:POSTGRES_DATABASE_URL = "postgresql+psycopg://app_user:app_password@localhost:5432/cafe_calories"
python -m uvicorn app.main:app --reload
```

## Security Considerations

### Application User Permissions
The `app_user` role has been granted:
- ✅ **Login capability** - Can connect to database
- ✅ **Database access** - Full access to `cafe_calories` database
- ✅ **Schema usage** - Can use `public` schema
- ✅ **Table operations** - SELECT, INSERT, UPDATE, DELETE on all tables
- ✅ **Sequence access** - Can use auto-increment sequences
- ❌ **No superuser privileges** - Cannot create databases or other users
- ❌ **No system access** - Cannot access other databases

### Connection Security
- Password-protected user account
- Limited to specific database
- No superuser privileges
- Follows principle of least privilege

## Troubleshooting

### Common Issues:

1. **Connection Refused**
   ```bash
   # Check if PostgreSQL is running
   pg_ctl status
   # Or check port
   netstat -an | grep 5432   # macOS/Linux
   # Windows (PowerShell):
   netstat -ano | Select-String 5432
   ```

2. **Role Does Not Exist**
   ```bash
   # Recreate the role
   psql -h localhost -p 5432 -U <your_user_name> -d postgres -c "CREATE ROLE app_user WITH LOGIN PASSWORD 'app_password';"
   ```

3. **Permission Denied**
   ```bash
   # Re-grant permissions
   psql -h localhost -p 5432 -U <your_user_name> -d cafe_calories -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;"
   ```

4. **Enum Types Missing**
   ```bash
   # Recreate enum types
   psql -h localhost -p 5432 -U <your_user_name> -d cafe_calories -c "CREATE TYPE role AS ENUM ('USER', 'OWNER', 'STAFF', 'ADMIN');"
   ```

## Database Schema Overview

### Core Tables:
- **users** - User accounts and profiles
- **cafes** - Restaurant/cafe information
- **items** - Menu items
- **orders** - Customer orders
- **payments** - Payment records

### Supporting Tables:
- **staff_assignments** - Staff assignments to cafes
- **carts** - Shopping carts
- **cart_items** - Items in carts
- **order_items** - Items in orders
- **calorie_goals** - User calorie goals
- **refund_requests** - Refund requests

### Enum Types:
- **role** - User roles (USER, OWNER, STAFF, ADMIN)
- **orderstatus** - Order statuses (PENDING, ACCEPTED, etc.)
- **paymentstatus** - Payment statuses (CREATED, PAID, etc.)

## Maintenance

### Backup Database
```bash
pg_dump -h localhost -p 5432 -U app_user -d cafe_calories > backup.sql
```

### Restore Database
```bash
psql -h localhost -p 5432 -U app_user -d cafe_calories < backup.sql
```

### Monitor Connections
```bash
psql -h localhost -p 5432 -U <your_user_name> -d postgres -c "SELECT * FROM pg_stat_activity WHERE datname = 'cafe_calories';"
```

---

**Note**: This setup provides a secure, production-ready database configuration with proper access controls and permissions for the Cafe Calories application.
