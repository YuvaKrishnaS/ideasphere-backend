const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('./models');
const { apiLimiter } = require('./middleware/rateLimiter');
const socketService = require('./services/socketService');
const valkeyClient = require('./config/valkey');

// Import routes
const authRoutes = require('./routes/auth');
const interestRoutes = require('./routes/interests');
const emailRoutes = require('./routes/email');
const projectRoutes = require('./routes/projects');
const roomRoutes = require('./routes/room');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
app.use(apiLimiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Ideashpere Backend is running!',
    timestamp: new Date().toISOString(),
    database: sequelize.getDatabaseName(),
    valkey: valkeyClient.isConnected ? 'connected' : 'disconnected'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/interests', interestRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/email', emailRoutes);

// --- FIX IS HERE ---
// 404 Not Found Handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});
// --- END OF FIX ---

// Global error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Something went wrong!',
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

// Database and services initialization
const startServer = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync database
    await sequelize.sync({
      alter: process.env.NODE_ENV === 'development',
      force: false
    });
    console.log('✅ Database synchronized successfully.');

    // Connect to Valkey
    await valkeyClient.connect();
    // No need for a log here, valkeyClient logs on its own

    // Initialize Socket.IO
    socketService.initialize(server);

    server.listen(PORT, () => {
      console.log(`🚀 Ideashpere backend running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`⚡ Socket.IO: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', err);
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await valkeyClient.disconnect();
  server.close(() => {
      process.exit(0);
  });
});

startServer();
