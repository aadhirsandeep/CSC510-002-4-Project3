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

import { apiClient, TokenManager } from './client';
import { Cafe, CafeCreateRequest } from './types';

// Cafe API Functions
export const cafeApi = {
  /**
   * Get all active cafes
   */
  async getCafes(searchTerm?: string): Promise<{ data?: Cafe[]; error?: string }> {
    const endpoint = searchTerm ? `/cafes/?q=${encodeURIComponent(searchTerm)}` : '/cafes/';
    return apiClient.get<Cafe[]>(endpoint, false); // Public endpoint
  },

  /**
   * Get a specific cafe by ID
   */
  async getCafe(cafeId: number): Promise<{ data?: Cafe; error?: string }> {
    return apiClient.get<Cafe>(`/cafes/${cafeId}`, false); // Public endpoint
  },

  /**
   * Create a new cafe (Owner/Admin only)
   */
  async createCafe(cafeData: CafeCreateRequest): Promise<{ data?: Cafe; error?: string }> {
    return apiClient.post<Cafe>('/cafes/', cafeData);
  },

  /**
   * Update a cafe (Owner/Admin only)
   */
  async updateCafe(cafeId: number, updates: Partial<CafeCreateRequest>): Promise<{ data?: Cafe; error?: string }> {
    return apiClient.put<Cafe>(`/cafes/${cafeId}`, updates);
  },

  /**
   * Delete a cafe (Admin only)
   */
  async deleteCafe(cafeId: number): Promise<{ data?: { message: string }; error?: string }> {
    return apiClient.delete(`/cafes/${cafeId}`);
  },

  /**
   * Upload menu PDF for OCR processing (Owner/Admin only)
   */
  async uploadMenu(cafeId: number, file: File): Promise<{ data?: any; error?: string }> {
    const formData = new FormData();
    formData.append('pdf', file);

    const token = TokenManager.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${TokenManager.getBaseURL()}/cafes/${cafeId}/menu/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || `HTTP ${response.status}` };
      }

      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Upload failed' };
    }
  },
};



// Export individual functions for convenience
export const {
  getCafes,
  getCafe,
  createCafe,
  updateCafe,
  deleteCafe,
  uploadMenu,
} = cafeApi;
