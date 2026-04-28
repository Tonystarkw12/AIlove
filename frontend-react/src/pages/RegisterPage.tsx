import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GameboyButton } from '../components/GameboyButton';

export function RegisterPage() {
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, wechatLogin } = useAuth();
  const navigate = useNavigate();

  const handleWechatLogin = async () => {
    // For PakePlus mobile app, this will trigger WeChat authorization
    // In the meantime, simulate a WeChat login for testing
    const mockCode = 'mock_wechat_code_' + Date.now();
    const mockUserInfo = {
      nickName: '微信训练师_' + Math.random().toString(36).substring(7),
      avatarUrl: '',
    };

    setIsLoading(true);
    try {
      await wechatLogin(mockCode, mockUserInfo);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '微信登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.nickname.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('请填写所有字段');
      return;
    }

    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailReg.test(formData.email)) {
      setError('请输入正确的邮箱格式');
      return;
    }

    if (formData.password.length < 8) {
      setError('密码至少需要8位');
      return;
    }

    setIsLoading(true);
    try {
      await register(formData.nickname, formData.email, formData.password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#9BBC0F] to-[#8BAC0F]">
      <div className="pokemon-card p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">🦞</div>
          <h1 className="text-3xl font-bold mb-2">LobLove</h1>
          <p className="text-gray-600 text-sm">
            龙虾红娘，AI替你牵线搭桥
          </p>
          <div className="w-full h-1 bg-black mt-4 rounded" />
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block font-bold text-sm">昵称</label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder="请输入昵称"
              maxLength={20}
              className="gameboy-input w-full p-3 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-sm">邮箱</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="请输入邮箱"
              className="gameboy-input w-full p-3 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-sm">密码</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="8-20位密码"
              maxLength={20}
              className="gameboy-input w-full p-3 rounded-xl"
            />
          </div>

          <GameboyButton
            text="注册并登录"
            subText="开始你的训练师之旅"
            size="large"
            loading={isLoading}
            disabled={isLoading}
            type="submit"
          />
        </form>

        {/* Divider */}
        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-400" />
          <span className="text-gray-500 text-sm font-bold">或使用微信登录</span>
          <div className="flex-1 h-px bg-gray-400" />
        </div>

        {/* WeChat Login Button */}
        <button
          onClick={handleWechatLogin}
          disabled={isLoading}
          className="w-full mt-4 py-3 bg-[#07C160] hover:bg-[#06AD56] text-white font-bold rounded-xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span className="text-xl">📱</span>
          <span>微信一键登录</span>
        </button>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="text-[#3B4CCA] font-bold underline hover:text-[#2A3BA8]"
          >
            已有账号？立即登录
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          注册即表示同意《用户协议》和《隐私政策》
        </p>
      </div>
    </div>
  );
}