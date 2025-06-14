export const API_BASE_URL = '/api'; // Changed for Docker proxy
export const UPLOAD_BASE_URL = '/uploads'; // Changed for Docker proxy (assuming Nginx also proxies this if needed)

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
