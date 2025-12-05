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
import { Order, PlaceOrderRequest, OrderStatus, OrderSummary, WaitTimeEstimate, SetPrepTimeRequest } from './types';

// Orders API Functions
export const ordersApi = {
  /**
   * Place an order from current cart
   */
  async placeOrder(orderData: PlaceOrderRequest): Promise<{ data?: Order; error?: string }> {
    return apiClient.post<Order>('/orders/place', orderData);
  },

  /**
   * Get user's orders
   */
  async getMyOrders(): Promise<{ data?: Order[]; error?: string }> {
    return apiClient.get<Order[]>('/orders/my');
  },

  /**
 * Get order summary with full details (items, driver info, etc.)
 */
  async getOrderSummary(orderId: number): Promise<{ data?: OrderSummary; error?: string }> {
    return apiClient.get<OrderSummary>(`/orders/${orderId}/summary`);
  },

  /**
   * Get a specific order by ID
   */
  async getOrder(orderId: number): Promise<{ data?: Order; error?: string }> {
    // Use the summary endpoint which includes item-level details
    return apiClient.get<any>(`/orders/${orderId}/summary`);
  },

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: number): Promise<{ data?: Order; error?: string }> {
    return apiClient.post<Order>(`/orders/${orderId}/cancel`);
  },

  /**
   * Get orders for a specific cafe (Staff/Owner only)
   */
  async getCafeOrders(cafeId: number, status?: OrderStatus): Promise<{ data?: Order[]; error?: string }> {
    const endpoint = status 
      ? `/orders/${cafeId}?status=${status}` 
      : `/orders/${cafeId}`;
    return apiClient.get<Order[]>(endpoint);
  },

  /**
   * Update order status (Staff/Owner only)
   */
  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<{ data?: Order; error?: string }> {
    // ✅ Send status as query parameter, not body
    return apiClient.post<Order>(`/orders/${orderId}/status?new_status=${status}`, {});
  },

  /**
   * Get wait time estimate for an order
   */
  async getWaitTime(orderId: number): Promise<{ data?: WaitTimeEstimate; error?: string }> {
    return apiClient.get<WaitTimeEstimate>(`/orders/${orderId}/wait-time`);
  },

  /**
   * Set estimated preparation time for an order (Staff/Owner only)
   */
  async setPrepTime(orderId: number, prepMinutes: number): Promise<{ data?: Order; error?: string }> {
    const body: SetPrepTimeRequest = { estimated_prep_minutes: prepMinutes };
    return apiClient.patch<Order>(`/orders/${orderId}/prep-time`, body);
  },
  
  /**
   * Get order tracking information
   */
  async trackOrder(orderId: number): Promise<{ data?: any; error?: string }> {
    return apiClient.get(`/orders/${orderId}/track`);
  },
};

// Export individual functions for convenience
export const {
  placeOrder,
  getMyOrders,
  getOrder,
  getOrderSummary,
  cancelOrder,
  getCafeOrders,
  updateOrderStatus,
  getWaitTime,
  setPrepTime,
  trackOrder,
} = ordersApi;

