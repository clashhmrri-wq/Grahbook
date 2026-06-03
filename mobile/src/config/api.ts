// Backend API endpoint configuration for GrahakBook.
// Expo automatically loads variables prefixed with EXPO_PUBLIC_ from the .env file.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000';

export const API_ROUTES = {
  shopkeeperOnboard: `${API_BASE_URL}/api/shopkeepers/onboard`,
  healthCheck: `${API_BASE_URL}/health`,
};
