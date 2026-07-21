import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { HpExpBar } from '../components/HpExpBar';
import { GameboyButton } from '../components/GameboyButton';

interface UserProfile {
  user_id: string;
  nickname: string;
  email: string;
  gender?: string;
  birth_date?: string;
  height_cm?: number;
  weight_kg?: number;
  occupation?: string;
  bio?: string;
  avatar_url?: string;
  points: number;
  level: number;
  pokeball_count?: number;
}

export function ProfilePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/me/profile');
      setProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      await api.put('/users/me/profile', profile);
      setIsEditing(false);
      alert('保存成功！');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('保存失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-linear-to-b from-[#9BBC0F] to-[#8BAC0F]">
        <div className="text-2xl animate-pulse">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-linear-to-b from-[#9BBC0F] to-[#8BAC0F] p-4 pb-20">
      {/* Header & Avatar */}
      <div className="pokemon-card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">个人资料</h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-[#306230] font-bold"
          >
            {isEditing ? '取消' : '编辑'}
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 rounded-full bg-[#306230] flex items-center justify-center text-white text-3xl font-bold border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {profile?.nickname?.charAt(0) || '?'}
          </div>
        </div>

        {profile && (
          <HpExpBar
            hp={profile.points || 0}
            maxHp={100}
            exp={profile.points || 0}
            maxExp={1000}
          />
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 text-sm text-center">
          <div className="bg-white/50 p-2 rounded">
            <p className="text-gray-600">等级</p>
            <p className="font-bold">Lv.{profile?.level || 1}</p>
          </div>
          <div className="bg-white/50 p-2 rounded">
            <p className="text-gray-600">积分</p>
            <p className="font-bold">{profile?.points || 0}</p>
          </div>
          <div className="bg-[#FFCB05] p-2 rounded border-2 border-black">
            <p className="text-gray-700">🔮</p>
            <p className="font-bold">{profile?.pokeball_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Pokeball Purchase */}
      <div className="pokemon-card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">🔮 精灵球</h2>
            <p className="text-sm text-gray-600">用于发起匹配</p>
          </div>
          <GameboyButton
            text="购买"
            onClick={() => navigate('/pokeball')}
            size="small"
          />
        </div>
      </div>

      {/* Profile Form */}
      <div className="pokemon-card p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">昵称</label>
            <input
              type="text"
              value={profile?.nickname || ''}
              onChange={(e) => setProfile({ ...profile!, nickname: e.target.value })}
              disabled={!isEditing}
              className="w-full p-3 border-4 border-black rounded-lg bg-white disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">性别</label>
            <select
              value={profile?.gender || ''}
              onChange={(e) => setProfile({ ...profile!, gender: e.target.value })}
              disabled={!isEditing}
              className="w-full p-3 border-4 border-black rounded-lg bg-white disabled:bg-gray-100"
            >
              <option value="">未设置</option>
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">生日</label>
            <input
              type="date"
              value={profile?.birth_date || ''}
              onChange={(e) => setProfile({ ...profile!, birth_date: e.target.value })}
              disabled={!isEditing}
              className="w-full p-3 border-4 border-black rounded-lg bg-white disabled:bg-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-bold mb-1">身高(cm)</label>
              <input
                type="number"
                value={profile?.height_cm || ''}
                onChange={(e) => setProfile({ ...profile!, height_cm: parseInt(e.target.value) || undefined })}
                disabled={!isEditing}
                className="w-full p-3 border-4 border-black rounded-lg bg-white disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">体重(kg)</label>
              <input
                type="number"
                value={profile?.weight_kg || ''}
                onChange={(e) => setProfile({ ...profile!, weight_kg: parseInt(e.target.value) || undefined })}
                disabled={!isEditing}
                className="w-full p-3 border-4 border-black rounded-lg bg-white disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">职业</label>
            <input
              type="text"
              value={profile?.occupation || ''}
              onChange={(e) => setProfile({ ...profile!, occupation: e.target.value })}
              disabled={!isEditing}
              className="w-full p-3 border-4 border-black rounded-lg bg-white disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">个人简介</label>
            <textarea
              value={profile?.bio || ''}
              onChange={(e) => setProfile({ ...profile!, bio: e.target.value })}
              disabled={!isEditing}
              rows={3}
              className="w-full p-3 border-4 border-black rounded-lg bg-white disabled:bg-gray-100 resize-none"
            />
          </div>

          {isEditing && (
            <GameboyButton text="保存资料" onClick={handleSave} size="large" />
          )}
        </div>
      </div>

      <div className="mt-4">
        <GameboyButton text="退出登录" variant="danger" onClick={logout} />
      </div>
    </div>
  );
}