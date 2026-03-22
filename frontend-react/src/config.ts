// API Configuration
export const API_BASE_URL = 'http://192.168.0.14:3052/api';
export const UPLOAD_BASE_URL = 'http://192.168.0.14:3052/uploads';
export const WS_URL = 'ws://192.168.0.14:3052/ws/chat';
export const MUSIC_BASE_URL = 'http://192.168.0.14:3052/music';
export const PICTURES_BASE_URL = 'http://192.168.0.14:3052/pictures';

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
  POKEBALL: {
    BALANCE: '/pokeball/balance',
    HISTORY: '/pokeball/history',
    RECHARGE: '/pokeball/recharge',
    CONSUME: '/pokeball/consume',
    CONFIRM_PAYMENT: '/pokeball/confirm-payment',
  },
  RECOMMENDATIONS: '/recommendations',
} as const;

// QR Code images mapping to amounts (filename hash -> amount shown in image)
export const QR_CODE_IMAGES = {
  1: '5443633d2ed15065ce4ec7425f78c861.jpg',      // ¥1.00
  5: 'd8ed6d84c8a8d3370c46a0fb95feed57.jpg',      // ¥5.00
  10: '6542f00d80affe884a9874bbe39dc2b2.jpg',     // ¥10.00
  20: '291a087c7b9f2211de1b8078ab4eb6f6.jpg',     // ¥20.00
  50: '8d0cc8904ccb7da00f86d87282166b01.jpg',     // ¥50.00
  100: '0c5a516cebe2de0af541055c17258904.jpg',    // ¥100.00
} as const;