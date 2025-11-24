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

// src/api/analytics.ts
// Mirrors analytics.py without adding endpoints or fields.
// Endpoint: GET /analytics/cafe/{cafe_id}

import { apiClient } from './client';

export type DateCountTuple = [dateISO: string, count: number];
export type NameCountTuple = [name: string, count: number];
export type DateRevenueTuple = [dateISO: string, sum: number];

export interface CafeAnalytics {
  orders_per_day: DateCountTuple[];
  top_items: NameCountTuple[];
  revenue_per_day: DateRevenueTuple[];
}

export const analyticsApi = {
  /** GET /analytics/cafe/{cafe_id} */
  getCafeAnalytics: (cafeId: number) =>
    apiClient.get<CafeAnalytics>(`/analytics/cafe/${cafeId}`),
};

// Named export (optional)
export const { getCafeAnalytics } = analyticsApi;
