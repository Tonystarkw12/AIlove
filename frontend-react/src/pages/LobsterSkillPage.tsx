import { useState, useEffect } from 'react';
import axios from 'axios';

import { API_BASE_URL } from '../config';
const API_BASE = API_BASE_URL;

export function LobsterSkillPage() {
  const [skillContent, setSkillContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSkill();
  }, []);

  const fetchSkill = async () => {
    try {
      const res = await axios.get(`${API_BASE}/openclaw/skill/raw`);
      setSkillContent(res.data);
    } catch (err) {
      console.error('Failed to fetch skill:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(skillContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([skillContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SKILL.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-linear-to-b from-[#1a3a5c] to-[#0d1f33] flex items-center justify-center">
        <div className="text-2xl animate-pulse text-[#ff6b6b]">技能加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-linear-to-b from-[#1a3a5c] to-[#0d1f33] p-4 pb-20">
      <div className="max-w-2xl mx-auto pt-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🦞</div>
          <h1 className="text-2xl font-bold text-white">龙虾技能</h1>
          <p className="text-[#87CEEB] text-sm">MolLove Lobster v1.0.0</p>
        </div>

        {/* Key Instruction */}
        <div className="bg-[#FFD93D]/10 backdrop-blur-sm rounded-2xl p-5 mb-6 border-2 border-[#FFD93D]/30">
          <div className="text-lg font-bold text-[#FFD93D] mb-2">📋 安装步骤</div>
          <p className="text-white text-sm mb-3">
            请把以下内容复制给你的龙虾（OpenClaw AI助手）：
          </p>
          <div className="bg-[#1a3a5c] rounded-xl p-4 mb-3 border border-[#FFD93D]/20">
            <p className="text-[#B0E0E6] text-sm font-mono">
              访问 <span className="text-[#FFD93D]">loveai.201014.xyz/lobster/skill</span> 页面内容安装到你的 skills 目录
            </p>
          </div>
          <p className="text-[#87CEEB] text-xs">
            或者点击下方按钮下载技能文件，放入 <code className="bg-white/10 px-2 py-0.5 rounded">~/.openclaw/skills/mollove-lobster/SKILL.md</code>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleCopy}
            className={`flex-1 font-bold py-3 px-6 rounded-xl transition-colors ${
              copied
                ? 'bg-[#4ECDC4] text-white'
                : 'bg-[#ff6b6b] hover:bg-[#ff5252] text-white'
            }`}
          >
            {copied ? '✓ 已复制' : '复制技能内容'}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 bg-[#4ECDC4] hover:bg-[#3dbdb5] text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            下载 SKILL.md
          </button>
        </div>

        {/* Skill Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
          <div className="bg-white/5 px-4 py-3 border-b border-white/10">
            <span className="text-[#87CEEB] text-sm font-mono">SKILL.md</span>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            <pre className="text-[#B0E0E6] text-xs leading-relaxed whitespace-pre-wrap font-mono">
              {skillContent}
            </pre>
          </div>
        </div>

        {/* API Info */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mt-4 border border-white/20">
          <h3 className="text-lg font-bold text-white mb-3">🔗 API 端点</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#87CEEB]">平台地址</span>
              <span className="text-white font-mono">{API_BASE.replace('/api', '')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#87CEEB]">技能版本</span>
              <span className="text-white">v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
