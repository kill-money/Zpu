import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import i18next from 'i18next';
import i18nextMiddleware from 'i18next-http-middleware';

// Middleware imports
import { errorHandler } from './middleware/errorHandler';
import { complianceLogger, maskSensitiveData } from './middleware/compliance';

// Route imports  
import authRoutes from './routes/auth';
import loanRoutes from './routes/loans';
import userRoutes from './routes/user';
import adminRoutes, { setSocketIO as setAdminSocketIO } from './routes/admin';
import calculatorRoutes from './routes/calculator';
import creditSimulationRoutes from './routes/creditSimulation';
import complianceRoutes from './routes/compliance';
import { setSocketIO as setAdminControllerSocketIO } from './controllers/adminController';

// i18n imports
import './i18n';

// Socket imports
import { initializeSocketHandlers } from './sockets/socketHandlers';
import { ApprovalSocketHandler } from './sockets/approvalHandlers';

// Load environment variables
dotenv.config();

// Initialize Redis client
const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 25000
});

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id']
}));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 5000, // Limit each IP
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

app.use(globalLimiter);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// i18n middleware
app.use(i18nextMiddleware.handle(i18next));

// Request logging middleware  
app.use((req, res, next) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  req.headers['x-request-id'] = requestId;
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip} (${requestId})`);
  
  next();
});

// Compliance logging middleware (must be before routes)
app.use(complianceLogger);

// Sensitive data masking middleware
app.use(maskSensitiveData);

// Health check endpoint (before authentication)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: redis.status === 'ready' ? 'connected' : 'disconnected'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/calculator', calculatorRoutes);
app.use('/api/credit', creditSimulationRoutes);
app.use('/api/compliance', complianceRoutes);

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zpu-loan';
    
    await mongoose.connect(mongoURI, {
      // Connection options for production reliability
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Handle MongoDB connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Redis connection
const connectRedis = async () => {
  try {
    await redis.connect();
    console.log('✅ Connected to Redis');
    
    // Handle Redis connection events
    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });
    
    redis.on('close', () => {
      console.warn('⚠️ Redis connection closed');
    });
    
    redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    process.exit(1);
  }
};

// Initialize Socket.IO handlers
initializeSocketHandlers(io, redis);

// Initialize approval socket handlers  
const approvalHandler = new ApprovalSocketHandler(io);
approvalHandler.initialize();

// Initialize admin Socket.IO for real-time user management
setAdminControllerSocketIO(io);

// Store socket.io instance globally for auth controller access
(global as any).__socketIO = io;

// Admin Socket.IO namespace for real-time updates
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  // Admin room join
  socket.on('admin:join', (data: { adminId: string }) => {
    if (data.adminId) {
      socket.join('admin-room');
      console.log(`[Socket] Admin ${data.adminId} joined admin-room`);
      socket.emit('admin:joined', { message: 'Connected to admin real-time updates' });
    }
  });
  
  // Admin room leave
  socket.on('admin:leave', () => {
    socket.leave('admin-room');
    console.log(`[Socket] Admin left admin-room: ${socket.id}`);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  
  // Close server to stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ HTTP server closed');
  });
  
  // Close database connections
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
    await redis.quit();
    console.log('✅ Redis connection closed');
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDB();
    await connectRedis();
    
    // Start HTTP server
    const PORT = process.env.PORT || 5000;
    
    server.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`⚡ Socket.IO enabled on port ${PORT}`);
      console.log(`📋 Health Check: http://localhost:${PORT}/health\n`);
      
      // Log compliance startup
      console.log('🛡️ US Financial Compliance Features:');
      console.log('  ✓ FCRA (Fair Credit Reporting Act)');
      console.log('  ✓ TCPA (Telephone Consumer Protection Act)');
      console.log('  ✓ TILA (Truth in Lending Act)');
      console.log('  ✓ ECOA (Equal Credit Opportunity Act)');
      console.log('  ✓ Data Encryption & PII Protection');
      console.log('  ✓ Compliance Audit Logging');
      console.log('  ✓ Rate Limiting & Security Controls\n');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Initialize server
startServer();

export { app, server, io, redis };