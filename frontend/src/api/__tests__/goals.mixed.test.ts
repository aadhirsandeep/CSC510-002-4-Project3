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
import * as goals from '../goals'
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

describe('goalsApi (mixed integration + unit tests)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /* Integration tests */
  it('Integration: setGoal posts payload to /goals/set and returns created goal', async () => {
    const payload = { target_calories: 2100, start_date: '2025-10-31' }
    const returned = { id: 1, ...payload }

    const fetchMock = vi.fn(async (url: string, opts: any) => {
      expect(url).toContain('/goals/set')
      expect(opts.method).toBe('POST')
      const body = opts?.body ? JSON.parse(opts.body) : {}
      expect(body.target_calories).toBe(payload.target_calories)
      return mockFetchResponse(returned)
    })

    vi.stubGlobal('fetch' as any, fetchMock)

    const res = await goals.setGoal(payload as any)
    expect(res.data?.target_calories).toBe(2100)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('Integration: getCurrentGoals returns an array of goals', async () => {
    const returned = [{ id: 1, target_calories: 2000, start_date: '2025-10-01' }]
    vi.stubGlobal('fetch' as any, vi.fn(() => mockFetchResponse(returned)))

    const res = await goals.getCurrentGoals()
    expect(res.data).toBeDefined()
    expect(Array.isArray(res.data)).toBe(true)
    expect(res.data?.[0].target_calories).toBe(2000)
  })

  it("Integration: getTodayIntake returns today's totals", async () => {
    const returned = { calories: 1200, breakdown: { breakfast: 400 } }
    vi.stubGlobal('fetch' as any, vi.fn(() => mockFetchResponse(returned)))

    const res = await goals.getTodayIntake()
    expect(res.data?.calories).toBe(1200)
  })

  it('Integration: getRecommendation derives age from dob, removes dob and sends age_years', async () => {
    const profile = { dob: '1995-06-15', height_cm: 175, weight_kg: 75, sex: 'M' }
    const returned = { daily_calorie_goal: 2200 }

    const fetchMock = vi.fn(async (url: string, opts: any) => {
      // Parse body
      const body = opts?.body ? JSON.parse(opts.body) : {}
      // dob should not be sent
      if (body.dob) {
        return mockFetchResponse({ detail: 'dob should not be sent' }, false, 400)
      }
      // age_years should be present
      if (!body.age_years) {
        return mockFetchResponse({ detail: 'age_years missing' }, false, 400)
      }
      return mockFetchResponse(returned)
    })

    vi.stubGlobal('fetch' as any, fetchMock)

    const res = await goals.getRecommendation(profile as any)
    expect(res.data?.daily_calorie_goal).toBe(2200)
    expect(fetchMock).toHaveBeenCalled()
  })

  /* Unit tests */
  it('Unit: setGoal delegates to apiClient.post with /goals/set', async () => {
    const spy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 2 } } as any)
    const payload = { target_calories: 1800 }
    const res = await goals.setGoal(payload as any)
    expect(spy).toHaveBeenCalledWith('/goals/set', payload)
    expect(res.data?.id).toBe(2)
    spy.mockRestore()
  })

  it('Unit: getCurrentGoals delegates to apiClient.get with /goals/current', async () => {
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [{ id: 1 }] } as any)
    const res = await goals.getCurrentGoals()
    expect(spy).toHaveBeenCalledWith('/goals/current')
    expect(Array.isArray(res.data)).toBe(true)
    spy.mockRestore()
  })

  it('Unit: getTodayIntake delegates to apiClient.get with /goals/intake/today', async () => {
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { calories: 500 } } as any)
    const res = await goals.getTodayIntake()
    expect(spy).toHaveBeenCalledWith('/goals/intake/today')
    expect(res.data?.calories).toBe(500)
    spy.mockRestore()
  })

  it('Unit: getRecommendation delegates to apiClient.post and uses public endpoint flag', async () => {
    const spy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { daily_calorie_goal: 2000 } } as any)
    const profile = { age_years: 30, height_cm: 170, weight_kg: 70 }
    const res = await goals.getRecommendation(profile as any)
    expect(spy).toHaveBeenCalledWith('/goals/recommend', profile, false)
    expect(res.data?.daily_calorie_goal).toBe(2000)
    spy.mockRestore()
  })

  it('Unit: updateGoal delegates to apiClient.put with correct endpoint', async () => {
    const spy = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { id: 5 } } as any)
    const res = await goals.updateGoal(5, { target_calories: 1900 })
    expect(spy).toHaveBeenCalledWith('/goals/5', { target_calories: 1900 })
    expect(res.data?.id).toBe(5)
    spy.mockRestore()
  })

  it('Unit: deleteGoal delegates to apiClient.delete with correct endpoint', async () => {
    const spy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { message: 'deleted' } } as any)
    const res = await goals.deleteGoal(7)
    expect(spy).toHaveBeenCalledWith('/goals/7')
    expect(res.data?.message).toBe('deleted')
    spy.mockRestore()
  })

  it('Unit: getIntakeHistory delegates to apiClient.get with range query', async () => {
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] } as any)
    const res = await goals.getIntakeHistory('2025-10-01', '2025-10-31')
    expect(spy).toHaveBeenCalledWith('/goals/intake/history?start=2025-10-01&end=2025-10-31')
    expect(Array.isArray(res.data)).toBe(true)
    spy.mockRestore()
  })
})
