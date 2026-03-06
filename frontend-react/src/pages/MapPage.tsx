import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { GameboyButton } from '../components/GameboyButton';

interface NearbyUser {
  user_id: string;
  nickname: string;
  gender?: string;
  distance: number;
  avatar_url?: string;
  level: number;
}

export function MapPage() {
  const {  } = useAuth();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(10);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyUsers();
    }
  }, [userLocation, radius]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setLoading(false);
        }
      );
    } else {
      setLoading(false);
    }
  };

  const fetchNearbyUsers = async () => {
    if (!userLocation) return;
    try {
      const response = await api.get('/map/nearby', {
        params: {
          lat: userLocation.lat,
          lng: userLocation.lng,
          radius: radius,
        },
      });
      setNearbyUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to fetch nearby users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async () => {
    if (!userLocation) return;
    try {
      await api.put('/users/me/location', {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
      });
      alert('位置更新成功！');
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const getGenderIcon = (gender?: string) => {
    switch (gender) {
      case 'male':
        return '♂️';
      case 'female':
        return '♀️';
      default:
        return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#9BBC0F] to-[#8BAC0F] p-4 pb-20">
      <div className="pokemon-card p-6 mb-4">
        <h1 className="text-2xl font-bold mb-4">📍 发现附近</h1>

        {/* Location Status */}
        <div className="bg-white/50 p-4 rounded-lg mb-4">
          {userLocation ? (
            <div className="text-sm">
              <p className="font-bold">当前位置:</p>
              <p className="text-gray-600">
                纬度: {userLocation.lat.toFixed(4)}°
              </p>
              <p className="text-gray-600">
                经度: {userLocation.lng.toFixed(4)}°
              </p>
            </div>
          ) : (
            <p className="text-gray-600">正在获取位置...</p>
          )}
        </div>

        {/* Radius Selector */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">搜索半径</label>
          <div className="flex gap-2 flex-wrap">
            {[1, 5, 10, 20, 50].map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`px-4 py-2 rounded-lg border-4 border-black font-bold transition-all ${
                  radius === r
                    ? 'bg-[#306230] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white hover:bg-gray-100'
                }`}
              >
                {r}km
              </button>
            ))}
          </div>
        </div>

        <GameboyButton
          text="更新我的位置"
          onClick={updateLocation}
          size="medium"
        />
      </div>

      {/* Nearby Users */}
      <div className="pokemon-card p-6">
        <h2 className="text-xl font-bold mb-4">
          附近的训练师 ({nearbyUsers.length})
        </h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-2xl animate-pulse">搜索中...</div>
          </div>
        ) : nearbyUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <p className="text-4xl mb-2">🔍</p>
            <p>附近没有发现其他训练师</p>
            <p className="text-sm mt-2">试试扩大搜索范围？</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearbyUsers.map((nearbyUser) => (
              <div
                key={nearbyUser.user_id}
                className="bg-white/70 p-4 rounded-lg border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-full bg-[#306230] flex items-center justify-center text-white text-xl font-bold">
                  {nearbyUser.nickname.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{nearbyUser.nickname}</span>
                    <span>{getGenderIcon(nearbyUser.gender)}</span>
                    <span className="text-xs bg-[#FFCB05] px-2 py-0.5 rounded-full">
                      Lv.{nearbyUser.level}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    📍 {nearbyUser.distance.toFixed(1)}km
                  </p>
                </div>
                <button className="bg-[#3B4CCA] text-white px-4 py-2 rounded-lg font-bold border-2 border-black">
                  发送精灵球
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}