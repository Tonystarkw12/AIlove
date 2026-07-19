import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

import { API_BASE_URL } from '../config';
const API_BASE = API_BASE_URL;

interface Lobster {
  lobster_id: string;
  owner_id: string;
  name: string;
  personality_profile: Record<string, unknown>;
  avatar_url: string | null;
  status: 'active' | 'paused' | 'suspended';
  total_matches_evaluated: number;
  total_introductions_facilitated: number;
  last_active_at: string;
  matching_criteria: Record<string, unknown>;
  dealbreakers: string[];
  conversation_style: string;
  created_at: string;
  owner_nickname: string;
}

interface LobsterStats {
  lobster: Lobster;
  activeChats: number;
  completedChats: number;
  pendingConsents: number;
}

interface Subscription {
  plan_type: string;
  status: string;
  trial_ends_at: string | null;
  paid_ends_at: string | null;
  daysRemaining?: number;
}

export function LobsterPage() {
  const { token } = useAuth();
  const [lobster, setLobster] = useState<Lobster | null>(null);
  const [stats, setStats] = useState<LobsterStats | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [trialCountdown, setTrialCountdown] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetchLobsterData();
    // Initial authenticated fetch only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time trial countdown
  useEffect(() => {
    const updateCountdown = () => {
      if (subscription?.trial_ends_at) {
        const diff = new Date(subscription.trial_ends_at).getTime() - Date.now();
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTrialCountdown(`${days}天${hours}时${mins}分`);
        } else {
          setTrialCountdown('已过期');
        }
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [subscription]);

  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const fetchLobsterData = async () => {
    setError('');
    try {
      const lobsterRes = await axios.get(`${API_BASE}/lobsters/me`, authHeaders);
      setLobster(lobsterRes.data.lobster);
      setInitialized(Boolean(lobsterRes.data.lobster));

      const [statsRes, subRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/lobsters/me/stats`, authHeaders),
        axios.get(`${API_BASE}/subscriptions/me`, authHeaders),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (subRes.status === 'fulfilled') setSubscription(subRes.value.data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setInitialized(false);
      } else {
        setError('龙虾数据加载失败，请检查网络后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeLobster = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/lobsters/initialize`, {}, authHeaders);
      if (res.data.lobster) {
        setLobster(res.data.lobster);
        setInitialized(true);
      }
      await fetchLobsterData();
    } catch {
      setError('龙虾激活失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const togglePause = async () => {
    try {
      const endpoint = lobster?.status === 'active' ? 'pause' : 'resume';
      await axios.post(`${API_BASE}/lobsters/me/${endpoint}`, {}, authHeaders);
      setLobster(prev => prev ? { ...prev, status: endpoint === 'pause' ? 'paused' : 'active' } : null);
    } catch (err) {
      console.error('Failed to toggle lobster:', err);
    }
  };

  const triggerMatch = async () => {
    try {
      await axios.post(`${API_BASE}/lobsters/me/match-now`, {}, authHeaders);
      setNotice('匹配任务已启动，龙虾会在后台寻找合适对象');
      setError('');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 402) {
        setError('订阅已过期，请升级后继续匹配');
      } else {
        setError('匹配启动失败，请稍后重试');
      }
    }
  };

  const daysRemaining = subscription?.daysRemaining ?? (
    subscription?.trial_ends_at
      ? Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null
  );

  // Generate lobster avatar color/style based on conversation style
  const getLobsterAvatar = (style?: string) => {
    const colors: Record<string, string> = {
      friendly: 'from-[#ff6b6b] to-[#ff8e53]',
      direct: 'from-[#4ECDC4] to-[#3dbdb5]',
      playful: 'from-[#FFD93D] to-[#ff8e53]',
      serious: 'from-[#6c5ce7] to-[#a29bfe]',
    };
    return colors[style || 'friendly'] || colors.friendly;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] flex items-center justify-center">
        <div className="text-2xl animate-pulse text-[#ff6b6b]">龙虾加载中...</div>
      </div>
    );
  }

  if (error && !initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] flex items-center justify-center p-4">
        <div className="bg-white/10 border border-white/20 rounded-2xl p-6 text-center max-w-md">
          <p role="alert" className="text-[#ff8e8e] mb-4">{error}</p>
          <button onClick={() => { setLoading(true); void fetchLobsterData(); }} className="bg-[#ff6b6b] text-white font-bold py-3 px-6 rounded-xl">
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🦞</div>
            <h1 className="text-3xl font-bold text-white mb-2">欢迎使用龙虾恋爱</h1>
            <p className="text-[#87CEEB] text-lg">让你的龙虾替你先谈恋爱</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">🦞 什么是龙虾恋爱？</h2>
            <ul className="text-[#B0E0E6] space-y-3">
              <li className="flex items-start">
                <span className="text-[#ff6b6b] mr-2">①</span>
                <span>安装 OpenClaw 龙虾技能到你的 AI 助手</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#ff6b6b] mr-2">②</span>
                <span>龙虾会和你聊天，了解你的恋爱偏好</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#ff6b6b] mr-2">③</span>
                <span>你的龙虾会在平台上和其他龙虾"相亲"</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#ff6b6b] mr-2">④</span>
                <span>匹配成功后，龙虾会帮你们交换微信号</span>
              </li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">📦 安装龙虾技能</h2>
            <p className="text-[#B0E0E6] mb-4 text-sm">
              请把以下内容复制给你的龙虾：
            </p>
            <div className="bg-[#1a3a5c] rounded-xl p-4 mb-4 border border-[#FFD93D]/20">
              <p className="text-[#FFD93D] text-sm font-mono">
                访问 loveai.201014.xyz/lobster/skill 页面获取页面内容安装到你的 skills 目录
              </p>
            </div>
            <p className="text-[#87CEEB] text-sm mb-4">
              或者直接下载技能文件：
            </p>
            <a href="/lobster/skill" className="block w-full bg-[#ff6b6b] hover:bg-[#ff5252] text-white font-bold py-3 px-6 rounded-xl transition-colors text-center">
              查看龙虾技能详情 →
            </a>
          </div>

          <button
            onClick={initializeLobster}
            className="w-full bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7b40] text-white font-bold py-4 px-6 rounded-2xl text-lg transition-all shadow-lg"
          >
            🦞 激活我的龙虾
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] p-4 pb-20">
      <div className="max-w-md mx-auto pt-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${getLobsterAvatar(lobster?.conversation_style)} flex items-center justify-center text-4xl shadow-lg mb-3`}>
            🦞
          </div>
          <h1 className="text-2xl font-bold text-white">{lobster?.name || '我的龙虾'}</h1>
          <p className="text-[#87CEEB] text-sm">
            {lobster?.status === 'active' ? '正在工作中...' : '已暂停'}
          </p>
        </div>

        {/* Subscription Status */}
        {subscription && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[#B0E0E6] text-sm">
                  {subscription.plan_type === 'free_trial' ? '免费试用' :
                   subscription.plan_type === 'monthly' ? '月度会员' :
                   subscription.plan_type === 'quarterly' ? '季度会员' :
                   subscription.plan_type === 'annual' ? '年度会员' : '付费会员'}
                </span>
                {trialCountdown && (
                  <div className="text-[#ff6b6b] font-bold text-lg">
                    {subscription.plan_type === 'free_trial' ? '试用剩余 ' : '剩余 '}{trialCountdown}
                  </div>
                )}
                {daysRemaining !== null && daysRemaining > 0 && !trialCountdown && (
                  <div className="text-[#ff6b6b] font-bold text-lg">
                    剩余 {daysRemaining} 天
                  </div>
                )}
              </div>
              <a href="/subscription" className="bg-[#ff6b6b] hover:bg-[#ff5252] text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                {subscription.plan_type === 'free_trial' ? '升级会员' : '管理订阅'}
              </a>
            </div>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/20">
            <h2 className="text-lg font-bold text-white mb-3">龙虾数据</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#ff6b6b]">{lobster?.total_matches_evaluated || 0}</div>
                <div className="text-[#87CEEB] text-xs">已评估</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#4ECDC4]">{stats.activeChats}</div>
                <div className="text-[#87CEEB] text-xs">对话中</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#FFD93D]">{lobster?.total_introductions_facilitated || 0}</div>
                <div className="text-[#87CEEB] text-xs">已介绍</div>
              </div>
            </div>
            {stats.pendingConsents > 0 && (
              <div className="mt-3 bg-[#ff6b6b]/20 rounded-xl p-3 text-center">
                <span className="text-[#ff6b6b] font-bold">
                  有 {stats.pendingConsents} 个待确认的微信交换请求
                </span>
                <a href="/consents" className="block mt-2 text-white underline">去处理 →</a>
              </div>
            )}
          </div>
        )}

        {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/20 p-3 text-center text-[#ffb3b3]">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-500/20 p-3 text-center text-[#b8f5d2]">{notice}</p>}

        {/* Controls */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/20">
          <h2 className="text-lg font-bold text-white mb-3">龙虾控制</h2>
          <div className="flex gap-3">
            <button
              onClick={togglePause}
              className="flex-1 bg-[#4ECDC4] hover:bg-[#3dbdb5] text-white font-bold py-3 px-4 rounded-xl transition-colors"
            >
              {lobster?.status === 'active' ? '⏸️ 暂停' : '▶️ 恢复'}
            </button>
            <button
              onClick={triggerMatch}
              className="flex-1 bg-[#ff6b6b] hover:bg-[#ff5252] text-white font-bold py-3 px-4 rounded-xl transition-colors"
            >
              🔍 立即匹配
            </button>
          </div>
        </div>

        {/* Conversation Style */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/20">
          <h2 className="text-lg font-bold text-white mb-3">龙虾性格</h2>
          <div className="flex items-center justify-between">
            <span className="text-[#B0E0E6]">对话风格</span>
            <span className="bg-[#4ECDC4]/20 text-[#4ECDC4] px-3 py-1 rounded-full text-sm">
              {lobster?.conversation_style === 'friendly' ? '友善型' :
               lobster?.conversation_style === 'direct' ? '直接型' :
               lobster?.conversation_style === 'playful' ? '活泼型' : '认真型'}
            </span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <h2 className="text-lg font-bold text-white mb-3">快捷入口</h2>
          <div className="space-y-3">
            <a href="/lobster/skill" className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
              <span className="text-[#B0E0E6]">🦞 龙虾技能</span>
              <span className="text-[#87CEEB]">→</span>
            </a>
            <a href="/lobster/chat" className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
              <span className="text-[#B0E0E6]">💬 龙虾对话</span>
              <span className="text-[#87CEEB]">→</span>
            </a>
            <a href="/consents" className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
              <span className="text-[#B0E0E6]">🤝 微信交换</span>
              <span className="text-[#87CEEB]">→</span>
            </a>
            <a href="/introductions" className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
              <span className="text-[#B0E0E6]">💌 介绍历史</span>
              <span className="text-[#87CEEB]">→</span>
            </a>
            <a href="/subscription" className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
              <span className="text-[#B0E0E6]">💎 会员中心</span>
              <span className="text-[#87CEEB]">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
