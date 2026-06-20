import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('请输入邮箱和密码');
      return;
    }

    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailReg.test(email)) {
      setError('请输入正确的邮箱格式');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-7xl mb-4 animate-float">🦞</div>
          <h1 className="text-3xl font-bold text-white mb-2">MolLove</h1>
          <p className="text-[#87CEEB]/80 text-sm">
            让你的龙虾替你谈恋爱
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 text-[#ff6b6b] p-4 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-[#87CEEB] text-sm font-medium">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff6b6b]/50 focus:bg-white/10 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[#87CEEB] text-sm font-medium">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff6b6b]/50 focus:bg-white/10 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7b40] text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            to="/register"
            className="text-[#87CEEB] hover:text-white transition-colors text-sm"
          >
            没有账号？<span className="text-[#ff6b6b] font-medium">立即注册</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
