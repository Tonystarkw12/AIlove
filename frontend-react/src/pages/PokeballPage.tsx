import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { GameboyButton } from '../components/GameboyButton';
import { PICTURES_BASE_URL, QR_CODE_IMAGES } from '../config';

interface TransactionRecord {
  id: number;
  type: 'recharge' | 'consume';
  amount: number;
  description: string;
  balance_after: number;
  created_at: string;
}

const AMOUNT_OPTIONS = [
  { value: 1, pokeball: 1 },
  { value: 5, pokeball: 5 },
  { value: 10, pokeball: 10 },
  { value: 20, pokeball: 20 },
  { value: 50, pokeball: 50 },
  { value: 100, pokeball: 100 },
];

export function PokeballPage() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [balanceRes, historyRes] = await Promise.all([
        api.get('/pokeball/balance'),
        api.get('/pokeball/history?limit=10'),
      ]);
      setBalance(balanceRes.data.balance || 0);
      setTransactions(historyRes.data.records || []);
    } catch (error) {
      console.error('Failed to fetch pokeball data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (submitting) return;

    const option = AMOUNT_OPTIONS.find(o => o.value === selectedAmount);
    if (!option) return;

    setSubmitting(true);
    try {
      await api.post('/pokeball/recharge', {
        amount: option.value,
        pokeballCount: option.pokeball,
      });

      alert(`充值成功！获得 ${option.pokeball} 个精灵球`);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || '充值失败，请重试';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const qrCodeImage = QR_CODE_IMAGES[selectedAmount as keyof typeof QR_CODE_IMAGES];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#9BBC0F] to-[#8BAC0F]">
        <div className="text-2xl animate-pulse">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#9BBC0F] to-[#8BAC0F] p-4 pb-20">
      {/* Header */}
      <div className="pokemon-card p-6 mb-4 text-center">
        <h1 className="text-2xl font-bold mb-2">🔮 精灵球商店</h1>
        <div className="bg-[#0F380F] text-white p-4 rounded-lg border-4 border-black">
          <p className="text-sm opacity-80">当前精灵球</p>
          <p className="text-4xl font-bold">{balance}</p>
        </div>
      </div>

      {/* Price Info */}
      <div className="pokemon-card p-4 mb-4">
        <h2 className="text-lg font-bold mb-3">💰 价格说明</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>1 元</span>
            <span className="font-bold">= 1 个精灵球</span>
          </div>
          <div className="flex justify-between">
            <span>10 元</span>
            <span className="font-bold text-[#306230]">= 10 个精灵球</span>
          </div>
        </div>
      </div>

      {/* Amount Selection */}
      <div className="pokemon-card p-4 mb-4">
        <h2 className="text-lg font-bold mb-3">选择充值金额</h2>
        <div className="grid grid-cols-3 gap-2">
          {AMOUNT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedAmount(option.value)}
              className={`p-3 rounded-lg border-4 border-black font-bold transition-all ${
                selectedAmount === option.value
                  ? 'bg-[#306230] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              <div className="text-lg">{option.value}元</div>
              <div className="text-xs opacity-80">{option.pokeball}个</div>
            </button>
          ))}
        </div>
      </div>

      {/* QR Code Display */}
      <div className="pokemon-card p-4 mb-4 text-center">
        <h2 className="text-lg font-bold mb-3">📱 微信扫码支付</h2>
        <div className="w-56 h-56 mx-auto bg-white border-4 border-black rounded-lg overflow-hidden">
          <img
            src={`${PICTURES_BASE_URL}/${qrCodeImage}`}
            alt={`充值${selectedAmount}元二维码`}
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-sm text-gray-600 mt-3">
          请扫描二维码支付，然后点击"我已支付"按钮
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 mb-4">
        <GameboyButton
          text={submitting ? '处理中...' : '我已支付'}
          onClick={handlePurchase}
          size="large"
        />
        <GameboyButton text="返回" onClick={() => navigate(-1)} size="medium" />
      </div>

      {/* Transaction History */}
      <div className="pokemon-card p-4">
        <h2 className="text-lg font-bold mb-3">📋 交易记录</h2>
        {transactions.length === 0 ? (
          <p className="text-center text-gray-500 py-4">暂无交易记录</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-white/70 p-3 rounded-lg border-2 border-black flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-sm">{tx.description}</p>
                  <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.type === 'recharge' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'recharge' ? '+' : '-'}{tx.amount}
                  </p>
                  <p className="text-xs text-gray-500">余额：{tx.balance_after}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
