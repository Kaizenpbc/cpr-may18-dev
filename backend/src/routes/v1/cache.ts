import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/errorHandler';
import { cacheService } from '../../services/cacheService';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';

const router = Router();

// Get cache statistics
router.get('/stats', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const stats = await cacheService.getStats();
  res.json({
    success: true,
    data: stats,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
}));

// Invalidate cache by pattern
router.post('/invalidate', authenticateToken, requireRole(['admin']), asyncHandler(async (req: Request, res: Response) => {
  const { pattern } = req.body;
  
  if (!pattern) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Pattern is required for cache invalidation'
      }
    });
  }

  await cacheService.invalidate(pattern);
  
  res.json({
    success: true,
    message: `Cache invalidated for pattern: ${pattern}`,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
}));

export default router; 