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

import { ApiResponse, ApiError, RequestOptions } from './types';

// API Configuration
const API_BASE_URL = 'http://127.0.0.1:8000';

// Token Management
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'cafe_calories_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'cafe_calories_refresh_token';

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getBaseURL(): string {
    return API_BASE_URL;
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

// Base API Client
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      requiresAuth = true
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add auth header if required
    if (requiresAuth) {
      const token = TokenManager.getAccessToken();
      if (token) {
        requestHeaders.Authorization = `Bearer ${token}`;
      }
    }

    try {
      // debug log request
      // eslint-disable-next-line no-console
      console.debug('[api] Request:', method, url, { headers: requestHeaders, body });
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      // debug log response
      // eslint-disable-next-line no-console
      console.debug('[api] Response:', method, url, response.status, data);

      if (!response.ok) {
        const error: ApiError = {
          detail: data.detail || `HTTP ${response.status}: ${response.statusText}`,
          status_code: response.status,
        };
        // eslint-disable-next-line no-console
        console.error('[api] Error:', method, url, error);
        return { error: error.detail };
      }

      return { data };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[api] Network error:', method, url, error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { error: errorMessage };
    }
  }

  // Public methods for different HTTP verbs
  async get<T>(endpoint: string, requiresAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET', requiresAuth });
  }

  async post<T>(
    endpoint: string,
    body?: any,
    requiresAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'POST', body, requiresAuth });
  }

  async put<T>(
    endpoint: string,
    body?: any,
    requiresAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'PUT', body, requiresAuth });
  }

  async delete<T>(endpoint: string, requiresAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE', requiresAuth });
  }

  async patch<T>(
    endpoint: string,
    body?: any,
    requiresAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'PATCH', body, requiresAuth });
  }
}

// Create and export the API client instance
export const apiClient = new ApiClient();

// Export token manager for use in components
export { TokenManager };

// Utility function to decode JWT token (client-side only)
export function decodeToken(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

// Utility function to check if token is expired
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

// Utility function to get current user info from token
export function getCurrentUserFromToken(): { uid: number; email: string; role: string } | null {
  const token = TokenManager.getAccessToken();
  if (!token || isTokenExpired(token)) return null;
  
  const decoded = decodeToken(token);
  return decoded ? { uid: decoded.uid, email: decoded.sub, role: decoded.role } : null;
}

