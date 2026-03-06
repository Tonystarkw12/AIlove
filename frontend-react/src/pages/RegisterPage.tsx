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

    if (formData.password.length < 6) {
      setError('密码至少需要6位');
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
          <div className="text-6xl mb-4 animate-bounce">🎮</div>
          <h1 className="text-3xl font-bold mb-2">AIlove</h1>
          <p className="text-gray-600 text-sm">
            欢迎来到AIlove，快使用精灵球捕获你心仪的对象吧！！
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
              placeholder="6-20位密码"
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