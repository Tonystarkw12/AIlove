require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Import the pool from db.js
const http = require('http'); // Required for WebSocket server
const path = require('path'); // Required for static file serving

const app = express();
const server = http.createServer(app); // Create HTTP server for Express and WebSocket
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection is now handled in db.js

// Basic Route
app.get('/', (req, res) => {
  res.send('AI Yue Lao Backend is running!');
});

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const recommendationRoutes = require('./routes/recommendations');
const chatRoutes = require('./routes/chat');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/chat', chatRoutes);

// WebSocket Server Setup
const { initializeWebSocketServer, sendMessageToUser } = require('./services/websocketService');
const wss = initializeWebSocketServer(server); // Pass the HTTP server

// Make wss and sendMessageToUser available to routes (e.g., for chat.js to push messages)
// This allows REST API endpoints to trigger WebSocket events if needed.
app.set('wss', wss);
app.set('sendMessageToUser', sendMessageToUser);

// Start Server
server.listen(port, () => { // Use server.listen instead of app.listen for WebSocket
  console.log(`Server (HTTP & WebSocket) listening on port ${port}`);
});

module.exports = { app, server, wss, sendMessageToUser }; // Export server and WebSocket utilities (pool is no longer defined here)
