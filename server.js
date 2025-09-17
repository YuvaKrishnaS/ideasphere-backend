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

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'IdeaSphere Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint (MUST BE BEFORE OTHER ROUTES)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'configured' : 'not configured'
  });
});

// Initialize database connection
let dbInitialized = false;
async function initializeDatabase() {
  try {
    // Only initialize if DATABASE_URL is provided
    if (process.env.DATABASE_URL) {
      console.log('📊 Initializing database connection...');
      const { sequelize } = require('./models');
      
      // Test database connection
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully');
      
      // Sync database (be careful in production)
      if (process.env.NODE_ENV === 'development') {
        await sequelize.sync({ alter: true });
        console.log('✅ Database synced successfully');
      }
      
      dbInitialized = true;
    } else {
      console.log('⚠️  No DATABASE_URL provided, skipping database initialization');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    // Don't crash the server, continue without database
  }
}

// Safe route registration with error handling
function safeRegisterRoute(path, routeFile) {
  try {
    console.log(`📍 Registering routes: ${path}`);
    const routes = require(routeFile);
    app.use(path, routes);
    console.log(`✅ Successfully registered: ${path}`);
  } catch (error) {
    console.error(`❌ Failed to register ${path}:`, error.message);
    // Register a fallback route that returns an error
    app.use(path, (req, res) => {
      res.status(503).json({
        success: false,
        message: `Route ${path} is temporarily unavailable`,
        error: 'Route registration failed'
      });
    });
  }
}

// Register API Routes with error handling
console.log('📍 Registering API routes...');

// Only register routes that exist
const routes = [
  { path: '/api/auth', file: './routes/auth' },
  { path: '/api/bits', file: './routes/bits' },
  { path: '/api/stacks', file: './routes/stacks' },
  { path: '/api/follow', file: './routes/follow' },
  { path: '/api/upload', file: './routes/upload' },
  { path: '/api/reports', file: './routes/reports' },
  { path: '/api/reputation', file: './routes/reputation' },
  { path: '/api/ai', file: './routes/ai' }
];

routes.forEach(route => {
  safeRegisterRoute(route.path, route.file);
});

// API status endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'IdeaSphere API is running',
    version: '1.0.0',
    status: 'active',
    database: dbInitialized ? 'connected' : 'not connected',
    endpoints: [
      'GET /health - Health check',
      'GET /api - API status',
      'POST /api/auth/register - User registration',
      'POST /api/auth/login - User login',
      'GET /api/bits - Get bits feed',
      'GET /api/stacks - Get stacks feed'
    ]
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', socket.id);
    console.log(`🏠 User ${socket.id} joined room ${roomId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler for all unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: ['/health', '/api', '/api/auth/register', '/api/auth/login']
  });
});

// Port configuration (Railway sets this automatically)
const PORT = process.env.PORT || 3000;

// Start server
async function startServer() {
  try {
    // Initialize database first (non-blocking)
    await initializeDatabase();
    
    // Start HTTP server
    server.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 ================================');
      console.log(`🚀 IdeaSphere Backend STARTED!`);
      console.log(`🚀 Port: ${PORT}`);
      console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 Database: ${dbInitialized ? 'Connected' : 'Not Connected'}`);
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
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
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
