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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '../client'
import { 
  ordersApi, 
  placeOrder, 
  getMyOrders, 
  getOrder, 
  cancelOrder, 
  getCafeOrders, 
  updateOrderStatus, 
  trackOrder 
} from '../orders'

// Mock apiClient methods
vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ordersApi', () => {

  it('placeOrder POSTs to /orders/place', async () => {
    const orderData = { cafe_id: 1, items: [1, 2], payment_method: 'card' }
    const mockResponse = { data: { id: 10, total: 25 } }
    ;(apiClient.post as any).mockResolvedValue(mockResponse)

    const res = await placeOrder(orderData)
    expect(apiClient.post).toHaveBeenCalledWith('/orders/place', orderData)
    expect(res).toEqual(mockResponse)
  })

  it('placeOrder returns error if apiClient rejects', async () => {
    const orderData = { cafe_id: 1 }
    const errorMsg = 'Network error'
    ;(apiClient.post as any).mockResolvedValue({ error: errorMsg })

    const res = await placeOrder(orderData)
    expect(res.error).toBe(errorMsg)
  })

  it('getMyOrders GETs /orders/my', async () => {
    const mockOrders = [{ id: 1 }, { id: 2 }]
    ;(apiClient.get as any).mockResolvedValue({ data: mockOrders })

    const res = await getMyOrders()
    expect(apiClient.get).toHaveBeenCalledWith('/orders/my')
    expect(res.data).toEqual(mockOrders)
  })

  it('getOrder GETs /orders/:id/summary', async () => {
    const mockOrder = { id: 42, total: 15, items: [], total_calories: 0 }
    ;(apiClient.get as any).mockResolvedValue({ data: mockOrder })
  
    const res = await getOrder(42)
    expect(apiClient.get).toHaveBeenCalledWith('/orders/42/summary')  // Changed from '/orders/42'
    expect(res.data?.id).toBe(42)
  })

  it('getOrder returns error if apiClient returns error', async () => {
    ;(apiClient.get as any).mockResolvedValue({ error: 'Not found' })
    const res = await getOrder(99)
    expect(res.error).toBe('Not found')
  })

  it('cancelOrder POSTs to /orders/:id/cancel', async () => {
    const mockOrder = { id: 55, status: 'cancelled' }
    ;(apiClient.post as any).mockResolvedValue({ data: mockOrder })

    const res = await cancelOrder(55)
    expect(apiClient.post).toHaveBeenCalledWith('/orders/55/cancel')
    expect(res.data?.status).toBe('cancelled')
  })

  it('getCafeOrders GETs /orders/:cafeId', async () => {
    const mockOrders = [{ id: 1 }, { id: 2 }]
    ;(apiClient.get as any).mockResolvedValue({ data: mockOrders })

    const res = await getCafeOrders(3)
    expect(apiClient.get).toHaveBeenCalledWith('/orders/3')
    expect(res.data?.length).toBe(2)
  })

  it('getCafeOrders includes status query param when provided', async () => {
    const mockOrders = [{ id: 3, status: 'pending' }]
    ;(apiClient.get as any).mockResolvedValue({ data: mockOrders })

    const res = await getCafeOrders(4, 'pending' as any)
    expect(apiClient.get).toHaveBeenCalledWith('/orders/4?status=pending')
    expect(res.data?.[0].status).toBe('pending')
  })

  it('updateOrderStatus POSTs to /orders/:id/status?new_status=status', async () => {
    const mockUpdated = { id: 9, status: 'completed' }
    ;(apiClient.post as any).mockResolvedValue({ data: mockUpdated })

    const res = await updateOrderStatus(9, 'completed' as any)
    expect(apiClient.post).toHaveBeenCalledWith('/orders/9/status?new_status=completed', {})
    expect(res.data?.status).toBe('completed')
  })

  it('updateOrderStatus accepts empty body object', async () => {
    const mockUpdated = { id: 12, status: 'ready' }
    ;(apiClient.post as any).mockResolvedValue({ data: mockUpdated })

    const res = await updateOrderStatus(12, 'ready' as any)
    expect(apiClient.post).toHaveBeenCalledWith('/orders/12/status?new_status=ready', {})
    expect(res.data?.status).toBe('ready')
  })

  it('trackOrder GETs /orders/:id/track', async () => {
    const mockTrack = { status: 'in_transit' }
    ;(apiClient.get as any).mockResolvedValue({ data: mockTrack })

    const res = await trackOrder(77)
    expect(apiClient.get).toHaveBeenCalledWith('/orders/77/track')
    expect(res.data?.status).toBe('in_transit')
  })

  it('trackOrder returns error if apiClient fails', async () => {
    ;(apiClient.get as any).mockResolvedValue({ error: 'Server error' })
    const res = await trackOrder(88)
    expect(res.error).toBe('Server error')
  })

})
