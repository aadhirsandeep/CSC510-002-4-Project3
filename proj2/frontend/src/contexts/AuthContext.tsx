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
 * @context AuthContext
 * @description Central authentication and user management context for the application.
 * 
 * Features:
 * - User authentication state management
 * - Login/Register/Logout functionality
 * - Token management (access & refresh tokens)
 * - User role-based access control
 * - Persistent auth state across page reloads
 * - Auto-login for restaurant owners
 * - Error handling and state updates
 * 
 * Methods:
 * - login(credentials): Authenticates user and sets up session
 * - register(userData): Creates new user account
 * - logout(): Clears auth state and tokens
 * - refreshUser(): Updates user data from server
 * - clearError(): Resets error state
 * 
 * Usage:
 * Wrap your app in AuthProvider and use useAuth() hook to access auth state
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, LoginRequest, RegisterRequest, Cafe, CafeCreateRequest } from '../api/types'; // adjust import path
import { apiClient } from '../api/client';
import { TokenManager, isTokenExpired } from '../api/client'; // adjust import path
import { cafeApi } from '../api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<User | null>;
  register: (userData: RegisterRequest) => Promise<User | null>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // ✅ Try loading user and tokens from storage at initialization time
  const storedUser = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  const [state, setState] = useState<AuthState>({
    user: storedUser,
    isAuthenticated: !!storedUser,
    isLoading: false,
    error: null,
  });


  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = TokenManager.getAccessToken();
        if (token) {
          if (token && !isTokenExpired(token)) {
            const response = await apiClient.get<User>('/users/me');
            if (response.data) {
              let userData = response.data;
            
              if (userData.role === 'OWNER') {
                try {
                  const cafeRes = await apiClient.get<Cafe>('/cafes/mine');
                  if (cafeRes.data) {
                    userData = { ...userData, cafe: cafeRes.data };
                  }
                } catch (e) {
                  console.error('⚠️ Failed to load owner cafe:', e);
                }
              }
            
              localStorage.setItem('user', JSON.stringify(userData));
              setState(prev => ({
                ...prev,
                user: userData,
                isAuthenticated: true,
                isLoading: false,
              }));
            }
             else {
              TokenManager.clearTokens();
              setState(prev => ({
                ...prev,
                isAuthenticated: false,
                isLoading: false,
              }));
            }
          } else {
            TokenManager.clearTokens();
            setState(prev => ({
              ...prev,
              isAuthenticated: false,
              isLoading: false,
            }));
          }
        } else {
          setState(prev => ({
            ...prev,
            isAuthenticated: false,
            isLoading: false,
          }));
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          isLoading: false,
          error: 'Authentication check failed',
        }));
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (credentials: LoginRequest): Promise<User | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
  
    try {
      const response = await apiClient.post<{ access_token: string; refresh_token: string; token_type: string }>(
        '/auth/login',
        credentials,
        false
      );
  
      if (response.data) {
        TokenManager.setTokens(response.data.access_token, response.data.refresh_token);
        const userResponse = await apiClient.get<User>('/users/me');
  
        if (userResponse.data) {
          let userData = userResponse.data;
  
          // ✅ If owner, get their cafe
          if (userData.role === 'OWNER') {
            const cafeRes = await apiClient.get<Cafe>('/cafes/mine');
            if (cafeRes.data) {
              userData = { ...userData, cafe: cafeRes.data };
            }
          }

          localStorage.setItem('user', JSON.stringify(userData));
          console.log('✅ Saved user to localStorage');
          console.log('🔍 Read back immediately:', localStorage.getItem('user'));

  
          setState(prev => ({
            ...prev,
            user: userData,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          }));
          // ✅ Persist user in localStorage for reloads
          localStorage.setItem('user', JSON.stringify(userData));

          return userData;
        }
      }

      
  
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: response.error || 'Login failed',
      }));
      return null;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
      return null;
    }
  }, []);
  

  const register = useCallback(async (userData: RegisterRequest): Promise<User | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
  
    try {
      const response = await apiClient.post<User>('/users/register', userData, false);
  
      if (response.data) {
        // ✅ Automatically login after register
        const loggedInUser = await login({
          email: userData.email,
          password: userData.password,
          role: userData.role
        });
  
        // ✅ If registered user is an OWNER, auto-create cafe
        if (loggedInUser?.role === 'OWNER') {
          const cafePayload: CafeCreateRequest = {
            name: userData.name || `${loggedInUser.name}'s Cafe`,
            // prefer address/cuisine passed at registration if available
            address: (userData as any).address || 'Not specified',
            phone: (userData as any).phone || undefined,
            cuisine: (userData as any).cuisine || undefined,
            timings: (userData as any).timings || undefined,
            lat: 0,
            lng: 0,
          };
  
          // 🔹 call via cafesAPI, not apiClient directly
          const { data: newCafe, error } = await cafeApi.createCafe(cafePayload);
  
          if (error) console.error(' Cafe creation failed:', error);
          else if (newCafe) console.log(' Cafe created:', newCafe);
  
          // 🔹 now fetch the updated user (with cafe)
          const { data: updatedUser, error: userError } = await apiClient.get<User>('/users/me');
          if (updatedUser) {
            setState(prev => ({
              ...prev,
              user: updatedUser,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            }));
          }
        }
  
        return loggedInUser;
      }
  
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: response.error || 'Registration failed',
      }));
      return null;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      }));
      return null;
    }
  }, [login]);
  

  const logout = useCallback(() => {
    TokenManager.clearTokens();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    localStorage.removeItem('user');
  }, []);

 


  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get<User>('/users/me');
      if (response.data) {
        setState(prev => ({
          ...prev,
          user: response.data!,
        }));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        clearError,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}