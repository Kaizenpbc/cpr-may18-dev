import express, { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { organizationPricingService } from '../../services/organizationPricingService.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { AppError } from '../../utils/errorHandler.js';

// Validation middleware
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  next();
};

const router = express.Router();

// Validation schemas
const createPricingSchema = [
  body('organizationId').isInt({ min: 1 }).withMessage('Valid organization ID is required'),
  body('classTypeId').isInt({ min: 1 }).withMessage('Valid class type ID is required'),
  body('pricePerStudent').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
];

const updatePricingSchema = [
  param('id').isInt({ min: 1 }).withMessage('Valid pricing ID is required'),
  body('pricePerStudent').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

const getPricingSchema = [
  query('organizationId').optional().isInt({ min: 1 }).withMessage('Valid organization ID is required'),
  query('classTypeId').optional().isInt({ min: 1 }).withMessage('Valid class type ID is required'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

// Get organization pricing (for organization users)
router.get('/organization/:organizationId', 
  authenticateToken,
  param('organizationId').isInt({ min: 1 }).withMessage('Valid organization ID is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      
      // Check if user has access to this organization
      if (req.user?.role !== 'sysadmin' && req.user?.organizationId !== organizationId) {
        throw new AppError(403, 'FORBIDDEN', 'Access denied to this organization');
      }

      const pricing = await organizationPricingService.getOrganizationPricingList(organizationId);
      
      res.json({
        success: true,
        data: pricing,
        message: 'Organization pricing retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get pricing for course calculation
router.get('/course-pricing/:organizationId/:classTypeId',
  authenticateToken,
  param('organizationId').isInt({ min: 1 }).withMessage('Valid organization ID is required'),
  param('classTypeId').isInt({ min: 1 }).withMessage('Valid class type ID is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const classTypeId = parseInt(req.params.classTypeId);
      
      // Check if user has access to this organization
      if (req.user?.role !== 'sysadmin' && req.user?.organizationId !== organizationId) {
        throw new AppError(403, 'FORBIDDEN', 'Access denied to this organization');
      }

      const pricing = await organizationPricingService.getPricingForCourse(organizationId, classTypeId);
      
      res.json({
        success: true,
        data: pricing,
        message: 'Course pricing retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Calculate course cost
router.post('/calculate-cost',
  authenticateToken,
  body('organizationId').isInt({ min: 1 }).withMessage('Valid organization ID is required'),
  body('classTypeId').isInt({ min: 1 }).withMessage('Valid class type ID is required'),
  body('studentCount').isInt({ min: 1 }).withMessage('Valid student count is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, classTypeId, studentCount } = req.body;
      
      // Check if user has access to this organization
      if (req.user?.role !== 'sysadmin' && req.user?.organizationId !== organizationId) {
        throw new AppError(403, 'FORBIDDEN', 'Access denied to this organization');
      }

      const cost = await organizationPricingService.calculateCourseCost(organizationId, classTypeId, studentCount);
      
      res.json({
        success: true,
        data: cost,
        message: 'Course cost calculated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin routes (sysadmin only)
router.get('/admin', 
  authenticateToken,
  getPricingSchema,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role !== 'sysadmin') {
        throw new AppError(403, 'FORBIDDEN', 'Admin access required');
      }

      const filters: Record<string, unknown> = {};
      if (req.query.organizationId) filters.organizationId = parseInt(req.query.organizationId as string);
      if (req.query.classTypeId) filters.classTypeId = parseInt(req.query.classTypeId as string);
      if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';

      const pricing = await organizationPricingService.getAllOrganizationPricing(filters);
      
      res.json({
        success: true,
        data: pricing,
        message: 'All organization pricing retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/admin/:id',
  authenticateToken,
  param('id').isInt({ min: 1 }).withMessage('Valid pricing ID is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role !== 'sysadmin') {
        throw new AppError(403, 'FORBIDDEN', 'Admin access required');
      }

      const id = parseInt(req.params.id);
      const pricing = await organizationPricingService.getOrganizationPricingById(id);
      
      if (!pricing) {
        throw new AppError(404, 'NOT_FOUND', 'Organization pricing not found');
      }

      res.json({
        success: true,
        data: pricing,
        message: 'Organization pricing retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/admin',
  authenticateToken,
  createPricingSchema,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role !== 'sysadmin') {
        throw new AppError(403, 'FORBIDDEN', 'Admin access required');
      }

      const pricingData = {
        ...req.body,
        createdBy: req.user.id
      };

      const pricing = await organizationPricingService.createOrganizationPricing(pricingData);
      
      res.status(201).json({
        success: true,
        data: pricing,
        message: 'Organization pricing created successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put('/admin/:id',
  authenticateToken,
  updatePricingSchema,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role !== 'sysadmin') {
        throw new AppError(403, 'FORBIDDEN', 'Admin access required');
      }

      const id = parseInt(req.params.id);
      const updateData = {
        ...req.body,
        lastModifiedBy: req.user.id
      };

      const pricing = await organizationPricingService.updateOrganizationPricing(id, updateData);
      
      if (!pricing) {
        throw new AppError(404, 'NOT_FOUND', 'Organization pricing not found');
      }

      res.json({
        success: true,
        data: pricing,
        message: 'Organization pricing updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/admin/:id',
  authenticateToken,
  param('id').isInt({ min: 1 }).withMessage('Valid pricing ID is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role !== 'sysadmin') {
        throw new AppError(403, 'FORBIDDEN', 'Admin access required');
      }

      const id = parseInt(req.params.id);
      const deleted = await organizationPricingService.deleteOrganizationPricing(id);
      
      if (!deleted) {
        throw new AppError(404, 'NOT_FOUND', 'Organization pricing not found');
      }

      res.json({
        success: true,
        message: 'Organization pricing deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 