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

import { apiClient } from './client';

export interface DriverLoginRequest {
  email: string;
  password: string;
}

export interface DriverLocationIn {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface AssignedOrderOut {
  id: number;
  status: string;
  // Add other order properties as needed
}

export const driversApi = {
  // Authentication
  async login(data: DriverLoginRequest) {
    return apiClient.post<{ access_token: string; refresh_token: string }>('/drivers/login', data);
  },

  async register(data: { email: string; password: string; name: string }) {
    return apiClient.post('/drivers/register', data);
  },

  // Driver Profile
  async getCurrentDriver() {
    return apiClient.get('/drivers/me');
  },

  // Orders
  async getAssignedOrders(driverId: number) {
    return apiClient.get<AssignedOrderOut[]>(`/drivers/${driverId}/assigned-orders`);
  },

  async pickupOrder(driverId: number, orderId: number) {
    return apiClient.post<AssignedOrderOut>(`/drivers/${driverId}/orders/${orderId}/pickup`);
  },

  async deliverOrder(driverId: number, orderId: number) {
  // Use the dedicated deliver endpoint (no body) to match backend pickup flow
  return apiClient.post<AssignedOrderOut>(`/drivers/${driverId}/orders/${orderId}/deliver`);
  },

  // Location
  async updateLocation(driverId: number, location: DriverLocationIn) {
    return apiClient.post(`/drivers/${driverId}/location`, location);
  },

  // WebSocket connection
  getWebSocketUrl(driverId: number) {
    return `ws://${window.location.host}/drivers/driver/${driverId}/ws`;
  }
};