import Redis from 'ioredis';
import { emailService } from './emailService.js';

interface EmailJob {
  id: string;
  type: 'course_assigned_instructor' | 'course_scheduled_organization';
  data: any;
  recipient: string;
  createdAt: Date;
  retries: number;
}

class EmailQueueService {
  private redis: Redis;
  private static instance: EmailQueueService;
  private isProcessing = false;

  private constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (error) => {
      console.error('❌ [EMAIL QUEUE] Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('✅ [EMAIL QUEUE] Connected to Redis');
      this.startProcessing();
    });
  }

  public static getInstance(): EmailQueueService {
    if (!EmailQueueService.instance) {
      EmailQueueService.instance = new EmailQueueService();
    }
    return EmailQueueService.instance;
  }

  /**
   * Add email job to queue (non-blocking)
   */
  public async addEmailJob(job: Omit<EmailJob, 'id' | 'createdAt' | 'retries'>): Promise<string> {
    const emailJob: EmailJob = {
      ...job,
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      retries: 0,
    };

    try {
      await this.redis.lpush('email_queue', JSON.stringify(emailJob));
      console.log(`📧 [EMAIL QUEUE] Job added: ${emailJob.id} for ${emailJob.recipient}`);
      return emailJob.id;
    } catch (error) {
      console.error('❌ [EMAIL QUEUE] Failed to add job:', error);
      throw error;
    }
  }

  /**
   * Process email jobs in background
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('🔄 [EMAIL QUEUE] Starting email processor...');

    while (this.isProcessing) {
      try {
        // Get job from queue (blocking for 5 seconds)
        const jobData = await this.redis.brpop('email_queue', 5);
        
        if (!jobData) {
          continue; // No jobs available
        }

        const job: EmailJob = JSON.parse(jobData[1]);
        console.log(`📧 [EMAIL QUEUE] Processing job: ${job.id}`);

        try {
          await this.processEmailJob(job);
          console.log(`✅ [EMAIL QUEUE] Job completed: ${job.id}`);
        } catch (error) {
          console.error(`❌ [EMAIL QUEUE] Job failed: ${job.id}`, error);
          await this.handleFailedJob(job, error);
        }
      } catch (error) {
        console.error('❌ [EMAIL QUEUE] Processing error:', error);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
      }
    }
  }

  /**
   * Process individual email job
   */
  private async processEmailJob(job: EmailJob): Promise<void> {
    switch (job.type) {
      case 'course_assigned_instructor':
        await emailService.sendCourseAssignedNotification(job.recipient, job.data);
        break;
      case 'course_scheduled_organization':
        await emailService.sendCourseScheduledToOrganization(job.recipient, job.data);
        break;
      default:
        throw new Error(`Unknown email job type: ${job.type}`);
    }
  }

  /**
   * Handle failed jobs with retry logic
   */
  private async handleFailedJob(job: EmailJob, error: any): Promise<void> {
    const maxRetries = 3;
    
    if (job.retries < maxRetries) {
      job.retries++;
      console.log(`🔄 [EMAIL QUEUE] Retrying job ${job.id} (attempt ${job.retries}/${maxRetries})`);
      
      // Add back to queue with delay
      setTimeout(async () => {
        try {
          await this.redis.lpush('email_queue', JSON.stringify(job));
        } catch (retryError) {
          console.error('❌ [EMAIL QUEUE] Failed to requeue job:', retryError);
        }
      }, 5000 * job.retries); // Exponential backoff
    } else {
      console.error(`❌ [EMAIL QUEUE] Job ${job.id} failed permanently after ${maxRetries} retries`);
      await this.logFailedJob(job, error);
    }
  }

  /**
   * Log permanently failed jobs
   */
  private async logFailedJob(job: EmailJob, error: any): Promise<void> {
    try {
      // Store failed job for monitoring
      await this.redis.hset('failed_emails', job.id, JSON.stringify({
        ...job,
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date(),
      }));
    } catch (logError) {
      console.error('❌ [EMAIL QUEUE] Failed to log failed job:', logError);
    }
  }

  /**
   * Get queue status
   */
  public async getQueueStatus(): Promise<{
    pendingJobs: number;
    failedJobs: number;
    isProcessing: boolean;
  }> {
    try {
      const pendingJobs = await this.redis.llen('email_queue');
      const failedJobs = await this.redis.hlen('failed_emails');
      
      return {
        pendingJobs,
        failedJobs,
        isProcessing: this.isProcessing,
      };
    } catch (error) {
      console.error('❌ [EMAIL QUEUE] Failed to get queue status:', error);
      return { pendingJobs: 0, failedJobs: 0, isProcessing: false };
    }
  }

  /**
   * Stop processing
   */
  public stop(): void {
    this.isProcessing = false;
    this.redis.disconnect();
  }
}

export const emailQueueService = EmailQueueService.getInstance(); 