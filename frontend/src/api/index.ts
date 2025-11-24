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

// Main API exports - this is your single import point for all API functions
export * from './types';
export * from './client';
export * from './cafes';
export * from './items';
export * from './cart';
export * from './orders';
export * from './goals';

// Future API modules will be exported here
// export * from './analytics';

// Re-export commonly used items for convenience
export { apiClient, TokenManager, decodeToken, isTokenExpired, getCurrentUserFromToken } from './client';
export { cafeApi } from './cafes';
export { itemsApi } from './items';
export { cartApi } from './cart';
export { ordersApi } from './orders';
export { goalsApi } from './goals';
export {analyticsApi} from './analytics';
export { paymentsApi } from './payments';
export {driversApi} from './drivers';
