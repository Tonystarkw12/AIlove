import { useState, useEffect, useRef } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import api from '../services/api';
import { GameboyButton } from '../components/GameboyButton';

interface NearbyUser {
  user_id: string;
  nickname: string;
  gender?: string;
  distance: number;
  avatar_url?: string;
  level: number;
  bio?: string;
  occupation?: string;
  location_latitude?: number;
  location_longitude?: number;
}

// 高德地图API Key - 请替换为你自己的key
const AMAP_KEY = 'YOUR_AMAP_KEY';

export function MapPage() {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(10);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy?.();
      }
    };
  }, []);

  useEffect(() => {
    if (userLocation && mapRef.current) {
      fetchNearbyUsers();
    }
  }, [userLocation, radius]);

  const initMap = async () => {
    try {
      const AMap = await AMapLoader.load({
        key: AMAP_KEY,
        version: '2.0',
        plugins: ['AMap.Geolocation', 'AMap.Marker'],
      });

      if (!containerRef.current) return;

      const map = new AMap.Map(containerRef.current, {
        viewMode: '2D',
        zoom: 14,
        center: [116.397428, 39.90923],
      });

      mapRef.current = map;

      // 获取定位
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete') {
          const { lat, lng } = result.position;
          setUserLocation({ lat, lng });
          map.setCenter([lng, lat]);

          // 添加自己的位置标记
          new AMap.Marker({
            position: [lng, lat],
            title: '我的位置',
            content: '<div style="background:#3B4CCA;color:white;padding:5px 10px;border-radius:50%;">我</div>',
          }).setMap(map);
        } else {
          console.error('定位失败:', result);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('地图初始化失败:', error);
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
      const users = response.data.nearbyUsers || response.data.users || [];
      setNearbyUsers(users);
      addMarkers(users);
    } catch (error) {
      console.error('Failed to fetch nearby users:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMarkers = (users: NearbyUser[]) => {
    if (!mapRef.current) return;
    // @ts-ignore
    const AMap = window.AMap;
    if (!AMap) return;

    users.forEach((user) => {
      if (user.location_latitude && user.location_longitude) {
        new AMap.Marker({
          position: [user.location_longitude, user.location_latitude],
          title: user.nickname,
          content: `<div style="background:#FFCB05;color:black;padding:5px 10px;border-radius:50%;font-weight:bold;border:2px solid black;">${user.nickname.charAt(0)}</div>`,
          extData: user,
        }).on('click', () => {
          setSelectedUser(user);
        }).setMap(mapRef.current);
      }
    });
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
      case 'male': return '♂️';
      case 'female': return '♀️';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#9BBC0F] to-[#8BAC0F] p-4 pb-20">
      {/* Map Container */}
      <div className="pokemon-card p-2 mb-4">
        <div
          ref={containerRef}
          className="w-full h-64 md:h-80 rounded-lg border-4 border-black"
        />
      </div>

      {/* Controls */}
      <div className="pokemon-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">📍 附近发现</h2>
          <span className="bg-[#FFCB05] px-3 py-1 rounded-full text-sm font-bold border-2 border-black">
            {nearbyUsers.length} 人
          </span>
        </div>

        <div className="mb-3">
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

        <GameboyButton text="更新我的位置" onClick={updateLocation} size="medium" />
      </div>

      {/* User List */}
      <div className="pokemon-card p-4">
        <h3 className="text-lg font-bold mb-3">附近的训练师</h3>

        {loading ? (
          <div className="text-center py-4 animate-pulse">搜索中...</div>
        ) : nearbyUsers.length === 0 ? (
          <div className="text-center py-4 text-gray-600">
            <p className="text-3xl mb-2">🔍</p>
            <p>附近没有发现其他训练师</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearbyUsers.map((user) => (
              <div
                key={user.user_id}
                onClick={() => setSelectedUser(user)}
                className="bg-white/70 p-3 rounded-lg border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 cursor-pointer hover:bg-white transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#306230] flex items-center justify-center text-white text-lg font-bold">
                  {user.nickname.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{user.nickname}</span>
                    <span>{getGenderIcon(user.gender)}</span>
                    <span className="text-xs bg-[#FFCB05] px-2 py-0.5 rounded-full border border-black">
                      Lv.{user.level}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">📍 {user.distance.toFixed(1)}km</p>
                </div>
                <button className="bg-[#3B4CCA] text-white px-3 py-1 rounded-lg font-bold border-2 border-black text-sm">
                  🔮
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
          <div className="pokemon-card p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-[#306230] flex items-center justify-center text-white text-2xl font-bold border-4 border-black">
                {selectedUser.nickname.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold">{selectedUser.nickname}</h3>
                <p className="text-gray-600">{getGenderIcon(selectedUser.gender)} Lv.{selectedUser.level}</p>
              </div>
            </div>

            {selectedUser.bio && (
              <p className="text-gray-700 mb-4 p-3 bg-white/50 rounded-lg">{selectedUser.bio}</p>
            )}

            <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
              {selectedUser.occupation && (
                <div className="bg-white/50 p-2 rounded">
                  <span className="text-gray-500">职业:</span> {selectedUser.occupation}
                </div>
              )}
              <div className="bg-white/50 p-2 rounded">
                <span className="text-gray-500">距离:</span> {selectedUser.distance.toFixed(1)}km
              </div>
            </div>

            <div className="flex gap-2">
              <GameboyButton text="发起聊天" onClick={() => setSelectedUser(null)} size="medium" />
              <GameboyButton text="发送精灵球" onClick={() => setSelectedUser(null)} variant="danger" size="medium" />
            </div>

            <button onClick={() => setSelectedUser(null)} className="w-full mt-3 py-2 text-gray-600 font-bold">
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}