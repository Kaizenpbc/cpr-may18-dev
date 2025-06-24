import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import emailTemplatesRouter from './routes/emailTemplates.js';

const execAsync = promisify(exec);

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

function writeErrorToLog(error: any, context?: string) {
  const timestamp = new Date().toISOString();
  const errorMessage = context ? `${context}: ${error.message || error}` : error.message || error;
  const stackTrace = error.stack || '';
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
  
  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(data: any) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Log response
    writeToLog(`📤 RESPONSE: ${method} ${url} - ${statusCode} (${duration}ms)`, 'INFO');
    
    if (statusCode >= 400) {
      writeToLog(`❌ Error response: ${JSON.stringify(data)}`, 'ERROR');
    } else if (url.includes('/auth/login') || url.includes('/auth/register')) {
      writeToLog(`🔐 Auth response: ${JSON.stringify({ success: data.success || false, message: data.message || 'No message' })}`, 'INFO');
    }
    
    return originalJson.call(this, data);
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
const errorLogger = (error: any, req: Request, res: Response, next: NextFunction) => {
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
    
    let killedAny = false;
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const pid = parts[4];
        if (pid && pid !== '0' && !isNaN(parseInt(pid))) {
          try {
            console.log(`🔪 Killing process ${pid}...`);
            await execAsync(`taskkill /F /PID ${pid}`);
            console.log(`✅ Successfully killed process ${pid}`);
            killedAny = true;
          } catch (killError) {
            console.log(`⚠️ Could not kill process ${pid}: ${killError}`);
          }
        }
      }
    }
    
    if (killedAny) {
      // Wait longer for the port to be released
      console.log(`⏳ Waiting 3 seconds for port ${port} to be released...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
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
      console.log(`ℹ️ No processes found on port ${port}`);
    }
  } catch (error) {
    console.log(`ℹ️ No process found on port ${port} or already killed`);
  }
}

console.log('1. Starting application...');

// Load environment variables
console.log('2. Loading environment variables...');
const result = dotenv.config();
if (result.error) {
  console.error('❌ Failed to load .env file:', result.error);
  process.exit(1);
}
console.log('✅ Environment variables loaded');

// Log environment info
console.log('3. Environment info:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3002',
});

// Create Express app
console.log('4. Creating Express app...');
const app = express();
console.log('✅ Express app created');

// Create HTTP server
console.log('5. Creating HTTP server...');
const httpServer = createServer(app);
console.log('✅ HTTP server created');

// Create Socket.IO server
console.log('6. Creating Socket.IO server...');
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://192.168.2.105:5173', 'http://192.168.2.105:5174'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});
console.log('✅ Socket.IO server created');

// Basic CORS
console.log('7. Setting up CORS...');
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://192.168.2.105:5173', 'http://192.168.2.105:5174'],
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
          connectSrc: ["'self'", 'http://localhost:3002', 'http://localhost:5173', 'http://localhost:5174', 'ws://localhost:3002', 'ws://192.168.2.105:3002'],
        },
      },
      hsts: false,
      frameguard: false,
      noSniff: true,
      xssFilter: true,
      referrerPolicy: false,
      hidePoweredBy: true,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
    })
  );
  console.log('✅ Security headers configured');
} catch (error) {
  console.error('❌ Failed to set up security headers:', error);
  process.exit(1);
}

// Parse JSON bodies
app.use(express.json());

// Add logging middleware
writeToLog('🔧 Setting up logging middleware...', 'INFO');
app.use(requestLogger);
app.use(authLogger);
writeToLog('✅ Logging middleware configured', 'INFO');

// Basic health check route
console.log('9. Setting up health check route...');
app.get('/api/v1/health', (req: Request, res: Response) => {
  writeToLog('🏥 Health check requested', 'INFO');
  res.json({ status: 'ok' });
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

// V1 API routes (includes /instructors endpoint)
console.log('11a. Setting up v1 API routes...');
import v1Routes from './routes/v1/index.js';
app.use('/api/v1', v1Routes);
console.log('✅ V1 API routes configured');

// Email templates routes
console.log('11b. Setting up email templates routes...');
app.use('/api/v1/email-templates', emailTemplatesRouter);
console.log('✅ Email templates routes configured');

// SSE endpoint
console.log('12. Setting up SSE endpoint...');
app.get('/api/v1/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial connection message
  sendEvent({ type: 'connected', timestamp: new Date().toISOString() });

  // Handle client disconnect
  req.on('close', () => {
    writeToLog('SSE client disconnected', 'INFO');
  });
});
console.log('✅ SSE endpoint configured');

// Add error logging middleware (must be last)
writeToLog('🔧 Setting up error logging middleware...', 'INFO');
app.use(errorLogger);
writeToLog('✅ Error logging middleware configured', 'INFO');

// Global error handler (must be last)
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
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
    console.log('14b. Checking for existing processes on port...');
    await killProcessOnPort(port);
    console.log('14c. Port cleanup completed');

    console.log('14d. Starting HTTP server...');
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`✅ Server is now listening on http://0.0.0.0:${port}`);
      console.log(`Try accessing http://localhost:${port}/api/v1/health`);
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