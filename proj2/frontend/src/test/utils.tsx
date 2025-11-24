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

import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
// import { Toaster } from 'sonner'
import { vi } from 'vitest'

// Mock User type for testing
export interface MockUser {
  id: string;
  email: string;
  name: string;
  type: 'customer' | 'restaurant_owner' | 'staff';
  restaurantId?: string;
  height?: number;
  weight?: number;
  calorieGoal?: number;
  goalType?: 'daily' | 'weekly' | 'monthly';
}

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MemoryRouter>
      {children}
      {/* <Toaster /> */}
    </MemoryRouter>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Mock data for testing
export const mockUsers: MockUser[] = [
  {
    id: '1',
    email: 'customer@demo.com',
    name: 'John Customer',
    type: 'customer',
    height: 180,
    weight: 75,
    calorieGoal: 2200,
    goalType: 'daily'
  },
  {
    id: '2',
    email: 'restaurant@demo.com',
    name: 'Pizza Palace',
    type: 'restaurant_owner',
    restaurantId: 'rest1'
  },
  {
    id: '3',
    email: 'staff@demo.com',
    name: 'Sarah Staff',
    type: 'staff',
    restaurantId: 'rest1'
  }
]

// Helper function to create mock onLogin function
export const createMockOnLogin = () => {
  return vi.fn()
}

// Helper function to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }
