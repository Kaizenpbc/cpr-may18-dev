import cron from 'node-cron';
import { query, getClient } from '../config/database.js';
import { emailService } from './emailService.js';

export class ScheduledJobsService {
  private static instance: ScheduledJobsService;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  private constructor() {}

  public static getInstance(): ScheduledJobsService {
    if (!ScheduledJobsService.instance) {
      ScheduledJobsService.instance = new ScheduledJobsService();
    }
    return ScheduledJobsService.instance;
  }

  public startAllJobs(): void {
    console.log('🕐 [SCHEDULED JOBS] Starting all scheduled jobs...');

    // Update overdue invoices job - runs every day at 1:00 AM
    this.scheduleOverdueInvoicesUpdate();

    // Email reminders job - runs every day at 9:00 AM
    this.scheduleEmailReminders();

    console.log('✅ [SCHEDULED JOBS] All jobs started successfully');
  }

  private scheduleOverdueInvoicesUpdate(): void {
    // Run every day at 1:00 AM
    const task = cron.schedule('0 1 * * *', async () => {
      console.log('🔄 [SCHEDULED JOB] Running overdue invoices update...');
      await this.updateOverdueInvoices();
    });

    // Also run immediately on startup for testing
    this.updateOverdueInvoices();

    this.jobs.set('overdue-invoices-update', task);
    task.start();
    console.log(
      '📅 [SCHEDULED JOB] Overdue invoices update job scheduled (daily at 1:00 AM)'
    );
  }

  private async updateOverdueInvoices(): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Update invoices that are past due date and not yet paid
      const result = await client.query(`
        UPDATE invoices 
        SET 
          status = 'overdue',
          updated_at = CURRENT_TIMESTAMP
        WHERE 
          due_date < CURRENT_DATE
          AND status IN ('pending', 'partial_payment')
          AND posted_to_org = TRUE
        RETURNING id, invoice_number, organization_id, due_date
      `);

      if (result.rows.length > 0) {
        console.log(
          `📊 [OVERDUE UPDATE] Updated ${result.rows.length} invoices to overdue status`
        );

        await this.sendOverdueNotifications((result.rows as any[]));
      } else {
        console.log('📊 [OVERDUE UPDATE] No invoices to update');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ [OVERDUE UPDATE ERROR]', error);
    } finally {
      client.release();
    }
  }

  private async sendOverdueNotifications(
    invoices: Array<{ id: number; invoice_number: string; organization_id: number; due_date: string }>
  ): Promise<void> {
    try {
      const orgIds = [...new Set(invoices.map(i => i.organization_id))];
      const orgPlaceholders = orgIds.map((_: any, i: number) => `$${i + 1}`).join(', ');
      const orgResult = await query<{ id: number; email: string; name: string }>(
        `SELECT id, email, name FROM organizations WHERE id IN (${orgPlaceholders})`,
        orgIds
      );
      const orgMap = new Map(orgResult.rows.map(o => [o.id, o]));

      // Fetch amounts for overdue invoices
      const invoiceIds = invoices.map(i => i.id);
      const invPlaceholders = invoiceIds.map((_: any, i: number) => `$${i + 1}`).join(', ');
      const amountResult = await query<{ id: number; amount: string }>(
        `SELECT id, amount FROM invoices WHERE id IN (${invPlaceholders})`,
        invoiceIds
      );
      const amountMap = new Map(amountResult.rows.map(r => [r.id, parseFloat(r.amount)]));

      for (const invoice of invoices) {
        const org = orgMap.get(invoice.organization_id);
        if (!org?.email) continue;

        await emailService.sendOverdueInvoiceNotification(
          org.email,
          org.name,
          invoice.invoice_number,
          new Date(invoice.due_date).toLocaleDateString(),
          amountMap.get(invoice.id) ?? 0
        );
        console.log(`📧 [OVERDUE NOTIFY] Sent overdue notice for invoice ${invoice.invoice_number} to ${org.email}`);
      }
    } catch (error) {
      console.error('❌ [OVERDUE NOTIFY] Failed to send overdue notifications:', error);
    }
  }

  public stopAllJobs(): void {
    console.log('🛑 [SCHEDULED JOBS] Stopping all scheduled jobs...');

    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`  - Stopped job: ${name}`);
    });

    this.jobs.clear();
    console.log('✅ [SCHEDULED JOBS] All jobs stopped');
  }

  // Method to manually trigger overdue update (useful for testing)
  public async triggerOverdueUpdate(): Promise<void> {
    console.log('🔄 [MANUAL TRIGGER] Running overdue invoices update...');
    await this.updateOverdueInvoices();
  }

  private scheduleEmailReminders(): void {
    const task = cron.schedule(
      '0 9 * * *',
      async () => {
        console.log('📧 [EMAIL REMINDERS] Starting email reminder job...');
        await this.sendEmailReminders();
      },
      {
        timezone: 'America/New_York',
      }
    );

    task.start();
    this.jobs.set('emailReminders', task);
    console.log(
      ' [SCHEDULED JOB] Email reminders job scheduled (daily at 9:00 AM)'
    );
  }

  private async sendEmailReminders(): Promise<void> {
    try {
      // Find invoices due in 7 days and 3 days
      const reminderDays = [7, 3];

      for (const days of reminderDays) {
        const result = await query(`
          SELECT 
            i.id as invoice_id,
            i.invoice_number,
            i.due_date,
            i.amount,
            o.name as organization_name,
            o.email as organization_email
          FROM invoices i
          JOIN organizations o ON i.organization_id = o.id
          WHERE i.status = 'pending'
          AND i.posted_to_org = TRUE
          AND i.due_date = CURRENT_DATE + INTERVAL ${days} DAY
        `);

        console.log(
          `📧 [EMAIL REMINDERS] Found ${result.rows.length} invoices due in ${days} days`
        );

        for (const invoice of (result.rows as any[])) {
          // Check if reminder has already been sent
          const alreadySent = await emailService.hasReminderBeenSent(
            invoice.invoice_id,
            days
          );

          if (!alreadySent) {
            const reminderData = {
              organizationName: invoice.organization_name,
              invoiceNumber: invoice.invoice_number,
              dueDate: new Date(invoice.due_date).toLocaleDateString(),
              amount: parseFloat(invoice.amount),
              daysUntilDue: days,
              invoiceId: invoice.invoice_id,
            };

            const success = await emailService.sendInvoiceReminder(
              reminderData,
              invoice.organization_email
            );

            if (success) {
              console.log(
                `📧 [EMAIL REMINDERS] Sent ${days}-day reminder for invoice ${invoice.invoice_number} to ${invoice.organization_email}`
              );
            } else {
              console.error(
                `❌ [EMAIL REMINDERS] Failed to send ${days}-day reminder for invoice ${invoice.invoice_number}`
              );
            }
          } else {
            console.log(
              `📧 [EMAIL REMINDERS] ${days}-day reminder already sent for invoice ${invoice.invoice_number}`
            );
          }
        }
      }

      console.log('✅ [EMAIL REMINDERS] Email reminder job completed');
    } catch (error) {
      console.error('❌ [EMAIL REMINDERS] Error in email reminder job:', error);
    }
  }

  public async triggerEmailReminders(): Promise<void> {
    console.log('🔄 [MANUAL TRIGGER] Running email reminders...');
    await this.sendEmailReminders();
  }
}
