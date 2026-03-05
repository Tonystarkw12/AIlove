// ===========================================
// AI月老 Frontend Configuration
// ===========================================
// To change API endpoints, modify these values:
// - For development: http://localhost:3052
// - For production: your deployed backend URL

// Backend API Configuration
export const API_BASE_URL = 'http://localhost:3052/api';
export const UPLOAD_BASE_URL = 'http://localhost:3052/uploads';

// App Configuration
export const APP_TITLE = 'AI月老';

// API Endpoint Paths
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login'
  },
  USERS: {
    PROFILE: '/users/me/profile',
    PHOTOS: '/users/me/photos',
    AVATAR: '/users/me/avatar'
  },
  RECOMMENDATIONS: '/recommendations',
  CHAT: '/chat'
}; 