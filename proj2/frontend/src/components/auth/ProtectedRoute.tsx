/**
 * Copyright (c) 2025 Group 2
 * All rights reserved.
 * 
 * This project and its source code are the property of Group 2:
 * - Aryan Tapkire
 * - Dilip Irala Narasimhareddy
 * - Sachi Vyas
 * - Supraj Gijre
 * 
 * @component ProtectedRoute
 * @description Route protection component for authenticated access control.
 * Features:
 * - Authentication state verification
 * - Role-based access control
 * - Redirection to login for unauthenticated users
 * - Loading state handling during auth checks
 * - Path-based authorization rules
 * - Token expiration handling
 * 
 * Wraps protected routes to ensure only authenticated users
 * with appropriate roles can access them.
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'USER' | 'OWNER' | 'DRIVER';
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  fallbackPath = '/login',
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole && user?.role !== requiredRole) {
    // Redirect to appropriate page based on user role
    const roleRedirects: Record<string, string> = {
      USER: '/dashboard',
      OWNER: '/restaurant/dashboard',
      DRIVER: '/driver/dashboard',
      // ADMIN: '/admin/dashboard',
    };
    
    const redirectPath = roleRedirects[user?.role || 'USER'] || '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

// Convenience components for different role requirements
export const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="USER">{children}</ProtectedRoute>
);

export const OwnerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="OWNER">{children}</ProtectedRoute>
);

export const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="OWNER">{children}</ProtectedRoute>
);

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="OWNER">{children}</ProtectedRoute>
);

// Component for role-based conditional rendering
interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ('USER' | 'OWNER' | 'DRIVER')[];
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback = null,
}) => {
  const { user } = useAuth();
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

