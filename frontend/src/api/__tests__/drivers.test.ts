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
import { driversApi } from '../drivers'
import type { DriverLoginRequest, DriverLocationIn, AssignedOrderOut } from '../drivers'

// Mock the apiClient module
vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('driversApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('calls POST /drivers/login correctly', async () => {
      const mockResponse = {
        data: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
        },
      }

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse)

      const loginData: DriverLoginRequest = {
        email: 'driver@test.com',
        password: 'password123',
      }

      const result = await driversApi.login(loginData)

      expect(apiClient.post).toHaveBeenCalledWith('/drivers/login', loginData)
      expect(result).toEqual(mockResponse)
    })

    it('calls POST /drivers/register correctly', async () => {
      const mockResponse = {
        data: { id: 1, email: 'newdriver@test.com', name: 'John Doe' },
      }

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse)

      const registerData = {
        email: 'newdriver@test.com',
        password: 'securepass',
        name: 'John Doe',
      }

      const result = await driversApi.register(registerData)

      expect(apiClient.post).toHaveBeenCalledWith('/drivers/register', registerData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Driver Profile', () => {
    it('calls GET /drivers/me correctly', async () => {
      const mockResponse = {
        data: {
          id: 5,
          email: 'driver@test.com',
          name: 'Jane Driver',
          status: 'active',
        },
      }

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse)

      const result = await driversApi.getCurrentDriver()

      expect(apiClient.get).toHaveBeenCalledWith('/drivers/me')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Orders', () => {
    it('calls GET /drivers/{driverId}/assigned-orders correctly', async () => {
      const mockOrders: AssignedOrderOut[] = [
        { id: 1, status: 'assigned' },
        { id: 2, status: 'picked_up' },
      ]

      const mockResponse = { data: mockOrders }

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse)

      const driverId = 5
      const result = await driversApi.getAssignedOrders(driverId)

      expect(apiClient.get).toHaveBeenCalledWith(`/drivers/${driverId}/assigned-orders`)
      expect(result).toEqual(mockResponse)
    })

    it('calls POST /drivers/{driverId}/orders/{orderId}/pickup correctly', async () => {
      const mockOrder: AssignedOrderOut = { id: 10, status: 'picked_up' }
      const mockResponse = { data: mockOrder }

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse)

      const driverId = 5
      const orderId = 10

      const result = await driversApi.pickupOrder(driverId, orderId)

      expect(apiClient.post).toHaveBeenCalledWith(`/drivers/${driverId}/orders/${orderId}/pickup`)
      expect(result).toEqual(mockResponse)
    })

    it('calls POST /drivers/{driverId}/orders/{orderId}/deliver correctly', async () => {
      const mockOrder: AssignedOrderOut = { id: 10, status: 'delivered' }
      const mockResponse = { data: mockOrder }

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse)

      const driverId = 5
      const orderId = 10

      const result = await driversApi.deliverOrder(driverId, orderId)

      expect(apiClient.post).toHaveBeenCalledWith(`/drivers/${driverId}/orders/${orderId}/deliver`)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Location', () => {
    it('calls POST /drivers/{driverId}/location correctly', async () => {
      const mockResponse = { data: { success: true } }

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse)

      const driverId = 5
      const location: DriverLocationIn = {
        lat: 35.7796,
        lng: -78.6382,
        timestamp: '2025-11-05T12:00:00Z',
      }

      const result = await driversApi.updateLocation(driverId, location)

      expect(apiClient.post).toHaveBeenCalledWith(`/drivers/${driverId}/location`, location)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('WebSocket', () => {
    it('generates correct WebSocket URL', () => {
      // Mock window.location.host
      Object.defineProperty(window, 'location', {
        value: { host: 'localhost:3000' },
        writable: true,
      })

      const driverId = 7
      const wsUrl = driversApi.getWebSocketUrl(driverId)

      expect(wsUrl).toBe(`ws://localhost:3000/drivers/driver/${driverId}/ws`)
    })
  })
})