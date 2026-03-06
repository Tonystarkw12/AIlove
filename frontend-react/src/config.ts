// API Configuration
export const API_BASE_URL = 'http://localhost:3052/api';
export const UPLOAD_BASE_URL = 'http://localhost:3052/uploads';
export const WS_URL = 'ws://localhost:3052/ws/chat';

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    WECHAT_LOGIN: '/auth/wechat-login',
  },
  USERS: {
    STATUS: '/users/me/status',
    PROFILE: '/users/me/profile',
    MATCH: '/users/me/match',
    AVATAR: '/users/me/avatar',
    ASSIGN_POKEMON: '/users/me/assign-pokemon',
  },
  MAP: {
    NEARBY: '/map/nearby',
    UPDATE_LOCATION: '/map/update-location',
  },
  CHAT: {
    MESSAGES: '/chat',
    SEND: '/chat/send',
  },
  COMMUNITY: {
    PHOTOS: '/community/photos',
    UPLOAD: '/community/upload-photo',
    LIKE: (photoId: string) => `/community/photos/${photoId}/like`,
  },
  RECOMMENDATIONS: '/recommendations',
} as const;