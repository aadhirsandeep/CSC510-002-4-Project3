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
import { apiClient, TokenManager, decodeToken, isTokenExpired, getCurrentUserFromToken } from '../client'

// Helper to create a mocked fetch response
function mockFetchResponse(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => data,
  })
}

// Helper to build a simple JWT-like token (header.payload.sig) with base64url encoding
function buildJwt(payload: Record<string, any>) {
  const header = { alg: 'none', typ: 'JWT' }

  const toBase64Url = (obj: any) => {
    const str = JSON.stringify(obj)
    let base64 = ''
    const G: any = globalThis
    if (typeof G.Buffer !== 'undefined' && typeof G.Buffer.from === 'function') {
      // Node environment
      base64 = G.Buffer.from(str).toString('base64')
    } else if (typeof btoa === 'function') {
      // Browser / jsdom
      base64 = btoa(unescape(encodeURIComponent(str)))
    } else {
      // No encoder available in this environment
      base64 = ''
    }
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  }

  const h = toBase64Url(header)
  const p = toBase64Url(payload)
  return `${h}.${p}.signature`
}

describe('ApiClient integration+unit tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    TokenManager.clearTokens()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    TokenManager.clearTokens()
    localStorage.clear()
  })

  it('Integration: GET without auth should not include Authorization header', async () => {
    const returned = { ok: true }
    const fetchMock = vi.fn(async (url: string, opts: any) => {
      expect(url).toContain('/public')
      expect(opts.headers.Authorization).toBeUndefined()
      return mockFetchResponse(returned)
    })
    vi.stubGlobal('fetch' as any, fetchMock)

    const res = await apiClient.get('/public', false)
    expect(res.data).toBeTruthy()
    expect(fetchMock).toHaveBeenCalled()
  })

  it('Integration: GET with auth should include Authorization header when token present', async () => {
    const returned = { secure: true }
    TokenManager.setTokens('access-abc', 'refresh-xyz')

    const fetchMock = vi.fn(async (url: string, opts: any) => {
      expect(opts.headers.Authorization).toBe('Bearer access-abc')
      return mockFetchResponse(returned)
    })
    vi.stubGlobal('fetch' as any, fetchMock)

    const res = await apiClient.get('/secure', true)
  expect((res.data as any)?.secure).toBe(true)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('Integration: POST sends JSON body and returns parsed response', async () => {
    const payload = { name: 'Cafe' }
    const returned = { id: 10, name: 'Cafe' }

    const fetchMock = vi.fn(async (url: string, opts: any) => {
      expect(url).toContain('/cafes/')
      expect(opts.method).toBe('POST')
      const body = opts?.body ? JSON.parse(opts.body) : {}
      expect(body.name).toBe(payload.name)
      return mockFetchResponse(returned)
    })
    vi.stubGlobal('fetch' as any, fetchMock)

    const res = await apiClient.post('/cafes/', payload, false)
  expect((res.data as any)?.id).toBe(10)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('Integration: handles non-ok response with error message', async () => {
    const fetchMock = vi.fn(async () => mockFetchResponse({ detail: 'bad request' }, false, 400))
    vi.stubGlobal('fetch' as any, fetchMock)

    const res = await apiClient.get('/bad', false)
    expect(res.error).toBeDefined()
    expect(typeof res.error).toBe('string')
  })

  it('Unit: TokenManager set/get/clear works with localStorage', () => {
    TokenManager.setTokens('tok-a', 'tok-b')
    expect(TokenManager.getAccessToken()).toBe('tok-a')
    expect(TokenManager.getRefreshToken()).toBe('tok-b')
    expect(TokenManager.isAuthenticated()).toBe(true)

    TokenManager.clearTokens()
    expect(TokenManager.getAccessToken()).toBeNull()
    expect(TokenManager.getRefreshToken()).toBeNull()
    expect(TokenManager.isAuthenticated()).toBe(false)
  })

  it('Unit: decodeToken and getCurrentUserFromToken with valid token', () => {
    const payload = {
      uid: 42,
      sub: 'me@example.com',
      role: 'USER',
      exp: Math.floor(Date.now() / 1000) + 60,
    }
    const token = buildJwt(payload)
    const decoded = decodeToken(token as any)
    expect(decoded).toBeDefined()
    expect(decoded.uid).toBe(42)

    TokenManager.setTokens(token, 'r')
    const user = getCurrentUserFromToken()
    expect(user).toEqual({ uid: 42, email: 'me@example.com', role: 'USER' })
  })

  it('Integration: handles fetch throwing network error', async () => {
    vi.stubGlobal('fetch' as any, vi.fn(() => { throw new Error('Network fail') }))
    const res = await apiClient.get('/fail', false)
    expect(res.error).toBe('Network fail')
  })
  

  it('Unit: isTokenExpired returns true for past exp and false for future exp', () => {
    const past = { exp: Math.floor(Date.now() / 1000) - 10 }
    const future = { exp: Math.floor(Date.now() / 1000) + 1000 }
    const pastToken = buildJwt(past)
    const futureToken = buildJwt(future)

    expect(isTokenExpired(pastToken as any)).toBe(true)
    expect(isTokenExpired(futureToken as any)).toBe(false)
  })
})
