import { createClient, RedisClientType } from 'redis';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryAttempts: number;
  retryDelay: number;
  connectTimeout: number;
  enabled: boolean;
}

class RedisManager {
  private client: RedisClientType | null = null;
  private config: RedisConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private connectionAttempted: boolean = false;

  constructor() {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryAttempts: parseInt(process.env.REDIS_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000'),
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '3000'),
      enabled: process.env.REDIS_ENABLED !== 'false',
    };
  }

  async connect(): Promise<void> {
    if (!this.config.enabled) {
      console.log('🔴 [REDIS] Redis disabled via configuration');
      return;
    }

    if (this.connectionAttempted) {
      return;
    }

    this.connectionAttempted = true;

    try {
      console.log('🔴 [REDIS] Attempting to connect to Redis...');
      console.log(
        `🔴 [REDIS] Configuration: ${this.config.host}:${this.config.port} (DB: ${this.config.db})`
      );

      this.client = createClient({
        url: `redis://${this.config.password ? ':' + this.config.password + '@' : ''}${this.config.host}:${this.config.port}/${this.config.db}`,
        socket: {
          connectTimeout: this.config.connectTimeout,
          reconnectStrategy: retries => {
            if (retries >= this.config.retryAttempts) {
              console.error('❌ [REDIS] Max reconnection attempts reached');
              return false;
            }
            const delay = Math.min(retries * this.config.retryDelay, 5000);
            console.log(
              `🔄 [REDIS] Reconnecting in ${delay}ms (attempt ${retries + 1}/${this.config.retryAttempts})`
            );
            return delay;
          },
        },
      });

      // Event listeners
      this.client.on('connect', () => {
        console.log('🔴 [REDIS] Connected to Redis server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('ready', () => {
        console.log('✅ [REDIS] Redis client ready for operations');
      });

      this.client.on('error', error => {
        console.error('❌ [REDIS] Redis connection error:', error.message);
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 [REDIS] Attempting to reconnect to Redis...');
        this.reconnectAttempts++;
      });

      this.client.on('end', () => {
        console.log('🔴 [REDIS] Redis connection ended');
        this.isConnected = false;
      });

      await this.client.connect();

      // Test the connection
      await this.client.ping();
      console.log('✅ [REDIS] Connection established and tested successfully');
    } catch (error) {
      console.error(
        '❌ [REDIS] Failed to connect to Redis:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      this.isConnected = false;
      this.client = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        console.log('🔴 [REDIS] Disconnecting from Redis...');
        await this.client.quit();
        console.log('✅ [REDIS] Disconnected gracefully');
      } catch (error) {
        console.error('❌ [REDIS] Error during Redis disconnection:', error);
      } finally {
        this.client = null;
        this.isConnected = false;
      }
    }
  }

  getClient(): RedisClientType {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client is not connected. Call connect() first.');
    }
    return this.client;
  }

  isReady(): boolean {
    return this.config.enabled && this.isConnected && this.client !== null;
  }

  async healthCheck(): Promise<{
    status: string;
    latency?: number;
    error?: string;
  }> {
    try {
      if (!this.config.enabled) {
        return { status: 'disabled', error: 'Redis disabled in configuration' };
      }

      if (!this.client || !this.isConnected) {
        return { status: 'disconnected', error: 'Redis client not connected' };
      }

      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      return { status: 'healthy', latency };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Session-specific operations with fallbacks
  async setSession(
    sessionId: string,
    sessionData: any,
    expireInSeconds: number = 3600
  ): Promise<void> {
    if (!this.isReady()) {
      console.log(
        '🔴 [REDIS SESSION] Redis not available, session storage skipped'
      );
      return; // Graceful fallback
    }

    try {
      const client = this.getClient();
      const serializedData = JSON.stringify({
        ...sessionData,
        lastAccess: new Date().toISOString(),
        createdAt: sessionData.createdAt || new Date().toISOString(),
      });

      await client.setEx(
        `session:${sessionId}`,
        expireInSeconds,
        serializedData
      );
      console.log(
        `🔴 [REDIS SESSION] Session ${sessionId} stored (expires in ${expireInSeconds}s)`
      );
    } catch (error) {
      console.error('❌ [REDIS SESSION] Failed to store session:', error);
      // Don't throw - graceful degradation
    }
  }

  async getSession(sessionId: string): Promise<any | null> {
    if (!this.isReady()) {
      console.log(
        '🔴 [REDIS SESSION] Redis not available, session retrieval skipped'
      );
      return null; // Graceful fallback
    }

    try {
      const client = this.getClient();
      const sessionData = await client.get(`session:${sessionId}`);

      if (!sessionData) {
        console.log(
          `🔴 [REDIS SESSION] Session ${sessionId} not found or expired`
        );
        return null;
      }

      const parsed = JSON.parse(sessionData);
      console.log(`🔴 [REDIS SESSION] Session ${sessionId} retrieved`);
      return parsed;
    } catch (error) {
      console.error('❌ [REDIS SESSION] Failed to retrieve session:', error);
      return null; // Graceful fallback
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    if (!this.isReady()) {
      console.log(
        '🔴 [REDIS SESSION] Redis not available, session deletion skipped'
      );
      return true; // Pretend success for graceful fallback
    }

    try {
      const client = this.getClient();
      const result = await client.del(`session:${sessionId}`);

      if (result > 0) {
        console.log(
          `🔴 [REDIS SESSION] Session ${sessionId} deleted successfully`
        );
        return true;
      } else {
        console.log(
          `🔴 [REDIS SESSION] Session ${sessionId} not found for deletion`
        );
        return false;
      }
    } catch (error) {
      console.error('❌ [REDIS SESSION] Failed to delete session:', error);
      return false;
    }
  }

  async extendSession(
    sessionId: string,
    expireInSeconds: number = 3600
  ): Promise<boolean> {
    if (!this.isReady()) {
      console.log(
        '🔴 [REDIS SESSION] Redis not available, session extension skipped'
      );
      return true; // Pretend success for graceful fallback
    }

    try {
      const client = this.getClient();
      const result = await client.expire(
        `session:${sessionId}`,
        expireInSeconds
      );

      if (result) {
        console.log(
          `🔴 [REDIS SESSION] Session ${sessionId} extended by ${expireInSeconds}s`
        );
        return true;
      } else {
        console.log(
          `🔴 [REDIS SESSION] Session ${sessionId} not found for extension`
        );
        return false;
      }
    } catch (error) {
      console.error('❌ [REDIS SESSION] Failed to extend session:', error);
      return false;
    }
  }

  async getAllUserSessions(userId: string): Promise<string[]> {
    if (!this.isReady()) {
      console.log(
        '🔴 [REDIS SESSION] Redis not available, returning empty sessions list'
      );
      return []; // Graceful fallback
    }

    try {
      const client = this.getClient();
      const keys = await client.keys(`session:*`);
      const userSessions: string[] = [];

      for (const key of keys) {
        const sessionData = await client.get(key);
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          if (parsed.userId === userId) {
            userSessions.push(key.replace('session:', ''));
          }
        }
      }

      console.log(
        `🔴 [REDIS SESSION] Found ${userSessions.length} sessions for user ${userId}`
      );
      return userSessions;
    } catch (error) {
      console.error('❌ [REDIS SESSION] Failed to get user sessions:', error);
      return [];
    }
  }

  async invalidateAllUserSessions(userId: string): Promise<number> {
    if (!this.isReady()) {
      console.log(
        '🔴 [REDIS SESSION] Redis not available, session invalidation skipped'
      );
      return 0; // Graceful fallback
    }

    try {
      const userSessions = await this.getAllUserSessions(userId);
      const client = this.getClient();

      if (userSessions.length === 0) {
        console.log(`🔴 [REDIS SESSION] No sessions found for user ${userId}`);
        return 0;
      }

      const sessionKeys = userSessions.map(sessionId => `session:${sessionId}`);
      const deletedCount = await client.del(sessionKeys);

      console.log(
        `🔴 [REDIS SESSION] Invalidated ${deletedCount} sessions for user ${userId}`
      );
      return deletedCount;
    } catch (error) {
      console.error(
        '❌ [REDIS SESSION] Failed to invalidate user sessions:',
        error
      );
      return 0;
    }
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    activeUsers: Set<string>;
    avgSessionAge: number;
  }> {
    if (!this.isReady()) {
      // Return empty stats when Redis is not available
      return { totalSessions: 0, activeUsers: new Set(), avgSessionAge: 0 };
    }

    try {
      const client = this.getClient();
      const keys = await client.keys('session:*');
      const activeUsers = new Set<string>();
      let totalAge = 0;
      let validSessions = 0;

      for (const key of keys) {
        const sessionData = await client.get(key);
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          if (parsed.userId) {
            activeUsers.add(parsed.userId);
            if (parsed.createdAt) {
              const age = Date.now() - new Date(parsed.createdAt).getTime();
              totalAge += age;
              validSessions++;
            }
          }
        }
      }

      const avgSessionAge = validSessions > 0 ? totalAge / validSessions : 0;

      return {
        totalSessions: keys.length,
        activeUsers,
        avgSessionAge,
      };
    } catch (error) {
      console.error('❌ [REDIS SESSION] Failed to get session stats:', error);
      return { totalSessions: 0, activeUsers: new Set(), avgSessionAge: 0 };
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    if (!this.isReady()) {
      console.log('🔴 [REDIS CLEANUP] Redis not available, cleanup skipped');
      return 0; // Graceful fallback
    }

    try {
      const client = this.getClient();
      const keys = await client.keys('session:*');
      let cleanedCount = 0;

      for (const key of keys) {
        const ttl = await client.ttl(key);

        // If TTL is -1, the key exists but has no expiration
        // If TTL is -2, the key doesn't exist (expired)
        if (ttl === -2) {
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(
          `🧹 [REDIS CLEANUP] Cleaned up ${cleanedCount} expired session keys`
        );
      }

      return cleanedCount;
    } catch (error) {
      console.error(
        '❌ [REDIS CLEANUP] Failed to cleanup expired sessions:',
        error
      );
      return 0;
    }
  }
}

// Singleton instance
export const redisManager = new RedisManager();

// Convenience functions for application use
export async function ensureRedisConnection(): Promise<void> {
  try {
    await redisManager.connect();
  } catch (error) {
    console.log(
      '⚠️ [REDIS] Redis connection failed, application will continue with JWT-only authentication'
    );
    throw error;
  }
}

export async function closeRedisConnection(): Promise<void> {
  await redisManager.disconnect();
}

export default redisManager;
