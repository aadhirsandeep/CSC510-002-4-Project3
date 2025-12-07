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

import { apiClient } from './client';
import { StaffAssignmentCreate, StaffAssignByEmail, StaffAssignment, StaffMember, StaffRole } from './types';

// Staff API Functions
export const staffApi = {
  /**
   * Assign a user as staff to a cafe
   * Only cafe owners and admins can assign staff
   */
  async assignStaff(assignment: StaffAssignmentCreate): Promise<{ data?: StaffAssignment; error?: string }> {
    return apiClient.post<StaffAssignment>('/staff/assign', assignment);
  },

  /**
   * Assign a user as staff to a cafe by email address
   * Only cafe owners and admins can assign staff
   */
  async assignStaffByEmail(assignment: StaffAssignByEmail): Promise<{ data?: StaffAssignment; error?: string }> {
    return apiClient.post<StaffAssignment>('/staff/assign-by-email', assignment);
  },

  /**
   * Get all staff members for a specific cafe
   * Owner, staff, and admins can view staff list
   */
  async getCafeStaff(cafeId: number): Promise<{ data?: StaffMember[]; error?: string }> {
    return apiClient.get<StaffMember[]>(`/staff/cafe/${cafeId}`);
  },

  /**
   * Update a staff assignment's role
   * Only cafe owners and admins can update staff roles
   */
  async updateStaffRole(assignmentId: number, role: StaffRole): Promise<{ data?: StaffAssignment; error?: string }> {
    return apiClient.put<StaffAssignment>(`/staff/${assignmentId}`, { role });
  },

  /**
   * Remove a staff assignment from a cafe
   * Only cafe owners and admins can remove staff
   */
  async removeStaff(assignmentId: number): Promise<{ data?: { message: string }; error?: string }> {
    return apiClient.delete(`/staff/${assignmentId}`);
  },

  /**
   * Toggle a staff member's active status
   * Only cafe owners and admins can toggle staff status
   */
  async toggleStaffActive(assignmentId: number): Promise<{ data?: { message: string; is_active: boolean }; error?: string }> {
    return apiClient.post<{ message: string; is_active: boolean }>(`/staff/${assignmentId}/toggle-active`, {});
  },
};

// Export individual functions for convenience
export const {
  assignStaff,
  assignStaffByEmail,
  getCafeStaff,
  updateStaffRole,
  removeStaff,
  toggleStaffActive,
} = staffApi;
