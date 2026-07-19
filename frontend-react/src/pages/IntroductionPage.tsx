import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
const API_BASE = API_BASE_URL;

interface Introduction {
  introduction_id: string;
  other_owner_name: string;
  other_owner_avatar: string | null;
  status: 'exchanged' | 'connected' | 'no_response' | 'blocked';
  owner_a_wechat_id: string | null;
  owner_b_wechat_id: string | null;
  owner_a_feedback: string | null;
  owner_b_feedback: string | null;
  created_at: string;
}

export function IntroductionPage() {
  const { token } = useAuth();
  const [introductions, setIntroductions] = useState<Introduction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntroductions();
    // Initial authenticated fetch only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchIntroductions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/introductions/me`, authHeaders);
      setIntroductions(res.data.introductions || []);
    } catch (err) {
      console.error('Failed to fetch introductions:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusEmoji = (status: string) => {
    switch (status) {
      case 'connected': return '💕';
      case 'exchanged': return '🤝';
      case 'no_response': return '⏳';
      case 'blocked': return '🚫';
      default: return '📋';
    }
  };

  const statusText = (status: string) => {
    switch (status) {
      case 'connected': return '已联系';
      case 'exchanged': return '已交换';
      case 'no_response': return '等待回复';
      case 'blocked': return '已屏蔽';
      default: return '未知';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] flex items-center justify-center">
        <div className="text-2xl animate-pulse text-[#ff6b6b]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] p-4 pb-20">
      <div className="max-w-md mx-auto pt-4">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">💌</div>
          <h1 className="text-2xl font-bold text-white">介绍历史</h1>
          <p className="text-[#87CEEB] text-sm">龙虾牵线的每一次相遇</p>
        </div>

        {introductions.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🦞</div>
            <p className="text-[#87CEEB]">还没有介绍记录</p>
            <p className="text-[#87CEEB] text-sm mt-1">龙虾正在努力匹配中...</p>
            <a href="/lobster" className="inline-block mt-4 bg-[#ff6b6b] hover:bg-[#ff5252] text-white font-bold py-2 px-6 rounded-xl transition-colors">
              回到龙虾首页
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {introductions.map((intro) => (
              <div key={intro.introduction_id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#ff6b6b] to-[#ff8e53] rounded-full flex items-center justify-center text-2xl mr-3">
                    {statusEmoji(intro.status)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold">{intro.other_owner_name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        intro.status === 'connected' ? 'bg-[#4ECDC4]/20 text-[#4ECDC4]' :
                        intro.status === 'exchanged' ? 'bg-[#FFD93D]/20 text-[#FFD93D]' :
                        intro.status === 'no_response' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-[#ff6b6b]/20 text-[#ff6b6b]'
                      }`}>
                        {statusText(intro.status)}
                      </span>
                      <span className="text-[#87CEEB] text-xs">
                        {new Date(intro.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-[#B0E0E6] text-sm">
                    微信号: {intro.owner_a_wechat_id || intro.owner_b_wechat_id || '已交换'}
                  </p>
                </div>

                {/* Feedback section */}
                {!intro.owner_a_feedback && intro.status === 'exchanged' && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        const feedback = prompt('分享一下这次介绍的感受？');
                        if (feedback) {
                          axios.post(
                            `${API_BASE}/introductions/${intro.introduction_id}/feedback`,
                            { feedback },
                            authHeaders
                          ).then(() => {
                            alert('感谢你的反馈！');
                            fetchIntroductions();
                          });
                        }
                      }}
                      className="w-full bg-white/5 hover:bg-white/10 text-[#87CEEB] text-sm py-2 rounded-xl transition-colors"
                    >
                      填写反馈 →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
