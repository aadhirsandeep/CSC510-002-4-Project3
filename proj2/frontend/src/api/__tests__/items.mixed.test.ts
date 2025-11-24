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
import * as items from '../items'
import { apiClient } from '../client'

function mockFetchResponse(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => data,
  })
}

describe('itemsApi (mixed integration + unit tests)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Integration tests
  it('Integration: listAll should fetch /items and return array', async () => {
    const returned = [{ id: 1, name: 'Burger' }]
    vi.stubGlobal('fetch' as any, vi.fn(() => mockFetchResponse(returned)))

    const res = await items.listAll()
    expect(res.data).toBeDefined()
    expect(Array.isArray(res.data)).toBe(true)
    expect(res.data?.[0].name).toBe('Burger')
  })

  it('Integration: getCafeItems includes encoded search query when provided', async () => {
    const returned = [{ id: 2, name: 'Pizza' }]
    const fetchMock = vi.fn(async (url: string, opts: any) => {
      expect(url).toContain('/items/7')
      expect(url).toContain('?q=pepperoni')
      return mockFetchResponse(returned)
    })
    vi.stubGlobal('fetch' as any, fetchMock)

    const res = await items.getCafeItems(7, 'pepperoni')
    expect(res.data?.[0].name).toBe('Pizza')
    expect(fetchMock).toHaveBeenCalled()
  })

  it('Integration: getItem requests /items/item/:id', async () => {
    const returned = { id: 9, name: 'Sushi' }
    
    
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: returned } as any)
  
    const res = await items.getItem(9)
    expect(spy).toHaveBeenCalledWith('/items/9', false)  // Note: endpoint is /items/9, not /items/item/9
    expect(res.data?.id).toBe(9)
    expect(res.data?.name).toBe('Sushi')
    
    spy.mockRestore()
  })

  it('Integration: addMenuItem POSTS to /items/:cafeId with JSON body', async () => {
    const payload = { name: 'Taco', price: 5 }
    const returned = { id: 11, ...payload }

    const fetchMock = vi.fn(async (url: string, opts: any) => {
      expect(url).toContain('/items/3')
      expect(opts.method).toBe('POST')
      const body = opts?.body ? JSON.parse(opts.body) : {}
      expect(body.name).toBe(payload.name)
      return mockFetchResponse(returned)
    })
    vi.stubGlobal('fetch' as any, fetchMock)

    const res = await items.addMenuItem(3, payload as any)
    expect(res.data?.id).toBe(11)
    expect(fetchMock).toHaveBeenCalled()
  })

  

  // Unit tests (spy on apiClient methods)
  it('Unit: listAll calls apiClient.get with /items and requiresAuth=false', async () => {
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [{ id: 1 }] } as any)
    const res = await items.listAll()
    expect(spy).toHaveBeenCalledWith('/items', false)
    expect(res.data?.[0].id).toBe(1)
    spy.mockRestore()
  })

  it('Unit: updateItem calls apiClient.put with correct endpoint', async () => {
    const spy = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { id: 20 } } as any)
    const res = await items.updateItem(20, { price: 9 })
    expect(spy).toHaveBeenCalledWith('/items/20', { price: 9 })  // Changed from '/items/item/20'
    expect(res.data?.id).toBe(20)
    spy.mockRestore()
  })

  it('Unit: deleteItem calls apiClient.delete with correct endpoint', async () => {
    const spy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { status: 'deleted' } } as any)  // Changed message to status
    const res = await items.deleteItem(30)
    expect(spy).toHaveBeenCalledWith('/items/30')  // Changed from '/items/item/30'
    expect(res.data?.status).toBe('deleted')
    spy.mockRestore()
  })
})
