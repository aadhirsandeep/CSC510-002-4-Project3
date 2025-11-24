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
import * as cafe from '../../api/cafes'
import { apiClient, TokenManager } from '../client'

// Helper to mock fetch-like responses
function mockFetchResponse(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => data,
  })
}

describe('cafeApi (mixed integration + unit tests)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /* Integration: using global fetch mock */
  it('Integration: getCafes fetches all cafes', async () => {
    const returned = [{ id: 1, name: 'Coffee Spot' }]
    vi.stubGlobal('fetch' as any, vi.fn(() => mockFetchResponse(returned)))

    const res = await cafe.getCafes()
    expect(res.data?.[0].name).toBe('Coffee Spot')
  })

  it('Integration: getCafes appends search query if provided', async () => {
    const fetchMock = vi.fn((url: string) => {
      expect(url).toContain('/cafes/?q=Latte')
      return mockFetchResponse([{ id: 2, name: 'Latte Land' }])
    })
    vi.stubGlobal('fetch' as any, fetchMock)

    const res = await cafe.getCafes('Latte')
    expect(res.data?.[0].name).toBe('Latte Land')
    expect(fetchMock).toHaveBeenCalled()
  })

  it('Integration: getCafe retrieves a specific cafe', async () => {
    const returned = { id: 5, name: 'Espresso Express' }
    vi.stubGlobal('fetch' as any, vi.fn(() => mockFetchResponse(returned)))

    const res = await cafe.getCafe(5)
    expect(res.data?.name).toBe('Espresso Express')
  })

  it('Integration: uploadMenu sends FormData and auth header', async () => {
    const fakeFile = new File(['dummy'], 'menu.pdf', { type: 'application/pdf' })
    const fakeToken = 'fake-jwt'
    const fakeBase = 'https://api.test'
    const returned = { parsed: true }

    vi.spyOn(TokenManager, 'getAccessToken').mockReturnValue(fakeToken)
    vi.spyOn(TokenManager, 'getBaseURL').mockReturnValue(fakeBase)

    const fetchMock = vi.fn(async (url: string, opts: any) => {
      expect(url).toBe(`${fakeBase}/cafes/7/menu/upload`)
      expect(opts.method).toBe('POST')
      expect(opts.headers.Authorization).toBe(`Bearer ${fakeToken}`)
      expect(opts.body instanceof FormData).toBe(true)
      return mockFetchResponse(returned)
    })
    vi.stubGlobal('fetch' as any, fetchMock)

    const res = await cafe.uploadMenu(7, fakeFile)
    expect(res.data?.parsed).toBe(true)
  })

  it('Integration: uploadMenu returns error on non-ok response', async () => {
    const returned = { detail: 'Bad PDF' }
    vi.spyOn(TokenManager, 'getAccessToken').mockReturnValue('t')
    vi.spyOn(TokenManager, 'getBaseURL').mockReturnValue('https://x')

    vi.stubGlobal('fetch' as any, vi.fn(() => mockFetchResponse(returned, false, 400)))

    const fakeFile = new File(['bad'], 'menu.pdf', { type: 'application/pdf' })
    const res = await cafe.uploadMenu(1, fakeFile)
    expect(res.error).toBe('Bad PDF')
  })

  /* Unit tests: spy on apiClient to isolate delegation */
  it('Unit: getCafes delegates to apiClient.get with /cafes/', async () => {
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] } as any)
    await cafe.getCafes()
    expect(spy).toHaveBeenCalledWith('/cafes/', false)
    spy.mockRestore()
  })

  it('Unit: getCafe delegates to apiClient.get with correct ID', async () => {
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { id: 9 } } as any)
    await cafe.getCafe(9)
    expect(spy).toHaveBeenCalledWith('/cafes/9', false)
    spy.mockRestore()
  })

  it('Unit: createCafe delegates to apiClient.post', async () => {
    const payload = { name: 'New Cafe' }
    const spy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 1 } } as any)
    await cafe.createCafe(payload as any)
    expect(spy).toHaveBeenCalledWith('/cafes/', payload)
    spy.mockRestore()
  })

  it('Unit: updateCafe delegates to apiClient.put', async () => {
    const updates = { name: 'Updated Cafe' }
    const spy = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: updates } as any)
    await cafe.updateCafe(5, updates)
    expect(spy).toHaveBeenCalledWith('/cafes/5', updates)
    spy.mockRestore()
  })

  it('Unit: deleteCafe delegates to apiClient.delete', async () => {
    const spy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { message: 'deleted' } } as any)
    await cafe.deleteCafe(3)
    expect(spy).toHaveBeenCalledWith('/cafes/3')
    spy.mockRestore()
  })
})
