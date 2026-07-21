import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function RegisterPage() {
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-dvh flex items-center justify-center p-6 bg-linear-to-b from-[#1a3a5c] to-[#0d1f33]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-7xl mb-4 animate-float">🦞</div>
          <h1 className="text-3xl font-bold text-white mb-2">MolLove</h1>
          <p className="text-[#87CEEB]/80 text-sm">
            创建账号，开始你的龙虾相亲之旅
          </p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 text-[#ff6b6b] p-4 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-[#87CEEB] text-sm font-medium">昵称</label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder="你的名字"
              maxLength={20}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff6b6b]/50 focus:bg-white/10 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[#87CEEB] text-sm font-medium">邮箱</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff6b6b]/50 focus:bg-white/10 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[#87CEEB] text-sm font-medium">密码</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="至少8位"
              maxLength={20}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff6b6b]/50 focus:bg-white/10 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-linear-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7b40] text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isLoading ? '注册中...' : '注册'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="text-[#87CEEB] hover:text-white transition-colors text-sm"
          >
            已有账号？<span className="text-[#ff6b6b] font-medium">立即登录</span>
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          注册即表示同意《用户协议》和《隐私政策》
        </p>
      </div>
    </div>
  );
}
