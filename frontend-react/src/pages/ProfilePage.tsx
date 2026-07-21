import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import axios from 'axios';

interface UserProfile {
  user_id: string;
  nickname: string;
  email: string;
  created_at: string;
}

export function ProfilePage() {
  const { logout, token, user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/me/profile`, authHeaders);
      setProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-4xl animate-pulse">🦞</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-4 pb-24">
      <div className="max-w-md mx-auto pt-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-linear-to-br from-[#ff6b6b] to-[#ff8e53] flex items-center justify-center text-4xl text-white font-bold mb-4 shadow-lg">
            {profile?.nickname?.charAt(0) || user?.nickname?.charAt(0) || '?'}
          </div>
          <h1 className="text-2xl font-bold text-white">
            {profile?.nickname || user?.nickname || '用户'}
          </h1>
          <p className="text-[#87CEEB]/60 text-sm mt-1">
            {profile?.email || user?.email}
          </p>
        </div>

        {/* Account Info */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 mb-4 border border-white/10">
          <h2 className="text-lg font-bold text-white mb-4">账号信息</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[#87CEEB]/60 text-sm">用户ID</span>
              <span className="text-white text-sm font-mono">
                {profile?.user_id?.slice(0, 8) || '...'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#87CEEB]/60 text-sm">注册时间</span>
              <span className="text-white text-sm">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 mb-4 border border-white/10">
          <h2 className="text-lg font-bold text-white mb-4">快捷入口</h2>
          <div className="space-y-3">
            <a
              href="/subscription"
              className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <span className="text-[#87CEEB]">💎 会员中心</span>
              <span className="text-white/40">→</span>
            </a>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full py-4 bg-white/5 hover:bg-white/10 text-[#ff6b6b] font-medium rounded-2xl transition-all border border-white/10 active:scale-[0.98]"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
