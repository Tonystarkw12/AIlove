import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import { API_ENDPOINTS } from '../config';

interface User {
  id: number;
  email: string;
  nickname: string;
  points: number;
  level?: number;
  pokemon_avatar_id?: string;
  vip_level?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (nickname: string, email: string, password: string) => Promise<void>;
  wechatLogin: (code: string, userInfo: { nickName: string; avatarUrl?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const response = await api.get(API_ENDPOINTS.USERS.STATUS);
          setUser(response.data);
          setToken(savedToken);
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    validateToken();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
    const { token: newToken, userId, nickname, message } = response.data;

    // 构建用户对象
    const userData = {
      id: userId,
      email: email,
      nickname: nickname,
      points: 0,
      level: 1,
    };

    localStorage.setItem('token', newToken);
    localStorage.setItem('userData', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const register = async (nickname: string, email: string, password: string) => {
    const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, { nickname, email, password });
    const { token: newToken, userId, message } = response.data;

    // 构建用户对象
    const userData = {
      id: userId,
      email: email,
      nickname: nickname,
      points: 0,
      level: 1,
    };

    localStorage.setItem('token', newToken);
    localStorage.setItem('userData', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  const wechatLogin = async (code: string, userInfo: { nickName: string; avatarUrl?: string }) => {
    const response = await api.post(API_ENDPOINTS.AUTH.WECHAT_LOGIN, { code, userInfo });
    const { token: newToken, user } = response.data;

    const userData = {
      id: user.userId,
      email: user.email || '',
      nickname: user.nickname || userInfo.nickName,
      points: user.points || 0,
      level: user.level || 1,
    };

    localStorage.setItem('token', newToken);
    localStorage.setItem('userData', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, wechatLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}