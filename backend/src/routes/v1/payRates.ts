import { Router, Request, Response } from 'express';
import { query, getClient } from '../../config/database.js';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { AppError, errorCodes } from '../../utils/errorHandler.js';
import { ApiResponseBuilder } from '../../utils/apiResponse.js';

const router = Router();

// Get all pay rate tiers
router.get('/tiers', authenticateToken, requireRole(['hr']), asyncHandler(async (req: Request, res: Response) => {
  const client = await getClient();
  
  try {
    const result = await client.query(`
      SELECT * FROM pay_rate_tiers 
      WHERE is_active = true 
      ORDER BY base_hourly_rate ASC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } finally {
    client.release();
  }
}));

// Create new pay rate tier
router.post('/tiers', authenticateToken, requireRole(['hr']), asyncHandler(async (req: Request, res: Response) => {
  const { name, description, base_hourly_rate, course_bonus } = req.body;
  
  if (!name || !base_hourly_rate) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Name and base hourly rate are required.');
  }
  
  const client = await getClient();
  
  try {
    const result = await client.query(`
      INSERT INTO pay_rate_tiers (name, description, base_hourly_rate, course_bonus)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, description, base_hourly_rate, course_bonus || 50.00]);
    
    res.json({
      success: true,
      message: 'Pay rate tier created successfully.',
      data: result.rows[0]
    });
  } finally {
    client.release();
  }
}));

// Update pay rate tier
router.put('/tiers/:id', authenticateToken, requireRole(['hr']), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, base_hourly_rate, course_bonus, is_active } = req.body;
  
  const client = await getClient();
  
  try {
    const result = await client.query(`
      UPDATE pay_rate_tiers 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          base_hourly_rate = COALESCE($3, base_hourly_rate),
          course_bonus = COALESCE($4, course_bonus),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [name, description, base_hourly_rate, course_bonus, is_active, id]);
    
    if (result.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Pay rate tier not found.');
    }
    
    res.json({
      success: true,
      message: 'Pay rate tier updated successfully.',
      data: result.rows[0]
    });
  } finally {
    client.release();
  }
}));

// Get instructor pay rates (with pagination and filtering)
router.get('/instructors', authenticateToken, requireRole(['hr']), asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search = '', has_rate = '' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  
  const client = await getClient();
  
  try {
    let whereClause = "WHERE u.role = 'instructor'";
    let params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      whereClause += ` AND (u.username LIKE $${paramIndex} OR u.email LIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (has_rate === 'true') {
      whereClause += ` AND ipr.id IS NOT NULL`;
    } else if (has_rate === 'false') {
      whereClause += ` AND ipr.id IS NULL`;
    }
    
    // Get instructors with their current pay rates
    const instructorsResult = await client.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.phone,
        ipr.hourly_rate,
        ipr.course_bonus,
        ipr.effective_date,
        ipr.is_active as rate_active,
        prt.name as tier_name,
        prt.description as tier_description,
        CASE 
          WHEN ipr.id IS NOT NULL THEN 'Set'
          ELSE 'Not Set'
        END as rate_status
      FROM users u
      LEFT JOIN instructor_pay_rates ipr ON u.id = ipr.instructor_id 
        AND ipr.is_active = true
        AND (ipr.end_date IS NULL OR ipr.end_date >= CURRENT_DATE)
      LEFT JOIN pay_rate_tiers prt ON ipr.tier_id = prt.id
      ${whereClause}
      ORDER BY u.username
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);
    
    // Get total count for pagination
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN instructor_pay_rates ipr ON u.id = ipr.instructor_id 
        AND ipr.is_active = true
        AND (ipr.end_date IS NULL OR ipr.end_date >= CURRENT_DATE)
      ${whereClause}
    `, params);
    
    res.json({
      success: true,
      data: {
        instructors: instructorsResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.rows[0].total,
          pages: Math.ceil(countResult.rows[0].total / Number(limit))
        }
      }
    });
  } finally {
    client.release();
  }
}));

// Get specific instructor's pay rate
router.get('/instructors/:instructorId', authenticateToken, requireRole(['hr']), asyncHandler(async (req: Request, res: Response) => {
  const { instructorId } = req.params;
  
  const client = await getClient();
  
  try {
    // Get current pay rate
    const currentRateResult = await client.query(`
      SELECT 
        ipr.*,
        prt.name as tier_name,
        prt.description as tier_description,
        u.username as instructor_name,
        u.email as instructor_email
      FROM instructor_pay_rates ipr
      LEFT JOIN pay_rate_tiers prt ON ipr.tier_id = prt.id
      JOIN users u ON ipr.instructor_id = u.id
      WHERE ipr.instructor_id = $1 
      AND ipr.is_active = true
      AND (ipr.end_date IS NULL OR ipr.end_date >= CURRENT_DATE)
      ORDER BY ipr.effective_date DESC
      LIMIT 1
    `, [instructorId]);
    
    // Get pay rate history
    const historyResult = await client.query(`
      SELECT 
        prh.*,
        prt_old.name as old_tier_name,
        prt_new.name as new_tier_name,
        u_changed.username as changed_by_name
      FROM pay_rate_history prh
      LEFT JOIN pay_rate_tiers prt_old ON prh.old_tier_id = prt_old.id
      LEFT JOIN pay_rate_tiers prt_new ON prh.new_tier_id = prt_new.id
      LEFT JOIN users u_changed ON prh.changed_by = u_changed.id
      WHERE prh.instructor_id = $1
      ORDER BY prh.effective_date DESC, prh.created_at DESC
      LIMIT 20
    `, [instructorId]);
    
    // Get instructor info
    const instructorResult = await client.query(`
      SELECT id, username, email, phone FROM users WHERE id = $1
    `, [instructorId]);
    
    if (instructorResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Instructor not found.');
    }
    
    res.json({
      success: true,
      data: {
        instructor: instructorResult.rows[0],
        currentRate: currentRateResult.rows[0] || null,
        history: historyResult.rows
      }
    });
  } finally {
    client.release();
  }
}));

// Set instructor pay rate
router.post('/instructors/:instructorId', authenticateToken, requireRole(['hr']), asyncHandler(async (req: Request, res: Response) => {
  const { instructorId } = req.params;
  const { hourly_rate, course_bonus, tier_id, effective_date, notes, change_reason } = req.body;
  const userId = (req as any).user.userId;
  
  if (!hourly_rate) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Hourly rate is required.');
  }
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Check if instructor exists
    const instructorResult = await client.query(`
      SELECT id, username FROM users WHERE id = $1 AND role = 'instructor'
    `, [instructorId]);
    
    if (instructorResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Instructor not found.');
    }
    
    // End the current active rate if it exists
    await client.query(`
      UPDATE instructor_pay_rates 
      SET end_date = $1, is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE instructor_id = $2 
      AND is_active = true 
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    `, [effective_date || new Date().toISOString().split('T')[0], instructorId]);
    
    // Get old rate for history
    const oldRateResult = await client.query(`
      SELECT hourly_rate, course_bonus, tier_id 
      FROM instructor_pay_rates 
      WHERE instructor_id = $1 
      AND is_active = false 
      ORDER BY effective_date DESC 
      LIMIT 1
    `, [instructorId]);
    
    const oldRate = oldRateResult.rows[0];
    
    // Create new pay rate
    const newRateResult = await client.query(`
      INSERT INTO instructor_pay_rates (
        instructor_id, tier_id, hourly_rate, course_bonus, 
        effective_date, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      instructorId, 
      tier_id, 
      hourly_rate, 
      course_bonus || 50.00, 
      effective_date || new Date().toISOString().split('T')[0], 
      notes, 
      userId
    ]);
    
    // Record in history
    await client.query(`
      INSERT INTO pay_rate_history (
        instructor_id, old_hourly_rate, new_hourly_rate, 
        old_course_bonus, new_course_bonus, old_tier_id, new_tier_id,
        change_reason, changed_by, effective_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      instructorId,
      oldRate?.hourly_rate || null,
      hourly_rate,
      oldRate?.course_bonus || null,
      course_bonus || 50.00,
      oldRate?.tier_id || null,
      tier_id,
      change_reason,
      userId,
      effective_date || new Date().toISOString().split('T')[0]
    ]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Instructor pay rate set successfully.',
      data: newRateResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Update instructor pay rate
router.put('/instructors/:instructorId', authenticateToken, requireRole(['hr']), asyncHandler(async (req: Request, res: Response) => {
  const { instructorId } = req.params;
  const { hourly_rate, course_bonus, tier_id, notes, change_reason } = req.body;
  const userId = (req as any).user.userId;
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Get current active rate
    const currentRateResult = await client.query(`
      SELECT * FROM instructor_pay_rates 
      WHERE instructor_id = $1 
      AND is_active = true 
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    `, [instructorId]);
    
    if (currentRateResult.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'No active pay rate found for this instructor.');
    }
    
    const currentRate = currentRateResult.rows[0];
    
    // Update the current rate
    const updateResult = await client.query(`
      UPDATE instructor_pay_rates 
      SET hourly_rate = COALESCE($1, hourly_rate),
          course_bonus = COALESCE($2, course_bonus),
          tier_id = COALESCE($3, tier_id),
          notes = COALESCE($4, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [hourly_rate, course_bonus, tier_id, notes, currentRate.id]);
    
    // Record in history if there were changes
    if (hourly_rate !== currentRate.hourly_rate || 
        course_bonus !== currentRate.course_bonus || 
        tier_id !== currentRate.tier_id) {
      
      await client.query(`
        INSERT INTO pay_rate_history (
          instructor_id, old_hourly_rate, new_hourly_rate, 
          old_course_bonus, new_course_bonus, old_tier_id, new_tier_id,
          change_reason, changed_by, effective_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        instructorId,
        currentRate.hourly_rate,
        hourly_rate || currentRate.hourly_rate,
        currentRate.course_bonus,
        course_bonus || currentRate.course_bonus,
        currentRate.tier_id,
        tier_id || currentRate.tier_id,
        change_reason,
        userId,
        currentRate.effective_date
      ]);
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Instructor pay rate updated successfully.',
      data: updateResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Get instructor's current pay rate for payroll calculation
router.get('/instructors/:instructorId/current', authenticateToken, requireRole(['hr']), asyncHandler(async (req: Request, res: Response) => {
  const { instructorId } = req.params;
  const { date = new Date().toISOString().split('T')[0] } = req.query;
  
  const client = await getClient();
  
  try {
    const result = await client.query(`
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
    `, [instructorId, date]);
    
    if (result.rows.length === 0) {
      // Return default rate if no specific rate is set
      res.json({
        success: true,
        data: {
          hourly_rate: 25.00,
          course_bonus: 50.00,
          tier_name: 'Default',
          is_default: true
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          ...result.rows[0],
          is_default: false
        }
      });
    }
  } finally {
    client.release();
  }
}));

// Bulk update pay rates (for multiple instructors)
router.post('/bulk-update', authenticateToken, requireRole(['hr']), asyncHandler(async (req: Request, res: Response) => {
  const { instructor_ids, hourly_rate, course_bonus, tier_id, effective_date, notes, change_reason } = req.body;
  const userId = (req as any).user.userId;
  
  if (!instructor_ids || !Array.isArray(instructor_ids) || instructor_ids.length === 0) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Instructor IDs array is required.');
  }
  
  if (!hourly_rate) {
    throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Hourly rate is required.');
  }
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const effectiveDateVal = effective_date || new Date().toISOString().split('T')[0];
    const courseBonusVal = course_bonus || 50.00;

    const idPlaceholders = instructor_ids.map((_: any, i: number) => `$${i + 1}`).join(', ');

    // 1. Fetch current active rates for all instructors before deactivating
    // MySQL equivalent of DISTINCT ON: subquery with MAX(effective_date) per instructor
    const oldRatesResult = await client.query(
      `SELECT ipr.instructor_id, ipr.hourly_rate, ipr.course_bonus, ipr.tier_id
       FROM instructor_pay_rates ipr
       INNER JOIN (
         SELECT instructor_id, MAX(effective_date) as max_date
         FROM instructor_pay_rates
         WHERE instructor_id IN (${idPlaceholders}) AND is_active = true
         GROUP BY instructor_id
       ) latest ON ipr.instructor_id = latest.instructor_id
         AND ipr.effective_date = latest.max_date
         AND ipr.is_active = true`,
      instructor_ids
    );
    const oldRateMap = new Map(oldRatesResult.rows.map((r: any) => [r.instructor_id, r]));

    // 2. Batch deactivate current rates
    await client.query(
      `UPDATE instructor_pay_rates
       SET end_date = $${instructor_ids.length + 1}, is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE instructor_id IN (${idPlaceholders})
         AND is_active = true
         AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
      [...instructor_ids, effectiveDateVal]
    );

    // 3. Insert new rates per instructor (loop replaces unnest)
    for (const instructor_id of instructor_ids) {
      await client.query(
        `INSERT INTO instructor_pay_rates
           (instructor_id, tier_id, hourly_rate, course_bonus, effective_date, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [instructor_id, tier_id, hourly_rate, courseBonusVal, effectiveDateVal, notes, userId]
      );
    }

    // 4. Insert history records per instructor
    for (const instructor_id of instructor_ids) {
      const old = oldRateMap.get(instructor_id);
      await client.query(
        `INSERT INTO pay_rate_history
           (instructor_id, old_hourly_rate, new_hourly_rate,
            old_course_bonus, new_course_bonus, old_tier_id, new_tier_id,
            change_reason, changed_by, effective_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          instructor_id,
          old?.hourly_rate ?? null,
          hourly_rate,
          old?.course_bonus ?? null,
          courseBonusVal,
          old?.tier_id ?? null,
          tier_id, change_reason, userId, effectiveDateVal,
        ]
      );
    }

    // Fetch newly inserted rates
    const newRatesResult = await client.query(
      `SELECT * FROM instructor_pay_rates
       WHERE instructor_id IN (${idPlaceholders})
         AND is_active = true AND effective_date = $${instructor_ids.length + 1}`,
      [...instructor_ids, effectiveDateVal]
    );
    const results = newRatesResult.rows;
    
    await client.query('COMMIT');
    
    return res.json(ApiResponseBuilder.success(results));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

export default router; 