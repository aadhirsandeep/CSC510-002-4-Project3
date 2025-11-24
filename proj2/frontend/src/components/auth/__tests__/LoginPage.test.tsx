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

/**
 * @file LoginPage.test.tsx
 * Vitest + RTL tests for the real LoginPage component
 */

import { vi, describe, beforeEach, test, expect } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
// jest-dom matchers are registered in the Vitest setup file
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

/* -------------------- Mocks (declare BEFORE importing component) -------------------- */

// Toasts
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Auth context used by the component
const mockLogin = vi.fn();
const mockAuthValue = {
  user: null,
  isLoading: false,
  error: null as string | null,
  isAuthenticated: false,
  clearError: vi.fn(),
  login: mockLogin,
};

// IMPORTANT: mock the EXACT module path your component imports
// IMPORTANT: mock the EXACT module path your component imports
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

// Only override useNavigate, keep rest of react-router-dom real
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

/* -------------------- Import the REAL component (enables coverage) -------------------- */
import LoginPage from '../LoginPage';

/* -------------------- Helpers -------------------- */
const renderLoginPage = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthValue.isLoading = false;
  mockAuthValue.error = null;
});

/* -------------------- Tests -------------------- */
describe('LoginPage Component', () => {
  test('renders login form with correct title and description', () => {
    renderLoginPage();
    // Adjust these strings if your component uses different copy
    expect(screen.getByRole('heading', { name: /welcome to calorie connect/i })).toBeInTheDocument();
    expect(screen.getByText(/sign in to your account to continue/i)).toBeInTheDocument();
  });

  test('renders Customer / Restaurant / Driver tabs', () => {
    renderLoginPage();
    expect(screen.getByRole('tab', { name: /customer/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /restaurant/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /driver/i })).toBeInTheDocument();
  });

  test('renders Sign up link', () => {
    renderLoginPage();
    const link = screen.getByRole('link', { name: /sign up/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/register'); // tweak if different
  });

  test('allows user to input email and password', async () => {
    renderLoginPage();
    const email = screen.getByLabelText(/email/i);
    const password = screen.getByLabelText(/password/i);

    await userEvent.type(email, 'test@example.com');
    await userEvent.type(password, 'mypassword');

    expect(email).toHaveValue('test@example.com');
    expect(password).toHaveValue('mypassword');
  });

  test('disables the button and shows loading label when isLoading is true', () => {
    mockAuthValue.isLoading = true;
    renderLoginPage();
    // During loading, label should become "Signing in..."
    const btn = screen.getByRole('button', { name: /signing in/i });
    expect(btn).toBeDisabled();
  });

  test('logs in as USER and navigates to /dashboard', async () => {
    mockLogin.mockResolvedValueOnce({ role: 'USER' });

    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  test('logs in as OWNER and navigates to /restaurant/dashboard', async () => {
    mockLogin.mockResolvedValueOnce({ role: 'OWNER' });

    renderLoginPage();
    // Switch to Restaurant tab so your component sets the role appropriately
    await userEvent.click(screen.getByRole('tab', { name: /restaurant/i }));

    await userEvent.type(screen.getByLabelText(/email/i), 'resto@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith('/restaurant/dashboard', { replace: true });
  });

  test('shows error message when context error is set', () => {
    mockAuthValue.error = 'Invalid credentials';
    renderLoginPage();
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
