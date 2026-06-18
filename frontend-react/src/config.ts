// API Configuration - detect production domain
const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// In production (loveai.201014.xyz), use relative URLs so nginx can proxy to backend
const apiBase = isProduction ? '/api' : 'http://192.168.0.14:3052/api';
const uploadBase = isProduction ? '/uploads' : 'http://192.168.0.14:3052/uploads';
const wsBase = isProduction ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host : 'ws://192.168.0.14:3052';
const musicBase = isProduction ? '/music' : 'http://192.168.0.14:3052/music';
const picturesBase = isProduction ? '/pictures' : 'http://192.168.0.14:3052/pictures';

// Allow override via Vite env vars
export const API_BASE_URL = import.meta.env.VITE_API_URL || apiBase;
export const UPLOAD_BASE_URL = import.meta.env.VITE_UPLOAD_URL || uploadBase;
export const WS_URL = import.meta.env.VITE_WS_URL || wsBase + '/ws/chat';
export const WS_OWNER_URL = (import.meta.env.VITE_WS_URL || wsBase) + '/ws/owner';
export const MUSIC_BASE_URL = import.meta.env.VITE_MUSIC_URL || musicBase;
export const PICTURES_BASE_URL = import.meta.env.VITE_PICTURES_URL || picturesBase;

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