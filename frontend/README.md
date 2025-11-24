<!--
Copyright (c) 2025 Group 2
All rights reserved.

This project and its source code are the property of Group 2:
- Aryan Tapkire
- Dilip Irala Narasimhareddy
- Sachi Vyas
- Supraj Gijre
-->

  # Cafes and Calorie Tracker App

  A React + Vite + TypeScript frontend for the Cafe Calories platform.

  ## Who is this for?
  - Consumers placing cafe orders and tracking calorie goals
  - Cafe owners/staff managing menus and orders
  - Drivers viewing/acting on assignments

  ## Prerequisites
  - Node 18+
  - npm

  ## Running the code
  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  App URL: http://localhost:3000

  ## API base URL
  The frontend talks to the backend at `http://localhost:8000` by default.
  To change this, update `src/api/client.ts` (or set your preferred base URL in the same file).

  ## Available scripts
  - `npm run dev`: Start dev server
  - `npm run build`: Production build
  - `npx vitest run`: Run frontend tests

  ## Notes
  - Make sure the backend is running (see `proj2/backend/README.md`).
  - If CORS or ports differ, update the API base URL as noted above.

 # Frontend Components Documentation

> Repository: `src/components/`  
> Purpose: Documentation for core frontend components, UI patterns, routing and implementation details for the food-ordering application.

# Core Components

## Authentication (`src/components/auth/`)
- **LoginPage**  
  - Path: `src/components/auth/LoginPage.tsx`  
  - Purpose: Handles user authentication using email/password.  
  - Key behaviour: form validation, error messages, calls `auth.signIn()`, stores JWT on success, redirects based on role.
  - Exports: `LoginPage` (default)
- **RegisterPage**  
  - Path: `src/components/auth/RegisterPage.tsx`  
  - Purpose: User registration form with role selection (`User` / `Restaurant Owner`).  
  - Key behaviour: role dropdown, client-side validation, calls `auth.register()`, optional onboarding steps for restaurant owners.

---

## User Components (`src/components/user/`)
- **UserDashboard**  
  - Path: `src/components/user/UserDashboard.tsx`  
  - Purpose: Main dashboard showing calorie tracking, todays summary, current orders and quick actions.
- **MenuPage**  
  - Path: `src/components/user/MenuPage.tsx`  
  - Purpose: Displays restaurant menu with search, category filters, and dietary (calorie) hints.
- **CalorieSettings**  
  - Path: `src/components/user/CalorieSettings.tsx`  
  - Purpose: Configure calorie goals, show progress and daily logs.
- **OrderHistory**  
  - Path: `src/components/user/OrderHistory.tsx`  
  - Purpose: Past orders list, status, reorder action and receipt view.
- **RestaurantList**  
  - Path: `src/components/user/RestaurantList.tsx`  
  - Purpose: Browse restaurants, quick filters (open now, rating).
- **AIFoodRecommendations**  
  - Path: `src/components/user/AIFoodRecommendations.tsx`  
  - Purpose: Show food suggestions (based on information gathered from the user when registering their account).
- **CartPage**  
  - Path: `src/components/user/CartPage.tsx`  
  - Purpose: Shopping cart management, apply coupons, checkout.
- **OrderTracking**  
  - Path: `src/components/user/OrderTracking.tsx`  
  - Purpose: Real-time order status (preparing → out for delivery → delivered), ETA display.

---

## Restaurant Components (`src/components/restaurant/`)
- **RestaurantDashboard**  
  - Path: `src/components/restaurant/RestaurantDashboard.tsx`  
  - Purpose: Owner dashboard showing revenue, orders, KPIs.
- **MenuManagement**  
  - Path: `src/components/restaurant/MenuManagement.tsx`  
  - Purpose: Create/Update/Delete menu items, images, price, calories, OCR support for bulk upload.
- **OrderManagement**  
  - Path: `src/components/restaurant/OrderManagement.tsx`  
  - Purpose: View & process incoming orders, update statuses, assign to staff.
- **Analytics**  
  - Path: `src/components/restaurant/Analytics.tsx`  
  - Purpose: Business insights & reports (sales by item, time series).
- **ReviewInsights**  
  - Path: `src/components/restaurant/ReviewInsights.tsx`  
  - Purpose: Feedback analysis, sentiment summaries, common complaints.

---

## Layout Components (`src/components/layout/`)
- **Header**  
  - Path: `src/components/layout/Header.tsx`  
  - Purpose: Main navigation header with logo, search and user menu.
- **Navigation**  
  - Path: `src/components/layout/Navigation.tsx`  
  - Purpose: Role-based navigation menu (User, Restaurant Owner, Driver, Admin).
- **ContactUs**  
  - Path: `src/components/layout/ContactUs.tsx`  
  - Purpose: Contact information and support form.

---

## Driver Components (`src/components/driver/`)
- **DriverDashboard**  
  - Path: `src/components/driver/DriverDashboard.tsx`  
  - Purpose: Order delivery management, route list, status updates, map / ETA.

---

# Key Features
- Role-based access control (User / Restaurant Owner / Driver / Admin)
- Real-time order tracking and ETA
- Calorie tracking and personalized goals
- AI-powered food recommendations
- Restaurant analytics and reviews insights
- Menu management with OCR-assisted bulk upload

---

# 🧩 Technical Implementation

## 1. State Management
- **React Context API** is used for managing authentication and global state.
- 

---

## 2. Routing
- Implemented using **React Router v6**.  
- Includes **protected routes** based on authentication and user roles.  
- Organized route grouping for `user`, `restaurant`, and `driver` modules.

---

## 3. UI Framework

### Primary UI Tools
- **Tailwind CSS** — Utility-first styling approach for rapid UI development.  
- **Shadcn UI** — Pre-built, accessible React components.  
- **Hero Icons** — Modern SVG icon set.  
- **React Hot Toast** — Toast notifications for success/error states.  
- **React Modal** — For dialogs and modals.

### Theme Support
- Fully **responsive** design for all screen sizes.  

---

## 4. API Integration & Auth
- All API calls are handled by a **centralized ApiClient** wrapper for REST communication.  
- It manages:
  - Base URL configuration  
  - Standardized request/response structure  
  - Error handling and logging  
  - Automatic JWT authentication header injection  
- The **Auth Context** provides login/logout logic and tracks authentication state across components.  
- Secure token storage with built-in revalidation on app load.

---

## 5. Real-time & Persistence
- **LocalStorage** is used to persist user sessions and preferences.   
- Caching ensures minimal redundant API calls for static or slow-changing data.

---

## 6. Testing
- **Vitest** for unit and component testing.    
- Mock API responses for reliable, isolated test cases.  
- Continuous Integration setup runs tests automatically on pull requests.

---

## 8. Key Highlights
- Role-based access and navigation  
- Real-time order tracking  
- AI-driven food recommendations  
- Emotion-based analytics for user behavior  
- Restaurant-side analytics and menu OCR  
- Staff coordination and order pipeline tracking  

---

> **Purpose:**  
> This document provides an overview of the frontend technical stack, structure, and conventions to help developers onboard quickly and maintain consistency across the project.



  
