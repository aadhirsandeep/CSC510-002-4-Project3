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
import { CartAddRequest, CartSummary, CartOut, CartAddItem } from './types';

// Cart API Functions
export const cartApi = {
    /**
   * Get cart details
   */
  async getCart(): Promise<{ data?: CartOut; error?: string }> {
    return apiClient.get('/cart');
  },


  /**
   * Add an item to the cart
   */
//   async addToCart(itemData: CartAddRequest): Promise<{ data?: any; error?: string }> {
//     return apiClient.post('/cart/add', itemData);
//   },
  async addToCart(data: CartAddItem): Promise<{ data?: { status: string }; error?: string }> {
    return apiClient.post('/cart/add', data);
  },

  /**
   * Get cart summary with calories and prices
   */
//   async getSummary(): Promise<{ data?: CartSummary; error?: string }> {
//     return apiClient.get<CartSummary>('/cart/summary');
//   },
  async getSummary(): Promise<{ data?: CartSummary; error?: string }> {
    return apiClient.get('/cart/summary');
  },

  /**
   * Update item quantity in cart
   */
  async updateItemQuantity(cartItemId: number, quantity: number): Promise<{ data?: any; error?: string }> {
    return apiClient.put(`/cart/item/${cartItemId}`, { quantity });
  },

  /**
   * Remove an item from cart
   */
  async removeItem(cartItemId: number): Promise<{ data?: { message: string }; error?: string }> {
    return apiClient.delete(`/cart/item/${cartItemId}`);
  },

  /**
   * Clear all items from cart
   */
//   async clearCart(): Promise<{ data?: { message: string }; error?: string }> {
//     return apiClient.delete('/cart/clear');
//   },
  async clearCart(): Promise<{ data?: { status: string }; error?: string }> {
    return apiClient.delete('/cart/clear');
  },

  /**
   * Get detailed cart items
   */
  async getCartItems(): Promise<{ data?: any[]; error?: string }> {
    return apiClient.get('/cart/items');
  },
};

// Export individual functions for convenience
export const {
  getCart,
  addToCart,        // was addItem
  getSummary,
  updateItemQuantity,
  removeItem,
  clearCart,
  getCartItems,
} = cartApi;

