require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');

const app = express();
const server = createServer(app);

console.log('🔧 Starting IdeaSphere Backend...');

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'IdeaSphere Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    database: process.env.DATABASE_URL ? 'configured' : 'not configured'
  });
});

// API status endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'IdeaSphere API is running',
    version: '1.0.0',
    status: 'active',
    endpoints: [
      'GET /health - Health check',
      'GET /api - API status'
    ]
  });
});

// Test database connection (non-blocking)
async function testDatabase() {
  try {
    if (process.env.DATABASE_URL) {
      console.log('📊 Testing database connection...');
      const { Sequelize } = require('sequelize');
      
      const sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        },
        logging: false
      });

      await sequelize.authenticate();
      console.log('✅ Database connection successful');
      await sequelize.close();
    } else {
      console.log('⚠️ No DATABASE_URL provided');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /',
      'GET /health', 
      'GET /api'
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', async () => {
  console.log('🚀 ================================');
  console.log(`🚀 IdeaSphere Backend STARTED!`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀 Health: http://localhost:${PORT}/health`);
  console.log(`🚀 API: http://localhost:${PORT}/api`);
  console.log('🚀 ================================');
  
  // Test database connection
  await testDatabase();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('🛑 Process terminated');
  });
});

module.exports = app;
