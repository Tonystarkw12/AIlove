import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Message {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface ChatUser {
  user_id: string;
  nickname: string;
  avatar_url?: string;
}

export function ChatPage() {
  const { user } = useAuth();
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    fetchChatUsers();
    return () => {
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.user_id);
      connectWebSocket();
    }
    return () => {
      if (ws) ws.close();
    };
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatUsers = async () => {
    try {
      const response = await api.get('/chat/conversations');
      setChatUsers(response.data.conversations || []);
    } catch (error) {
      console.error('Failed to fetch chat users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const response = await api.get(`/chat/messages/${userId}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const connectWebSocket = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const wsUrl = `ws://localhost:3052/ws/chat?token=${token}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_message' && selectedUser) {
        if (
          data.message.sender_id === selectedUser.user_id ||
          data.message.receiver_id === selectedUser.user_id
        ) {
          setMessages((prev) => [...prev, data.message]);
        }
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(websocket);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      await api.post('/chat/send', {
        receiver_id: selectedUser.user_id,
        content: newMessage.trim(),
      });
      setNewMessage('');
      fetchMessages(selectedUser.user_id);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#9BBC0F] to-[#8BAC0F]">
        <div className="text-2xl animate-pulse">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#9BBC0F] to-[#8BAC0F] p-4 pb-20">
      <div className="pokemon-card p-4 h-[calc(100vh-8rem)]">
        <h1 className="text-2xl font-bold mb-4">💬 聊天</h1>

        <div className="flex h-[calc(100%-3rem)]">
          {/* Chat List */}
          <div className={`${selectedUser ? 'hidden md:block md:w-1/3' : 'w-full'} border-r-4 border-black pr-2 overflow-y-auto`}>
            {chatUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <p className="text-4xl mb-2">💬</p>
                <p>还没有聊天记录</p>
                <p className="text-sm mt-2">去发现页面开始匹配吧！</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatUsers.map((chatUser) => (
                  <div
                    key={chatUser.user_id}
                    onClick={() => setSelectedUser(chatUser)}
                    className={`p-3 rounded-lg cursor-pointer border-4 transition-all ${
                      selectedUser?.user_id === chatUser.user_id
                        ? 'bg-[#306230] text-white border-black'
                        : 'bg-white/70 border-black hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#3B4CCA] flex items-center justify-center text-white font-bold">
                        {chatUser.nickname.charAt(0)}
                      </div>
                      <span className="font-bold">{chatUser.nickname}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Window */}
          {selectedUser ? (
            <div className={`${selectedUser ? 'w-full md:w-2/3' : 'hidden'} flex flex-col pl-2`}>
              {/* Chat Header */}
              <div className="bg-[#306230] text-white p-3 rounded-t-lg flex items-center gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="md:hidden text-xl"
                >
                  ←
                </button>
                <div className="w-8 h-8 rounded-full bg-[#FFCB05] flex items-center justify-center font-bold text-black">
                  {selectedUser.nickname.charAt(0)}
                </div>
                <span className="font-bold">{selectedUser.nickname}</span>
              </div>

              {/* Messages */}
              <div className="flex-1 bg-white/50 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    发送第一条消息开始聊天吧！
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.message_id}
                      className={`flex ${
                        msg.sender_id === String(user?.id) ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg border-2 border-black ${
                          msg.sender_id === String(user?.id)
                            ? 'bg-[#3B4CCA] text-white'
                            : 'bg-white'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="输入消息..."
                  className="flex-1 p-3 border-4 border-black rounded-lg"
                />
                <button
                  onClick={sendMessage}
                  className="bg-[#306230] text-white px-6 py-3 rounded-lg font-bold border-4 border-black hover:bg-[#0F380F] transition-colors"
                >
                  发送
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex md:w-2/3 items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-4xl mb-2">💬</p>
                <p>选择一个聊天开始</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}