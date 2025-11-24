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

import { describe, it, expect, vi } from 'vitest'
import { apiClient } from '../client'
import { analyticsApi, getCafeAnalytics } from '../analytics'

// Mock apiClient.get before each test
vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

describe('analyticsApi', () => {
  it('calls apiClient.get with correct endpoint', async () => {
    const mockData = {
      orders_per_day: [['2025-11-01', 10]],
      top_items: [['Latte', 5]],
      revenue_per_day: [['2025-11-01', 40.0]],
    }

    // Mock resolved value
    ;(apiClient.get as any).mockResolvedValue({ data: mockData })

    const res = await getCafeAnalytics(7)

    expect(apiClient.get).toHaveBeenCalledWith('/analytics/cafe/7')
    expect(res.data).toEqual(mockData)
  })
})
