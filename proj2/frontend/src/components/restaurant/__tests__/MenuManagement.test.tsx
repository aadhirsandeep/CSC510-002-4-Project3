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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom'; // ← Add this import for toBeInTheDocument
import { act } from 'react'; // ← Add this import to fix the 'act' error
import MenuManagement from '../MenuManagement';
import { useAuth } from '../../../contexts/AuthContext';
import { itemsApi } from '../../../api/items';
import { cafeApi } from '../../../api/cafes';
import { toast } from 'sonner';
// Mock dependencies
vi.mock('../../../contexts/AuthContext');
vi.mock('../../../api/items');
vi.mock('../../../api/cafes');
vi.mock('sonner');

const mockUser = {
  id: 1,
  email: 'owner@test.com',
  role: 'OWNER',
  cafe: {
    id: 5,
    name: 'Test Cafe',
  },
};

const mockMenuItems = [
  {
    id: 1,
    name: 'Burger',
    description: 'Delicious burger',
    price: 12.99,
    calories: 650,
    category: 'main',
    isVegetarian: false,
    ingredients: ['beef', 'lettuce', 'tomato'],
    quantity: '1 piece',
    servings: 1,
  },
  {
    id: 2,
    name: 'Salad',
    description: 'Fresh garden salad',
    price: 8.99,
    calories: 200,
    category: 'appetizer',
    isVegetarian: true,
    ingredients: ['lettuce', 'tomato', 'cucumber'],
    quantity: '1 bowl',
    servings: 1,
  },
];

describe('MenuManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useAuth
    (useAuth as any).mockReturnValue({
      user: mockUser,
    });

    // Mock itemsApi
    (itemsApi.getCafeItems as any).mockResolvedValue({
      data: mockMenuItems,
      error: null,
    });
  });

  describe('Rendering and Initial Load', () => {
    it('renders the menu management page with title', async () => {
      render(<MenuManagement />);
      
      expect(screen.getByText('Menu Management')).toBeInTheDocument();
      expect(screen.getByText(/Manage menu items and upload PDF\/Image menus for AI parsing/i)).toBeInTheDocument();
    });

    it('fetches and displays menu items on mount', async () => {
      render(<MenuManagement />);

      await waitFor(() => {
        expect(itemsApi.getCafeItems).toHaveBeenCalledWith(5);
      });

      await waitFor(() => {
        expect(screen.getByText('Burger')).toBeInTheDocument();
        expect(screen.getByText('Salad')).toBeInTheDocument();
      });
    });

    it('displays statistics correctly', async () => {
      render(<MenuManagement />);

      await waitFor(() => {
        // Use:
        const totalItemsCard = screen.getByText('Total Items').closest('div')?.parentElement;
        expect(totalItemsCard).toHaveTextContent('2');

        const vegCard = screen.getByText('Vegetarian').closest('div')?.parentElement;
        expect(vegCard).toHaveTextContent('1');
      });
    });

    it('shows loading state while fetching items', () => {
      (itemsApi.getCafeItems as any).mockReturnValue(new Promise(() => {})); // Never resolves
      
      render(<MenuManagement />);
      
      expect(screen.getByText('Loading items...')).toBeInTheDocument();
    });

    it('shows empty state when no items exist', async () => {
      (itemsApi.getCafeItems as any).mockResolvedValue({
        data: [],
        error: null,
      });

      render(<MenuManagement />);

      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters items by search term', async () => {
      render(<MenuManagement />);

      await waitFor(() => {
        expect(screen.getByText('Burger')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search items by name/i);
      await userEvent.type(searchInput, 'Salad');

      await waitFor(() => {
        expect(screen.getByText('Salad')).toBeInTheDocument();
        expect(screen.queryByText('Burger')).not.toBeInTheDocument();
      });
    });

    it('shows all items when search is cleared', async () => {
      render(<MenuManagement />);

      await waitFor(() => {
        expect(screen.getByText('Burger')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search items by name/i);
      await userEvent.type(searchInput, 'Salad');
      await userEvent.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Burger')).toBeInTheDocument();
        expect(screen.getByText('Salad')).toBeInTheDocument();
      });
    });
  });

  describe('Add Item Dialog', () => {
    it('opens add item dialog when Add Item button is clicked', async () => {
      render(<MenuManagement />);

      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await userEvent.click(addButton);

      expect(screen.getByText('Add New Menu Item')).toBeInTheDocument();
    });

    it('successfully adds a new item', async () => {
      (itemsApi.addMenuItem as any).mockResolvedValue({
        data: { id: 3, name: 'Pizza' },
        error: null,
      });

      render(<MenuManagement />);

      // Open dialog
      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await userEvent.click(addButton);

      // Fill form
      await userEvent.type(screen.getByLabelText(/Item Name/i), 'Pizza');
      await userEvent.type(screen.getByLabelText(/Description/i), 'Cheesy pizza');
      await userEvent.type(screen.getByLabelText(/Price/i), '15.99');
      await userEvent.type(screen.getByLabelText(/Calories/i), '800');

      // Submit
      const submitButton = screen.getByRole('button', { name: /Add Item/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(itemsApi.addMenuItem).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Item added successfully');
      });
    });

    it('shows error when adding item fails', async () => {
      (itemsApi.addMenuItem as any).mockResolvedValue({
        data: null,
        error: 'Failed to add item',
      });

      render(<MenuManagement />);

      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await userEvent.click(addButton);

      // Fill minimal required fields
      await userEvent.type(screen.getByLabelText(/Item Name/i), 'Test');
      await userEvent.type(screen.getByLabelText(/Description/i), 'Test desc');
      await userEvent.type(screen.getByLabelText(/Price/i), '10');
      await userEvent.type(screen.getByLabelText(/Calories/i), '500');

      const submitButton = screen.getByRole('button', { name: /Add Item/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to add item');
      });
    });

    it('validates required fields before submission', async () => {
      render(<MenuManagement />);

      const addButton = screen.getByRole('button', { name: /Add Item/i });
      await userEvent.click(addButton);

      // Try to submit without filling fields
      const submitButton = screen.getByRole('button', { name: /Add Item/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please fill in all required fields');
      });
    });
  });

  describe('Edit Item Dialog', () => {
    it('opens edit dialog with pre-filled data', async () => {
      render(<MenuManagement />);

      await waitFor(() => {
        expect(screen.getByText('Burger')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await userEvent.click(editButtons[0]);

      expect(screen.getByText('Edit Menu Item')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Burger')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Delicious burger')).toBeInTheDocument();
    });

    it('successfully updates an item', async () => {
      (itemsApi.updateItem as any).mockResolvedValue({
        data: { id: 1, name: 'Updated Burger' },
        error: null,
      });

      render(<MenuManagement />);

      await waitFor(() => {
        expect(screen.getByText('Burger')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await userEvent.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Burger');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Burger');

      const updateButton = screen.getByRole('button', { name: /Update Item/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(itemsApi.updateItem).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Item updated successfully');
      });
    });
  });

  describe('Delete Item', () => {
    it('deletes an item after confirmation', async () => {
      (itemsApi.deleteItem as any).mockResolvedValue({
        data: { status: 'deleted' },
        error: null,
      });

      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<MenuManagement />);

      await waitFor(() => {
        expect(screen.getByText('Burger')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /^$/ }); // Trash icon buttons
      const trashButton = deleteButtons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );
      
      if (trashButton) {
        await userEvent.click(trashButton);

        await waitFor(() => {
          expect(itemsApi.deleteItem).toHaveBeenCalledWith(1);
          expect(toast.success).toHaveBeenCalledWith('Item deleted');
        });
      }

      confirmSpy.mockRestore();
    });

    it('cancels deletion when user declines confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<MenuManagement />);

      await waitFor(() => {
        expect(screen.getByText('Burger')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /^$/ });
      const trashButton = deleteButtons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );
      
      if (trashButton) {
        await userEvent.click(trashButton);
        expect(itemsApi.deleteItem).not.toHaveBeenCalled();
      }

      confirmSpy.mockRestore();
    });
  });

  describe('PDF Upload', () => {
    it('opens upload dialog when Upload PDF Menu button is clicked', async () => {
      render(<MenuManagement />);

      const uploadButton = screen.getByRole('button', { name: /Upload Menu /i });
      await userEvent.click(uploadButton);

      expect(screen.getByRole('heading', { name: /Upload Menu File/i })).toBeInTheDocument();
      expect(screen.getByText(/Upload your menu in PDF or Image format/i)).toBeInTheDocument();
    });

    it('extracts items from PDF and opens review dialog', async () => {
      const extractedData = {
        items: [
          { name: 'Pasta', price: 14.99, calories: 600 },
          { name: 'Soup', price: 6.99, calories: 250 },
        ],
      };

      (cafeApi.uploadMenu as any).mockResolvedValue({
        data: extractedData,
        error: null,
      });

      render(<MenuManagement />);

      const uploadButton = screen.getByRole('button', { name: /Upload Menu File/i });
      await userEvent.click(uploadButton);

      // Create and select a file
      const file = new File(['dummy'], 'menu.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(fileInput, file);

      const extractButton = screen.getByRole('button', { name: /Extract Menu Items/i });
      await userEvent.click(extractButton);

      await waitFor(() => {
        expect(cafeApi.uploadMenu).toHaveBeenCalledWith(5, file);
        expect(screen.getByText('Review Extracted Items')).toBeInTheDocument();
      });
    });

    it('shows error when PDF upload fails', async () => {
      (cafeApi.uploadMenu as any).mockResolvedValue({
        data: null,
        error: 'Upload failed',
      });

      render(<MenuManagement />);

      const uploadButton = screen.getByRole('button', { name: /Upload Menu File/i });
      await userEvent.click(uploadButton);

      const file = new File(['dummy'], 'menu.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(fileInput, file);

      const extractButton = screen.getByRole('button', { name: /Extract Menu Items/i });
      await userEvent.click(extractButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Upload failed');
      });
    });
  });

  describe('Review Extracted Items', () => {
    it('allows editing extracted items before submission', async () => {
      const extractedData = {
        items: [
          { name: 'Pasta', price: 14.99, calories: 600 },
        ],
      };

      (cafeApi.uploadMenu as any).mockResolvedValue({
        data: extractedData,
        error: null,
      });

      (itemsApi.replaceMenu as any).mockResolvedValue({
        data: { success: true, items_created: 1 },
        error: null,
      });

      render(<MenuManagement />);

      // Upload PDF
      const uploadButton = screen.getByRole('button', { name: /Upload Menu File/i });
      await userEvent.click(uploadButton);

      const file = new File(['dummy'], 'menu.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(fileInput, file);

      const extractButton = screen.getByRole('button', { name: /Extract Menu Items/i });
      await userEvent.click(extractButton);

      await waitFor(() => {
        expect(screen.getByText('Review Extracted Items')).toBeInTheDocument();
      });

      // Edit the item name
      const nameInput = screen.getByDisplayValue('Pasta');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Spaghetti Carbonara');

      // Submit
      const replaceButton = screen.getByRole('button', { name: /Replace Menu/i });
      await userEvent.click(replaceButton);

      await waitFor(() => {
        expect(itemsApi.replaceMenu).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it('allows removing extracted items before submission', async () => {
      const extractedData = {
        items: [
          { name: 'Pasta', price: 14.99, calories: 600 },
          { name: 'Soup', price: 6.99, calories: 250 },
        ],
      };

      (cafeApi.uploadMenu as any).mockResolvedValue({
        data: extractedData,
        error: null,
      });

      render(<MenuManagement />);

      // Upload and get to review
      const uploadButton = screen.getByRole('button', { name: /Upload Menu File/i });
      await userEvent.click(uploadButton);

      const file = new File(['dummy'], 'menu.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(fileInput, file);

      const extractButton = screen.getByRole('button', { name: /Extract Menu Items/i });
      await userEvent.click(extractButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Pasta')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Soup')).toBeInTheDocument();
      });

      // Remove one item
      const deleteButtons = screen.getAllByRole('button');
      const trashButtons = deleteButtons.filter(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );
      
      if (trashButtons.length > 0) {
        await userEvent.click(trashButtons[0]);
      
        await waitFor(() => {
          // You removed the first item (Pasta), so check that Pasta is gone:
          expect(screen.queryByDisplayValue('Pasta')).not.toBeInTheDocument();
          // And Soup should still be there:
          expect(screen.getByDisplayValue('Soup')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('shows error toast when fetching items fails', async () => {
      (itemsApi.getCafeItems as any).mockResolvedValue({
        data: null,
        error: 'Network error',
      });

      render(<MenuManagement />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load items');
      });
    });

    it('handles missing cafe ID gracefully', () => {
      (useAuth as any).mockReturnValue({
        user: { ...mockUser, cafe: null },
      });

      render(<MenuManagement />);

      // Should not crash, items API should not be called
      expect(itemsApi.getCafeItems).not.toHaveBeenCalled();
    });
  });

  describe('Refresh Functionality', () => {
    it('refreshes items when refresh button is clicked', async () => {
      render(<MenuManagement />);

      await waitFor(() => {
        expect(screen.getByText('Burger')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      await userEvent.click(refreshButton);

      await waitFor(() => {
        expect(itemsApi.getCafeItems).toHaveBeenCalledTimes(2);
      });
    });
  });
});