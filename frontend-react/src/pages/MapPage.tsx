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

// 高德地图 API Key - 从环境变量读取
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || 'cb927bb49904fd30765c001e4c03e0f5';

export function MapPage() {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(10);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  // AMap loader does not expose usable instance types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const amapRef = useRef<any>(null);
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
    // Nearby search is intentionally driven by location and radius.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, radius]);

  const initMap = async () => {
    try {
      console.log('开始初始化地图...');
      console.log('容器元素:', containerRef.current);
      console.log('AMAP_KEY:', AMAP_KEY);
      
      const AMap = await AMapLoader.load({
        key: AMAP_KEY,
        version: '2.0',
        plugins: ['AMap.Geolocation', 'AMap.Marker'],
      });

      console.log('AMap 加载成功:', AMap);

      if (!containerRef.current) {
        console.error('地图容器不存在');
        return;
      }

      // 存储 AMap 引用供后续使用
      amapRef.current = AMap;

      const map = new AMap.Map(containerRef.current, {
        viewMode: '2D',
        zoom: 15,
        center: [116.397428, 39.90923],
        mapStyle: 'amap://styles/normal',
      });

      console.log('地图实例创建成功:', map);
      mapRef.current = map;

      // 等待地图加载完成后获取定位
      map.on('complete', () => {
        console.log('地图加载完成事件触发');
        
        // 获取定位
        const geolocation = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geolocation.getCurrentPosition((status: string, result: any) => {
          console.log('定位结果:', status, result);
          if (status === 'complete') {
            const { lat, lng } = result.position;
            setUserLocation({ lat, lng });
            
            // 先设置中心点，再调整缩放级别以确保地图瓦片正确加载
            map.setCenter([lng, lat]);
            map.setZoom(15);
            
            // 强制刷新地图视图以确保瓦片加载
            map.setMapStyle('amap://styles/normal');
            
            // 调用 resize 确保地图正确渲染
            map.resize();

            // 添加自己的位置标记
            new AMap.Marker({
              position: [lng, lat],
              title: '我的位置',
              content: '<div style="background:#3B4CCA;color:white;padding:5px 10px;border-radius:50%;">我</div>',
            }).setMap(map);
            
            console.log('定位成功，地图中心:', [lng, lat]);
          } else {
            const errorMsg = result?.message || '定位失败，请检查浏览器权限设置';
            setLocationError(`定位失败：${errorMsg}`);
            setLoading(false);
            console.error('定位失败:', errorMsg);
          }
        });
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '地图初始化失败';
      setLocationError(errorMsg);
      setLoading(false);
      console.error('地图初始化错误:', error);
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
    if (!mapRef.current || !amapRef.current) return;
    const AMap = amapRef.current;

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
      {/* Location Error Display */}
      {locationError && (
        <div className="pokemon-card bg-red-100 border-4 border-red-500 p-4 mb-4">
          <div className="flex items-center gap-2 text-red-700">
            <span className="text-xl">⚠️</span>
            <span className="font-bold">{locationError}</span>
          </div>
          <p className="text-sm mt-2 text-red-600">
            请检查浏览器定位权限设置，或稍后重试
          </p>
        </div>
      )}

      {/* Map Container */}
      <div className="pokemon-card p-2 mb-4">
        <div
          ref={containerRef}
          id="map-container"
          style={{ width: '100%', height: '400px' }}
          className="w-full rounded-lg border-4 border-black bg-white"
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