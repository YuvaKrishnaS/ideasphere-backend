require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);

console.log('🔧 Starting IdeaSphere Backend...');

// --- Middleware Setup ---
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// --- Socket.IO Setup ---
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', socket.id);
  });
  
  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});

// --- Core Routes ---
// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'IdeaSphere API is running',
    status: 'active',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// --- Database Connection ---
async function initializeDatabase() {
  try {
    const { sequelize } = require('./models');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synced');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    // Don't crash the server, continue without database
  }
}

// --- API Route Registration ---
console.log('📍 Registering API routes...');

// Safe route registration function
function registerRoute(path, routeFile) {
  try {
    const routes = require(routeFile);
    app.use(path, routes);
    console.log(`✅ Registered: ${path}`);
  } catch (error) {
    console.error(`❌ Failed to register ${path}:`, error.message);
    // Register fallback route
    app.use(path, (req, res) => {
      res.status(503).json({
        success: false,
        message: `${path} routes temporarily unavailable`
      });
    });
  }
}

// Register all API routes
registerRoute('/api/auth', './routes/auth');
registerRoute('/api/bits', './routes/bits');
registerRoute('/api/stacks', './routes/stacks');
registerRoute('/api/follow', './routes/follow');
registerRoute('/api/upload', './routes/upload');
registerRoute('/api/reports', './routes/reports');
registerRoute('/api/reputation', './routes/reputation');
registerRoute('/api/ai', './routes/ai');

console.log('✅ All routes registered.');

// API status endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'IdeaSphere API',
    version: '1.0.0',
    status: 'active',
    endpoints: [
      'GET /health - Health check',
      'GET /api - API status',
      'POST /api/auth/register - User registration',
      'POST /api/auth/login - User login',
      'GET /api/bits - Get bits feed',
      'GET /api/stacks - Get stacks feed',
      'POST /api/follow/:userId - Follow user',
      'POST /api/upload/image - Upload image'
    ]
  });
});

// --- Error Handling ---

// 404 Handler for API routes (Express 5 compatible)
app.use('/api/*splat', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    available: ['/api', '/api/auth', '/api/bits', '/api/stacks']
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Global Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Catch-all handler for non-API routes (Express 5 compatible)
app.use('/*splat', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    suggestion: 'Try /api for API endpoints or /health for health check'
  });
});

// --- Server Startup ---
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    // Start HTTP server
    server.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 ================================');
      console.log(`🚀 IdeaSphere Backend STARTED!`);
      console.log(`🚀 Port: ${PORT}`);
      console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 Health: http://localhost:${PORT}/health`);
      console.log(`🚀 API: http://localhost:${PORT}/api`);
      console.log('🚀 ================================');
    });
    
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('🛑 Process terminated');
  });
});

// Start the server
startServer();

module.exports = app;
