import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL, WS_OWNER_URL } from '../config';
const API_BASE = API_BASE_URL;

interface ChatMessage {
  sender: 'a' | 'b' | 'system';
  content: string;
  timestamp: string;
}

interface LobsterChat {
  chat_id: string;
  lobster_a_id: string;
  lobster_b_id: string;
  messages: ChatMessage[];
  session_status: string;
  compatibility_score: number | null;
  compatibility_analysis: string | null;
  outcome: string;
  owner_a_response: string | null;
  owner_b_response: string | null;
  other_owner_name: string;
  other_lobster_name: string;
  created_at: string;
}

export function LobsterChatPage() {
  const { token } = useAuth();
  const [chats, setChats] = useState<LobsterChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<LobsterChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [chatStatus, setChatStatus] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChats();
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!token) return;

    const wsUrl = `${WS_OWNER_URL}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      // Subscribe to selected chat if any
      if (selectedChat) {
        ws.send(JSON.stringify({ type: 'subscribe_chat', chat_id: selectedChat.chat_id }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleWsMessage(msg);
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
    };

    ws.onerror = () => {
      setWsStatus('disconnected');
    };

    return () => {
      ws.close();
    };
  }, [token, selectedChat?.chat_id]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages]);

  const handleWsMessage = useCallback((msg: Record<string, unknown>) => {
    if (msg.type === 'lobster:message' && msg.chat_id === selectedChat?.chat_id) {
      setSelectedChat(prev => {
        if (!prev) return prev;
        const newMessage: ChatMessage = {
          sender: msg.sender as 'a' | 'b' | 'system',
          content: msg.content as string,
          timestamp: msg.timestamp as string
        };
        return { ...prev, messages: [...prev.messages, newMessage] };
      });
    } else if (msg.type === 'lobster:chat_started' && !selectedChat) {
      // Refresh chat list when a new chat starts
      fetchChats();
    } else if (msg.type === 'lobster:chat_ended' && msg.chat_id === selectedChat?.chat_id) {
      setChatStatus('ended');
      setSelectedChat(prev => prev ? { ...prev, session_status: 'completed' } : prev);
      fetchChats();
    } else if (msg.type === 'authenticated' || msg.type === 'subscribed') {
      // Expected messages, no action needed
    } else if (msg.type === 'active_chats') {
      // Could highlight active chats
    }
  }, [selectedChat?.chat_id]);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchChats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/lobsters/me/chats`, authHeaders);
      setChats(res.data.chats || []);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const openChat = async (chatId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/lobsters/me/chats/${chatId}`, authHeaders);
      setSelectedChat(res.data.chat);
      setChatStatus(res.data.chat.session_status === 'active' ? 'active' : 'ended');

      // Subscribe to this chat via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'subscribe_chat', chat_id: chatId }));
      }
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] flex items-center justify-center">
        <div className="text-2xl animate-pulse text-[#ff6b6b]">加载中...</div>
      </div>
    );
  }

  if (selectedChat) {
    const isActive = selectedChat.session_status === 'active' || chatStatus === 'active';
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] p-4 pb-20">
        <div className="max-w-md mx-auto pt-4">
          <button
            onClick={() => { setSelectedChat(null); setChatStatus(''); }}
            className="text-[#87CEEB] mb-4 flex items-center"
          >
            ← 返回对话列表
          </button>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  🦞 {selectedChat.other_lobster_name || '未知龙虾'}
                </h2>
                <p className="text-[#87CEEB] text-sm">与 {selectedChat.other_owner_name} 的龙虾</p>
              </div>
              <div className="text-right">
                {isActive ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#4ECDC4]/20 text-[#4ECDC4] text-sm font-bold">
                    <span className="w-2 h-2 bg-[#4ECDC4] rounded-full mr-2 animate-pulse"></span>
                    正在对话...
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-sm font-bold">
                    对话已结束
                  </span>
                )}
                <div className="mt-1">
                  <span className={`text-xs ${wsStatus === 'connected' ? 'text-[#4ECDC4]' : 'text-gray-500'}`}>
                    {wsStatus === 'connected' ? '● 实时连接' : wsStatus === 'connecting' ? '○ 连接中...' : '○ 未连接'}
                  </span>
                </div>
              </div>
            </div>
            {selectedChat.compatibility_score && (
              <div className="mt-2 flex items-center">
                <span className="text-[#4ECDC4] font-bold">匹配度: {selectedChat.compatibility_score}%</span>
              </div>
            )}
          </div>

          {/* Compatibility Analysis */}
          {selectedChat.compatibility_analysis && selectedChat.session_status === 'completed' && (
            <div className="bg-[#4ECDC4]/10 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-[#4ECDC4]/30">
              <h3 className="text-white font-bold mb-2">📊 匹配分析</h3>
              <p className="text-[#B0E0E6] text-sm">{selectedChat.compatibility_analysis}</p>
            </div>
          )}

          {/* Conversation */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <h3 className="text-white font-bold mb-3">龙虾对话</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedChat.messages?.length > 0 ? (
                selectedChat.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl ${
                      msg.sender === 'a'
                        ? 'bg-[#ff6b6b]/20 ml-8'
                        : msg.sender === 'b'
                        ? 'bg-[#4ECDC4]/20 mr-8'
                        : 'bg-gray-500/20 text-center text-xs'
                    }`}
                  >
                    <p className="text-[#B0E0E6] text-sm">{msg.content}</p>
                    <p className="text-[#87CEEB] text-xs mt-1">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-[#87CEEB] text-center py-8">
                  {isActive ? '等待龙虾开始对话...' : '暂无对话记录'}
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Action Buttons */}
          {selectedChat.outcome === 'recommended' && !selectedChat.owner_a_response && selectedChat.session_status === 'completed' && (
            <div className="mt-4 flex gap-3">
              <button
                onClick={async () => {
                  try {
                    await axios.post(`${API_BASE}/lobsters/me/respond`, {
                      chatId: selectedChat.chat_id,
                      response: 'approved'
                    }, authHeaders);
                    alert('已批准！等待对方确认后龙虾会帮你们交换微信号');
                    fetchChats();
                    setSelectedChat(null);
                  } catch (err) {
                    alert('操作失败');
                  }
                }}
                className="flex-1 bg-[#4ECDC4] hover:bg-[#3dbdb5] text-white font-bold py-3 rounded-xl"
              >
                ✓ 批准认识
              </button>
              <button
                onClick={async () => {
                  try {
                    await axios.post(`${API_BASE}/lobsters/me/respond`, {
                      chatId: selectedChat.chat_id,
                      response: 'rejected'
                    }, authHeaders);
                    fetchChats();
                    setSelectedChat(null);
                  } catch (err) {
                    alert('操作失败');
                  }
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-xl"
              >
                ✗ 暂不考虑
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d1f33] p-4 pb-20">
      <div className="max-w-md mx-auto pt-4">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">💬</div>
          <h1 className="text-2xl font-bold text-white">龙虾对话</h1>
          <p className={`text-sm mt-2 ${wsStatus === 'connected' ? 'text-[#4ECDC4]' : 'text-gray-500'}`}>
            {wsStatus === 'connected' ? '● 实时连接已建立' : wsStatus === 'connecting' ? '○ 正在连接...' : '○ 未连接'}
          </p>
        </div>

        {chats.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🦞</div>
            <p className="text-[#87CEEB]">还没有对话</p>
            <p className="text-[#87CEEB] text-sm mt-1">龙虾正在和其他龙虾交流中...</p>
            <a href="/lobster" className="inline-block mt-4 bg-[#ff6b6b] hover:bg-[#ff5252] text-white font-bold py-2 px-6 rounded-xl transition-colors">
              回到龙虾首页
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {chats.map(chat => (
              <button
                key={chat.chat_id}
                onClick={() => openChat(chat.chat_id)}
                className="w-full bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-[#ff6b6b]/50 rounded-full flex items-center justify-center text-lg mr-3">
                      🦞
                    </div>
                    <div>
                      <h4 className="text-white font-bold">{chat.other_owner_name}</h4>
                      <p className="text-[#87CEEB] text-xs">
                        {chat.session_status === 'active' ? '正在对话...' :
                         chat.outcome === 'recommended' ? '推荐认识' : '已结束'}
                      </p>
                    </div>
                  </div>
                  {chat.compatibility_score && (
                    <span className="text-[#4ECDC4] font-bold">{chat.compatibility_score}%</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
