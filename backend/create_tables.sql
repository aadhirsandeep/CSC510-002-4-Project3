-- Cafe Calories Database Schema
-- This script creates all required enum types and tables

-- Drop existing tables and types if they exist (in reverse dependency order)
DROP TABLE IF EXISTS refund_requests CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS staff_assignments CASCADE;
DROP TABLE IF EXISTS calorie_goals CASCADE;
DROP TABLE IF EXISTS driver_locations CASCADE;
DROP TABLE IF EXISTS cafes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS paymentstatus CASCADE;
DROP TYPE IF EXISTS orderstatus CASCADE;
DROP TYPE IF EXISTS role CASCADE;
DROP TYPE IF EXISTS driverstatus CASCADE;

-- Create enum types
CREATE TYPE role AS ENUM ('USER', 'OWNER', 'STAFF', 'ADMIN', 'DRIVER');
CREATE TYPE orderstatus AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'READY', 'PICKED_UP', 'CANCELLED', 'REFUNDED', 'DELIVERED');
CREATE TYPE paymentstatus AS ENUM ('CREATED', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE driverstatus AS ENUM ('IDLE', 'OCCUPIED');

-- Create tables

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    hashed_password VARCHAR NOT NULL,
    role role NOT NULL DEFAULT 'USER',
    is_active BOOLEAN DEFAULT TRUE,
    height_cm DOUBLE PRECISION,
    weight_kg DOUBLE PRECISION,
    sex VARCHAR,  -- "M"/"F"/"X"
    dob DATE
);

-- Create index on email
CREATE INDEX ix_users_email ON users (email);

-- Cafes table
CREATE TABLE cafes (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    address VARCHAR,
    active BOOLEAN DEFAULT TRUE,
    owner_id INTEGER REFERENCES users(id),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL
);

-- Create index on name
CREATE INDEX ix_cafes_name ON cafes (name);

-- Driver locations table
CREATE TABLE driver_locations (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES users(id),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status driverstatus DEFAULT 'IDLE' NOT NULL
);

-- Create indexes
CREATE INDEX ix_driver_locations_driver_id ON driver_locations (driver_id);
CREATE INDEX ix_driver_locations_status ON driver_locations (status);

-- Staff assignments table
CREATE TABLE staff_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    cafe_id INTEGER NOT NULL REFERENCES cafes(id),
    role role NOT NULL DEFAULT 'STAFF',
    CONSTRAINT uq_staff_cafe UNIQUE (user_id, cafe_id)
);

-- Items table
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    cafe_id INTEGER REFERENCES cafes(id),
    name VARCHAR NOT NULL,
    description TEXT,
    ingredients TEXT,
    calories INTEGER NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    quantity VARCHAR,  -- e.g., "350ml" or "1 slice"
    servings DOUBLE PRECISION,   -- per item
    veg_flag BOOLEAN DEFAULT TRUE,
    kind VARCHAR,  -- dessert, milkshake, etc.
    active BOOLEAN DEFAULT TRUE
);

-- Create indexes
CREATE INDEX ix_items_cafe_id ON items (cafe_id);
CREATE INDEX ix_items_name ON items (name);

-- Carts table
CREATE TABLE carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id
CREATE INDEX ix_carts_user_id ON carts (user_id);

-- Cart items table
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES carts(id),
    item_id INTEGER REFERENCES items(id),
    quantity INTEGER DEFAULT 1,
    assignee_user_id INTEGER REFERENCES users(id)
);

-- Create indexes
CREATE INDEX ix_cart_items_cart_id ON cart_items (cart_id);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    cafe_id INTEGER REFERENCES cafes(id),
    driver_id INTEGER REFERENCES users(id),
    status orderstatus DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    can_cancel_until TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes'),
    pickup_code VARCHAR,
    total_price DOUBLE PRECISION DEFAULT 0.0,
    total_calories INTEGER DEFAULT 0
);

-- Create indexes
CREATE INDEX ix_orders_user_id ON orders (user_id);
CREATE INDEX ix_orders_cafe_id ON orders (cafe_id);
CREATE INDEX ix_orders_driver_id ON orders (driver_id);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    item_id INTEGER REFERENCES items(id),
    quantity INTEGER DEFAULT 1,
    assignee_user_id INTEGER REFERENCES users(id),
    subtotal_price DOUBLE PRECISION DEFAULT 0.0,
    subtotal_calories INTEGER DEFAULT 0
);

-- Create index
CREATE INDEX ix_order_items_order_id ON order_items (order_id);

-- Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    provider VARCHAR DEFAULT 'MOCK',
    amount DOUBLE PRECISION DEFAULT 0.0,
    status paymentstatus DEFAULT 'CREATED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX ix_payments_order_id ON payments (order_id);

-- Calorie goals table
CREATE TABLE calorie_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    period VARCHAR,  -- daily/weekly/monthly
    target_calories INTEGER NOT NULL,
    start_date DATE NOT NULL
);

-- Create index
CREATE INDEX ix_calorie_goals_user_id ON calorie_goals (user_id);

-- Refund requests table
CREATE TABLE refund_requests (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    reason TEXT,
    status VARCHAR DEFAULT 'PENDING'  -- APPROVED/REJECTED
);

-- Create index
CREATE INDEX ix_refund_requests_order_id ON refund_requests (order_id);

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts and profiles';
COMMENT ON TABLE cafes IS 'Restaurant/cafe information';
COMMENT ON TABLE staff_assignments IS 'Staff assignments to cafes';
COMMENT ON TABLE driver_locations IS 'Driver location tracking and status';
COMMENT ON TABLE items IS 'Menu items';
COMMENT ON TABLE carts IS 'Shopping carts';
COMMENT ON TABLE cart_items IS 'Items in carts';
COMMENT ON TABLE orders IS 'Customer orders';
COMMENT ON TABLE order_items IS 'Items in orders';
COMMENT ON TABLE payments IS 'Payment records';
COMMENT ON TABLE calorie_goals IS 'User calorie goals';
COMMENT ON TABLE refund_requests IS 'Refund requests';

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
