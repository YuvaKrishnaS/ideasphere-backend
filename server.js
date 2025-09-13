require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);

// Add this at the top of server.js temporarily
const originalGet = app.get;
const originalPost = app.post;
const originalUse = app.use;

app.get = function(path, ...args) {
  console.log('Registering GET route:', path);
  return originalGet.call(this, path, ...args);
};

app.post = function(path, ...args) {
  console.log('Registering POST route:', path);
  return originalPost.call(this, path, ...args);
};

app.use = function(path, ...args) {
  if (typeof path === 'string') {
    console.log('Registering middleware for path:', path);
  }
  return originalUse.call(this, path, ...args);
};


// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bits', require('./routes/bits'));
app.use('/api/stacks', require('./routes/stacks'));
app.use('/api/follow', require('./routes/follow'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/reputation', require('./routes/reputation'));
app.use('/api/ai', require('./routes/ai'));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', socket.id);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// ✅ CORRECTED 404 handler - note the parameter name after *
app.use('/*splat', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Port configuration
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 IdeaSphere Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;

