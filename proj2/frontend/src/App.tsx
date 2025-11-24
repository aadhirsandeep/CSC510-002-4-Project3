/**
 * Copyright (c) 2025 Group 2
 * All rights reserved.
 * 
 * This project and its source code are the property of Group 2:
 * - Aryan Tapkire
 * - Dilip Irala Narasimhareddy
 * - Sachi Vyas
 * - Supraj Gijre
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './contexts/AuthContext';

// Components
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import UserDashboard from './components/user/UserDashboard';
import RestaurantList from './components/user/RestaurantList';
import MenuPage from './components/user/MenuPage';
import CartPage from './components/user/CartPage';
import OrderHistory from './components/user/OrderHistory';
import OrderTracking from './components/user/OrderTracking';
import CalorieSettings from './components/user/CalorieSettings';
import AIFoodRecommendations from './components/user/AIFoodRecommendations';
import EmotionalInsights from './components/user/EmotionalInsights';
import RestaurantReviews from './components/user/RestaurantReviews';
import RestaurantDashboard from './components/restaurant/RestaurantDashboard';
import ReviewInsights from './components/restaurant/ReviewInsights';
import MenuManagement from './components/restaurant/MenuManagement';
import OrderManagement from './components/restaurant/OrderManagement';
import StaffManagement from './components/restaurant/StaffManagement';
import Analytics from './components/restaurant/Analytics';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import ApplicationPoster from './components/poster/ApplicationPoster';
import DriverDashboard from './components/driver/DriverDashboard';
import ContactUs from './components/layout/ContactUs';


export default function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="container mx-auto px-4 py-6">
    <div className="min-h-screen bg-background">
      {/* Header appears for all logged-in users */}
      {isAuthenticated && user && <Header user={user} logout={logout} />}

      {/* Navigation only for USER role */}
      {isAuthenticated && user?.role === 'USER' && <Navigation user={user} />}

      <Toaster position="top-center" />
      
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* USER ROUTES */}
        {isAuthenticated && user?.role === 'USER' && (
          <>
            <Route path="/dashboard" element={<UserDashboard user={user} />} />
            <Route path="/restaurants" element={<RestaurantList />} />
            <Route path="/menu/:restaurantId" element={<MenuPage />} />
            <Route path="/cart" element={<CartPage user={user} />} />
            <Route path="/orders" element={<OrderHistory user={user} />} />
            <Route path="/orders/:orderId/track" element={<OrderTracking />} />
            <Route path="/calories" element={<CalorieSettings user={user} />} />
            <Route path="/ai-recommendations" element={<AIFoodRecommendations user={user} />} />
            {/*<Route path="/emotions" element={<EmotionalInsights />} /> */}
            <Route path="/reviews" element={<RestaurantReviews />} />
            <Route path="/poster" element={<ApplicationPoster />} />
            <Route path="/contact" element={<ContactUs />} />
          </>
        )}

        {/* OWNER/STAFF ROUTES */}
        {isAuthenticated && user?.role === 'OWNER' && (
          <>
            <Route path="/restaurant/dashboard" element={<RestaurantDashboard />} />
            <Route path="/restaurant/menu" element={<MenuManagement/>} />
            <Route path="/restaurant/orders" element={<OrderManagement user={user} />} />
            <Route path="/restaurant/reviews" element={<ReviewInsights cafeId={user?.cafe?.id!} />} />
            <Route path="/restaurant/analytics" element={<Analytics/>} />
            <Route path="/contact" element={<ContactUs />} />
          </>
        )}

        {/* DRIVER ROUTES */}
        {isAuthenticated && user?.role === 'DRIVER' && (
          <>
            <Route path="/driver/dashboard" element={<DriverDashboard user={user} />} />
            <Route path="/contact" element={<ContactUs />} />
          </>
        )}

        {/* ADMIN ROUTES */}
        {isAuthenticated && user?.role === 'OWNER' && (
          <>
            <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
          </>
        )}

        {/* DEFAULT / FALLBACK */}
        <Route
          path="*"
          element={
            isAuthenticated && user ? (
              <Navigate
                to={
                  user.role === 'USER'
                    ? '/dashboard'
                    : user.role === 'OWNER'
                    ? '/restaurant/dashboard'
                    : user.role === 'DRIVER'
                    ? '/driver/dashboard'
                    : '/login' // fallback if role is somehow unknown
                }
                replace
              />
            ) : (
              <LoginPage />
            )
          }
        />

      </Routes>
      
    </div>
    </main>
  );
}