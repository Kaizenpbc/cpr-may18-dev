import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import cookieParser from 'cookie-parser';
import emailTemplatesRouter from './routes/v1/emailTemplates.js';
import { initializeTokenBlacklist } from './utils/tokenBlacklist.js';
import { apiLimiter, authLimiter, registerLimiter } from './middleware/rateLimiter.js';
import { sanitizeInput } from './middleware/inputSanitizer.js';
import { auditLogger } from './middleware/auditLogger.js';
import { initializeSessionManagement } from './middleware/sessionManager.js';
import { initializeDatabaseSecurity } from './config/databaseSecurity.js';
import { initializeDatabaseEncryption } from './utils/databaseEncryption.js';
import { apiSecurity, initializeApiSecurity } from './middleware/apiSecurity.js';
import { requestValidator } from './middleware/requestValidator.js';
import { getSafeErrorMessage } from './utils/errorHandler.js';
import { initializeSSL, checkSSLHealth } from './config/sslConfig.js';
import { initializeEnvironmentConfig, checkConfigurationHealth } from './config/environmentConfig.js';
import { initializeMFADatabase } from './config/mfaDatabase.js';
import { initializeEncryptionDatabase } from './config/encryptionDatabase.js';
import { initializeSecurityMonitoringDatabase } from './config/securityMonitoringDatabase.js';

const execAsync = promisify(exec);

// Utility: Convert snake_case to camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Utility: Recursively convert all object keys from snake_case to camelCase
function convertKeysToCamelCase(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item));
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (typeof obj === 'object') {
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = snakeToCamel(key);
      converted[camelKey] = convertKeysToCamelCase(value);
    }
    return converted;
  }

  return obj;
}

// Logging setup
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'app.log');
const errorLogFile = path.join(logDir, 'error.log');

// Logging functions
function writeToLog(message: string, level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG' = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}\n`;

  // Write to console
  console.log(logEntry.trim());

  // Write to file
  try {
    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

function writeErrorToLog(error: unknown, context?: string) {
  const timestamp = new Date().toISOString();
  const errMsg = error instanceof Error ? error.message : String(error);
  const errorMessage = context ? `${context}: ${errMsg}` : errMsg;
  const stackTrace = error instanceof Error ? error.stack || '' : '';
  const logEntry = `[${timestamp}] [ERROR] ${errorMessage}\n${stackTrace}\n`;

  // Write to console
  console.error(logEntry.trim());

  // Write to error file
  try {
    fs.appendFileSync(errorLogFile, logEntry);
  } catch (writeError) {
    console.error('Failed to write to error log file:', writeError);
  }
}

// Request logging middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, ip, headers } = req;

  // Log incoming request
  writeToLog(`📥 INCOMING REQUEST: ${method} ${url} from ${ip}`, 'INFO');
  writeToLog(`📋 Headers: ${JSON.stringify({
    'user-agent': headers['user-agent'],
    'content-type': headers['content-type'],
    'authorization': headers.authorization ? '[REDACTED]' : 'none'
  })}`, 'DEBUG');

  // Log request body for non-GET requests (excluding sensitive data)
  if (method !== 'GET' && req.body) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
    writeToLog(`📦 Request body: ${JSON.stringify(sanitizedBody)}`, 'DEBUG');
  }

  // Override res.json to log responses AND convert snake_case to camelCase
  const originalJson = res.json;
  res.json = function (data: unknown) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Log response
    writeToLog(`📤 RESPONSE: ${method} ${url} - ${statusCode} (${duration}ms)`, 'INFO');

    if (statusCode >= 400) {
      writeToLog(`❌ Error response: ${JSON.stringify(data)}`, 'ERROR');
    } else if (url.includes('/auth/login') || url.includes('/auth/register')) {
      const respData = data as { success?: boolean; message?: string };
      writeToLog(`🔐 Auth response: ${JSON.stringify({ success: respData.success || false, message: respData.message || 'No message' })}`, 'INFO');
    }

    // Convert all snake_case keys to camelCase before sending response
    const transformedData = convertKeysToCamelCase(data);

    return originalJson.call(this, transformedData);
  };

  next();
};

// Authentication logging middleware
const authLogger = (req: Request, res: Response, next: NextFunction) => {
  const { url, method } = req;

  // Log authentication attempts
  if (url.includes('/auth/login')) {
    writeToLog(`🔐 LOGIN ATTEMPT: ${method} ${url}`, 'INFO');
  } else if (url.includes('/auth/register')) {
    writeToLog(`📝 REGISTRATION ATTEMPT: ${method} ${url}`, 'INFO');
  } else if (url.includes('/auth/logout')) {
    writeToLog(`🚪 LOGOUT ATTEMPT: ${method} ${url}`, 'INFO');
  }

  // Log protected route access
  if (req.user) {
    writeToLog(`👤 PROTECTED ROUTE ACCESS: ${method} ${url} by user ${req.user.userId} (${req.user.role})`, 'INFO');
  }

  next();
};

// Error logging middleware
const errorLogger = (error: unknown, req: Request, res: Response, next: NextFunction) => {
  writeErrorToLog(error, `Request failed: ${req.method} ${req.url}`);
  next(error);
};

// Function to kill process on port 3001
async function killProcessOnPort(port: number): Promise<void> {
  try {
    console.log(`🔪 Attempting to kill process on port ${port}...`);

    // For Windows - get all processes using the port
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    const lines = stdout.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      console.log(`ℹ️ No processes found on port ${port}`);
      return;
    }

    let killedAny = false;
    const processedPids = new Set<string>();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const pid = parts[4];
        if (pid && pid !== '0' && !isNaN(parseInt(pid)) && !processedPids.has(pid)) {
          processedPids.add(pid);
          try {
            console.log(`🔪 Killing process ${pid}...`);
            await execAsync(`taskkill /F /PID ${pid}`);
            console.log(`✅ Successfully killed process ${pid}`);
            killedAny = true;
          } catch (killError) {
            // Only log if it's not a "process not found" error
            const errMsg = killError instanceof Error ? killError.message : String(killError);
            if (!errMsg.includes('not found')) {
              console.log(`⚠️ Could not kill process ${pid}: ${errMsg}`);
            }
          }
        }
      }
    }

    if (killedAny) {
      // Wait for the port to be released
      console.log(`⏳ Waiting 2 seconds for port ${port} to be released...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify port is free
      try {
        const { stdout: checkOutput } = await execAsync(`netstat -ano | findstr :${port}`);
        if (checkOutput.trim()) {
          console.log(`⚠️ Port ${port} is still in use after kill attempt`);
        } else {
          console.log(`✅ Port ${port} is now available`);
        }
      } catch (checkError) {
        console.log(`✅ Port ${port} appears to be available (no processes found)`);
      }
    } else {
      console.log(`ℹ️ No processes needed to be killed on port ${port}`);
    }
  } catch (error) {
    // Only log if it's not a "no processes found" error
    const errMsg = error instanceof Error ? error.message : String(error);
    if (!errMsg.includes('not found')) {
      console.log(`ℹ️ Error checking port ${port}: ${errMsg}`);
    } else {
      console.log(`ℹ️ No process found on port ${port}`);
    }
  }
}

console.log('1. Starting application...');

// Load environment variables from root directory (optional - Render provides env vars directly)
console.log('2. Loading environment variables...');
const result = dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
if (result.error) {
  console.warn('⚠️ No .env file found - using environment variables from hosting platform');
} else {
  console.log('✅ Environment variables loaded from .env file');
}

// Log environment info
console.log('3. Environment info:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3001',
});

// Create Express app
console.log('4. Creating Express app...');
const app = express();

// Trust proxy - required for rate limiting behind Render's reverse proxy
// This ensures X-Forwarded-For headers are used correctly for client IP detection
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
console.log('✅ Express app created');

// Create HTTP server
console.log('5. Creating HTTP server...');
const httpServer = createServer(app);
console.log('✅ HTTP server created');

// Create Socket.IO server
console.log('6. Creating Socket.IO server...');
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://192.168.2.105:5173',
      'http://192.168.2.105:5174',
      'https://gta-cpr-course-admin.netlify.app'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io',
  // Use polling first for better compatibility with Render free tier
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  // Allow upgrade from polling to websocket
  allowUpgrades: true,
  upgradeTimeout: 30000
});
console.log('✅ Socket.IO server created');

// Basic CORS
console.log('7. Setting up CORS...');
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://192.168.2.105:5173',
    'http://192.168.2.105:5174',
    'https://gta-cpr-course-admin.netlify.app'
  ],
  credentials: true
}));
console.log('✅ CORS configured');

// Security Headers Middleware
console.log('8. Setting up security headers...');
try {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for development
          styleSrc: ["'self'", "'unsafe-inline'", "https:"], // Allow inline styles and external fonts
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174', 'ws://localhost:3001', 'ws://192.168.2.105:3001', 'https://gta-cpr-course-admin.netlify.app'],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hidePoweredBy: true,
      crossOriginEmbedderPolicy: false, // Disabled for development
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: { allow: false },
      ieNoOpen: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
    })
  );
  console.log('✅ Security headers configured');
} catch (error) {
  console.error('❌ Failed to set up security headers:', error);
  process.exit(1);
}

// Parse JSON bodies
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// Rate limiting middleware
console.log('8a. Setting up rate limiting...');
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', registerLimiter);
app.use('/api/v1', apiLimiter);
console.log('✅ Rate limiting configured');

// Input sanitization middleware
console.log('8b. Setting up input sanitization...');
app.use('/api/v1', sanitizeInput);
console.log('✅ Input sanitization configured');

// API security middleware
console.log('8c. Setting up API security...');
app.use('/api/v1', apiSecurity());
console.log('✅ API security configured');

// Request validation middleware
console.log('8d. Setting up request validation...');
app.use('/api/v1', requestValidator());
console.log('✅ Request validation configured');

// Add logging middleware
writeToLog('🔧 Setting up logging middleware...', 'INFO');
app.use(requestLogger);
app.use(authLogger);
app.use(auditLogger);
writeToLog('✅ Logging middleware configured', 'INFO');

// Add session management middleware
writeToLog('🔧 Setting up session management...', 'INFO');
writeToLog('✅ Session management configured', 'INFO');

// Basic health check route
console.log('9. Setting up health check route...');
app.get('/api/v1/health', (req: Request, res: Response) => {
  writeToLog('🏥 Health check requested', 'INFO');
  res.json({ status: 'ok' });
});

// Database security health check route
app.get('/api/v1/health/database', async (req: Request, res: Response) => {
  try {
    const { getSecureDatabase } = await import('./config/secureDatabase.js');
    const db = getSecureDatabase();
    const health = await db.healthCheck();

    res.json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      database: health.stats,
      security: health.security,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: getSafeErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

// SSL/TLS health check route
app.get('/api/v1/health/ssl', (req: Request, res: Response) => {
  try {
    const sslHealth = checkSSLHealth();
    res.json({
      status: sslHealth.valid ? 'healthy' : 'unhealthy',
      ssl: sslHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: getSafeErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Configuration health check route
app.get('/api/v1/health/config', (req: Request, res: Response) => {
  try {
    const configHealth = checkConfigurationHealth();
    res.json({
      status: configHealth.valid ? 'healthy' : 'unhealthy',
      config: configHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: getSafeErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

// MFA health check route
app.get('/api/v1/health/mfa', async (req: Request, res: Response) => {
  try {
    const { getMFADatabaseHealth } = await import('./config/mfaDatabase.js');
    const mfaHealth = await getMFADatabaseHealth();

    res.json({
      status: mfaHealth.status,
      mfa: mfaHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: getSafeErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Encryption health check route
app.get('/api/v1/health/encryption', async (req: Request, res: Response) => {
  try {
    const { getEncryptionDatabaseHealth } = await import('./config/encryptionDatabase.js');
    const encryptionHealth = await getEncryptionDatabaseHealth();

    res.json({
      status: encryptionHealth.status,
      encryption: encryptionHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: getSafeErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Security monitoring health check route
app.get('/api/v1/health/security-monitoring', async (req: Request, res: Response) => {
  try {
    const { getSecurityMonitoringDatabaseHealth } = await import('./config/securityMonitoringDatabase.js');
    const securityMonitoringHealth = await getSecurityMonitoringDatabaseHealth();

    res.json({
      status: securityMonitoringHealth.status,
      securityMonitoring: securityMonitoringHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: getSafeErrorMessage(error),
      timestamp: new Date().toISOString()
    });
  }
});

console.log('✅ Health check route configured');

// Auth routes
console.log('10. Setting up auth routes...');
import authRoutes from './routes/v1/auth.js';
app.use('/api/v1/auth', authRoutes);
console.log('✅ Auth routes configured');

// Instructor routes
console.log('11. Setting up instructor routes...');
import instructorRoutes from './routes/v1/instructor.js';
app.use('/api/v1/instructor', instructorRoutes);
console.log('✅ Instructor routes configured');

// Colleges routes
console.log('11a. Setting up colleges routes...');
import collegesRoutes from './routes/v1/colleges.js';
app.use('/api/v1/colleges', collegesRoutes);
console.log('✅ Colleges routes configured');

// V1 API routes (includes /instructors endpoint)
console.log('11a. Setting up v1 API routes...');
import v1Routes from './routes/v1/index.js';
app.use('/api/v1', v1Routes);
console.log('✅ V1 API routes configured');

// Email templates routes
console.log('11b. Setting up email templates routes...');
app.use('/api/v1/email-templates', emailTemplatesRouter);
console.log('✅ Email templates routes configured');

// Organization pricing routes
console.log('11c. Setting up organization pricing routes...');
import organizationPricingRoutes from './routes/v1/organizationPricing.js';
app.use('/api/v1/organization-pricing', organizationPricingRoutes);
console.log('✅ Organization pricing routes configured');

// Profile changes routes
console.log('11d. Setting up profile changes routes...');
import profileChangesRoutes from './routes/v1/profile-changes.js';
app.use('/api/v1/profile-changes', profileChangesRoutes);
console.log('✅ Profile changes routes configured');

// MFA routes
console.log('11f. Setting up MFA routes...');
import mfaRoutes from './routes/v1/mfa.js';
app.use('/api/v1/mfa', mfaRoutes);
console.log('✅ MFA routes configured');

// Encryption routes
console.log('11g. Setting up encryption routes...');
import encryptionRoutes from './routes/v1/encryption.js';
app.use('/api/v1/encryption', encryptionRoutes);
console.log('✅ Encryption routes configured');

// Security monitoring routes
console.log('11h. Setting up security monitoring routes...');
import securityMonitoringRoutes from './routes/v1/securityMonitoring.js';
app.use('/api/v1/security-monitoring', securityMonitoringRoutes);
console.log('✅ Security monitoring routes configured');

// Vendor routes are now handled in v1 routes
console.log('11e. Vendor routes are handled in v1 routes...');
console.log('✅ Vendor routes configured');

// SSE endpoint
console.log('12. Setting up SSE endpoint...');
app.get('/api/v1/events', (req: Request, res: Response) => {
  console.log('[SSE] Client attempting to connect to events endpoint');

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    const sendEvent = (data: Record<string, unknown>) => {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        console.error('[SSE] Error sending event:', error);
      }
    };

    // Send initial connection message
    console.log('[SSE] Sending initial connection message');
    sendEvent({ type: 'connected', timestamp: new Date().toISOString() });

    // Handle client disconnect
    req.on('close', () => {
      console.log('[SSE] Client disconnected');
      writeToLog('SSE client disconnected', 'INFO');
    });

    // Handle errors
    req.on('error', (error) => {
      console.error('[SSE] Request error:', error);
    });

    res.on('error', (error) => {
      console.error('[SSE] Response error:', error);
    });

    console.log('[SSE] SSE connection established successfully');
  } catch (error) {
    console.error('[SSE] Error setting up SSE endpoint:', error);
    res.status(500).json({ error: 'SSE setup failed' });
  }
});
console.log('✅ SSE endpoint configured');

// Add error logging middleware (must be last)
writeToLog('🔧 Setting up error logging middleware...', 'INFO');
app.use(errorLogger);
writeToLog('✅ Error logging middleware configured', 'INFO');

// Global error handler (must be last)
interface AppErrorLike extends Error {
  statusCode?: number;
  code?: string;
}

app.use((error: AppErrorLike, req: Request, res: Response, _next: NextFunction) => {
  writeErrorToLog(error, `Global error handler: ${req.method} ${req.url}`);

  // Handle AppError instances
  if (error.name === 'AppError' || error.statusCode) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      }
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_TOKEN_INVALID',
        message: 'Invalid token'
      }
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Token expired'
      }
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message || 'Validation failed'
      }
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
});

// Socket.IO connection handling
console.log('13. Setting up Socket.IO handlers...');
console.log('13a. Configuring Socket.IO connection events...');
io.on('connection', (socket) => {
  console.log('Socket.IO client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Socket.IO client disconnected:', socket.id);
  });

  socket.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });
});
console.log('✅ Socket.IO handlers configured');

// Start server
console.log('14. Starting server...');
console.log('14a. Getting port configuration...');
const port = parseInt(process.env.PORT || '3001', 10); // Use 3001 as default backend port
console.log(`Port configured as: ${port}`);
console.log(`Attempting to start server on port ${port}...`);

const startServer = async () => {
  try {
    // ========== CRITICAL INITIALIZATIONS (must complete before server starts) ==========
    console.log('🚀 Starting critical initializations...');

    console.log('14a. Initializing database tables...');
    const { initializeDatabase } = await import('./scripts/init-db.js');
    await initializeDatabase();
    console.log('✅ Database tables initialized');

    console.log('14b. Initializing token blacklist...');
    await initializeTokenBlacklist();
    console.log('✅ Token blacklist initialized');

    console.log('14c. Initializing environment configuration...');
    const envInitialized = await initializeEnvironmentConfig();
    if (!envInitialized) {
      console.error('❌ Environment configuration initialization failed');
      process.exit(1);
    }
    console.log('✅ Environment configuration initialized');

    console.log('14d. Checking for existing processes on port...');
    await killProcessOnPort(port);
    console.log('✅ Port cleanup completed');

    // ========== START SERVER IMMEDIATELY ==========
    console.log('14e. Starting HTTP server...');
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`✅ Server is now listening on http://0.0.0.0:${port}`);
      console.log(`Try accessing http://localhost:${port}/api/v1/health`);

      // ========== NON-CRITICAL INITIALIZATIONS (run in background after server starts) ==========
      console.log('🔄 Starting background initializations...');
      setImmediate(async () => {
        try {
          // These run in background and don't block requests
          console.log('[Background] Initializing session management...');
          await initializeSessionManagement().catch(e => console.log('ℹ️ Session management init skipped:', e.message));

          console.log('[Background] Initializing database security...');
          await initializeDatabaseSecurity().catch(e => console.log('ℹ️ Database security init skipped:', e.message));

          console.log('[Background] Initializing database encryption...');
          initializeDatabaseEncryption();

          console.log('[Background] Initializing API security...');
          await initializeApiSecurity().catch(e => console.log('ℹ️ API security init skipped:', e.message));

          console.log('[Background] Initializing MFA database...');
          await initializeMFADatabase().catch(e => console.log('ℹ️ MFA database init skipped:', e.message));

          console.log('[Background] Initializing encryption database...');
          await initializeEncryptionDatabase().catch(e => console.log('ℹ️ Encryption database init skipped:', e.message));

          console.log('[Background] Initializing security monitoring database...');
          await initializeSecurityMonitoringDatabase().catch(e => console.log('ℹ️ Security monitoring init skipped:', e.message));

          console.log('[Background] Initializing SSL/TLS...');
          await initializeSSL().catch(e => console.log('ℹ️ SSL/TLS init skipped:', e.message));

          console.log('[Background] Running organization locations migration...');
          const { migrateOrganizationLocations } = await import('./scripts/migrate-locations.js');
          await migrateOrganizationLocations().catch(e => console.log('ℹ️ Locations migration skipped:', e.message));

          console.log('✅ All background initializations completed');
        } catch (bgError) {
          console.error('⚠️ Some background initializations failed:', bgError);
          // Don't exit - server is already running and can handle requests
        }
      });
    });

    httpServer.on('error', (error: Error) => {
      console.error('❌ Server error:', error);
      if (error.message.includes('EADDRINUSE')) {
        console.error(`🚨 Port ${port} is already in use.`);
        console.error(`💡 Try manually killing the process or use a different port.`);
        console.error(`💡 You can run: netstat -ano | findstr :${port} to see what's using the port`);
        console.error(`💡 Or try: taskkill /F /IM node.exe to kill all Node.js processes`);
      }
      process.exit(1);
    });

    httpServer.on('listening', () => {
      console.log('14e. HTTP server listening event fired');
      const address = httpServer.address();
      if (address && typeof address === 'object') {
        console.log(`✅ Server bound to ${address.address}:${address.port}`);
        console.log(`Address type: ${address.family}`);
      }
      // Success message
      console.log('\n🎉 ========================================');
      console.log('🎉 BACKEND SERVER STARTED SUCCESSFULLY!');
      console.log('🎉 ========================================');
      console.log(`🌐 Server URL: http://localhost:${port}`);
      console.log(`🔌 Health Check: http://localhost:${port}/api/v1/health`);
      console.log(`📡 WebSocket: ws://localhost:${port}/socket.io/`);
      console.log('🎉 ========================================\n');
    });
  } catch (error) {
    console.error('14f. Error in startServer:', error);
    writeErrorToLog(error, 'Server startup failed');
    process.exit(1);
  }
};

// Process handlers
console.log('15. Setting up process handlers...');
console.log('15a. Setting up SIGINT handler...');
process.on('SIGINT', () => {
  writeToLog('🛑 Received SIGINT, shutting down gracefully...', 'INFO');
  httpServer.close(() => {
    writeToLog('✅ Server closed', 'INFO');
    process.exit(0);
  });
});

console.log('15b. Setting up SIGTERM handler...');
process.on('SIGTERM', () => {
  writeToLog('🛑 Received SIGTERM, shutting down gracefully...', 'INFO');
  httpServer.close(() => {
    writeToLog('✅ Server closed', 'INFO');
    process.exit(0);
  });
});

console.log('15c. Setting up uncaughtException handler...');
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  writeErrorToLog(error, 'Uncaught Exception');
  process.exit(1);
});

console.log('15d. Setting up unhandledRejection handler...');
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  writeErrorToLog(reason, `Unhandled Rejection at ${promise}`);
  process.exit(1);
});
console.log('✅ Process handlers configured');

// Start the server
console.log('16. Calling startServer()...');
startServer();
console.log('17. startServer() called - waiting for server to start...');