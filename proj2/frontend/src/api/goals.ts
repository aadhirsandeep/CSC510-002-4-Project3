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
import { CalorieGoal, GoalSetRequest, GoalRecommendationRequest, GoalRecommendationResponse } from './types';

// Goals API Functions
export const goalsApi = {
  /**
   * Set a calorie goal
   */
  async setGoal(goalData: GoalSetRequest): Promise<{ data?: CalorieGoal; error?: string }> {
    return apiClient.post<CalorieGoal>('/goals/set', goalData);
  },

  /**
   * Get current calorie goals
   */
  async getCurrentGoals(): Promise<{ data?: CalorieGoal[]; error?: string }> {
    return apiClient.get<CalorieGoal[]>('/goals/current');
  },

  /**
   * Get today's calorie intake
   */
  async getTodayIntake(): Promise<{ data?: { calories: number; breakdown?: any }; error?: string }> {
    return apiClient.get('/goals/intake/today');
  },

  /**
   * Get calorie recommendation based on user profile
   */
  async getRecommendation(profile: GoalRecommendationRequest): Promise<{ data?: GoalRecommendationResponse; error?: string }> {
    // If dob is provided, derive age_years here so backend stays unchanged
    let payload: GoalRecommendationRequest = { ...profile };
    if (!payload.age_years && payload.dob) {
      const dob = new Date(payload.dob);
      if (!isNaN(dob.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        if (age > 0) payload.age_years = age;
      }
      // do not send dob to backend; it's not required
      delete (payload as any).dob;
    }
    return apiClient.post<GoalRecommendationResponse>('/goals/recommend', payload, false); // Public endpoint
  },

  /**
   * Update a goal
   */
  async updateGoal(goalId: number, updates: Partial<GoalSetRequest>): Promise<{ data?: CalorieGoal; error?: string }> {
    return apiClient.put<CalorieGoal>(`/goals/${goalId}`, updates);
  },

  /**
   * Delete a goal
   */
  async deleteGoal(goalId: number): Promise<{ data?: { message: string }; error?: string }> {
    return apiClient.delete(`/goals/${goalId}`);
  },

  /**
   * Get calorie intake for a specific date range
   */
  async getIntakeHistory(startDate: string, endDate: string): Promise<{ data?: any[]; error?: string }> {
    return apiClient.get(`/goals/intake/history?start=${startDate}&end=${endDate}`);
  },
};

// Export individual functions for convenience
export const {
  setGoal,
  getCurrentGoals,
  getTodayIntake,
  getRecommendation,
  updateGoal,
  deleteGoal,
  getIntakeHistory,
} = goalsApi;