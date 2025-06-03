import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './utils/errorHandler';
import v1Routes from './routes/v1';
import authRoutes from './routes/v1/auth';
import apiRoutes from './routes/v1/index';
import databaseRoutes from './routes/v1/database';
import { apiLimiter, authLimiter, registerLimiter } from './middleware/rateLimiter';
import { sanitizeInput, detectMaliciousInput } from './middleware/inputSanitizer';
import { authenticateToken } from './middleware/authMiddleware';
import path from 'path';
import instructorRoutes from './routes/instructor';
import holidaysRoutes from './routes/holidays';
import { initializeDatabase } from './config/database';
import { ScheduledJobsService } from './services/scheduledJobs';
import morgan from 'morgan';
import cron from 'node-cron';
import { redisManager, ensureRedisConnection, closeRedisConnection } from './config/redis';

console.log('🚀 [STARTUP] Starting backend server initialization...');

// Load environment variables
console.log('📝 [STARTUP] Loading environment variables...');
const result = dotenv.config();
console.log('Environment loading result:', result.error ? 'Error loading .env file' : 'Environment variables loaded successfully');
console.log('Current working directory:', process.cwd());

// Set Redis to disabled by default in development
if (!process.env.REDIS_ENABLED) {
  process.env.REDIS_ENABLED = 'false';
  console.log('🔴 [REDIS] Redis disabled by default (set REDIS_ENABLED=true to enable)');
}

// Log only non-sensitive environment info
console.log('Environment info:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3001',
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  FRONTEND_URL: process.env.FRONTEND_URL,
  REDIS_ENABLED: process.env.REDIS_ENABLED
});

console.log('🔧 [STARTUP] Creating Express app...');
const app = express();

console.log('🌐 [STARTUP] Setting up CORS configuration...');
// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-production-domain.com' 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Security Headers Middleware
console.log('🛡️ [STARTUP] Setting up security headers...');
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3001", "http://localhost:5173"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'none'"]
    }
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // X-XSS-Protection
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: ["no-referrer", "strict-origin-when-cross-origin"]
  },
  
  // Remove X-Powered-By header
  hidePoweredBy: true,
  
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Disabled for development
  
  // Cross-Origin Opener Policy  
  crossOriginOpenerPolicy: {
    policy: "same-origin-allow-popups"
  },
  
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: {
    policy: "cross-origin"
  }
}));

console.log('📦 [STARTUP] Setting up middleware...');
// Body parsing middleware
app.use(express.json());
app.use(cookieParser());

// Input Sanitization Middleware
console.log('🧼 [STARTUP] Setting up input sanitization...');
app.use(detectMaliciousInput); // Detect malicious patterns first
app.use(sanitizeInput); // Sanitize all inputs

// Rate limiting middleware
console.log('🚦 [STARTUP] Setting up rate limiting...');

// JSON parsing error handler - after express.json()
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('JSON parsing error:', err);
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON payload'
      }
    });
  }
  next(err);
});

console.log('🛣️ [STARTUP] Setting up routes...');
// Routes
try {
  console.log('   - Setting up auth routes...');
  app.use('/api/v1/auth', authRoutes);
  
  console.log('   - Setting up v1 routes...');
  app.use('/api/v1', apiRoutes);

  console.log('   - Setting up database routes...');
  app.use('/api/v1/database', databaseRoutes);

  console.log('   - Setting up protected routes...');
  // Protected routes
  app.use('/api/v1/protected', authenticateToken);
  app.use('/api/v1/instructor', authenticateToken, instructorRoutes);
  app.use('/api/v1/holidays', authenticateToken, holidaysRoutes);

  console.log('✅ [STARTUP] All routes configured successfully');
} catch (error) {
  console.error('❌ [STARTUP ERROR] Failed to set up routes:', error);
  process.exit(1);
}

console.log('🏥 [STARTUP] Setting up health check...');
// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

console.log('📊 [STARTUP] Setting up request logging middleware...');
// Add comprehensive request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[REQUEST] ${new Date().toISOString()}`);
  console.log(`  Method: ${req.method}`);
  console.log(`  URL: ${req.url}`);
  console.log(`  Path: ${req.path}`);
  console.log(`  Base URL: ${req.baseUrl}`);
  console.log(`  Original URL: ${req.originalUrl}`);
  console.log(`  Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`  Query:`, req.query);
  console.log(`  Body:`, req.body || 'No body');
  
  // Log response when it's done
  const oldSend = res.send;
  res.send = function(data: any) {
    console.log(`[RESPONSE] ${req.method} ${req.originalUrl}`);
    console.log(`  Status: ${res.statusCode}`);
    console.log(`  Body preview:`, typeof data === 'string' ? data.substring(0, 200) : 'Non-string response');
    res.send = oldSend;
    return res.send(data);
  };
  
  next();
});

console.log('📋 [STARTUP] Listing all registered routes...');
// List all registered routes
console.log('[ROUTES] All registered routes:');
function printRoutes(path: string, layer: any) {
  if (layer.route) {
    layer.route.stack.forEach((routeLayer: any) => {
      console.log(`  ${routeLayer.method?.toUpperCase() || 'ALL'} ${path}${layer.route.path}`);
    });
  } else if (layer.name === 'router' && layer.handle.stack) {
    layer.handle.stack.forEach((stackLayer: any) => {
      printRoutes(path + (layer.regexp.source === '^\\/?$' ? '' : layer.path || ''), stackLayer);
    });
  }
}

try {
  app._router.stack.forEach((layer: any) => {
    if (layer.name === 'router') {
      printRoutes('', layer);
    }
  });
  console.log('✅ [STARTUP] Route listing completed');
} catch (error) {
  console.error('❌ [STARTUP ERROR] Failed to list routes:', error);
}

console.log('🚫 [STARTUP] Setting up 404 handler...');
// 404 handler for unmatched routes
app.use((req: Request, res: Response) => {
  console.error(`[404 ERROR] Route not found: ${req.method} ${req.originalUrl}`);
  console.error(`  Available base paths: /api/v1/*`);
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      suggestion: 'Check if the route exists and the method is correct'
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

console.log('⚠️ [STARTUP] Setting up error handler...');
// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Initialize Redis connection (helper function for background initialization)
async function initializeRedis(): Promise<void> {
  try {
    console.log('🔴 [REDIS] Initializing Redis connection...');
    
    // Add timeout to prevent hanging
    const redisPromise = ensureRedisConnection();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Redis connection timeout')), 3000); // Reduced timeout
    });
    
    await Promise.race([redisPromise, timeoutPromise]);
    console.log('✅ [REDIS] Redis initialized successfully');
  } catch (error) {
    console.error('❌ [REDIS] Redis initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    console.log('⚠️ [REDIS] Application will continue with JWT-only authentication');
    throw error; // Re-throw so caller knows it failed
  }
}

// Schedule cleanup job for expired sessions
cron.schedule('0 2 * * *', async () => {
  console.log('🔐 [SESSION CLEANUP] Running scheduled session cleanup...');
  try {
    await ensureRedisConnection();
    const { sessionManager } = await import('./services/sessionManager');
    const cleanedCount = await sessionManager.cleanupExpiredSessions();
    console.log(`✅ [SESSION CLEANUP] Cleaned up ${cleanedCount} expired sessions`);
  } catch (error) {
    console.error('❌ [SESSION CLEANUP] Failed to cleanup sessions:', error);
  }
});

// Schedule overdue invoice check (TODO: implement when invoice service is available)
// cron.schedule('0 1 * * *', async () => {
//   console.log('📊 [SCHEDULED JOB] Running daily overdue invoice check...');
//   try {
//     const result = await checkOverdueInvoices();
//     console.log(`📊 [SCHEDULED JOB] Overdue invoice check completed. Updated ${result.updatedCount} invoices.`);
//   } catch (error) {
//     console.error('❌ [SCHEDULED JOB] Overdue invoice check failed:', error);
//   }
// });

// Graceful shutdown handling
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n🔴 [SHUTDOWN] Received ${signal}, initiating graceful shutdown...`);
  
  try {
    // Close Redis connection
    await closeRedisConnection();
    console.log('✅ [SHUTDOWN] Redis connection closed');
    
    // Close database connections would go here if needed
    console.log('✅ [SHUTDOWN] Graceful shutdown completed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ [SHUTDOWN] Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ [FATAL] Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
async function startServer(): Promise<void> {
  try {
    // Initialize database
    console.log('🗄️ [DATABASE] Initializing database...');
    await initializeDatabase();
    console.log('✅ [DATABASE] Database initialized successfully');

    // Start HTTP server first (Redis initialization will happen in background)
    const server = app.listen(PORT, async () => {
      console.log('\n' + '='.repeat(80));
      console.log('🚀 CPR Training Management System - Backend Server');
      console.log('='.repeat(80));
      console.log(`📍 Server running on: http://localhost:${PORT}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 Security Features: Rate Limiting, Security Headers, Input Sanitization`);
      console.log(`🔐 Session Management: ${process.env.REDIS_ENABLED === 'true' ? 'Redis Enhanced (if available)' : 'JWT Only'}`);
      console.log(`⚡ Health Check: http://localhost:${PORT}/health`);
      console.log(`📊 API Base: http://localhost:${PORT}/api/v1`);
      console.log('='.repeat(80));
      console.log('✅ Server is ready to accept connections');
      console.log('='.repeat(80) + '\n');

      // Start scheduled jobs
      console.log('🕐 [STARTUP] Starting scheduled jobs...');
      const scheduledJobs = ScheduledJobsService.getInstance();
      scheduledJobs.startAllJobs();

      // Initialize Redis in background (non-blocking)
      if (process.env.REDIS_ENABLED === 'true') {
        initializeRedis().then(() => {
          console.log(`🔐 Session Management Enhanced: ${redisManager.isReady() ? 'Redis Active' : 'JWT Fallback'}`);
        }).catch(() => {
          console.log('🔐 Session Management: JWT Only (Redis connection failed)');
        });
      } else {
        console.log('🔐 Session Management: JWT Only (Redis disabled)');
      }
    });

    // Handle server errors
    server.on('error', (error: any) => {
      console.error('❌ [SERVER ERROR] Failed to start server:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ [SERVER ERROR] Port ${PORT} is already in use`);
        console.error('💡 [SUGGESTION] Try stopping other processes or use a different port');
        console.error('💡 [SUGGESTION] Or set PORT environment variable to use a different port');
      }
      process.exit(1);
    });

    // Set server timeout to 30 seconds
    server.timeout = 30000;

  } catch (error) {
    console.error('❌ [STARTUP] Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer().catch((error) => {
  console.error('❌ [STARTUP] Application startup failed:', error);
  process.exit(1);
}); 