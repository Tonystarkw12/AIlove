import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3052/api';

interface Lobster {
  lobster_id: string;
  owner_id: string;
  name: string;
  personality_profile: any;
  avatar_url: string | null;
  status: 'active' | 'paused' | 'suspended';
  total_matches_evaluated: number;
  total_introductions_facilitated: number;
  last_active_at: string;
  matching_criteria: any;
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

  useEffect(() => {
    fetchLobsterData();
  }, []);

  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const fetchLobsterData = async () => {
    try {
      const [lobsterRes, statsRes, subRes] = await Promise.all([
        axios.get(`${API_BASE}/lobsters/me`, authHeaders).catch(() => null),
        axios.get(`${API_BASE}/lobsters/me/stats`, authHeaders).catch(() => null),
        axios.get(`${API_BASE}/subscriptions/me`, authHeaders).catch(() => null),
      ]);

      if (lobsterRes?.data?.lobster) {
        setLobster(lobsterRes.data.lobster);
        setInitialized(true);
      }
      if (statsRes?.data) setStats(statsRes.data);
      if (subRes?.data) setSubscription(subRes.data);
    } catch (err) {
      console.error('Failed to fetch lobster data:', err);
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
    } catch (err) {
      console.error('Failed to initialize lobster:', err);
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
    } catch (err: any) {
      if (err.response?.status === 402) {
        alert('订阅已过期，请升级后继续匹配');
      }
    }
  };

  const daysRemaining = subscription?.daysRemaining ?? (
    subscription?.trial_ends_at
      ? Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] flex items-center justify-center">
        <div className="text-2xl animate-pulse text-[#ff6b6b]">龙虾加载中...</div>
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
            <p className="text-[#B0E0E6] mb-4 text-sm">让你的 OpenClaw 装上龙虾技能，开始偏好收集</p>
            <button
              onClick={() => window.open(`${API_BASE}/openclaw/skill/download`, '_blank')}
              className="w-full bg-[#ff6b6b] hover:bg-[#ff5252] text-white font-bold py-3 px-6 rounded-xl transition-colors mb-3"
            >
              下载技能文件 (SKILL.md)
            </button>
            <p className="text-[#87CEEB] text-xs">
              下载后放入 ~/.openclaw/skills/mollove-lobster/ 目录，然后运行 /lobster-setup
            </p>
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
          <div className="text-5xl mb-2">🦞</div>
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
                  {subscription.plan_type === 'free_trial' ? '免费试用' : '付费会员'}
                </span>
                {daysRemaining !== null && daysRemaining > 0 && (
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
          <a href="/lobster-settings" className="block mt-3 text-[#87CEEB] text-sm text-center underline">
            修改龙虾设置 →
          </a>
        </div>

        {/* Quick Links */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <h2 className="text-lg font-bold text-white mb-3">快捷入口</h2>
          <div className="space-y-3">
            <a href="/recommendations" className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
              <span className="text-[#B0E0E6]">💕 匹配推荐</span>
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
