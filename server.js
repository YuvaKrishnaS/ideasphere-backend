const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('./models');
const { apiLimiter } = require('./middleware/rateLimiter');
const socketService = require('./services/socketService');
const valkeyClient = require('./config/valkey');

// --- 1. Import ALL your routes here ---
const authRoutes = require('./routes/auth');
const interestRoutes = require('./routes/interests');
const projectRoutes = require('./routes/projects');
const roomRoutes = require('./routes/room');
const emailVerifyRoutes = require('./routes/emailVerify');
const passwordResetRoutes = require('./routes/passwordReset');
const passwordResetPageRoutes = require('./routes/passwordResetPage');
const bitRoutes = require('./routes/bits');
const stackRoutes = require('./routes/stacks');
const reportRoutes = require('./routes/reports');
const reputationRoutes = require('./routes/reputation');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// --- 2. Standard Middleware Setup ---
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(apiLimiter);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- 3. Register ALL Routes ---

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Ideashpere Backend is running!',
    timestamp: new Date().toISOString(),
    database: sequelize.getDatabaseName(),
    valkey: valkeyClient.isConnected ? 'connected' : 'disconnected'
  });
});

// ✅ FIX: Place the specific, non-API verification route here, right after health check
app.use('/', emailVerifyRoutes);

// All other API routes prefixed with /api
app.use('/api/auth', authRoutes);
app.use('/api/interests', interestRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/rooms', roomRoutes);
// Add routes (after your existing routes)
app.use('/', passwordResetPageRoutes); // For the reset page
app.use('/api/password-reset', passwordResetRoutes); // For API endpoints
app.use('/api/bits', bitRoutes);
app.use('/api/stacks', stackRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reputation', reputationRoutes);


// --- 4. The 404 Handler (MUST BE THE LAST ROUTE HANDLER) ---
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// --- 5. Global Error Handling Middleware ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Something went wrong!',
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

// --- Server Initialization Logic (no changes here) ---
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    await sequelize.sync({
      alter: process.env.NODE_ENV === 'development',
      force: false
    });
    console.log('✅ Database synchronized successfully.');

    await valkeyClient.connect();

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

process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', err);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await valkeyClient.disconnect();
  server.close(() => {
      process.exit(0);
  });
});

startServer();
