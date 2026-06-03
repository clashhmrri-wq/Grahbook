// Backend API endpoint configuration for GrahakBook.
// Expo automatically loads variables prefixed with EXPO_PUBLIC_ from the .env file.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000';

export const API_ROUTES = {
  shopkeeperOnboard: `${API_BASE_URL}/api/shopkeepers/onboard`,
  shopkeepers: `${API_BASE_URL}/api/shopkeepers`,
  healthCheck: `${API_BASE_URL}/health`,
  products: `${API_BASE_URL}/api/products`,
  nearbyShops: `${API_BASE_URL}/api/shops/nearby`,
  shopDetails: (id: string) => `${API_BASE_URL}/api/shops/${id}`,
  
  // Phase 3 routes
  customerLogin: `${API_BASE_URL}/api/customers/login`,
  createOrder: `${API_BASE_URL}/api/orders`,
  customerOrders: (customerId: string) => `${API_BASE_URL}/api/orders/customer?customerId=${customerId}`,
  shopkeeperOrders: (shopkeeperId: string) => `${API_BASE_URL}/api/orders/shopkeeper?shopkeeperId=${shopkeeperId}`,
  updateOrderStatus: (orderId: string) => `${API_BASE_URL}/api/orders/${orderId}/status`,
  completeOrder: (orderId: string) => `${API_BASE_URL}/api/orders/${orderId}/complete`,
  
  createPaymentOrder: `${API_BASE_URL}/api/payments/order`,
  verifyPayment: `${API_BASE_URL}/api/payments/verify`,
  createSaaSSubscription: `${API_BASE_URL}/api/payments/subscription`,
  verifySaaSSubscription: `${API_BASE_URL}/api/payments/subscription/verify`,
  publishToOndc: (id: string) => `${API_BASE_URL}/api/shopkeepers/${id}/ondc/publish`,
  
  createReview: `${API_BASE_URL}/api/reviews`,
  shopReviews: (shopkeeperId: string) => `${API_BASE_URL}/api/reviews?shopkeeperId=${shopkeeperId}`,
  
  shopkeeperAnalytics: (id: string) => `${API_BASE_URL}/api/shopkeepers/${id}/analytics`,
};
