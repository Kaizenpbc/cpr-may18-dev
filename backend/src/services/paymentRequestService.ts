import { pool } from '../config/database.js';
import { AppError, errorCodes } from '../utils/errorHandler.js';

export interface PaymentRequest {
  id?: number;
  instructor_id: number;
  timesheet_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at?: string;
  updated_at?: string;
}

export interface PaymentRequestDetail extends PaymentRequest {
  instructor_name: string;
  instructor_email: string;
  week_start_date: string;
  total_hours: number;
  courses_taught: number;
  hourly_rate: number;
  course_bonus: number;
  base_amount: number;
  bonus_amount: number;
  tier_name: string;
  hr_comment?: string;
  class_details?: ClassDetail[];
}

export interface ClassDetail {
  course_name: string;
  hours: number;
  date: string;
  location?: string;
}

export interface TimesheetPaymentCalculation {
  instructor_id: number;
  timesheet_id: number;
  total_hours: number;
  courses_taught: number;
  hourly_rate: number;
  course_bonus: number;
  base_amount: number;
  bonus_amount: number;
  total_amount: number;
  tier_name: string;
}

export class PaymentRequestService {
  /**
   * Calculate payment amount for an approved timesheet
   */
  static async calculateTimesheetPayment(timesheetId: number): Promise<TimesheetPaymentCalculation> {
    const client = await pool.connect();
    
    try {
      // Get the timesheet with instructor info
      const timesheetResult = await client.query(`
        SELECT 
          t.*,
          u.id as instructor_id,
          u.username as instructor_name
        FROM timesheets t
        JOIN users u ON t.instructor_id = u.id
        WHERE t.id = $1 AND t.status = 'approved'
      `, [timesheetId]);
      
      if (timesheetResult.rows.length === 0) {
        throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Approved timesheet not found.');
      }
      
      const timesheet = timesheetResult.rows[0];
      const instructorId = timesheet.instructor_id;
      const weekStartDate = timesheet.week_start_date;
      
      // Get instructor's pay rate for the timesheet week
      const payRateResult = await client.query(`
        SELECT 
          ipr.hourly_rate,
          ipr.course_bonus,
          prt.name as tier_name
        FROM instructor_pay_rates ipr
        LEFT JOIN pay_rate_tiers prt ON ipr.tier_id = prt.id
        WHERE ipr.instructor_id = $1 
        AND ipr.is_active = true
        AND ipr.effective_date <= $2
        AND (ipr.end_date IS NULL OR ipr.end_date >= $2)
        ORDER BY ipr.effective_date DESC
        LIMIT 1
      `, [instructorId, weekStartDate]);
      
      // Use default rates if no specific rate found
      let hourlyRate = 25.00; // Default rate
      let courseBonus = 50.00; // Default bonus
      let tierName = 'Default';
      
      if (payRateResult.rows.length > 0) {
        hourlyRate = parseFloat(payRateResult.rows[0].hourly_rate);
        courseBonus = parseFloat(payRateResult.rows[0].course_bonus);
        tierName = payRateResult.rows[0].tier_name || 'Custom';
      }
      
      // Calculate payment amounts
      const totalHours = parseFloat(timesheet.total_hours) || 0;
      const coursesTaught = parseInt(timesheet.courses_taught) || 0;
      const baseAmount = totalHours * hourlyRate;
      const bonusAmount = coursesTaught * courseBonus;
      const totalAmount = baseAmount + bonusAmount;
      
      return {
        instructor_id: instructorId,
        timesheet_id: timesheetId,
        total_hours: totalHours,
        courses_taught: coursesTaught,
        hourly_rate: hourlyRate,
        course_bonus: courseBonus,
        base_amount: baseAmount,
        bonus_amount: bonusAmount,
        total_amount: totalAmount,
        tier_name: tierName
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * Create a payment request for an approved timesheet
   */
  static async createPaymentRequest(timesheetId: number): Promise<PaymentRequest> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Calculate payment amount
      const calculation = await this.calculateTimesheetPayment(timesheetId);
      
      // Check if payment request already exists for this timesheet
      const existingResult = await client.query(`
        SELECT id FROM payment_requests WHERE timesheet_id = $1
      `, [timesheetId]);
      
      if (existingResult.rows.length > 0) {
        throw new AppError(400, errorCodes.RESOURCE_ALREADY_EXISTS, 'Payment request already exists for this timesheet.');
      }
      
      // Create payment request
      const paymentRequestResult = await client.query(`
        INSERT INTO payment_requests (
          instructor_id, timesheet_id, amount, payment_date, 
          payment_method, notes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
        RETURNING *
      `, [
        calculation.instructor_id,
        timesheetId,
        calculation.total_amount,
        new Date().toISOString().split('T')[0], // Today's date
        'direct_deposit',
        `Payment for timesheet week starting ${calculation.timesheet_id}. Hours: ${calculation.total_hours}, Courses: ${calculation.courses_taught}, Rate: $${calculation.hourly_rate}/hr, Bonus: $${calculation.course_bonus}/course`
      ]);
      
      // Also create a payroll payment record for consistency
      const payrollPaymentResult = await client.query(`
        INSERT INTO payroll_payments (
          instructor_id, amount, payment_date, payment_method, 
          notes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
        RETURNING *
      `, [
        calculation.instructor_id,
        calculation.total_amount,
        new Date().toISOString().split('T')[0],
        'direct_deposit',
        `Auto-generated from timesheet ${timesheetId}. Hours: ${calculation.total_hours}, Courses: ${calculation.courses_taught}`
      ]);
      
      await client.query('COMMIT');
      
      return paymentRequestResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get all payment requests for accounting dashboard
   */
  static async getPaymentRequests(filters: {
    status?: string;
    instructor_id?: number;
    page?: number;
    limit?: number;
  } = {}): Promise<{ requests: PaymentRequestDetail[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const client = await pool.connect();

    try {
      const { status, instructor_id, page = 1, limit = 10 } = filters;
      const offset = (page - 1) * limit;

      let whereClause = "WHERE 1=1";
      const params: (string | number)[] = [];
      let paramIndex = 1;
      
      if (status) {
        whereClause += ` AND pr.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (instructor_id) {
        whereClause += ` AND pr.instructor_id = $${paramIndex}`;
        params.push(instructor_id);
        paramIndex++;
      }
      
      // Get payment requests with instructor info and payment calculation details
      const requestsResult = await client.query(`
        SELECT 
          pr.*,
          u.username as instructor_name,
          u.email as instructor_email,
          t.week_start_date,
          t.total_hours,
          t.courses_taught,
          t.hr_comment,
          t.course_details,
          -- Calculate payment breakdown
          CASE 
            WHEN ipr.hourly_rate IS NOT NULL THEN ipr.hourly_rate 
            ELSE 25.00 
          END as hourly_rate,
          CASE 
            WHEN ipr.course_bonus IS NOT NULL THEN ipr.course_bonus 
            ELSE 50.00 
          END as course_bonus,
          (t.total_hours * COALESCE(ipr.hourly_rate, 25.00)) as base_amount,
          (t.courses_taught * COALESCE(ipr.course_bonus, 50.00)) as bonus_amount,
          COALESCE(prt.name, 'Default') as tier_name
        FROM payment_requests pr
        JOIN users u ON pr.instructor_id = u.id
        JOIN timesheets t ON pr.timesheet_id = t.id
        LEFT JOIN instructor_pay_rates ipr ON ipr.instructor_id = pr.instructor_id 
          AND ipr.is_active = true 
          AND ipr.effective_date <= t.week_start_date
          AND (ipr.end_date IS NULL OR ipr.end_date >= t.week_start_date)
        LEFT JOIN pay_rate_tiers prt ON ipr.tier_id = prt.id
        ${whereClause}
        ORDER BY pr.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset]);
      
      // Parse course details for each request
      const requestsWithCourseDetails = requestsResult.rows.map((request) => {
        let courseDetails: unknown[] = [];
        if (request.course_details) {
          try {
            courseDetails = typeof request.course_details === 'string'
              ? JSON.parse(request.course_details)
              : request.course_details;
          } catch (error) {
            console.error('Error parsing course details:', error);
            courseDetails = [];
          }
        }
        return {
          ...request,
          course_details: courseDetails
        };
      }) as PaymentRequestDetail[];
      
      // Get total count for pagination
      const countResult = await client.query(`
        SELECT COUNT(*) as total
        FROM payment_requests pr
        ${whereClause}
      `, params);
      
      return {
        requests: requestsWithCourseDetails,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        }
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * Get detailed payment request information including class details
   */
  static async getPaymentRequestDetail(requestId: number): Promise<PaymentRequestDetail> {
    const client = await pool.connect();
    
    try {
      // Get payment request with all details including course details
      const requestResult = await client.query(`
        SELECT 
          pr.*,
          u.username as instructor_name,
          u.email as instructor_email,
          t.week_start_date,
          t.total_hours,
          t.courses_taught,
          t.hr_comment,
          t.course_details,
          -- Calculate payment breakdown
          CASE 
            WHEN ipr.hourly_rate IS NOT NULL THEN ipr.hourly_rate 
            ELSE 25.00 
          END as hourly_rate,
          CASE 
            WHEN ipr.course_bonus IS NOT NULL THEN ipr.course_bonus 
            ELSE 50.00 
          END as course_bonus,
          (t.total_hours * COALESCE(ipr.hourly_rate, 25.00)) as base_amount,
          (t.courses_taught * COALESCE(ipr.course_bonus, 50.00)) as bonus_amount,
          COALESCE(prt.name, 'Default') as tier_name
        FROM payment_requests pr
        JOIN users u ON pr.instructor_id = u.id
        JOIN timesheets t ON pr.timesheet_id = t.id
        LEFT JOIN instructor_pay_rates ipr ON ipr.instructor_id = pr.instructor_id 
          AND ipr.is_active = true 
          AND ipr.effective_date <= t.week_start_date
          AND (ipr.end_date IS NULL OR ipr.end_date >= t.week_start_date)
        LEFT JOIN pay_rate_tiers prt ON ipr.tier_id = prt.id
        WHERE pr.id = $1
      `, [requestId]);
      
      if (requestResult.rows.length === 0) {
        throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Payment request not found.');
      }
      
      const request = requestResult.rows[0];
      
      // Parse course details if they exist
      let courseDetails = [];
      if (request.course_details) {
        try {
          courseDetails = typeof request.course_details === 'string' 
            ? JSON.parse(request.course_details) 
            : request.course_details;
        } catch (error) {
          console.error('Error parsing course details:', error);
          courseDetails = [];
        }
      }
      
      return {
        ...request,
        course_details: courseDetails
      };
    } finally {
      client.release();
    }
  }

  /**
   * Process a payment request (approve/return to HR)
   */
  static async processPaymentRequest(
    requestId: number, 
    action: 'approve' | 'return_to_hr', 
    paymentMethod?: string,
    notes?: string
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get the payment request
      const requestResult = await client.query(`
        SELECT * FROM payment_requests WHERE id = $1 AND status = 'pending'
      `, [requestId]);
      
      if (requestResult.rows.length === 0) {
        throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Payment request not found or already processed.');
      }
      
      const newStatus = action === 'approve' ? 'approved' : 'returned_to_hr';
      
      // Update the payment request status and payment method if provided
      if (action === 'approve') {
        await client.query(`
          UPDATE payment_requests 
          SET status = $1, payment_method = $2, notes = $3, updated_at = NOW()
          WHERE id = $4
        `, [newStatus, paymentMethod || 'direct_deposit', notes || '', requestId]);
        
        // Also update the corresponding payroll payment
        await client.query(`
          UPDATE payroll_payments 
          SET status = 'completed', payment_method = $1, updated_at = NOW()
          WHERE id = (
            SELECT id FROM payroll_payments 
            WHERE instructor_id = $2 AND amount = $3 AND status = 'pending'
            ORDER BY created_at DESC
            LIMIT 1
          )
        `, [paymentMethod || 'direct_deposit', requestResult.rows[0].instructor_id, requestResult.rows[0].amount]);
      } else {
        // Return to HR - update status and add accountant notes
        await client.query(`
          UPDATE payment_requests 
          SET status = $1, notes = $2, updated_at = NOW()
          WHERE id = $3
        `, [newStatus, notes || '', requestId]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get returned payment requests for HR review
   */
  static async getReturnedPaymentRequests(filters: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ requests: PaymentRequestDetail[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const client = await pool.connect();

    try {
      const { page = 1, limit = 10 } = filters;
      const offset = (page - 1) * limit;
      
      // Get returned payment requests with instructor info and payment calculation details
      const requestsResult = await client.query(`
        SELECT 
          pr.*,
          u.username as instructor_name,
          u.email as instructor_email,
          t.week_start_date,
          t.total_hours,
          t.courses_taught,
          t.hr_comment,
          -- Calculate payment breakdown
          CASE 
            WHEN ipr.hourly_rate IS NOT NULL THEN ipr.hourly_rate 
            ELSE 25.00 
          END as hourly_rate,
          CASE 
            WHEN ipr.course_bonus IS NOT NULL THEN ipr.course_bonus 
            ELSE 50.00 
          END as course_bonus,
          (t.total_hours * COALESCE(ipr.hourly_rate, 25.00)) as base_amount,
          (t.courses_taught * COALESCE(ipr.course_bonus, 50.00)) as bonus_amount,
          COALESCE(prt.name, 'Default') as tier_name
        FROM payment_requests pr
        JOIN users u ON pr.instructor_id = u.id
        JOIN timesheets t ON pr.timesheet_id = t.id
        LEFT JOIN instructor_pay_rates ipr ON ipr.instructor_id = pr.instructor_id 
          AND ipr.is_active = true 
          AND ipr.effective_date <= t.week_start_date
          AND (ipr.end_date IS NULL OR ipr.end_date >= t.week_start_date)
        LEFT JOIN pay_rate_tiers prt ON ipr.tier_id = prt.id
        WHERE pr.status = 'returned_to_hr'
        ORDER BY pr.updated_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      // Get total count for pagination
      const countResult = await client.query(`
        SELECT COUNT(*) as total
        FROM payment_requests 
        WHERE status = 'returned_to_hr'
      `);
      
      return {
        requests: requestsResult.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        }
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get payment request statistics for dashboard
   */
  static async getPaymentRequestStats(): Promise<any> {
    const client = await pool.connect();
    
    try {
      // Total pending payment requests
      const pendingResult = await client.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
        FROM payment_requests WHERE status = 'pending'
      `);
      
      // Total approved this month
      const approvedThisMonthResult = await client.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
        FROM payment_requests 
        WHERE status = 'approved'
        AND EXTRACT(MONTH FROM updated_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM updated_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      `);
      
      // Total rejected this month
      const rejectedThisMonthResult = await client.query(`
        SELECT COUNT(*) as count
        FROM payment_requests 
        WHERE status = 'rejected'
        AND EXTRACT(MONTH FROM updated_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM updated_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      `);
      
      return {
        pending: {
          count: parseInt(pendingResult.rows[0].count),
          amount: parseFloat(pendingResult.rows[0].total_amount)
        },
        approvedThisMonth: {
          count: parseInt(approvedThisMonthResult.rows[0].count),
          amount: parseFloat(approvedThisMonthResult.rows[0].total_amount)
        },
        rejectedThisMonth: parseInt(rejectedThisMonthResult.rows[0].count)
      };
    } finally {
      client.release();
    }
  }
} 