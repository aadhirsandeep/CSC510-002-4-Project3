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

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}
// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
  role?: 'USER' | 'OWNER' | 'DRIVER' | 'ADMIN';
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
export interface TokenPayload {
  sub: string;
  uid: number;
  role: 'USER' | 'OWNER' | 'DRIVER'; 
  exp: number;
}
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'USER' | 'OWNER' | 'DRIVER'; 
  is_active: boolean;
  cafe?: Cafe;
  height_cm?: number;
  weight_kg?: number;
  sex?: string;
  dob?: string; // ISO date string (YYYY-MM-DD)
  age?: number; // kept optional for backward compatibility
  activity?: string;
  daily_calorie_goal?: number;
}
export interface DashboardStats {
  total_orders: number;
  total_spent: number;
  total_calories: number;
  favorite_restaurants: Array<{
    id: string;
    name: string;
    visits: number;
  }>;
  recent_orders: Array<{
    id: string;
    restaurant_name: string;
    total_amount: number;
    status: string;
    created_at: string;
    items: Array<{
      name: string;
      quantity: number;
      calories: number;
    }>;
  }>;
  calorie_history: Array<{
    date: string;
    calories: number;
  }>;
}
export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  role: 'USER' | 'OWNER' | 'DRIVER'; // ✅ added role here for registration
  // Optional owner-specific fields
  cuisine?: string;
  address?: string;
  timings?: string;
  phone?: string;
}
// Cafe Types
export interface Cafe {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  cuisine?: string;
  timings?: string;
  active: boolean;
  lat: number;
  lng: number;
}

export interface CafeCreateRequest {
  name: string;
  address?: string;
  phone?: string;
  cuisine?: string;
  timings?: string;
  lat: number;
  lng: number;
}
// Item Types
export interface MenuItem {
  id: number;
  cafe_id: string;
  name: string;
  description?: string;
  ingredients?: string;
  calories: number;
  price: number;
  quantity?: string;
  servings?: number;
  isVegetarian: boolean;
  kind?: string;
  active: boolean;
  category: string;
  image?: string; // Added image property
  restaurantId: string; // Added to match usage in MenuPage.tsx
}
// REVIEWS
export interface Review {
  id: number;
  cafe_id: number;
  user_id: number;
  rating: number;
  text: string;
  created_at: string; // ISO timestamp
}
export interface ReviewSummary {
  summary: string;
  review_count: number;
  cached: boolean;
}
export interface CreateReviewInput {
  cafe_id: number;
  user_id: number;
  rating: number;
  text: string;
}
export interface ItemCreateRequest {
  name: string;
  description?: string;
  ingredients?: string;
  calories: number;
  price: number;
  quantity?: string;
  servings?: number;
  veg_flag?: boolean;
  kind?: string;
}
// Cart Types
export interface CartItem {
  id: number;
  cart_id: number;
  item_id: number;
  quantity: number;
  assignee_user_id?: number;
}
export interface CartAddRequest {
  item_id: number;
  quantity?: number;
  assignee_email?: string;
}
// export interface CartSummary {
//   by_person: Record<string, Record<string, number>>;
//   total_calories: number;
//   total_price: number;
// }
export interface CartAddItem {
  item_id: number;
  quantity: number;
  assignee_email?: string;
}
export interface CartOut {
  id: number;
  user_id: number;
  created_at: string;
}
export interface CartSummary {
  by_person: {
    [email: string]: {
      calories: number;
      price: number;
    };
  };
  total_calories: number;
  total_price: number;
}
// Order Types
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'READY' | 'PICKED_UP' | 'CANCELLED' | 'REFUNDED' | 'DELIVERED';

export interface Order {
  id: number;
  cafe_id: number;
  status: OrderStatus;
  created_at: string;
  total_price: number;
  total_calories: number;
  can_cancel_until: string;
}

// Add these new types for order summaries
export interface OrderItemSummary {
  item_id: number;
  name: string;
  quantity: number;
  subtotal_price: number;
  subtotal_calories: number;
}

export interface DriverInfo {
  driver_id: number;
  driver_email: string;
}

export interface OrderSummary {
  id: number;
  cafe_id: number;
  status: OrderStatus;
  created_at: string;
  total_price: number;
  total_calories: number;
  items: OrderItemSummary[];
  driver_info?: DriverInfo | null;
}

export interface PlaceOrderRequest {
  cafe_id: number;
}
// Goal Types
export interface CalorieGoal {
  id: number;
  period: string;
  target_calories: number;
  start_date: string;
}
export interface GoalSetRequest {
  period: string;
  target_calories: number;
  start_date: string;
}
export interface GoalRecommendationRequest {
  height_cm: number;
  weight_kg: number;
  sex?: string;
  age_years?: number; // derived from dob if provided
  dob?: string; // optional input, client will derive age
  activity?: string;
}
export interface GoalRecommendationResponse {
  daily_calorie_goal: number;
}
// API Error Types
export interface ApiError {
  detail: string;
  status_code?: number;
}
// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
// Request Options
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  requiresAuth?: boolean;
}
