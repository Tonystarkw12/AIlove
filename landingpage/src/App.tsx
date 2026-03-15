import { useState } from 'react'

function App() {
  const [activeFeature, setActiveFeature] = useState(0)

  const features = [
    {
      icon: '🧠',
      title: 'Agent 智能分析系统',
      description: '基于深度学习的 AI 智能体，精准分析用户画像、兴趣爱好和行为模式，为你匹配最合适的另一半',
      color: 'type-psychic'
    },
    {
      icon: '🎯',
      title: '智能推荐算法',
      description: '先进的协同过滤 + 内容基推荐引擎，每次匹配都经过数千个特征维度的精密计算',
      color: 'type-dragon'
    },
    {
      icon: '💬',
      title: 'AI 聊天助手',
      description: '内置智能对话建议系统，实时分析聊天内容，提供幽默风趣的回复建议，让你不再冷场',
      color: 'type-electric'
    },
    {
      icon: '🔮',
      title: '情感预测模型',
      description: '基于大数据的情感走向预测，提前预知关系发展概率，让你的每一步都胸有成竹',
      color: 'type-fairy'
    },
    {
      icon: '🛡️',
      title: '真人验证系统',
      description: '多层 AI 防伪验证 + 人脸识别技术，确保每个用户都是真实存在的训练师',
      color: 'type-steel'
    },
    {
      icon: '📍',
      title: 'LBS 地理位置匹配',
      description: '基于地理位置的智能推荐，优先匹配附近的有缘人，让线上相遇变成线下约会',
      color: 'type-ground'
    }
  ]

  const stats = [
    { label: '活跃用户', value: '10,000+', icon: '👥' },
    { label: '成功匹配', value: '5,000+', icon: '💕' },
    { label: 'AI 分析次数', value: '100,000+', icon: '🧠' },
    { label: '用户满意度', value: '98%', icon: '⭐' }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Floating Decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-16 h-16 bg-yellow-400 rounded-full opacity-30 animate-float" />
          <div className="absolute top-40 right-20 w-24 h-24 bg-blue-400 rounded-full opacity-30 animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-20 left-1/3 w-20 h-20 bg-pink-400 rounded-full opacity-30 animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo */}
            <div className="text-8xl mb-6 animate-bounce">🎮</div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold mb-4 text-white drop-shadow-lg">
              AIlove
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white mb-2 font-bold drop-shadow">
              AI 驱动的智能恋爱匹配平台
            </p>
            <p className="text-lg text-white/90 mb-8">
              用科技的力量，帮你找到命中注定的那个 TA
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="http://loveai.201014.xyz/register"
                className="gameboy-btn bg-[#FFCB05] hover:bg-[#FFB400] text-black font-bold py-4 px-8 rounded-xl text-lg inline-flex items-center gap-2"
              >
                <span>⚡</span>
                <span>立即开始</span>
              </a>
              <a
                href="http://loveai.201014.xyz"
                className="gameboy-btn bg-[#3B4CCA] hover:bg-[#2A3BA8] text-white font-bold py-4 px-8 rounded-xl text-lg inline-flex items-center gap-2"
              >
                <span>🎯</span>
                <span>进入应用</span>
              </a>
            </div>

            {/* Stats Bar */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="pokemon-card p-4 bg-white/95">
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-[#3B4CCA]">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 bg-white/80">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4 text-[#0F380F]">
              🚀 核心功能
            </h2>
            <p className="text-center text-gray-600 mb-12 text-lg">
              融合尖端 AI 技术，打造最智能的恋爱匹配体验
            </p>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`pokemon-card p-6 cursor-pointer transition-all duration-300 hover:scale-105 ${
                    activeFeature === index ? 'ring-4 ring-[#3B4CCA]' : ''
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <div className={`inline-block px-3 py-1 rounded-full text-white text-sm font-bold mb-4 ${feature.color}`}>
                    功能 #{index + 1}
                  </div>
                  <div className="text-5xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold mb-3 text-[#0F380F]">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4 text-white drop-shadow-lg">
              🎮 如何开始
            </h2>
            <p className="text-center text-white/90 mb-12 text-lg">
              只需三步，开启你的智能恋爱冒险之旅
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="pokemon-card p-6 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-[#FF5A5A] rounded-full flex items-center justify-center text-4xl border-4 border-black animate-bounce">
                  📝
                </div>
                <div className="text-2xl font-bold text-[#0F380F] mb-2">Step 1: 注册账号</div>
                <p className="text-gray-600">填写基本信息，创建你的专属训练师档案</p>
              </div>

              {/* Step 2 */}
              <div className="pokemon-card p-6 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-[#FFCB05] rounded-full flex items-center justify-center text-4xl border-4 border-black animate-bounce" style={{ animationDelay: '0.5s' }}>
                  🧠
                </div>
                <div className="text-2xl font-bold text-[#0F380F] mb-2">Step 2: AI 分析</div>
                <p className="text-gray-600">智能系统分析你的偏好，构建精准用户画像</p>
              </div>

              {/* Step 3 */}
              <div className="pokemon-card p-6 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-[#3B4CCA] rounded-full flex items-center justify-center text-4xl border-4 border-black animate-bounce" style={{ animationDelay: '1s' }}>
                  💕
                </div>
                <div className="text-2xl font-bold text-[#0F380F] mb-2">Step 3: 开始匹配</div>
                <p className="text-gray-600">接收智能推荐，与心仪对象展开浪漫对话</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-16 bg-white/80">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4 text-[#0F380F]">
              🔬 技术实力
            </h2>
            <p className="text-gray-600 mb-12 text-lg">
              强大的技术架构，支撑每一次精准匹配
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="pokemon-card p-6">
                <div className="text-4xl mb-3">🤖</div>
                <h3 className="font-bold text-lg mb-2">深度学习模型</h3>
                <p className="text-sm text-gray-600">基于 Transformer 的用户行为分析</p>
              </div>
              <div className="pokemon-card p-6">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="font-bold text-lg mb-2">实时推荐引擎</h3>
                <p className="text-sm text-gray-600">毫秒级响应，即时匹配</p>
              </div>
              <div className="pokemon-card p-6">
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="font-bold text-lg mb-2">隐私保护</h3>
                <p className="text-sm text-gray-600">端到端加密，安全无忧</p>
              </div>
              <div className="pokemon-card p-6">
                <div className="text-4xl mb-3">📱</div>
                <h3 className="font-bold text-lg mb-2">全平台支持</h3>
                <p className="text-sm text-gray-600">Web/移动端无缝体验</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="pokemon-card p-12 bg-gradient-to-br from-[#FFCB05] to-[#FF5A5A]">
              <h2 className="text-4xl font-bold mb-4 text-white drop-shadow-lg">
                准备好了吗？
              </h2>
              <p className="text-xl text-white mb-8">
                加入 AIlove，让 AI 帮你找到命中注定的那个人
              </p>
              <a
                href="http://loveai.201014.xyz/register"
                className="gameboy-btn bg-white hover:bg-gray-100 text-[#3B4CCA] font-bold py-4 px-12 rounded-xl text-lg inline-flex items-center gap-2"
              >
                <span>🚀</span>
                <span>免费注册</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F380F] text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="text-2xl mb-2">🎮</div>
          <p className="text-white/70 text-sm">
            © 2026 AIlove. All rights reserved.
          </p>
          <p className="text-white/50 text-xs mt-2">
            用 AI 技术，成就美好姻缘
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
