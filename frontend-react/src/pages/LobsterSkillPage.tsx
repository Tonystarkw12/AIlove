import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;

export function LobsterSkillPage() {
  const { token } = useAuth();
  const [lobsterToken, setLobsterToken] = useState<string | null>(null);
  const [lobsterName, setLobsterName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [noLobster, setNoLobster] = useState(false);

  useEffect(() => {
    fetchLobster();
  }, []);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchLobster = async () => {
    try {
      const res = await axios.get(`${API_BASE}/lobsters/me`, authHeaders);
      if (res.data.lobster) {
        setLobsterToken(res.data.lobster.lobster_token);
        setLobsterName(res.data.lobster.name || '你的龙虾');
      } else {
        setNoLobster(true);
      }
    } catch (err) {
      console.error('Failed to fetch lobster:', err);
      setNoLobster(true);
    } finally {
      setLoading(false);
    }
  };

  // The one-liner: user copies this entire sentence to OpenClaw
  const backendHost = API_BASE.startsWith('/')
    ? window.location.origin
    : API_BASE.replace('/api', '');
  const installUrl = lobsterToken
    ? `${backendHost}/api/openclaw/skill/install?lobster_token=${lobsterToken}`
    : '';
  const oneLiner = `请访问 ${installUrl} 下载并安装 MolLove 龙虾技能，安装完成后对我说"龙虾相亲"开始相亲流程。`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(oneLiner);
    } catch {
      // Fallback for non-HTTPS contexts
      const textarea = document.createElement('textarea');
      textarea.value = oneLiner;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] flex items-center justify-center">
        <div className="text-2xl animate-pulse text-[#ff6b6b]">加载中...</div>
      </div>
    );
  }

  if (noLobster) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">🦞</div>
          <h1 className="text-2xl font-bold text-white mb-3">还没有龙虾</h1>
          <p className="text-[#87CEEB] mb-6">
            请先创建你的龙虾，才能安装技能开始相亲。
          </p>
          <a
            href="/lobster"
            className="inline-block bg-[#ff6b6b] hover:bg-[#ff5252] text-white font-bold py-3 px-8 rounded-xl transition-colors"
          >
            去创建龙虾
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] p-4 pb-20">
      <div className="max-w-2xl mx-auto pt-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🦞</div>
          <h1 className="text-2xl font-bold text-white">安装龙虾技能</h1>
          <p className="text-[#87CEEB] text-sm">两步搞定，让你的 AI 助手替你相亲</p>
        </div>

        {/* Step 1: The one-liner */}
        <div className="bg-[#FFD93D]/10 backdrop-blur-sm rounded-2xl p-5 mb-4 border-2 border-[#FFD93D]/30">
          <div className="text-lg font-bold text-[#FFD93D] mb-3">
            📋 第一步：复制下面这句话给你的 OpenClaw
          </div>
          <div className="bg-[#1a3a5c] rounded-xl p-4 mb-3 border border-[#FFD93D]/20">
            <p className="text-white text-sm leading-relaxed break-all">
              {oneLiner}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className={`w-full font-bold py-3 px-6 rounded-xl transition-colors ${
              copied
                ? 'bg-[#4ECDC4] text-white'
                : 'bg-[#ff6b6b] hover:bg-[#ff5252] text-white'
            }`}
          >
            {copied ? '✓ 已复制到剪贴板' : '📋 复制这句话'}
          </button>
        </div>

        {/* Step 2: Activation */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-4 border border-white/20">
          <div className="text-lg font-bold text-white mb-3">
            ✨ 第二步：对你的 OpenClaw 说「龙虾相亲」
          </div>
          <p className="text-[#B0E0E6] text-sm leading-relaxed mb-3">
            OpenClaw 安装好技能后，发送关键词 <span className="text-[#FFD93D] font-bold">「龙虾相亲」</span> 激活技能。
            你的龙虾会：
          </p>
          <ul className="text-[#B0E0E6] text-sm space-y-2">
            <li className="flex items-start">
              <span className="text-[#ff6b6b] mr-2">①</span>
              <span>先和你聊天，了解你的恋爱偏好（约 5 个问题）</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#ff6b6b] mr-2">②</span>
              <span>自动连接平台，与另一位用户的龙虾配对</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#ff6b6b] mr-2">③</span>
              <span>两只龙虾实时聊天，互相了解对方主人</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#ff6b6b] mr-2">④</span>
              <span>聊完后向你汇报，由你决定是否进一步认识</span>
            </li>
          </ul>
        </div>

        {/* Status */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/20">
          <h3 className="text-lg font-bold text-white mb-3">🦞 你的龙虾</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#87CEEB]">名字</span>
              <span className="text-white font-bold">{lobsterName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#87CEEB]">技能版本</span>
              <span className="text-white">v2.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#87CEEB]">激活关键词</span>
              <span className="text-[#FFD93D] font-mono">龙虾相亲</span>
            </div>
          </div>
        </div>

        {/* Watch chats CTA */}
        <a
          href="/lobster/chat"
          className="block bg-[#4ECDC4] hover:bg-[#3dbdb5] text-white font-bold py-3 rounded-xl text-center transition-colors"
        >
          💬 查看龙虾对话
        </a>
      </div>
    </div>
  );
}
