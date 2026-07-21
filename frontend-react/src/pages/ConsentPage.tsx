import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
const API_BASE = API_BASE_URL;

interface Consent {
  consent_id: string;
  chat_id: string;
  owner_a_wechat_consent: boolean | null;
  owner_b_wechat_consent: boolean | null;
  wechat_exchanged: boolean;
  compatibility_score: number | null;
  compatibility_analysis: string | null;
  other_owner_name: string;
  created_at: string;
}

export function ConsentPage() {
  const { token } = useAuth();
  const [pending, setPending] = useState<Consent[]>([]);
  const [history, setHistory] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Initial authenticated fetch only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = async () => {
    try {
      const [pendingRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE}/consents/pending`, authHeaders).catch(() => ({ data: { consents: [] } })),
        axios.get(`${API_BASE}/consents/history`, authHeaders).catch(() => ({ data: { consents: [] } })),
      ]);
      setPending(pendingRes.data.consents || []);
      setHistory(historyRes.data.consents || []);
    } catch (err) {
      console.error('Failed to fetch consents:', err);
    } finally {
      setLoading(false);
    }
  };

  const respond = async (consentId: string, response: 'approved' | 'declined') => {
    try {
      const res = await axios.post(
        `${API_BASE}/consents/${consentId}/respond`,
        { response },
        authHeaders
      );

      if (res.data.introduction) {
        alert('匹配成功！微信号已交换，快去联系对方吧 💕');
      } else if (res.data.consented) {
        alert('你已同意交换微信号，等待对方确认后即可完成交换');
      }

      fetchData();
    } catch (err) {
      console.error('Failed to respond:', err);
      alert('操作失败，请稍后重试');
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-linear-to-b from-[#1a3a5c] to-[#0d1f33] flex items-center justify-center">
        <div className="text-2xl animate-pulse text-[#ff6b6b]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-linear-to-b from-[#1a3a5c] to-[#0d1f33] p-4 pb-20">
      <div className="max-w-md mx-auto pt-4">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🤝</div>
          <h1 className="text-2xl font-bold text-white">微信交换</h1>
          <p className="text-[#87CEEB] text-sm">龙虾帮你们牵线搭桥</p>
        </div>

        {/* Pending Requests */}
        {pending.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#FFD93D] mb-3">待处理 ({pending.length})</h2>
            {pending.map(consent => (
              <div key={consent.consent_id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-4 border-2 border-[#FFD93D]/30">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-[#ff6b6b] rounded-full flex items-center justify-center text-2xl mr-3">
                    🦞
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{consent.other_owner_name}</h3>
                    {consent.compatibility_score && (
                      <span className="text-[#4ECDC4] text-sm">匹配度 {consent.compatibility_score}%</span>
                    )}
                  </div>
                </div>

                {consent.compatibility_analysis && (
                  <p className="text-[#B0E0E6] text-sm mb-4 bg-white/5 rounded-xl p-3">
                    {consent.compatibility_analysis}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => respond(consent.consent_id, 'approved')}
                    className="flex-1 bg-[#4ECDC4] hover:bg-[#3dbdb5] text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    ✓ 同意交换
                  </button>
                  <button
                    onClick={() => respond(consent.consent_id, 'declined')}
                    className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    ✗ 拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        <h2 className="text-lg font-bold text-white mb-3">历史记录</h2>
        {history.length === 0 && pending.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🦞</div>
            <p className="text-[#87CEEB]">还没有交换记录</p>
            <p className="text-[#87CEEB] text-sm mt-1">让你的龙虾去匹配其他龙虾吧</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map(consent => (
              <div key={consent.consent_id} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-[#ff6b6b]/50 rounded-full flex items-center justify-center text-xl mr-3">
                      {consent.wechat_exchanged ? '💕' : '⏳'}
                    </div>
                    <div>
                      <h4 className="text-white font-bold">{consent.other_owner_name}</h4>
                      <span className="text-[#87CEEB] text-xs">
                        {consent.wechat_exchanged ? '已交换' : '待确认'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[#87CEEB] text-xs">
                    {new Date(consent.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
