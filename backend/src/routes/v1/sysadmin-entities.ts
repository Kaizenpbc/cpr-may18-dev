import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler, AppError, errorCodes } from '../../utils/errorHandler.js';
import { ApiResponseBuilder } from '../../utils/apiResponse.js';
import { keysToCamel } from '../../utils/caseConverter.js';
import { AuthenticatedRequest, isDatabaseError } from '../../types/index.js';
import { query } from '../../config/database.js';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import { devLog } from '../../utils/devLog.js';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

const router = Router();

// All routes in this file require authentication — role checked per route below
router.use(authenticateToken);

// ===========================
// SYSTEM ADMINISTRATION ENDPOINTS
// ===========================

// Course Definition Management
router.get(
  '/courses',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await query(`
        SELECT
          id,
          name,
          description,
          duration_minutes as "durationMinutes",
          course_code as "courseCode",
          COALESCE(is_active, true) as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM class_types
        ORDER BY name
      `);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  })
);

router.post(
  '/courses',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        duration_minutes,
        course_code,
        is_active = true,
      } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: { code: 'VAL_2001', message: 'Course name is required' } });
      }

      if (duration_minutes === undefined || duration_minutes === null) {
        return res.status(400).json({ success: false, error: { code: 'VAL_2001', message: 'Duration (minutes) is required' } });
      }

      // Check for duplicate course name
      const existingCourse = await query(
        'SELECT id FROM class_types WHERE LOWER(name) = LOWER($1)',
        [name]
      );

      if (existingCourse.rows.length > 0) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'A course with this name already exists'
        );
      }

      const result = await query(
        `
        INSERT INTO class_types (
          name, description, duration_minutes, course_code, is_active
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
          name,
          description,
          duration_minutes,
          course_code || null,
          is_active,
        ]
      );

      res.json({
        success: true,
        message: 'Course created successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  })
);

router.put(
  '/courses/:id',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        duration_minutes,
        course_code,
        is_active,
      } = req.body;

      // Check for duplicate course name (excluding current course)
      if (name) {
        const existingCourse = await query(
          'SELECT id FROM class_types WHERE LOWER(name) = LOWER($1) AND id != $2',
          [name, id]
        );

        if (existingCourse.rows.length > 0) {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            'A course with this name already exists'
          );
        }
      }

      const result = await query(
        `
        UPDATE class_types
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          duration_minutes = COALESCE($3, duration_minutes),
          course_code = COALESCE($4, course_code),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
        `,
        [
          name,
          description,
          duration_minutes,
          course_code,
          is_active,
          id,
        ]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course not found'
        );
      }

      res.json({
        success: true,
        message: 'Course updated successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  })
);

// Toggle course active/inactive status
router.put(
  '/courses/:id/toggle-active',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await query(
        `
        UPDATE class_types
        SET
          is_active = NOT COALESCE(is_active, true),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Course not found'
        );
      }

      const course = result.rows[0];
      const statusText = course.is_active ? 'activated' : 'deactivated';

      res.json({
        success: true,
        message: `Course ${statusText} successfully`,
        data: course,
      });
    } catch (error) {
      console.error('Error toggling course status:', error);
      throw error;
    }
  })
);

// Soft delete course (set is_active to false)
router.delete(
  '/courses/:id',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if course has any associated course requests
      const usageCheck = await query(
        'SELECT COUNT(*) as count FROM course_requests WHERE course_type_id = $1',
        [id]
      );

      const usageCount = parseInt(usageCheck.rows[0].count);

      if (usageCount > 0) {
        // Soft delete - set is_active to false
        const result = await query(
          `
          UPDATE class_types
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
          `,
          [id]
        );

        if (result.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Course not found'
          );
        }

        res.json({
          success: true,
          message: `Course deactivated (${usageCount} course requests exist). Use toggle to reactivate.`,
          data: result.rows[0],
          softDeleted: true,
        });
      } else {
        // Hard delete - no course requests reference this course
        const result = await query(
          `DELETE FROM class_types WHERE id = $1 RETURNING *`,
          [id]
        );

        if (result.rows.length === 0) {
          throw new AppError(
            404,
            errorCodes.RESOURCE_NOT_FOUND,
            'Course not found'
          );
        }

        res.json({
          success: true,
          message: 'Course deleted permanently',
          data: result.rows[0],
          softDeleted: false,
        });
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  })
);

// User Management
router.get(
  '/users',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await query(`
      SELECT
        u.id,
        u.username,
        u.email,
        u.role,
        u.phone,
        u.mobile,
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.full_name as "fullName",
        u.organization_id as "organizationId",
        o.name as "organizationName",
        u.location_id as "locationId",
        ol.location_name as "locationName",
        u.date_onboarded as "dateOnboarded",
        u.date_offboarded as "dateOffboarded",
        u.user_comments as "userComments",
        u.status,
        u.created_at as "createdAt",
        u.updated_at as "updatedAt"
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN organization_locations ol ON u.location_id = ol.id
      ORDER BY u.created_at DESC
      LIMIT 500
    `);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  })
);

router.post(
  '/users',
  requireRole(['admin', 'sysadmin']),
  [
    body('username')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Must be a valid email address'),
    body('role')
      .isIn(['admin', 'instructor', 'organization', 'accountant', 'hr', 'courseadmin', 'vendor', 'sysadmin'])
      .withMessage('Role must be one of: admin, instructor, organization, accountant, hr, courseadmin, vendor, sysadmin'),
    body('firstName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('First name must be less than 100 characters'),
    body('lastName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Last name must be less than 100 characters'),
    body('mobile')
      .optional()
      .isMobilePhone('any')
      .withMessage('Mobile must be a valid phone number'),
    body('organizationId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Organization ID must be a positive integer')
  ],
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          `Validation failed: ${errors.array().map(e => e.msg).join(', ')}`
        );
      }

      // Accept both camelCase (from frontend) and snake_case field names
      const {
        username,
        email,
        password,
        firstName, first_name,
        lastName, last_name,
        fullName, full_name,
        role,
        mobile,
        organizationId, organization_id,
        locationId, location_id,
        dateOnboarded, date_onboarded,
        userComments, user_comments,
      } = req.body;

      // Use camelCase values first, fall back to snake_case
      const firstNameVal = firstName ?? first_name;
      const lastNameVal = lastName ?? last_name;
      const fullNameVal = fullName ?? full_name;
      const organizationIdVal = organizationId ?? organization_id;
      const locationIdVal = locationId ?? location_id;
      const dateOnboardedVal = dateOnboarded ?? date_onboarded;
      const userCommentsVal = userComments ?? user_comments;

      // Enforce organization and location for Organization role users (case-insensitive)
      if (role && role.toLowerCase() === 'organization') {
        if (!organizationIdVal) {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            'Organization is required for users with Organization role.'
          );
        }
        if (!locationIdVal) {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            'Location is required for users with Organization role.'
          );
        }
      }

      // Check if username already exists
      const existingUsername = await query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      if (existingUsername.rows.length > 0) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Username already exists. Please choose a different username.'
        );
      }

      // Check if email already exists
      const existingEmail = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (existingEmail.rows.length > 0) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Email address already exists. Please use a different email address.'
        );
      }

      const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);

      const result = await query(
        `
      INSERT INTO users (
        username, email, password_hash, role, organization_id, location_id,
        first_name, last_name, full_name, mobile, date_onboarded, user_comments
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, username, email, role,
        organization_id as "organizationId",
        location_id as "locationId",
        first_name as "firstName",
        last_name as "lastName",
        full_name as "fullName",
        mobile,
        date_onboarded as "dateOnboarded",
        user_comments as "userComments"
    `,
        [
          username,
          email,
          passwordHash,
          role,
          organizationIdVal || null,
          locationIdVal || null,
          firstNameVal || null,
          lastNameVal || null,
          fullNameVal || null,
          mobile || null,
          dateOnboardedVal || null,
          userCommentsVal || null,
        ]
      );

      // Fetch the organization and location names
      const userData = result.rows[0];
      if (userData.organizationId) {
        const orgResult = await query(
          'SELECT name FROM organizations WHERE id = $1',
          [userData.organizationId]
        );
        if (orgResult.rows.length > 0) {
          userData.organizationName = orgResult.rows[0].name;
        }
      }
      if (userData.locationId) {
        const locResult = await query(
          'SELECT location_name FROM organization_locations WHERE id = $1',
          [userData.locationId]
        );
        if (locResult.rows.length > 0) {
          userData.locationName = locResult.rows[0].location_name;
        }
      }

      res.json({
        success: true,
        message: 'User created successfully',
        data: userData,
      });
    } catch (error) {
      console.error('Error creating user:', error);

      // Handle specific database constraint violations
      if (isDatabaseError(error) && error.code === '23505') {
        // Unique constraint violation
        if (error.constraint === 'users_email_key') {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            'Email address already exists. Please use a different email address.'
          );
        } else if (error.constraint === 'users_username_key') {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            'Username already exists. Please choose a different username.'
          );
        }
      }

      // Re-throw AppErrors as-is
      if (error instanceof AppError) {
        throw error;
      }

      // Generic error for unexpected issues
      throw new AppError(
        500,
        errorCodes.DB_QUERY_ERROR,
        'Failed to create user'
      );
    }
  })
);

router.put(
  '/users/:id',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // Accept both camelCase (from frontend) and snake_case field names
      const {
        username,
        email,
        password,
        firstName, first_name,
        lastName, last_name,
        fullName, full_name,
        role,
        mobile,
        organizationId, organization_id,
        locationId, location_id,
        dateOnboarded, date_onboarded,
        dateOffboarded, date_offboarded,
        userComments, user_comments,
        status,
      } = req.body;

      // Use camelCase values first, fall back to snake_case
      const firstNameVal = firstName ?? first_name;
      const lastNameVal = lastName ?? last_name;
      const fullNameVal = fullName ?? full_name;
      const organizationIdVal = organizationId ?? organization_id;
      const locationIdVal = locationId ?? location_id;
      const dateOnboardedVal = dateOnboarded ?? date_onboarded;
      const dateOffboardedVal = dateOffboarded ?? date_offboarded;
      const userCommentsVal = userComments ?? user_comments;

      // Fetch existing user to check current role if role not being changed
      const existingUser = await query(
        'SELECT role, organization_id, location_id FROM users WHERE id = $1',
        [id]
      );
      if (existingUser.rows.length === 0) {
        throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'User not found');
      }

      // Determine final role (new role or existing)
      const finalRole = role || existingUser.rows[0].role;
      // Determine final org/location (new values or existing)
      const finalOrgId = organizationIdVal !== undefined ? organizationIdVal : existingUser.rows[0].organization_id;
      const finalLocId = locationIdVal !== undefined ? locationIdVal : existingUser.rows[0].location_id;

      // Enforce organization and location for Organization role users (case-insensitive)
      if (finalRole && finalRole.toLowerCase() === 'organization') {
        if (!finalOrgId) {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            'Organization is required for users with Organization role.'
          );
        }
        if (!finalLocId) {
          throw new AppError(
            400,
            errorCodes.VALIDATION_ERROR,
            'Location is required for users with Organization role.'
          );
        }
      }

      let passwordHash = undefined;
      if (password) {
        passwordHash = bcrypt.hashSync(password, 10);
      }

      const result = await query(
        `
      UPDATE users
      SET
        username = COALESCE($1, username),
        email = COALESCE($2, email),
        password_hash = COALESCE($3, password_hash),
        role = COALESCE($4, role),
        organization_id = COALESCE($5, organization_id),
        location_id = COALESCE($15, location_id),
        first_name = COALESCE($7, first_name),
        last_name = COALESCE($8, last_name),
        full_name = COALESCE($9, full_name),
        mobile = COALESCE($10, mobile),
        date_onboarded = COALESCE($11, date_onboarded),
        date_offboarded = COALESCE($12, date_offboarded),
        user_comments = COALESCE($13, user_comments),
        status = COALESCE($14, status),
        updated_at = NOW()
      WHERE id = $6
      RETURNING id, username, email, role,
        organization_id as "organizationId",
        location_id as "locationId",
        first_name as "firstName", last_name as "lastName", full_name as "fullName",
        mobile, date_onboarded as "dateOnboarded", date_offboarded as "dateOffboarded",
        user_comments as "userComments", status
    `,
        [
          username,
          email,
          passwordHash,
          role,
          organizationIdVal,
          id,
          firstNameVal,
          lastNameVal,
          fullNameVal,
          mobile,
          dateOnboardedVal,
          dateOffboardedVal,
          userCommentsVal,
          status,
          locationIdVal,
        ]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'User not found'
        );
      }

      // Fetch the organization and location names
      const userData = result.rows[0];
      if (userData.organizationId) {
        const orgResult = await query(
          'SELECT name FROM organizations WHERE id = $1',
          [userData.organizationId]
        );
        if (orgResult.rows.length > 0) {
          userData.organizationName = orgResult.rows[0].name;
        }
      }
      if (userData.locationId) {
        const locResult = await query(
          'SELECT location_name FROM organization_locations WHERE id = $1',
          [userData.locationId]
        );
        if (locResult.rows.length > 0) {
          userData.locationName = locResult.rows[0].location_name;
        }
      }

      res.json({
        success: true,
        message: 'User updated successfully',
        data: userData,
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  })
);

router.delete(
  '/users/:id',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await query(
        `
      DELETE FROM users
      WHERE id = $1
      RETURNING id, username, email, role
    `,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'User not found'
        );
      }

      res.json({
        success: true,
        message: 'User deactivated successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  })
);

// Vendor Management
router.get(
  '/vendors',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await query(`
      SELECT
        id,
        name as "vendorName",
        contact_email as "email",
        contact_phone as "phone",
        address,
        vendor_type as "vendorType",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM vendors
      ORDER BY name
    `);

      // Transform the data to match frontend expectations
      const transformedVendors = result.rows.map(vendor => {
        // Parse address into separate fields if it contains commas
        let addressStreet = '';
        let addressCity = '';
        let addressProvince = '';
        let addressPostalCode = '';

        if (vendor.address) {
          const addressParts = vendor.address.split(',').map((part: string) => part.trim());
          addressStreet = addressParts[0] || '';
          addressCity = addressParts[1] || '';
          addressProvince = addressParts[2] || '';
          addressPostalCode = addressParts[3] || '';
        }

        return {
          ...vendor,
          addressStreet,
          addressCity,
          addressProvince,
          addressPostalCode,
          // Add default values for fields that don't exist in database
          contactFirstName: '',
          contactLastName: '',
          mobile: '',
          services: [],
          contractStartDate: null,
          contractEndDate: null,
          performanceRating: 0,
          insuranceExpiry: null,
          certificationStatus: '',
          billingContactEmail: '',
          comments: '',
          status: vendor.isActive ? 'active' : 'inactive'
        };
      });

      res.json({
        success: true,
        data: transformedVendors,
      });
    } catch (error) {
      console.error('Error fetching vendors:', error);
      throw error;
    }
  })
);

router.post(
  '/vendors',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const {
        vendor_name, // Frontend sends this, map to 'name'
        contact_first_name,
        contact_last_name,
        email, // Frontend sends this, map to 'contact_email'
        contactEmail, // camelCase variant also accepted
        mobile,
        phone, // Frontend sends this, map to 'contact_phone'
        address_street,
        address_city,
        address_province,
        address_postal_code,
        vendor_type,
        services,
        contract_start_date,
        contract_end_date,
        performance_rating,
        insurance_expiry,
        certification_status,
        billing_contact_email,
        comments,
        status,
        // Also accept the original field names for backward compatibility
        name,
        contact_email,
        contact_phone,
        address,
        is_active,
      } = req.body;

      // Use vendor_name if provided, otherwise fall back to name
      const vendorName = vendor_name || name;
      if (!vendorName) {
        throw new AppError(
          400,
          errorCodes.VALIDATION_ERROR,
          'Vendor name is required'
        );
      }

      // Build address from separate fields if provided
      let fullAddress = address;
      if (address_street || address_city || address_province || address_postal_code) {
        const addressParts = [address_street, address_city, address_province, address_postal_code].filter(Boolean);
        fullAddress = addressParts.join(', ');
      }

      // Use email if provided, otherwise fall back to contactEmail (camelCase) or contact_email (snake_case)
      const resolvedContactEmail = email || contactEmail || contact_email;
      
      // Use phone if provided, otherwise fall back to contact_phone
      const contactPhone = phone || contact_phone;

      const result = await query(
        `
      INSERT INTO vendors (
        name, contact_email, contact_phone, address, vendor_type, is_active
      )
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, true))
      RETURNING *
    `,
        [
          vendorName,
          resolvedContactEmail,
          contactPhone,
          fullAddress,
          vendor_type,
          is_active !== undefined ? is_active : true,
        ]
      );

      res.json({
        success: true,
        message: 'Vendor created successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw error;
    }
  })
);

router.put(
  '/vendors/:id',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        vendor_name, // Frontend sends this, map to 'name'
        contact_first_name,
        contact_last_name,
        email, // Frontend sends this, map to 'contact_email'
        mobile,
        phone, // Frontend sends this, map to 'contact_phone'
        address_street,
        address_city,
        address_province,
        address_postal_code,
        vendor_type,
        services,
        contract_start_date,
        contract_end_date,
        performance_rating,
        insurance_expiry,
        certification_status,
        billing_contact_email,
        comments,
        status,
        // Also accept the original field names for backward compatibility
        name,
        contact_email,
        contact_phone,
        address,
        is_active,
      } = req.body;

      // Use vendor_name if provided, otherwise fall back to name
      const vendorName = vendor_name || name;
      
      // Build address from separate fields if provided
      let fullAddress = address;
      if (address_street || address_city || address_province || address_postal_code) {
        const addressParts = [address_street, address_city, address_province, address_postal_code].filter(Boolean);
        fullAddress = addressParts.join(', ');
      }

      // Use email if provided, otherwise fall back to contact_email
      const contactEmail = email || contact_email;
      
      // Use phone if provided, otherwise fall back to contact_phone
      const contactPhone = phone || contact_phone;

      const result = await query(
        `
      UPDATE vendors
      SET 
        name = COALESCE($1, name),
        contact_email = COALESCE($2, contact_email),
        contact_phone = COALESCE($3, contact_phone),
        address = COALESCE($4, address),
        vendor_type = COALESCE($5, vendor_type),
        is_active = COALESCE($6, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `,
        [
          vendorName,
          contactEmail,
          contactPhone,
          fullAddress,
          vendor_type,
          is_active,
          id,
        ]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Vendor not found'
        );
      }

      res.json({
        success: true,
        message: 'Vendor updated successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating vendor:', error);
      throw error;
    }
  })
);

router.delete(
  '/vendors/:id',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await query(
        `
      UPDATE vendors
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `,
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError(
          404,
          errorCodes.RESOURCE_NOT_FOUND,
          'Vendor not found'
        );
      }

      res.json({
        success: true,
        message: 'Vendor deactivated successfully',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error deactivating vendor:', error);
      throw error;
    }
  })
);

// System Administration Dashboard
router.get(
  '/dashboard',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Get total counts
      const userCount = await query(
        "SELECT COUNT(*) as count FROM users"
      );
      const organizationCount = await query(
        'SELECT COUNT(*) as count FROM organizations'
      );
      const courseCount = await query(
        'SELECT COUNT(*) as count FROM class_types WHERE is_active = true'
      );
      const vendorCount = await query(
        "SELECT COUNT(*) as count FROM vendors WHERE is_active = true"
      );

      // Get recent activity
      const recentUsers = await query(`
      SELECT username, role, created_at as "createdAt"
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

      const recentCourses = await query(`
      SELECT name, course_code as "courseCode", created_at as "createdAt"
      FROM class_types
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 5
    `);

      const dashboardData = {
        summary: {
          totalUsers: parseInt(userCount.rows[0].count),
          totalOrganizations: parseInt(organizationCount.rows[0].count),
          totalCourses: parseInt(courseCount.rows[0].count),
          totalVendors: parseInt(vendorCount.rows[0].count),
        },
        recentActivity: {
          users: recentUsers.rows,
          courses: recentCourses.rows,
        },
      };

      res.json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      console.error('Error fetching system admin dashboard:', error);
      throw error;
    }
  })
);

// Organization Management
router.get(
  '/organizations',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    devLog('[Debug] Getting all organizations for sysadmin');

    const sql = `
    SELECT
      o.id,
      o.name as "organizationName",
      o.contact_name as "contactName",
      o.contact_email as "contactEmail",
      o.contact_phone as "contactPhone",
      o.contact_position as "contactPosition",
      o.address,
      o.address_street as "addressStreet",
      o.address_city as "addressCity",
      o.address_province as "addressProvince",
      o.address_postal_code as "addressPostalCode",
      o.country,
      o.ceo_name as "ceoName",
      o.ceo_email as "ceoEmail",
      o.ceo_phone as "ceoPhone",
      o.organization_comments as "organizationComments",
      o.created_at as "createdAt",
      o.updated_at as "updatedAt",
      COUNT(DISTINCT u.id) as "userCount",
      COUNT(DISTINCT cr.id) as "courseCount"
    FROM organizations o
    LEFT JOIN users u ON u.organization_id = o.id
    LEFT JOIN course_requests cr ON cr.organization_id = o.id
    GROUP BY o.id
    ORDER BY o.name
  `;

    const result = await query(sql);

    res.json({
      success: true,
      data: result.rows,
    });
  })
);

router.post(
  '/organizations',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    devLog('[Debug] Creating new organization:', req.body);

    const {
      name,
      organizationName,
      contactName,
      contact_name,
      contactEmail,
      contact_email,
      contactPhone,
      contact_phone,
      contactPosition,
      contact_position,
      address,
      addressStreet,
      address_street,
      addressCity,
      address_city,
      addressProvince,
      address_province,
      addressPostalCode,
      address_postal_code,
      country,
      ceoName,
      ceo_name,
      ceoEmail,
      ceo_email,
      ceoPhone,
      ceo_phone,
      organizationComments,
      organization_comments,
    } = req.body;

    const sql = `
    INSERT INTO organizations (
      name, contact_name, contact_email, contact_phone, contact_position,
      address, address_street, address_city, address_province, address_postal_code,
      country, ceo_name, ceo_email, ceo_phone, organization_comments
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;

    const values = [
      name || organizationName,
      contactName || contact_name || null,
      contactEmail || contact_email || null,
      contactPhone || contact_phone || null,
      contactPosition || contact_position || null,
      address || null,
      addressStreet || address_street || null,
      addressCity || address_city || null,
      addressProvince || address_province || null,
      addressPostalCode || address_postal_code || null,
      country || 'Canada',
      ceoName || ceo_name || null,
      ceoEmail || ceo_email || null,
      ceoPhone || ceo_phone || null,
      organizationComments || organization_comments || null,
    ];

    const result = await query(sql, values);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Organization created successfully',
    });
  })
);

router.put(
  '/organizations/:id',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    devLog('[Debug] Updating organization:', id, req.body);

    const {
      name,
      organizationName,
      contactName,
      contact_name,
      contactEmail,
      contact_email,
      contactPhone,
      contact_phone,
      contactPosition,
      contact_position,
      address,
      addressStreet,
      address_street,
      addressCity,
      address_city,
      addressProvince,
      address_province,
      addressPostalCode,
      address_postal_code,
      country,
      ceoName,
      ceo_name,
      ceoEmail,
      ceo_email,
      ceoPhone,
      ceo_phone,
      organizationComments,
      organization_comments,
    } = req.body;

    const sql = `
    UPDATE organizations
    SET
      name = COALESCE($1, name),
      contact_name = COALESCE($2, contact_name),
      contact_email = COALESCE($3, contact_email),
      contact_phone = COALESCE($4, contact_phone),
      contact_position = COALESCE($5, contact_position),
      address = COALESCE($6, address),
      address_street = COALESCE($7, address_street),
      address_city = COALESCE($8, address_city),
      address_province = COALESCE($9, address_province),
      address_postal_code = COALESCE($10, address_postal_code),
      country = COALESCE($11, country),
      ceo_name = COALESCE($12, ceo_name),
      ceo_email = COALESCE($13, ceo_email),
      ceo_phone = COALESCE($14, ceo_phone),
      organization_comments = COALESCE($15, organization_comments),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $16
    RETURNING *
  `;

    const values = [
      name || organizationName,
      contactName || contact_name,
      contactEmail || contact_email,
      contactPhone || contact_phone,
      contactPosition || contact_position,
      address,
      addressStreet || address_street,
      addressCity || address_city,
      addressProvince || address_province,
      addressPostalCode || address_postal_code,
      country,
      ceoName || ceo_name,
      ceoEmail || ceo_email,
      ceoPhone || ceo_phone,
      organizationComments || organization_comments,
      id,
    ];

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Organization not found' },
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Organization updated successfully',
    });
  })
);

router.delete(
  '/organizations/:id',
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    devLog('[Debug] Deleting organization:', id);

    // Check for dependencies
    const checkQuery = `
    SELECT 
      COUNT(DISTINCT u.id) as user_count,
      COUNT(DISTINCT cr.id) as course_count
    FROM organizations o
    LEFT JOIN users u ON u.organization_id = o.id
    LEFT JOIN course_requests cr ON cr.organization_id = o.id
    WHERE o.id = $1
  `;

    const checkResult = await query(checkQuery, [id]);
    const { user_count, course_count } = checkResult.rows[0];

    if (parseInt(user_count) > 0 || parseInt(course_count) > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Cannot delete organization with associated users or courses',
          details: `${user_count} users and ${course_count} courses are linked to this organization`,
        },
      });
    }

    const deleteQuery = 'DELETE FROM organizations WHERE id = $1 RETURNING *';
    const result = await query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Organization not found' },
      });
    }

    res.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  })
);

// Get single organization by ID (for OrganizationDetailPage)
router.get(
  '/organizations/:id',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'accountant']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    devLog('[Debug] Getting organization details for ID:', id);

    const sql = `
      SELECT
        o.id as organizationid,
        o.name as organizationname,
        o.address_street as addressstreet,
        o.contact_name as contactname,
        o.contact_email as contactemail,
        o.contact_phone as contactphone,
        o.address_city as addresscity,
        o.address_province as addressprovince,
        o.address_postal_code as addresspostalcode,
        o.created_at,
        o.updated_at
      FROM organizations o
      WHERE o.id = $1
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Organization not found');
    }

    res.json(ApiResponseBuilder.success(keysToCamel(result.rows[0])));
  })
);

// ==================== Organization Locations Management ====================

// Get all locations for an organization
router.get(
  '/organizations/:orgId/locations',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'accountant']),
  asyncHandler(async (req: Request, res: Response) => {
    const { orgId } = req.params;
    devLog('[Debug] Getting locations for organization ID:', orgId);

    const sql = `
      SELECT
        ol.id,
        ol.organization_id as "organizationId",
        ol.location_name as "locationName",
        ol.address,
        ol.city,
        ol.province,
        ol.postal_code as "postalCode",
        ol.contact_first_name as "contactFirstName",
        ol.contact_last_name as "contactLastName",
        ol.contact_email as "contactEmail",
        ol.contact_phone as "contactPhone",
        ol.is_active as "isActive",
        ol.created_at as "createdAt",
        ol.updated_at as "updatedAt",
        (SELECT COUNT(*) FROM users u WHERE u.location_id = ol.id) as "userCount",
        (SELECT COUNT(*) FROM course_requests cr WHERE cr.location_id = ol.id) as "courseCount",
        (SELECT COUNT(*) FROM invoices i WHERE i.location_id = ol.id) as "invoiceCount"
      FROM organization_locations ol
      WHERE ol.organization_id = $1
      ORDER BY ol.location_name
    `;

    const result = await query(sql, [orgId]);

    res.json({
      success: true,
      data: result.rows,
    });
  })
);

// Get single location
router.get(
  '/organizations/:orgId/locations/:id',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'accountant']),
  asyncHandler(async (req: Request, res: Response) => {
    const { orgId, id } = req.params;

    const sql = `
      SELECT
        ol.id,
        ol.organization_id as "organizationId",
        ol.location_name as "locationName",
        ol.address,
        ol.city,
        ol.province,
        ol.postal_code as "postalCode",
        ol.contact_first_name as "contactFirstName",
        ol.contact_last_name as "contactLastName",
        ol.contact_email as "contactEmail",
        ol.contact_phone as "contactPhone",
        ol.is_active as "isActive",
        ol.created_at as "createdAt",
        ol.updated_at as "updatedAt"
      FROM organization_locations ol
      WHERE ol.id = $1 AND ol.organization_id = $2
    `;

    const result = await query(sql, [id, orgId]);

    if (result.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Location not found');
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

// Create a new location for an organization
router.post(
  '/organizations/:orgId/locations',
  authenticateToken,
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { orgId } = req.params;
    const {
      locationName, location_name,
      address,
      city,
      province,
      postalCode, postal_code,
      contactFirstName, contact_first_name,
      contactLastName, contact_last_name,
      contactEmail, contact_email,
      contactPhone, contact_phone,
    } = req.body;

    // Accept both camelCase and snake_case field names
    const resolvedLocationName = locationName ?? location_name;
    const resolvedPostalCode = postalCode ?? postal_code;
    const resolvedContactFirstName = contactFirstName ?? contact_first_name;
    const resolvedContactLastName = contactLastName ?? contact_last_name;
    const resolvedContactEmail = contactEmail ?? contact_email;
    const resolvedContactPhone = contactPhone ?? contact_phone;

    devLog('[Debug] Creating location for org:', orgId, req.body);

    // Verify organization exists
    const orgCheck = await query('SELECT id FROM organizations WHERE id = $1', [orgId]);
    if (orgCheck.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Organization not found');
    }

    const sql = `
      INSERT INTO organization_locations (
        organization_id,
        location_name,
        address,
        city,
        province,
        postal_code,
        contact_first_name,
        contact_last_name,
        contact_email,
        contact_phone,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
      RETURNING
        id,
        organization_id as "organizationId",
        location_name as "locationName",
        address,
        city,
        province,
        postal_code as "postalCode",
        contact_first_name as "contactFirstName",
        contact_last_name as "contactLastName",
        contact_email as "contactEmail",
        contact_phone as "contactPhone",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await query(sql, [
      orgId,
      resolvedLocationName,
      address || null,
      city || null,
      province || null,
      resolvedPostalCode || null,
      resolvedContactFirstName || null,
      resolvedContactLastName || null,
      resolvedContactEmail || null,
      resolvedContactPhone || null,
    ]);

    res.json({
      success: true,
      message: 'Location created successfully',
      data: result.rows[0],
    });
  })
);

// Update a location
router.put(
  '/organizations/:orgId/locations/:id',
  authenticateToken,
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { orgId, id } = req.params;
    const {
      locationName,
      address,
      city,
      province,
      postalCode,
      contactFirstName,
      contactLastName,
      contactEmail,
      contactPhone,
      isActive,
    } = req.body;

    devLog('[Debug] Updating location:', id, 'for org:', orgId, req.body);

    const sql = `
      UPDATE organization_locations
      SET
        location_name = COALESCE($1, location_name),
        address = COALESCE($2, address),
        city = COALESCE($3, city),
        province = COALESCE($4, province),
        postal_code = COALESCE($5, postal_code),
        contact_first_name = COALESCE($6, contact_first_name),
        contact_last_name = COALESCE($7, contact_last_name),
        contact_email = COALESCE($8, contact_email),
        contact_phone = COALESCE($9, contact_phone),
        is_active = COALESCE($10, is_active),
        updated_at = NOW()
      WHERE id = $11 AND organization_id = $12
      RETURNING
        id,
        organization_id as "organizationId",
        location_name as "locationName",
        address,
        city,
        province,
        postal_code as "postalCode",
        contact_first_name as "contactFirstName",
        contact_last_name as "contactLastName",
        contact_email as "contactEmail",
        contact_phone as "contactPhone",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await query(sql, [
      locationName,
      address,
      city,
      province,
      postalCode,
      contactFirstName,
      contactLastName,
      contactEmail,
      contactPhone,
      isActive,
      id,
      orgId,
    ]);

    if (result.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Location not found');
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: result.rows[0],
    });
  })
);

// Delete (deactivate) a location
router.delete(
  '/organizations/:orgId/locations/:id',
  authenticateToken,
  requireRole(['admin', 'sysadmin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { orgId, id } = req.params;

    devLog('[Debug] Deactivating location:', id, 'for org:', orgId);

    // Check if location has any courses or invoices
    const checkQuery = `
      SELECT
        (SELECT COUNT(*) FROM course_requests WHERE location_id = $1) as course_count,
        (SELECT COUNT(*) FROM invoices WHERE location_id = $1) as invoice_count
    `;
    const checkResult = await query(checkQuery, [id]);
    const { course_count, invoice_count } = checkResult.rows[0];

    if (course_count > 0 || invoice_count > 0) {
      // Soft delete - set is_active = false
      await query(
        'UPDATE organization_locations SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND organization_id = $2',
        [id, orgId]
      );

      return res.json({
        success: true,
        message: `Location deactivated (has ${course_count} courses and ${invoice_count} invoices)`,
      });
    }

    // Hard delete if no dependencies
    const result = await query(
      'DELETE FROM organization_locations WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, orgId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, 'Location not found');
    }

    res.json({
      success: true,
      message: 'Location deleted successfully',
    });
  })
);

// ==================== End Organization Locations Management ====================

// Get courses for an organization (admin view)
router.get(
  '/organizations/:id/courses',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'accountant']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    devLog('[Debug] Getting courses for organization ID:', id);

    const sql = `
      SELECT
        cr.id as courseid,
        cr.id as coursenumber,
        ct.name as coursetypename,
        cr.status,
        cr.confirmed_date as confirmeddate,
        cr.date_requested as daterequested,
        cr.location,
        cr.registered_students as registeredstudents,
        COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned') as instructorname,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as studentcount,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as attendedcount,
        cr.created_at,
        cr.updated_at
      FROM course_requests cr
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN users u ON cr.instructor_id = u.id
      WHERE cr.organization_id = $1
      ORDER BY cr.confirmed_date DESC NULLS LAST, cr.created_at DESC
    `;

    const result = await query(sql, [id]);

    res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
  })
);

// Get invoices for an organization
router.get(
  '/organizations/:id/invoices',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'accountant']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    devLog('[Debug] Getting invoices for organization ID:', id);

    const sql = `
      SELECT
        i.id as invoiceid,
        i.invoice_number as invoicenumber,
        i.amount,
        i.status,
        i.invoice_date as invoicedate,
        i.due_date as duedate,
        i.paid_date as paiddate,
        i.notes,
        COALESCE(
          (SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id),
          0
        ) as amountpaid,
        i.created_at,
        i.updated_at
      FROM invoices i
      WHERE i.organization_id = $1
      ORDER BY i.invoice_date DESC NULLS LAST, i.created_at DESC
    `;

    const result = await query(sql, [id]);

    res.json(ApiResponseBuilder.success(keysToCamel(result.rows)));
  })
);

// Get financial summary for an organization
router.get(
  '/organizations/:id/financial-summary',
  authenticateToken,
  requireRole(['admin', 'sysadmin', 'accountant']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    devLog('[Debug] Getting financial summary for organization ID:', id);

    const sql = `
      SELECT
        COALESCE(SUM(i.amount), 0) as total_invoiced,
        COALESCE(SUM(
          CASE WHEN i.status IN ('paid', 'partial') THEN
            (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = i.id)
          ELSE 0 END
        ), 0) as total_paid,
        COALESCE(SUM(
          CASE WHEN i.status NOT IN ('paid', 'void', 'cancelled') THEN
            i.amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0)
          ELSE 0 END
        ), 0) as balance_due
      FROM invoices i
      WHERE i.organization_id = $1
        AND i.status NOT IN ('void', 'cancelled')
    `;

    const result = await query(sql, [id]);
    const row = result.rows[0] || { total_invoiced: 0, total_paid: 0, balance_due: 0 };

    res.json(ApiResponseBuilder.success({
      totalInvoiced: parseFloat(row.total_invoiced) || 0,
      totalPaid: parseFloat(row.total_paid) || 0,
      balanceDue: parseFloat(row.balance_due) || 0,
    }));
  })
);

export default router;
