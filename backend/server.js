require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Import the pool from db.js
const http = require('http'); // Required for WebSocket server
const path = require('path'); // Required for static file serving
const { apiLogger, errorLogger, logger } = require('./services/logger');
const { initializeRedisClient } = require('./services/redisClient');

const app = express();
const server = http.createServer(app); // Create HTTP server for Express and WebSocket
const port = process.env.PORT || 3000;

// Initialize Redis
initializeRedisClient().catch(err => console.error('Redis初始化失败:', err));

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// API日志中间件（记录所有API请求和响应）
app.use('/api', apiLogger);

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files for music and pictures
app.use('/music', express.static(path.join(__dirname, '../music')));
app.use('/pictures', express.static(path.join(__dirname, '../pictures')));

// Database Connection is now handled in db.js
const rateLimiter = require('./middleware/rateLimiter');

// Apply rate limiting globally (120 req/min per IP)
app.use(rateLimiter(120, 60000));

// Basic Route
app.get('/', (req, res) => {
  res.send('AI Yue Lao Backend is running!');
});

// Routes (LobLove core only — legacy dating routes removed)
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');
// LobLove System Routes
const lobsterRoutes = require('./routes/lobsters');
const consentRoutes = require('./routes/consents');
const subscriptionRoutes = require('./routes/subscriptions');
const introductionRoutes = require('./routes/introductions');
const openclawRoutes = require('./routes/openclaw');
const wechatAuthRoutes = require('./routes/wechatAuth'); // 微信认证路由

app.use('/api/auth', authRoutes);
app.use('/api/auth', wechatAuthRoutes); // 微信登录API
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);

// LobLove System API
app.use('/api/lobsters', lobsterRoutes);
app.use('/api/consents', consentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/introductions', introductionRoutes);
app.use('/api/openclaw', openclawRoutes);

// WebSocket Server Setup
const { initializeWebSocketServer, sendMessageToUser } = require('./services/websocketService');
const wss = initializeWebSocketServer(server); // Pass the HTTP server

// Make wss and sendMessageToUser available to routes (e.g., for chat.js to push messages)
// This allows REST API endpoints to trigger WebSocket events if needed.
app.set('wss', wss);
app.set('sendMessageToUser', sendMessageToUser);

// 错误处理中间件（必须在所有路由之后）
app.use(errorLogger);

// Start Server
server.listen(port, () => { // Use server.listen instead of app.listen for WebSocket
  console.log(`Server (HTTP & WebSocket) listening on port ${port}`);

  // Start Lobster Agent Scheduler
  const lobsterScheduler = require('./services/lobsterScheduler');
  lobsterScheduler.start();
});

module.exports = { app, server, wss, sendMessageToUser }; // Export server and WebSocket utilities (pool is no longer defined here)
