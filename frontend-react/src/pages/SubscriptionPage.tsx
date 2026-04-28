import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
const API_BASE = API_BASE_URL;

interface Plan {
  type: string;
  name: string;
  price: number;
  duration: string;
  maxChatsPerDay: number;
  maxIntrosPerMonth: number;
  features: string[];
}

interface Subscription {
  plan_type: string;
  status: string;
  trial_ends_at: string | null;
  paid_ends_at: string | null;
  daysRemaining?: number;
}

export function SubscriptionPage() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        axios.get(`${API_BASE}/subscriptions/plans`),
        axios.get(`${API_BASE}/subscriptions/me`, authHeaders).catch(() => null),
      ]);
      if (plansRes.data.plans) setPlans(plansRes.data.plans);
      if (subRes?.data) setSubscription(subRes.data);
    } catch (err) {
      console.error('Failed to fetch subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const upgrade = async (planType: string) => {
    setUpgrading(planType);
    try {
      // For now, simulate upgrade (real integration would go to payment page)
      const res = await axios.post(`${API_BASE}/subscriptions/upgrade`, {
        planType,
        paymentMethod: 'wechat_pay',
        externalTransactionId: `manual_${Date.now()}`
      }, authHeaders);

      if (res.data.subscriptionId) {
        alert('升级成功！');
        fetchData();
      }
    } catch (err: any) {
      console.error('Upgrade failed:', err);
      alert('升级失败，请稍后重试');
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] flex items-center justify-center">
        <div className="text-2xl animate-pulse text-[#FFD93D]">会员加载中...</div>
      </div>
    );
  }

  const daysRemaining = subscription?.daysRemaining ?? (
    subscription?.trial_ends_at
      ? Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] p-4 pb-20">
      <div className="max-w-md mx-auto pt-4">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">💎</div>
          <h1 className="text-2xl font-bold text-white">龙虾会员</h1>
        </div>

        {/* Current Status */}
        {subscription && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/20">
            <h2 className="text-lg font-bold text-white mb-2">当前状态</h2>
            <div className="flex items-center justify-between">
              <div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  subscription.status === 'active' ? 'bg-[#4ECDC4]/20 text-[#4ECDC4]' :
                  subscription.status === 'free_trial' ? 'bg-[#FFD93D]/20 text-[#FFD93D]' :
                  'bg-[#ff6b6b]/20 text-[#ff6b6b]'
                }`}>
                  {subscription.plan_type === 'free_trial' ? '免费试用' :
                   subscription.plan_type === 'monthly' ? '月度会员' :
                   subscription.plan_type === 'quarterly' ? '季度会员' :
                   subscription.plan_type === 'annual' ? '年度会员' : '未订阅'}
                </span>
              </div>
              {daysRemaining !== null && daysRemaining > 0 && (
                <span className="text-[#FFD93D] font-bold">剩余 {daysRemaining} 天</span>
              )}
            </div>
          </div>
        )}

        {/* Plans */}
        <h2 className="text-xl font-bold text-white mb-4">选择会员计划</h2>
        <div className="space-y-4">
          {plans.filter(p => p.type !== 'free_trial').map(plan => (
            <div
              key={plan.type}
              className={`bg-white/10 backdrop-blur-sm rounded-2xl p-5 border-2 transition-all ${
                subscription?.plan_type === plan.type
                  ? 'border-[#4ECDC4] bg-[#4ECDC4]/10'
                  : 'border-white/20 hover:border-[#ff6b6b]/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <span className="text-[#87CEEB] text-sm">{plan.duration}</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#FFD93D]">¥{plan.price}</div>
                  <div className="text-[#87CEEB] text-xs">
                    {plan.type === 'monthly' ? '/月' : plan.type === 'quarterly' ? '/季' : '/年'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[#ff6b6b] font-bold">{plan.maxChatsPerDay}</div>
                  <div className="text-[#87CEEB] text-xs">对话/天</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[#4ECDC4] font-bold">{plan.maxIntrosPerMonth}</div>
                  <div className="text-[#87CEEB] text-xs">介绍/月</div>
                </div>
              </div>

              <ul className="space-y-1 mb-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="text-[#B0E0E6] text-sm flex items-center">
                    <span className="text-[#4ECDC4] mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => upgrade(plan.type)}
                disabled={upgrading === plan.type || subscription?.plan_type === plan.type}
                className={`w-full py-3 rounded-xl font-bold transition-colors ${
                  subscription?.plan_type === plan.type
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7b40] text-white'
                }`}
              >
                {upgrading === plan.type ? '处理中...' :
                 subscription?.plan_type === plan.type ? '当前计划' : '立即升级'}
              </button>
            </div>
          ))}
        </div>

        {/* Value comparison */}
        <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-2">💡 省钱小贴士</h3>
          <div className="text-[#B0E0E6] text-sm space-y-1">
            <p>月度 ¥29/月 × 12 = ¥348/年</p>
            <p>年度 ¥199/年 = 立省 <span className="text-[#4ECDC4] font-bold">¥149</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
