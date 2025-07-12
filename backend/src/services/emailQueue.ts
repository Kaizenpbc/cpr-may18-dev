import { Redis } from 'ioredis';

interface EmailJob {
  id: string;
  to: string;
  subject: string;
  html: string;
  createdAt: Date;
}

class EmailQueueService {
  private redis: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    if (process.env.REDIS_ENABLED === 'true') {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: 3,
      });

      this.redis.on('error', (error: Error) => {
        console.error('❌ [REDIS] Connection error:', error);
        this.isConnected = false;
      });

      this.redis.on('connect', () => {
        console.log('✅ [REDIS] Connected to Redis server');
        this.isConnected = true;
      });
    }
  }

  async addToQueue(emailJob: EmailJob): Promise<void> {
    if (!this.redis || !this.isConnected) {
      console.log('⚠️ [EMAIL QUEUE] Redis not available, skipping queue');
      return;
    }

    try {
      await this.redis.lpush('email_queue', JSON.stringify(emailJob));
      console.log(`📧 [EMAIL QUEUE] Added email job ${emailJob.id} to queue`);
    } catch (error) {
      console.error('❌ [EMAIL QUEUE] Failed to add to queue:', error);
    }
  }

  async processQueue(): Promise<void> {
    if (!this.redis || !this.isConnected) {
      console.log('⚠️ [EMAIL QUEUE] Redis not available, skipping queue processing');
      return;
    }

    try {
      const jobData = await this.redis.rpop('email_queue');
      if (jobData) {
        const job: EmailJob = JSON.parse(jobData);
        console.log(`📧 [EMAIL QUEUE] Processing email job ${job.id}`);
        
        // Process the email job here
        // This would typically call the email service
      }
    } catch (error) {
      console.error('❌ [EMAIL QUEUE] Failed to process queue:', error);
    }
  }

  async getQueueLength(): Promise<number> {
    if (!this.redis || !this.isConnected) {
      return 0;
    }

    try {
      return await this.redis.llen('email_queue');
    } catch (error) {
      console.error('❌ [EMAIL QUEUE] Failed to get queue length:', error);
      return 0;
    }
  }
}

export const emailQueueService = new EmailQueueService(); 