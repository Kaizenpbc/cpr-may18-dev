import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';
import { AppError, errorCodes } from '../utils/errorHandler.js';
import { logSecurityEvent, AuditEventSeverity } from './auditLogger.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Session configuration
export interface SessionConfig {
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  extendOnActivity: boolean;
  requireReauthOnSuspiciousActivity: boolean;
}

// Default session configuration by role
export const DEFAULT_SESSION_CONFIG: Record<string, SessionConfig> = {
  sysadmin: {
    maxConcurrentSessions: 2,
    sessionTimeoutMinutes: 30, // 30 minutes
    idleTimeoutMinutes: 15,    // 15 minutes idle
    extendOnActivity: true,
    requireReauthOnSuspiciousActivity: true
  },
  admin: {
    maxConcurrentSessions: 3,
    sessionTimeoutMinutes: 60, // 1 hour
    idleTimeoutMinutes: 30,    // 30 minutes idle
    extendOnActivity: true,
    requireReauthOnSuspiciousActivity: true
  },
  instructor: {
    maxConcurrentSessions: 5,
    sessionTimeoutMinutes: 480, // 8 hours
    idleTimeoutMinutes: 120,    // 2 hours idle
    extendOnActivity: true,
    requireReauthOnSuspiciousActivity: false
  },
  hr: {
    maxConcurrentSessions: 4,
    sessionTimeoutMinutes: 240, // 4 hours
    idleTimeoutMinutes: 60,     // 1 hour idle
    extendOnActivity: true,
    requireReauthOnSuspiciousActivity: true
  },
  accountant: {
    maxConcurrentSessions: 4,
    sessionTimeoutMinutes: 240, // 4 hours
    idleTimeoutMinutes: 60,     // 1 hour idle
    extendOnActivity: true,
    requireReauthOnSuspiciousActivity: true
  },
  default: {
    maxConcurrentSessions: 3,
    sessionTimeoutMinutes: 120, // 2 hours
    idleTimeoutMinutes: 30,     // 30 minutes idle
    extendOnActivity: true,
    requireReauthOnSuspiciousActivity: false
  }
};

// Session information interface
export interface SessionInfo {
  sessionId: string;
  userId: string;
  role: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  loginLocation?: string;
}

// Create session table if it doesn't exist
export async function initializeSessionTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        role VARCHAR(50) NOT NULL,
        ip_address INET NOT NULL,
        user_agent TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        login_location VARCHAR(255),
        created_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
    `);

    console.log('✅ Session management table initialized');
  } catch (error) {
    console.error('❌ Failed to initialize session table:', error);
    throw error;
  }
}

// Create a new session
export async function createSession(
  userId: string,
  role: string,
  ipAddress: string,
  userAgent: string,
  loginLocation?: string
): Promise<SessionInfo> {
  const sessionId = uuidv4();
  const config = DEFAULT_SESSION_CONFIG[role] || DEFAULT_SESSION_CONFIG.default;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.sessionTimeoutMinutes * 60 * 1000);

  try {
    // Check concurrent session limit
    const activeSessions = await pool.query(
      `SELECT COUNT(*) as count FROM user_sessions 
       WHERE user_id = $1 AND is_active = TRUE AND expires_at > NOW()`,
      [userId]
    );

    const activeCount = parseInt(activeSessions.rows[0].count);
    if (activeCount >= config.maxConcurrentSessions) {
      // Deactivate oldest sessions to make room
      await pool.query(
        `UPDATE user_sessions 
         SET is_active = FALSE 
         WHERE user_id = $1 AND is_active = TRUE 
         ORDER BY last_activity ASC 
         LIMIT $2`,
        [userId, activeCount - config.maxConcurrentSessions + 1]
      );
    }

    // Create new session
    const result = await pool.query(
      `INSERT INTO user_sessions 
       (session_id, user_id, role, ip_address, user_agent, expires_at, login_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [sessionId, userId, role, ipAddress, userAgent, expiresAt, loginLocation]
    );

    const session = result.rows[0];
    return {
      sessionId: session.session_id,
      userId: session.user_id.toString(),
      role: session.role,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      createdAt: session.created_at,
      lastActivity: session.last_activity,
      expiresAt: session.expires_at,
      isActive: session.is_active,
      loginLocation: session.login_location
    };
  } catch (error) {
    console.error('Failed to create session:', error);
    throw new AppError(500, errorCodes.INTERNAL_SERVER_ERROR, 'Failed to create session');
  }
}

// Validate and update session
export async function validateSession(
  sessionId: string,
  ipAddress: string,
  userAgent: string
): Promise<SessionInfo | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM user_sessions 
       WHERE session_id = $1 AND is_active = TRUE AND expires_at > NOW()`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];
    const config = DEFAULT_SESSION_CONFIG[session.role] || DEFAULT_SESSION_CONFIG.default;
    const now = new Date();
    const lastActivity = new Date(session.last_activity);
    const idleTime = (now.getTime() - lastActivity.getTime()) / (1000 * 60); // minutes

    // Check for suspicious activity
    if (session.ip_address !== ipAddress || session.user_agent !== userAgent) {
      if (config.requireReauthOnSuspiciousActivity) {
        // Log security event and deactivate session
        await logSecurityEvent(
          'SUSPICIOUS_SESSION_ACTIVITY',
          AuditEventSeverity.HIGH,
          { ip: ipAddress, get: () => userAgent, url: '/session' } as unknown as Request,
          {
            sessionId,
            originalIp: session.ip_address,
            originalUserAgent: session.user_agent,
            newIp: ipAddress,
            newUserAgent: userAgent
          }
        );

        await pool.query(
          'UPDATE user_sessions SET is_active = FALSE WHERE session_id = $1',
          [sessionId]
        );
        return null;
      }
    }

    // Check idle timeout
    if (idleTime > config.idleTimeoutMinutes) {
      await pool.query(
        'UPDATE user_sessions SET is_active = FALSE WHERE session_id = $1',
        [sessionId]
      );
      return null;
    }

    // Update last activity if session is still valid
    if (config.extendOnActivity) {
      const newExpiresAt = new Date(now.getTime() + config.sessionTimeoutMinutes * 60 * 1000);
      await pool.query(
        `UPDATE user_sessions 
         SET last_activity = NOW(), expires_at = $1 
         WHERE session_id = $2`,
        [newExpiresAt, sessionId]
      );
    }

    return {
      sessionId: session.session_id,
      userId: session.user_id.toString(),
      role: session.role,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      createdAt: session.created_at,
      lastActivity: session.last_activity,
      expiresAt: session.expires_at,
      isActive: session.is_active,
      loginLocation: session.login_location
    };
  } catch (error) {
    console.error('Failed to validate session:', error);
    return null;
  }
}

// Deactivate session
export async function deactivateSession(sessionId: string): Promise<void> {
  try {
    await pool.query(
      'UPDATE user_sessions SET is_active = FALSE WHERE session_id = $1',
      [sessionId]
    );
  } catch (error) {
    console.error('Failed to deactivate session:', error);
  }
}

// Deactivate all sessions for a user
export async function deactivateAllUserSessions(userId: string): Promise<void> {
  try {
    await pool.query(
      'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1',
      [userId]
    );
  } catch (error) {
    console.error('Failed to deactivate user sessions:', error);
  }
}

// Clean up expired sessions
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const result = await pool.query(
      'UPDATE user_sessions SET is_active = FALSE WHERE expires_at < NOW() AND is_active = TRUE'
    );
    console.log(`🧹 Cleaned up ${result.rowCount} expired sessions`);
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error);
  }
}

// Get active sessions for a user
export async function getUserActiveSessions(userId: string): Promise<SessionInfo[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM user_sessions 
       WHERE user_id = $1 AND is_active = TRUE AND expires_at > NOW()
       ORDER BY last_activity DESC`,
      [userId]
    );

    return result.rows.map(session => ({
      sessionId: session.session_id,
      userId: session.user_id.toString(),
      role: session.role,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      createdAt: session.created_at,
      lastActivity: session.last_activity,
      expiresAt: session.expires_at,
      isActive: session.is_active,
      loginLocation: session.login_location
    }));
  } catch (error) {
    console.error('Failed to get user sessions:', error);
    return [];
  }
}

// Session management middleware
export const sessionManager = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract session ID from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.decode(token) as { sessionId?: string } | null;

    if (!decoded || !decoded.sessionId) {
      return next();
    }

    // Validate session
    const session = await validateSession(
      decoded.sessionId,
      req.ip || req.connection.remoteAddress || 'unknown',
      req.get('User-Agent') || 'unknown'
    );

    if (!session) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session has expired or is invalid'
        }
      });
    }

    // Add session info to request (using sessionInfo to avoid conflict with express-session)
    req.sessionInfo = session;
    next();
  } catch (error) {
    console.error('Session management error:', error);
    next();
  }
};

// Middleware to require active session
export const requireActiveSession = (req: Request, res: Response, next: NextFunction) => {
  const session = req.sessionInfo;

  if (!session) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'SESSION_REQUIRED',
        message: 'Active session required'
      }
    });
  }

  next();
};

// Initialize session management on startup
export async function initializeSessionManagement(): Promise<void> {
  await initializeSessionTable();
  
  // Clean up expired sessions every 5 minutes
  setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
  
  console.log('✅ Session management initialized');
}
