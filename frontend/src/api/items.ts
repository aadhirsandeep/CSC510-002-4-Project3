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
import { MenuItem, ItemCreateRequest } from './types';

// Items API Functions
export const itemsApi = {
  /**
   * List all items across all cafes
   */
  async listAll(): Promise<{ data?: MenuItem[]; error?: string }> {
    return apiClient.get<MenuItem[]>('/items', false); // Public endpoint
  },

  /**
   * Get all menu items from a specific cafe
   */
  async getCafeItems(cafeId: number, searchTerm?: string): Promise<{ data?: MenuItem[]; error?: string }> {
    const endpoint = searchTerm 
      ? `/items/${cafeId}?q=${encodeURIComponent(searchTerm)}` 
      : `/items/${cafeId}`;
    return apiClient.get<MenuItem[]>(endpoint, false); // Public endpoint
  },

  /**
   * Get a specific menu item by ID
   */
  async getItem(itemId: number): Promise<{ data?: MenuItem; error?: string }> {
    return apiClient.get<MenuItem>(`/items/${itemId}`, false);
  },

  /**
   * Add a new menu item to a cafe (Owner/Admin only)
   */
  async addMenuItem(cafeId: number, itemData: ItemCreateRequest): Promise<{ data?: MenuItem; error?: string }> {
    return apiClient.post<MenuItem>(`/items/${cafeId}`, itemData);
  },

  /**
   * Update a menu item (Owner/Admin only)
   */
  async updateItem(itemId: number, updates: Partial<ItemCreateRequest>): Promise<{ data?: MenuItem; error?: string }> {
    return apiClient.put<MenuItem>(`/items/${itemId}`, updates);
  },

  /**
   * Delete a menu item (Owner/Admin only)
   */
  async deleteItem(itemId: number): Promise<{ data?: { status: string }; error?: string }> {
    return apiClient.delete(`/items/${itemId}`);
  },

  /**
   * Replace entire menu with extracted items from PDF (Owner/Admin only)
   */
  async replaceMenu(cafeId: number, items: ItemCreateRequest[]): Promise<{ data?: { success: boolean; items_created: number }; error?: string }> {
    return apiClient.put<{ success: boolean; items_created: number }>(`/cafes/${cafeId}/menu`, items);
  },
};

// Export individual functions for convenience
export const {
  listAll,
  getCafeItems,
  getItem,
  addMenuItem,
  updateItem,
  deleteItem,
  replaceMenu,
} = itemsApi;