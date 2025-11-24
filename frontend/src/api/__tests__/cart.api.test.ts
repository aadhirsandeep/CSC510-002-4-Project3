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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as cart from '../cart'
import { apiClient } from '../client'

// Helper to create a mocked fetch response
function mockFetchResponse(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => data,
  })
}

describe('cartApi (mixed integration + unit tests)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /* Integration tests: stub global fetch and exercise full request plumbing */
  it('Integration: getCart returns cart data from /cart', async () => {
    const returned = { id: 1, items: [{ id: 10, quantity: 2 }] }
    vi.stubGlobal('fetch' as any, vi.fn(() => mockFetchResponse(returned)))

    const res = await cart.getCart()
    expect(res).toBeDefined()
    expect(res.data).toBeDefined()
    expect((res.data as any)?.items?.length).toBe(1)
  })

  it('Integration: addToCart posts to /cart/add with JSON body', async () => {
    const payload = { item_id: 12, quantity: 3 }
    const returned = { status: 'ok' }

    const fetchMock = vi.fn(async (url: string, opts: any) => {
      expect(url).toContain('/cart/add')
      expect(opts.method).toBe('POST')
      const body = opts?.body ? JSON.parse(opts.body) : {}
      expect(body.item_id).toBe(payload.item_id)
      expect(body.quantity).toBe(payload.quantity)
      return mockFetchResponse(returned)
    })

    vi.stubGlobal('fetch' as any, fetchMock)

    const res = await cart.addToCart(payload as any)
    expect(res.data?.status).toBe('ok')
    expect(fetchMock).toHaveBeenCalled()
  })

  it('Integration: getSummary requests /cart/summary and returns totals', async () => {
    const returned = { total_price: 25.5, total_calories: 1200 }
    vi.stubGlobal('fetch' as any, vi.fn(() => mockFetchResponse(returned)))

    const res = await cart.getSummary()
    expect(res.data?.total_price).toBe(25.5)
  })

  it('Integration: getCartItems returns array of items', async () => {
    const returned = [{ id: 1, name: 'Burger' }]
    vi.stubGlobal('fetch' as any, vi.fn(() => mockFetchResponse(returned)))

    const res = await cart.getCartItems()
    expect(Array.isArray(res.data)).toBe(true)
    expect(res.data?.[0].name).toBe('Burger')
  })

  it('Integration: updateItemQuantity sends PUT to /cart/item/:id', async () => {
    const returned = { success: true }
    const fetchMock = vi.fn(async (url: string, opts: any) => {
      expect(url).toContain('/cart/item/55')
      expect(opts.method).toBe('PUT')
      const body = opts?.body ? JSON.parse(opts.body) : {}
      expect(body.quantity).toBe(4)
      return mockFetchResponse(returned)
    })
    vi.stubGlobal('fetch' as any, fetchMock)

    const res = await cart.updateItemQuantity(55, 4)
    expect(res.data).toBeDefined()
    expect(fetchMock).toHaveBeenCalled()
  })

  it('Integration: removeItem sends DELETE to /cart/item/:id', async () => {
    const returned = { message: 'deleted' }
    const fetchMock = vi.fn(async (url: string, opts: any) => {
      expect(url).toContain('/cart/item/77')
      expect(opts.method).toBe('DELETE')
      return mockFetchResponse(returned)
    })
    vi.stubGlobal('fetch' as any, fetchMock)

    const res = await cart.removeItem(77)
    expect(res.data?.message).toBe('deleted')
    expect(fetchMock).toHaveBeenCalled()
  })

  it('Integration: clearCart sends DELETE to /cart/clear', async () => {
    const returned = { status: 'cleared' }
    const fetchMock = vi.fn(async (url: string, opts: any) => {
      expect(url).toContain('/cart/clear')
      expect(opts.method).toBe('DELETE')
      return mockFetchResponse(returned)
    })
    vi.stubGlobal('fetch' as any, fetchMock)

    const res = await cart.clearCart()
    expect(res.data?.status).toBe('cleared')
  })

  /* Unit tests: spy on apiClient methods to isolate behavior */
  it('Unit: addToCart delegates to apiClient.post with /cart/add', async () => {
    const spy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { status: 'ok' } } as any)
    const payload = { item_id: 2, quantity: 1 }
    const res = await cart.addToCart(payload as any)
    expect(spy).toHaveBeenCalledWith('/cart/add', payload)
    expect(res.data?.status).toBe('ok')
    spy.mockRestore()
  })

  it('Unit: getSummary delegates to apiClient.get with /cart/summary', async () => {
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { total_calories: 500 } } as any)
    const res = await cart.getSummary()
    expect(spy).toHaveBeenCalledWith('/cart/summary')
    expect(res.data?.total_calories).toBe(500)
    spy.mockRestore()
  })

  it('Unit: updateItemQuantity delegates to apiClient.put with correct endpoint', async () => {
    const spy = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { success: true } } as any)
    const res = await cart.updateItemQuantity(99, 2)
    expect(spy).toHaveBeenCalledWith('/cart/item/99', { quantity: 2 })
    expect(res.data?.success).toBe(true)
    spy.mockRestore()
  })

  it('Unit: removeItem delegates to apiClient.delete with correct endpoint', async () => {
    const spy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { message: 'ok' } } as any)
    const res = await cart.removeItem(123)
    expect(spy).toHaveBeenCalledWith('/cart/item/123')
    expect(res.data?.message).toBe('ok')
    spy.mockRestore()
  })

  it('Unit: clearCart delegates to apiClient.delete with /cart/clear', async () => {
    const spy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { status: 'cleared' } } as any)
    const res = await cart.clearCart()
    expect(spy).toHaveBeenCalledWith('/cart/clear')
    expect(res.data?.status).toBe('cleared')
    spy.mockRestore()
  })
})
