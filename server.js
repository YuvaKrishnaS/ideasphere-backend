require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { sequelize } = require('./models'); // Import sequelize instance once

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
  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});


// --- Core Routes ---
// Root endpoint
app.get('/', (req, res) => res.json({ message: 'IdeaSphere API is running' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});


// --- API Route Registration ---
console.log('📍 Registering API routes...');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bits', require('./routes/bits'));
app.use('/api/stacks', require('./routes/stacks'));
app.use('/api/follow', require('./routes/follow'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/reputation', require('./routes/reputation'));
app.use('/api/ai', require('./routes/ai'));
console.log('✅ All routes registered.');


// --- Error Handling ---
// 404 Handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Global Error Handler:', err.stack);
  res.status(500).json({
    success: false,
    message: 'An internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});


// --- Server Startup ---
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log('📊 Authenticating database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful.');

    // Sync models (use with caution in production)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synced.');
    }
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 ================================');
      console.log(`🚀 IdeaSphere Backend is LIVE!`);
      console.log(`🚀 Port: ${PORT}`);
      console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('🚀 ================================');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
