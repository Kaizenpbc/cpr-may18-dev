import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import { errorCodes } from '../../utils/errorHandler.js';
import ConfigService from '../../services/configService.js';

const router = Router();

// Middleware to check if user is sysadmin
const requireSysadmin = (req: Request, res: Response, next: Function) => {
  if (req.user?.role !== 'sysadmin') {
    throw new AppError(403, errorCodes.ACCESS_DENIED, 'Sysadmin access required');
  }
  next();
};

// Get all configurations grouped by category
router.get(
  '/configurations',
  authenticateToken,
  requireSysadmin,
  asyncHandler(async (req: Request, res: Response) => {
    const configService = ConfigService.getInstance();
    const configurations = await configService.getAllConfigurations();
    
    res.json({
      success: true,
      data: configurations,
      message: 'System configurations retrieved successfully'
    });
  })
);

// Get configurations by category
router.get(
  '/configurations/category/:category',
  authenticateToken,
  requireSysadmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.params;
    const configService = ConfigService.getInstance();
    const configurations = await configService.getConfigurationsByCategory(category);
    
    res.json({
      success: true,
      data: configurations,
      message: `Configurations for category '${category}' retrieved successfully`
    });
  })
);

// Get configuration categories
router.get(
  '/configurations/categories',
  authenticateToken,
  requireSysadmin,
  asyncHandler(async (req: Request, res: Response) => {
    const configService = ConfigService.getInstance();
    const categories = await configService.getCategories();
    
    res.json({
      success: true,
      data: categories,
      message: 'Configuration categories retrieved successfully'
    });
  })
);

// Get a specific configuration value
router.get(
  '/configurations/:key',
  authenticateToken,
  requireSysadmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;
    const configService = ConfigService.getInstance();
    const value = await configService.getConfigValue(key);
    
    if (!value) {
      throw new AppError(404, errorCodes.RESOURCE_NOT_FOUND, `Configuration key '${key}' not found`);
    }
    
    res.json({
      success: true,
      data: { key, value },
      message: `Configuration '${key}' retrieved successfully`
    });
  })
);

// Update a configuration value
router.put(
  '/configurations/:key',
  authenticateToken,
  requireSysadmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;
    const { value } = req.body;
    
    if (!value) {
      throw new AppError(400, errorCodes.VALIDATION_ERROR, 'Configuration value is required');
    }
    
    const configService = ConfigService.getInstance();
    const updatedConfig = await configService.updateConfig(key, {
      config_value: value,
      updated_by: req.user!.id
    });
    
    res.json({
      success: true,
      data: updatedConfig,
      message: `Configuration '${key}' updated successfully`
    });
  })
);

// Validate SMTP configuration
router.post(
  '/configurations/validate-smtp',
  authenticateToken,
  requireSysadmin,
  asyncHandler(async (req: Request, res: Response) => {
    const configService = ConfigService.getInstance();
    const validation = await configService.validateSMTPConfig();
    
    if (validation.valid) {
      res.json({
        success: true,
        data: { valid: true },
        message: 'SMTP configuration is valid'
      });
    } else {
      res.json({
        success: false,
        data: { valid: false, error: validation.error },
        message: 'SMTP configuration validation failed'
      });
    }
  })
);

// Get invoice due days (for testing configurable values)
router.get(
  '/configurations/invoice/due-days',
  authenticateToken,
  requireSysadmin,
  asyncHandler(async (req: Request, res: Response) => {
    const configService = ConfigService.getInstance();
    const dueDays = await configService.getInvoiceDueDays();
    
    res.json({
      success: true,
      data: { dueDays },
      message: `Invoice due days: ${dueDays} days`
    });
  })
);

// Get late fee percentage (for testing configurable values)
router.get(
  '/configurations/invoice/late-fee',
  authenticateToken,
  requireSysadmin,
  asyncHandler(async (req: Request, res: Response) => {
    const configService = ConfigService.getInstance();
    const lateFeePercent = await configService.getLateFeePercent();
    
    res.json({
      success: true,
      data: { lateFeePercent },
      message: `Late fee percentage: ${lateFeePercent}%`
    });
  })
);

export default router; 