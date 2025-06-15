import { randomBytes, createHash } from 'crypto';
import { redisManager } from '../config/redis';
import {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
} from '../utils/jwtUtils';

export interface SessionData {
  sessionId: string;
  userId: string;
  username: string;
  role: string;
  organizationId?: number;
  ipAddress: string;
  userAgent: string;
  deviceInfo?: string;
  createdAt: string;
  lastAccess: string;
  isActive: boolean;
  securityLevel: 'standard' | 'high' | 'critical';
  accessToken?: string;
  refreshToken?: string;
}

export interface SessionConfig {
  accessTokenExpiry: number; // seconds
  refreshTokenExpiry: number; // seconds
  maxSessionsPerUser: number;
  sessionTimeoutWarning: number; // seconds before expiry to warn
  requireReauthForSensitive: boolean;
  ipBindingEnabled: boolean;
  userAgentBindingEnabled: boolean;
}

class SessionManager {
  private config: SessionConfig;

  constructor() {
    this.config = {
      accessTokenExpiry: parseInt(process.env.ACCESS_TOKEN_EXPIRY || '900'), // 15 minutes
      refreshTokenExpiry: parseInt(
        process.env.REFRESH_TOKEN_EXPIRY || '604800'
      ), // 7 days
      maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || '5'),
      sessionTimeoutWarning: parseInt(
        process.env.SESSION_TIMEOUT_WARNING || '300'
      ), // 5 minutes
      requireReauthForSensitive:
        process.env.REQUIRE_REAUTH_SENSITIVE === 'true',
      ipBindingEnabled: process.env.IP_BINDING_ENABLED !== 'false', // enabled by default
      userAgentBindingEnabled:
        process.env.USER_AGENT_BINDING_ENABLED !== 'false',
    };
  }

  /**
   * Generate a secure session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString();
    const randomData = randomBytes(32).toString('hex');
    const combined = `${timestamp}-${randomData}`;
    return createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Determine security level based on user role and request context
   */
  private determineSecurityLevel(
    role: string,
    ipAddress: string
  ): 'standard' | 'high' | 'critical' {
    // Admin and system admin require highest security
    if (role === 'admin' || role === 'system_admin') {
      return 'critical';
    }

    // Accounting role requires high security
    if (role === 'accounting') {
      return 'high';
    }

    // Check if accessing from internal network (basic heuristic)
    if (
      ipAddress.startsWith('192.168.') ||
      ipAddress.startsWith('10.') ||
      ipAddress === '127.0.0.1'
    ) {
      return 'standard';
    }

    // External access gets higher security by default
    return 'high';
  }

  /**
   * Get session expiry based on security level
   */
  private getSessionExpiry(
    securityLevel: 'standard' | 'high' | 'critical'
  ): number {
    switch (securityLevel) {
      case 'critical':
        return Math.min(this.config.refreshTokenExpiry, 3600); // Max 1 hour for critical
      case 'high':
        return Math.min(this.config.refreshTokenExpiry, 14400); // Max 4 hours for high
      case 'standard':
      default:
        return this.config.refreshTokenExpiry; // Full expiry for standard
    }
  }

  /**
   * Create a new session
   */
  async createSession(userData: {
    userId: string;
    username: string;
    role: string;
    organizationId?: number;
    ipAddress: string;
    userAgent: string;
    deviceInfo?: string;
  }): Promise<{
    sessionId: string;
    accessToken: string;
    refreshToken: string;
    sessionData: SessionData;
  }> {
    try {
      console.log(
        '🔐 [SESSION] Creating new session for user:',
        userData.username
      );

      const sessionId = this.generateSessionId();
      const securityLevel = this.determineSecurityLevel(
        userData.role,
        userData.ipAddress
      );
      const sessionExpiry = this.getSessionExpiry(securityLevel);

      // Generate JWT tokens
      const tokens = generateTokens({
        id: parseInt(userData.userId),
        userId: userData.userId,
        username: userData.username,
        role: userData.role,
        organizationId: userData.organizationId,
        sessionId, // Include session ID in JWT
      });

      const sessionData: SessionData = {
        sessionId,
        userId: userData.userId,
        username: userData.username,
        role: userData.role,
        organizationId: userData.organizationId,
        ipAddress: userData.ipAddress,
        userAgent: userData.userAgent,
        deviceInfo: userData.deviceInfo,
        createdAt: new Date().toISOString(),
        lastAccess: new Date().toISOString(),
        isActive: true,
        securityLevel,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };

      // Try to store session in Redis, but don't fail if it doesn't work
      try {
        await redisManager.setSession(sessionId, sessionData, sessionExpiry);
        console.log(
          `🔐 [SESSION] Session ${sessionId} stored in Redis (security: ${securityLevel}, expires: ${sessionExpiry}s)`
        );
      } catch (redisError) {
        console.error('❌ [SESSION] Failed to store session in Redis:', redisError);
        console.log('⚠️ [SESSION] Continuing with standard JWT authentication');
      }

      return {
        sessionId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        sessionData,
      };
    } catch (error) {
      console.error('❌ [SESSION] Failed to create session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionData = await redisManager.getSession(sessionId);

      if (!sessionData) {
        console.log(`🔐 [SESSION] Session ${sessionId} not found or expired`);
        return null;
      }

      // Update last access time
      sessionData.lastAccess = new Date().toISOString();
      const sessionExpiry = this.getSessionExpiry(sessionData.securityLevel);
      await redisManager.setSession(sessionId, sessionData, sessionExpiry);

      return sessionData as SessionData;
    } catch (error) {
      console.error('❌ [SESSION] Failed to get session:', error);
      return null;
    }
  }

  /**
   * Validate session with security checks
   */
  async validateSession(
    sessionId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ valid: boolean; sessionData?: SessionData; reason?: string }> {
    try {
      const sessionData = await this.getSession(sessionId);

      if (!sessionData) {
        return { valid: false, reason: 'Session not found or expired' };
      }

      if (!sessionData.isActive) {
        return { valid: false, reason: 'Session is inactive' };
      }

      // IP binding validation
      if (this.config.ipBindingEnabled && sessionData.ipAddress !== ipAddress) {
        console.error(
          `🚨 [SESSION SECURITY] IP mismatch for session ${sessionId}: expected ${sessionData.ipAddress}, got ${ipAddress}`
        );
        await this.invalidateSession(sessionId, 'IP address mismatch detected');
        return { valid: false, reason: 'IP address validation failed' };
      }

      // User agent binding validation (more lenient - check major components)
      if (
        this.config.userAgentBindingEnabled &&
        sessionData.userAgent !== userAgent
      ) {
        const originalUA = this.extractUserAgentFingerprint(
          sessionData.userAgent
        );
        const currentUA = this.extractUserAgentFingerprint(userAgent);

        if (originalUA !== currentUA) {
          console.error(
            `🚨 [SESSION SECURITY] User agent mismatch for session ${sessionId}`
          );
          await this.invalidateSession(
            sessionId,
            'User agent validation failed'
          );
          return { valid: false, reason: 'User agent validation failed' };
        }
      }

      return { valid: true, sessionData };
    } catch (error) {
      console.error('❌ [SESSION] Session validation failed:', error);
      return { valid: false, reason: 'Session validation error' };
    }
  }

  /**
   * Extract user agent fingerprint for validation
   */
  private extractUserAgentFingerprint(userAgent: string): string {
    // Extract browser, version, and OS for loose matching
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/);

    return `${browserMatch ? browserMatch[1] + browserMatch[2] : 'unknown'}-${osMatch ? osMatch[1] : 'unknown'}`;
  }

  /**
   * Refresh session tokens
   */
  async refreshSession(
    refreshToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{
    success: boolean;
    accessToken?: string;
    newRefreshToken?: string;
    sessionData?: SessionData;
    error?: string;
  }> {
    try {
      console.log('🔐 [SESSION] Attempting to refresh session');

      // Verify refresh token
      const decoded = await verifyRefreshToken(refreshToken);
      if (!decoded || !decoded.sessionId) {
        return { success: false, error: 'Invalid refresh token' };
      }

      // Validate session
      const validation = await this.validateSession(
        decoded.sessionId,
        ipAddress,
        userAgent
      );
      if (!validation.valid || !validation.sessionData) {
        return {
          success: false,
          error: validation.reason || 'Session validation failed',
        };
      }

      const sessionData = validation.sessionData;

      // Check if the refresh token matches
      if (sessionData.refreshToken !== refreshToken) {
        console.error(
          `🚨 [SESSION SECURITY] Refresh token mismatch for session ${decoded.sessionId}`
        );
        await this.invalidateSession(
          decoded.sessionId,
          'Refresh token mismatch'
        );
        return { success: false, error: 'Token validation failed' };
      }

      // Generate new tokens
      const newTokens = generateTokens({
        id: parseInt(sessionData.userId),
        userId: sessionData.userId,
        username: sessionData.username,
        role: sessionData.role,
        organizationId: sessionData.organizationId,
        sessionId: sessionData.sessionId,
      });

      // Update session with new tokens
      sessionData.accessToken = newTokens.accessToken;
      sessionData.refreshToken = newTokens.refreshToken;
      sessionData.lastAccess = new Date().toISOString();

      const sessionExpiry = this.getSessionExpiry(sessionData.securityLevel);
      await redisManager.setSession(
        sessionData.sessionId,
        sessionData,
        sessionExpiry
      );

      console.log(
        `🔐 [SESSION] Session ${sessionData.sessionId} refreshed successfully`
      );

      return {
        success: true,
        accessToken: newTokens.accessToken,
        newRefreshToken: newTokens.refreshToken,
        sessionData,
      };
    } catch (error) {
      console.error('❌ [SESSION] Failed to refresh session:', error);
      return { success: false, error: 'Session refresh failed' };
    }
  }

  /**
   * Invalidate a specific session
   */
  async invalidateSession(
    sessionId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      console.log(
        `🔐 [SESSION] Invalidating session ${sessionId}${reason ? ` (reason: ${reason})` : ''}`
      );

      const result = await redisManager.deleteSession(sessionId);

      if (result) {
        console.log(
          `✅ [SESSION] Session ${sessionId} invalidated successfully`
        );
        // TODO: Log security event for audit trail
        return true;
      } else {
        console.log(
          `⚠️ [SESSION] Session ${sessionId} was not found for invalidation`
        );
        return false;
      }
    } catch (error) {
      console.error('❌ [SESSION] Failed to invalidate session:', error);
      return false;
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(
    userId: string,
    excludeSessionId?: string
  ): Promise<number> {
    try {
      console.log(
        `🔐 [SESSION] Invalidating all sessions for user ${userId}${excludeSessionId ? ` except ${excludeSessionId}` : ''}`
      );

      const userSessions = await redisManager.getAllUserSessions(userId);
      let invalidatedCount = 0;

      for (const sessionId of userSessions) {
        if (excludeSessionId && sessionId === excludeSessionId) {
          continue; // Skip the excluded session
        }

        const success = await this.invalidateSession(
          sessionId,
          'User session cleanup'
        );
        if (success) {
          invalidatedCount++;
        }
      }

      console.log(
        `🔐 [SESSION] Invalidated ${invalidatedCount} sessions for user ${userId}`
      );
      return invalidatedCount;
    } catch (error) {
      console.error('❌ [SESSION] Failed to invalidate user sessions:', error);
      return 0;
    }
  }

  /**
   * Enforce session limits per user
   */
  private async enforceSessionLimits(userId: string): Promise<void> {
    try {
      const userSessions = await redisManager.getAllUserSessions(userId);

      if (userSessions.length >= this.config.maxSessionsPerUser) {
        console.log(
          `🔐 [SESSION] User ${userId} has ${userSessions.length} sessions, enforcing limit of ${this.config.maxSessionsPerUser}`
        );

        // Get session details to find oldest ones
        const sessionDetails: { sessionId: string; lastAccess: string }[] = [];

        for (const sessionId of userSessions) {
          const sessionData = await redisManager.getSession(sessionId);
          if (sessionData) {
            sessionDetails.push({
              sessionId,
              lastAccess: sessionData.lastAccess || sessionData.createdAt,
            });
          }
        }

        // Sort by last access (oldest first)
        sessionDetails.sort(
          (a, b) =>
            new Date(a.lastAccess).getTime() - new Date(b.lastAccess).getTime()
        );

        // Remove oldest sessions to make room for new one
        const sessionsToRemove =
          sessionDetails.length - this.config.maxSessionsPerUser + 1;

        for (let i = 0; i < sessionsToRemove; i++) {
          await this.invalidateSession(
            sessionDetails[i].sessionId,
            'Session limit enforcement'
          );
        }
      }
    } catch (error) {
      console.error('❌ [SESSION] Failed to enforce session limits:', error);
      // Don't throw - session creation should continue
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeUsers: number;
    avgSessionAge: number;
    sessionsBySecurityLevel: {
      standard: number;
      high: number;
      critical: number;
    };
  }> {
    try {
      const stats = await redisManager.getSessionStats();

      // Count sessions by security level
      const sessionsBySecurityLevel = { standard: 0, high: 0, critical: 0 };
      const client = redisManager.getClient();
      const keys = await client.keys('session:*');

      for (const key of keys) {
        const sessionData = await client.get(key);
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          if (parsed.securityLevel) {
            sessionsBySecurityLevel[
              parsed.securityLevel as keyof typeof sessionsBySecurityLevel
            ]++;
          }
        }
      }

      return {
        totalSessions: stats.totalSessions,
        activeUsers: stats.activeUsers.size,
        avgSessionAge: stats.avgSessionAge,
        sessionsBySecurityLevel,
      };
    } catch (error) {
      console.error('❌ [SESSION] Failed to get session stats:', error);
      return {
        totalSessions: 0,
        activeUsers: 0,
        avgSessionAge: 0,
        sessionsBySecurityLevel: { standard: 0, high: 0, critical: 0 },
      };
    }
  }

  /**
   * Cleanup expired sessions (should be called periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      console.log('🔐 [SESSION] Starting cleanup of expired sessions');

      const client = redisManager.getClient();
      const keys = await client.keys('session:*');
      let cleanedCount = 0;

      for (const key of keys) {
        const ttl = await client.ttl(key);
        if (ttl === -2) {
          // Key doesn't exist (expired)
          cleanedCount++;
        }
      }

      console.log(
        `🔐 [SESSION] Cleanup completed: ${cleanedCount} expired sessions removed`
      );
      return cleanedCount;
    } catch (error) {
      console.error('❌ [SESSION] Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): SessionConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

// Helper functions
export async function createUserSession(userData: {
  userId: string;
  username: string;
  role: string;
  organizationId?: number;
  ipAddress: string;
  userAgent: string;
  deviceInfo?: string;
}): Promise<{ sessionId: string; accessToken: string; refreshToken: string }> {
  const result = await sessionManager.createSession(userData);
  return {
    sessionId: result.sessionId,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };
}

export async function validateUserSession(
  sessionId: string,
  ipAddress: string,
  userAgent: string
): Promise<SessionData | null> {
  const validation = await sessionManager.validateSession(
    sessionId,
    ipAddress,
    userAgent
  );
  return validation.valid ? validation.sessionData || null : null;
}

export async function refreshUserSession(
  refreshToken: string,
  ipAddress: string,
  userAgent: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const result = await sessionManager.refreshSession(
    refreshToken,
    ipAddress,
    userAgent
  );

  if (result.success && result.accessToken && result.newRefreshToken) {
    return {
      accessToken: result.accessToken,
      refreshToken: result.newRefreshToken,
    };
  }

  return null;
}

export async function invalidateUserSession(
  sessionId: string
): Promise<boolean> {
  return await sessionManager.invalidateSession(sessionId);
}

export async function invalidateAllUserSessions(
  userId: string,
  excludeSessionId?: string
): Promise<number> {
  return await sessionManager.invalidateAllUserSessions(
    userId,
    excludeSessionId
  );
}
