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
      enabled: false, // Disable Redis by default
    };

    console.log('🔴 [REDIS] Redis is disabled by default');
  }

  async connect(): Promise<void> {
    if (!this.config.enabled) {
      console.log('🔴 [REDIS] Redis disabled, skipping connection');
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
    if (!this.config.enabled) {
      console.log('🔴 [REDIS] Redis disabled, no disconnection needed');
      return;
    }

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
    if (!this.config.enabled) {
      throw new Error('Redis is disabled');
    }
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }

  isReady(): boolean {
    if (!this.config.enabled) {
      return true; // Return true when Redis is disabled to allow JWT-only auth
    }
    return this.isConnected;
  }

  async healthCheck(): Promise<{
    status: string;
    latency?: number;
    error?: string;
  }> {
    return { status: 'disabled', error: 'Redis is disabled' };
  }

  // Session-specific operations with fallbacks
  async setSession(
    sessionId: string,
    sessionData: any,
    expireInSeconds: number = 3600
  ): Promise<void> {
    console.log('🔴 [REDIS SESSION] Redis disabled, session storage skipped');
    return;
  }

  async getSession(sessionId: string): Promise<any | null> {
    console.log('🔴 [REDIS SESSION] Redis disabled, session retrieval skipped');
    return null;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    console.log('🔴 [REDIS SESSION] Redis disabled, session deletion skipped');
    return true;
  }

  async extendSession(
    sessionId: string,
    expireInSeconds: number = 3600
  ): Promise<boolean> {
    console.log('🔴 [REDIS SESSION] Redis disabled, session extension skipped');
    return true;
  }

  async getAllUserSessions(userId: string): Promise<string[]> {
    console.log('🔴 [REDIS SESSION] Redis disabled, returning empty sessions list');
    return [];
  }

  async invalidateAllUserSessions(userId: string): Promise<number> {
    console.log('🔴 [REDIS SESSION] Redis disabled, session invalidation skipped');
    return 0;
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    activeUsers: Set<string>;
    avgSessionAge: number;
  }> {
    return { totalSessions: 0, activeUsers: new Set(), avgSessionAge: 0 };
  }

  async cleanupExpiredSessions(): Promise<number> {
    console.log('🔴 [REDIS CLEANUP] Redis disabled, cleanup skipped');
    return 0;
  }
}

// Export singleton instance
export const redisManager = new RedisManager();

// Convenience functions for application use
export async function ensureRedisConnection(): Promise<void> {
  console.log('🔴 [REDIS] Redis is disabled, skipping connection');
  return;
}

export async function closeRedisConnection(): Promise<void> {
  console.log('🔴 [REDIS] Redis is disabled, no disconnection needed');
  return;
}

export default redisManager;
