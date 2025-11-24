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

import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// ✅ Add this line to enable toBeInTheDocument and other matchers
expect.extend(matchers);

// ✅ Add cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>()
    const React = await import('react')
  
    return {
      ...actual, // keep MemoryRouter, BrowserRouter, etc.
      Link: ({ children, to, ...props }: any) =>
        React.createElement('a', { href: to, ...props }, children),
      useNavigate: () => vi.fn(),
      useLocation: () => ({ pathname: '/' }),
    }
  })

// Mock sonner toast
vi.mock('sonner', async (importOriginal) => {
    const actual = await importOriginal<typeof import('sonner')>()
    return {
      ...actual,
      toast: {
        success: vi.fn(),
        error: vi.fn(),
      },
    }
  })

// Mock CSS modules
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})