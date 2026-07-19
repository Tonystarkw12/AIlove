import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HpExpBar } from '../components/HpExpBar';
import { GameboyButton } from '../components/GameboyButton';

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#9BBC0F] to-[#8BAC0F] p-4">
      <div className="pokemon-card p-6 mb-4">
        <h1 className="text-2xl font-bold mb-4">
          欢迎，{user?.nickname || '训练师'}！
        </h1>

        {user && (
          <HpExpBar
            hp={user.points || 0}
            maxHp={100}
            exp={user.points || 0}
            maxExp={1000}
          />
        )}

        <div className="mt-4">
          <p className="text-sm text-gray-600">
            VIP等级: {user?.vip_level || '普通训练师'}
          </p>
          <p className="text-sm text-gray-600">
            积分: {user?.points || 0}
          </p>
        </div>
      </div>

      <div className="pokemon-card p-6">
        <h2 className="text-xl font-bold mb-4">开始匹配</h2>
        <p className="text-gray-600 mb-4">
          点击下方按钮开始你的匹配之旅！
        </p>
        <GameboyButton
          text="开始匹配"
          subText="设置龙虾并寻找匹配"
          size="large"
          onClick={() => navigate('/lobster')}
        />
      </div>

      <div className="mt-4">
        <GameboyButton
          text="退出登录"
          variant="danger"
          onClick={logout}
        />
      </div>
    </div>
  );
}