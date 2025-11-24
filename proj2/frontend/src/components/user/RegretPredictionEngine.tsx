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

import { Order, EmotionalState, User, CartItem } from '../../App';

export interface RegretPrediction {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number; // 0-100
  reasons: string[];
  suggestions: string[];
  confidence: number; // 0-100
}

export interface RegretPattern {
  emotionalState: EmotionalState;
  timeOfDay: string;
  hourRange: string;
  dayOfWeek: string;
  calorieRange: string;
  regretRate: number;
  totalOrders: number;
  regreттedOrders: number;
}

export class RegretPredictionEngine {
  private orders: Order[];
  private user: User;

  constructor(orders: Order[], user: User) {
    this.orders = orders.filter(o => o.emotionalData && o.regretData);
    this.user = user;
  }

  /**
   * Predict if the current order might be regretted
   */
  predictRegret(
    currentEmotion: EmotionalState,
    currentIntensity: number,
    cartItems: CartItem[],
    totalCalories: number
  ): RegretPrediction {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    let riskScore = 0;
    const reasons: string[] = [];
    const suggestions: string[] = [];

    // Not enough data for predictions
    if (this.orders.length < 3) {
      return {
        riskLevel: 'low',
        riskScore: 0,
        reasons: ['Not enough historical data yet'],
        suggestions: ['Keep tracking your orders to get personalized insights'],
        confidence: 0
      };
    }

    // 1. Emotional State Analysis (30 points)
    const emotionRegretRate = this.getEmotionRegretRate(currentEmotion);
    if (emotionRegretRate > 0.6) {
      riskScore += 30;
      reasons.push(`You've regretted ${Math.round(emotionRegretRate * 100)}% of orders when feeling ${currentEmotion}`);
      suggestions.push('Consider waiting 10 minutes before ordering');
    } else if (emotionRegretRate > 0.4) {
      riskScore += 15;
      reasons.push(`Moderate regret rate when feeling ${currentEmotion}`);
    }

    // 2. Time of Day Analysis (25 points)
    const timeRegretRate = this.getTimeRegretRate(hour);
    if (timeRegretRate > 0.5) {
      riskScore += 25;
      reasons.push(`You often regret orders at this time (${this.getTimeLabel(hour)})`);
      suggestions.push('Try having a healthy snack first');
    } else if (timeRegretRate > 0.3) {
      riskScore += 12;
    }

    // 3. Calorie Analysis (25 points)
    if (this.user.calorieGoal) {
      const remainingCalories = this.getRemainingCalories();
      const percentOfRemaining = (totalCalories / remainingCalories) * 100;
      
      if (percentOfRemaining > 150) {
        riskScore += 25;
        reasons.push('This order exceeds your remaining calorie budget significantly');
        suggestions.push('Consider splitting this order or choosing lighter options');
      } else if (percentOfRemaining > 100) {
        riskScore += 15;
        reasons.push('This order uses all your remaining calories');
      }

      // High calorie orders + negative emotions = higher risk
      if (totalCalories > 1000 && ['sadness', 'anger', 'disgust'].includes(currentEmotion)) {
        riskScore += 15;
        reasons.push('High-calorie orders during emotional distress are often regretted');
        suggestions.push('Consider a comforting but lighter option');
      }
    }

    // 4. Intensity Analysis (10 points)
    if (currentIntensity >= 4 && ['sadness', 'anger', 'disgust'].includes(currentEmotion)) {
      riskScore += 10;
      reasons.push('Strong negative emotions can lead to emotional eating');
      suggestions.push('Take a short walk or call a friend before ordering');
    }

    // 5. Day of Week Pattern (10 points)
    const dayRegretRate = this.getDayRegretRate(dayOfWeek);
    if (dayRegretRate > 0.5) {
      riskScore += 10;
      reasons.push(`You tend to regret orders on ${dayOfWeek}s`);
    }

    // 6. Late Night Ordering (bonus risk)
    if (hour >= 22 || hour < 6) {
      riskScore += 15;
      reasons.push('Late-night orders have higher regret rates');
      suggestions.push('Consider if you\'re truly hungry or just tired');
    }

    // 7. Pattern Matching (check for exact scenarios)
    const similarOrderRegretRate = this.getSimilarScenarioRegretRate(
      currentEmotion,
      hour,
      totalCalories
    );
    if (similarOrderRegretRate > 0.7) {
      riskScore += 10;
      reasons.push('Very similar situations have led to regret before');
      suggestions.push('Review your previous orders in similar situations');
    }

    // Calculate confidence based on data availability
    const confidence = Math.min(100, (this.orders.length / 10) * 100);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore >= 60) {
      riskLevel = 'high';
      if (!suggestions.includes('Wait 15 minutes and reassess if you still want this')) {
        suggestions.push('Wait 15 minutes and reassess if you still want this');
      }
    } else if (riskScore >= 30) {
      riskLevel = 'medium';
      suggestions.push('Consider healthier alternatives from our AI suggestions');
    } else {
      riskLevel = 'low';
      suggestions.push('This order aligns well with your patterns');
    }

    return {
      riskLevel,
      riskScore: Math.min(100, riskScore),
      reasons: reasons.slice(0, 4), // Top 4 reasons
      suggestions: suggestions.slice(0, 3), // Top 3 suggestions
      confidence
    };
  }

  /**
   * Get regret rate for a specific emotion
   */
  private getEmotionRegretRate(emotion: EmotionalState): number {
    const emotionOrders = this.orders.filter(
      o => o.emotionalData?.emotion === emotion
    );
    
    if (emotionOrders.length === 0) return 0;
    
    const regretted = emotionOrders.filter(o => o.regretData?.regretted).length;
    return regretted / emotionOrders.length;
  }

  /**
   * Get regret rate for a specific time range
   */
  private getTimeRegretRate(hour: number): number {
    const timeOrders = this.orders.filter(
      o => {
        const orderHour = o.emotionalData?.hour;
        if (orderHour === undefined) return false;
        // Check within 2-hour window
        return Math.abs(orderHour - hour) <= 1;
      }
    );
    
    if (timeOrders.length === 0) return 0;
    
    const regretted = timeOrders.filter(o => o.regretData?.regretted).length;
    return regretted / timeOrders.length;
  }

  /**
   * Get regret rate for a specific day of week
   */
  private getDayRegretRate(dayOfWeek: string): number {
    const dayOrders = this.orders.filter(
      o => o.emotionalData?.dayOfWeek === dayOfWeek
    );
    
    if (dayOrders.length === 0) return 0;
    
    const regretted = dayOrders.filter(o => o.regretData?.regretted).length;
    return regretted / dayOrders.length;
  }

  /**
   * Get regret rate for similar scenarios
   */
  private getSimilarScenarioRegretRate(
    emotion: EmotionalState,
    hour: number,
    calories: number
  ): number {
    const similarOrders = this.orders.filter(o => {
      if (!o.emotionalData) return false;
      
      const emotionMatch = o.emotionalData.emotion === emotion;
      const timeMatch = Math.abs(o.emotionalData.hour - hour) <= 2;
      const calorieMatch = Math.abs(o.totalCalories - calories) < 300;
      
      return emotionMatch && timeMatch && calorieMatch;
    });
    
    if (similarOrders.length === 0) return 0;
    
    const regretted = similarOrders.filter(o => o.regretData?.regretted).length;
    return regretted / similarOrders.length;
  }

  /**
   * Get remaining calories for today
   */
  private getRemainingCalories(): number {
    const today = new Date().toDateString();
    const todayOrders = this.orders.filter(
      o => new Date(o.createdAt).toDateString() === today
    );
    
    const consumed = todayOrders.reduce((sum, o) => sum + o.totalCalories, 0);
    return (this.user.calorieGoal || 2200) - consumed;
  }

  /**
   * Get time label for display
   */
  private getTimeLabel(hour: number): string {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'late night';
  }

  /**
   * Get all regret patterns for analytics
   */
  getRegretPatterns(): RegretPattern[] {
    const patterns: RegretPattern[] = [];
    
    // Group by emotion
    const emotions: EmotionalState[] = ['happiness', 'sadness', 'anger', 'fear', 'surprise', 'disgust'];
    emotions.forEach(emotion => {
      const emotionOrders = this.orders.filter(o => o.emotionalData?.emotion === emotion);
      if (emotionOrders.length > 0) {
        const regretted = emotionOrders.filter(o => o.regretData?.regretted).length;
        patterns.push({
          emotionalState: emotion,
          timeOfDay: 'All',
          hourRange: 'All hours',
          dayOfWeek: 'All days',
          calorieRange: 'All',
          regretRate: regretted / emotionOrders.length,
          totalOrders: emotionOrders.length,
          regreттedOrders: regretted
        });
      }
    });
    
    return patterns.sort((a, b) => b.regretRate - a.regretRate);
  }

  /**
   * Get overall statistics
   */
  getStatistics() {
    const totalOrders = this.orders.length;
    const regrettedOrders = this.orders.filter(o => o.regretData?.regretted).length;
    const overallRegretRate = totalOrders > 0 ? regrettedOrders / totalOrders : 0;
    
    return {
      totalOrders,
      regrettedOrders,
      satisfiedOrders: totalOrders - regrettedOrders,
      overallRegretRate,
      dataQuality: totalOrders >= 10 ? 'good' : totalOrders >= 5 ? 'fair' : 'limited'
    };
  }
}
