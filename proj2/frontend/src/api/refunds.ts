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
import {
  Refund,
  RefundCreate,
  RefundApprove,
  RefundReject,
  RefundReason,
  OrderIssue,
  OrderIssueCreate,
  RefundCategory
} from './types';

// Refunds API Functions
export const refundsApi = {
  /**
   * Request a refund for an order
   */
  async requestRefund(refundData: RefundCreate): Promise<{ data?: Refund; error?: string }> {
    return apiClient.post<Refund>('/refunds/request', refundData);
  },

  /**
   * Get a specific refund by ID
   */
  async getRefund(refundId: number): Promise<{ data?: Refund; error?: string }> {
    return apiClient.get<Refund>(`/refunds/${refundId}`);
  },

  /**
   * Get all refunds for a specific order
   */
  async getRefundsForOrder(orderId: number): Promise<{ data?: Refund[]; error?: string }> {
    return apiClient.get<Refund[]>(`/refunds/order/${orderId}`);
  },

  /**
   * Get current user's refunds
   */
  async getMyRefunds(): Promise<{ data?: Refund[]; error?: string }> {
    return apiClient.get<Refund[]>('/refunds/my');
  },

  /**
   * Get all pending refunds (admin only)
   */
  async getPendingRefunds(): Promise<{ data?: Refund[]; error?: string }> {
    return apiClient.get<Refund[]>('/refunds/pending');
  },

  /**
   * Approve a pending refund (admin only)
   */
  async approveRefund(
    refundId: number,
    approvalData: RefundApprove
  ): Promise<{ data?: Refund; error?: string }> {
    return apiClient.post<Refund>(`/refunds/${refundId}/approve`, approvalData);
  },

  /**
   * Reject a pending refund (admin only)
   */
  async rejectRefund(
    refundId: number,
    rejectionData: RefundReject
  ): Promise<{ data?: Refund; error?: string }> {
    return apiClient.post<Refund>(`/refunds/${refundId}/reject`, rejectionData);
  },

  /**
   * Get available refund reasons
   */
  async getRefundReasons(category?: RefundCategory): Promise<{ data?: RefundReason[]; error?: string }> {
    const params = category ? { category } : {};
    return apiClient.get<RefundReason[]>('/refunds/reasons/', params);
  },

  /**
   * Report an issue with an order
   */
  async reportOrderIssue(issueData: OrderIssueCreate): Promise<{ data?: OrderIssue; error?: string }> {
    return apiClient.post<OrderIssue>('/refunds/issues/report', issueData);
  },

  /**
   * Get issues for a specific order
   */
  async getOrderIssues(orderId: number): Promise<{ data?: OrderIssue[]; error?: string }> {
    return apiClient.get<OrderIssue[]>(`/refunds/issues/order/${orderId}`);
  },
};
