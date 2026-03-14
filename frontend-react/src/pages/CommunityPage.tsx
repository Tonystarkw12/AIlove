import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { GameboyButton } from '../components/GameboyButton';

interface Photo {
  photo_id: string;
  user_id: string;
  nickname: string;
  image_url: string;
  caption: string;
  likes_count: number;
  is_liked: boolean;
  created_at: string;
}

export function CommunityPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchPhotos();
  }, [page]);

  const fetchPhotos = async () => {
    try {
      const response = await api.get('/community/photos', {
        params: { page, limit: 20 },
      });
      setPhotos(response.data.photos || []);
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (photoId: string) => {
    try {
      await api.post(`/community/photos/${photoId}/like`);
      setPhotos(photos.map(photo =>
        photo.photo_id === photoId
          ? { ...photo, likes_count: photo.likes_count + 1, is_liked: true }
          : photo
      ));
    } catch (error) {
      console.error('Failed to like photo:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#9BBC0F] to-[#8BAC0F] p-4 pb-20">
      <div className="pokemon-card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">💕 爱情墙</h1>
          <button className="bg-[#FF5A5A] text-white px-4 py-2 rounded-lg font-bold border-4 border-black">
            + 发布
          </button>
        </div>
        <p className="text-gray-600 text-sm">
          分享你的甜蜜瞬间，记录爱情的每一个美好时刻
        </p>
      </div>

      {/* Photo Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-2xl animate-pulse">加载中...</div>
        </div>
      ) : photos.length === 0 ? (
        <div className="pokemon-card p-8 text-center">
          <p className="text-4xl mb-2">📸</p>
          <p className="text-gray-600">还没有照片</p>
          <p className="text-sm mt-2">成为第一个分享的人吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.photo_id}
              className="pokemon-card overflow-hidden"
            >
              {/* Image */}
              <div className="aspect-square bg-gray-200 relative">
                {photo.image_url ? (
                  <img
                    src={photo.image_url}
                    alt={photo.caption}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    📷
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#3B4CCA] flex items-center justify-center text-white font-bold text-sm">
                      {photo.nickname.charAt(0)}
                    </div>
                    <span className="font-bold text-sm">{photo.nickname}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(photo.created_at)}
                  </span>
                </div>

                <p className="text-sm mb-3">{photo.caption}</p>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLike(photo.photo_id)}
                    disabled={photo.is_liked}
                    className={`flex items-center gap-1 ${
                      photo.is_liked ? 'text-red-500' : 'text-gray-600'
                    }`}
                  >
                    <span className="text-xl">{photo.is_liked ? '❤️' : '🤍'}</span>
                    <span className="text-sm">{photo.likes_count}</span>
                  </button>
                  <button className="text-gray-600 flex items-center gap-1">
                    <span className="text-xl">💬</span>
                    <span className="text-sm">0</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {photos.length > 0 && (
        <div className="mt-4 text-center">
          <GameboyButton
            text="加载更多"
            onClick={() => setPage(page + 1)}
            size="medium"
          />
        </div>
      )}
    </div>
  );
}