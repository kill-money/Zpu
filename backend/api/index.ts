/**
 * Vercel Serverless Entry Point
 * 
 * This file wraps the Express app for Vercel's serverless functions.
 * Socket.IO is NOT available in serverless mode.
 * MongoDB connections are cached between warm invocations.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import i18next from 'i18next';
import i18nextMiddleware from 'i18next-http-middleware';

// Middleware imports
import { errorHandler } from '../src/middleware/errorHandler';
import { complianceLogger, maskSensitiveData } from '../src/middleware/compliance';

// Route imports
import authRoutes from '../src/routes/auth';
import loanRoutes from '../src/routes/loans';
import userRoutes from '../src/routes/user';
import adminRoutes from '../src/routes/admin';
import calculatorRoutes from '../src/routes/calculator';
import creditSimulationRoutes from '../src/routes/creditSimulation';
import complianceRoutes from '../src/routes/compliance';

// i18n
import '../src/i18n';

dotenv.config();

// ============ Serverless MongoDB Connection Caching ============
let cachedDb: typeof mongoose | null = null;

const connectDB = async () => {
  if (cachedDb && cachedDb.connection.readyState === 1) {
    return cachedDb;
  }

  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  cachedDb = await mongoose.connect(mongoURI, {
    maxPoolSize: 5, // Lower pool for serverless
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  console.log('✅ MongoDB connected (serverless)');
  return cachedDb;
};

// ============ Express App Setup ============
const app = express();

// Trust proxy (Vercel runs behind CDN)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || [
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id']
}));

// Rate limiting (uses in-memory store in serverless — limited effectiveness)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/api/health'
});

app.use(globalLimiter);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(i18nextMiddleware.handle(i18next));

// Request ID
app.use((req, _res, next) => {
  req.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  next();
});

// Compliance middleware
app.use(complianceLogger);
app.use(maskSensitiveData);

// Ensure DB connection before any route
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'ZPU Loan Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      loans: '/api/loans',
      user: '/api/user',
      admin: '/api/admin',
      calculator: '/api/calculator',
      credit: '/api/credit',
      compliance: '/api/compliance'
    }
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    runtime: 'vercel-serverless',
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: 'see-middleware', // Redis used directly in auth middleware
      socketio: 'not-available-in-serverless'
    }
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    runtime: 'vercel-serverless'
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Error handler
app.use(errorHandler);

// Export for Vercel
export default app;
