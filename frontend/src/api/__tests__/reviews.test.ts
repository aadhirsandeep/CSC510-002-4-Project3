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

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { apiClient } from '../client'
import { reviewsApi } from '../reviews'
import type { Review, ReviewSummary, CreateReviewInput } from '../types'

// Mock the apiClient module
vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('reviewsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls GET /cafes/{cafe_id}/reviews correctly', async () => {
    const mockResponse = {
      data: [
        {
          id: 1,
          cafe_id: 3,
          user_id: 7,
          rating: 5,
          text: 'Amazing coffee!',
          created_at: '2025-11-05T12:00:00Z',
        },
      ] as Review[],
    }

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse)

    const cafeId = 3
    const result = await reviewsApi.getReviews(cafeId)

    expect(apiClient.get).toHaveBeenCalledWith(`/cafes/${cafeId}/reviews`)
    expect(result).toEqual(mockResponse)
  })

  it('calls GET /cafes/{cafe_id}/reviews/summary correctly (without force)', async () => {
    const mockSummary = {
      data: { summary: 'Very positive', review_count: 20, cached: true } as ReviewSummary,
    }
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockSummary)

    const cafeId = 5
    const result = await reviewsApi.getReviewSummary(cafeId)

    expect(apiClient.get).toHaveBeenCalledWith(`/cafes/${cafeId}/reviews/summary`)
    expect(result).toEqual(mockSummary)
  })

  it('calls GET /cafes/{cafe_id}/reviews/summary?force=true when force=true', async () => {
    const mockSummary = {
      data: { summary: 'Fresh data', review_count: 5, cached: false } as ReviewSummary,
    }
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockSummary)

    const cafeId = 10
    await reviewsApi.getReviewSummary(cafeId, true)

    expect(apiClient.get).toHaveBeenCalledWith(`/cafes/${cafeId}/reviews/summary?force=true`)
  })

  it('calls POST /cafes/{cafe_id}/reviews correctly', async () => {
    const mockReview: Review = {
      id: 99,
      cafe_id: 1,
      user_id: 12,
      rating: 4,
      text: 'Nice pastries but slow service',
      created_at: '2025-11-05T15:00:00Z',
    }

    const mockResponse = { data: mockReview }
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse)

    const cafeId = 1
    const input: CreateReviewInput = {
      cafe_id: cafeId,
      user_id: 12,
      rating: 4,
      text: 'Nice pastries but slow service',
    }

    const result = await reviewsApi.createReview(cafeId, input)

    expect(apiClient.post).toHaveBeenCalledWith(`/cafes/${cafeId}/reviews`, input)
    expect(result).toEqual(mockResponse)
  })
})
