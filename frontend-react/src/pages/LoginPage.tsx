import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GameboyButton } from '../components/GameboyButton';

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#9BBC0F] to-[#8BAC0F]">
      <div className="pokemon-card p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">🎮</div>
          <h1 className="text-3xl font-bold mb-2">AIlove</h1>
          <p className="text-gray-600 text-sm">
            欢迎来到AIlove，快使用精灵球捕获你心仪的对象吧！！
          </p>
          <div className="w-full h-1 bg-black mt-4 rounded" />
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block font-bold text-sm">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              className="gameboy-input w-full p-3 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-sm">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="gameboy-input w-full p-3 rounded-xl"
            />
          </div>

          <GameboyButton
            text="登录"
            subText="继续你的冒险"
            size="large"
            loading={isLoading}
            disabled={isLoading}
            type="submit"
          />
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            to="/register"
            className="text-[#3B4CCA] font-bold underline hover:text-[#2A3BA8]"
          >
            注册新账号
          </Link>
        </div>
      </div>
    </div>
  );
}