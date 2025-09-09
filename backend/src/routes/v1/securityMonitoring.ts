import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../../utils/errorHandler.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { requireMFA } from '../../middleware/mfaMiddleware.js';
import { securityMonitoringService } from '../../services/securityMonitoringService.js';
import { logSecurityEvent, AuditEventSeverity } from '../../middleware/auditLogger.js';

const router = Router();

// Apply authentication to all security monitoring routes
router.use(authenticateToken);

// Get comprehensive security dashboard data
router.get('/dashboard', 
  requireMFA,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    const dashboardData = await securityMonitoringService.getSecurityDashboardData();
    
    // Log dashboard access
    logSecurityEvent(
      'SECURITY_DASHBOARD_ACCESSED',
      AuditEventSeverity.LOW,
      req,
      {
        userId: user.id,
        userRole: user.role,
        dashboardComponents: Object.keys(dashboardData)
      }
    );
    
    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  })
);

// Get security metrics
router.get('/metrics', 
  requireMFA,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    const metrics = await securityMonitoringService.getSecurityMetrics();
    
    // Log metrics access
    logSecurityEvent(
      'SECURITY_METRICS_ACCESSED',
      AuditEventSeverity.LOW,
      req,
      {
        userId: user.id,
        userRole: user.role
      }
    );
    
    res.json({
      success: true,
      data: {
        metrics,
        timestamp: new Date().toISOString()
      }
    });
  })
);

// Get recent security events
router.get('/events', 
  requireMFA,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const events = await securityMonitoringService.getRecentSecurityEvents(limit);
    
    // Log events access
    logSecurityEvent(
      'SECURITY_EVENTS_ACCESSED',
      AuditEventSeverity.LOW,
      req,
      {
        userId: user.id,
        userRole: user.role,
        limit
      }
    );
    
    res.json({
      success: true,
      data: {
        events,
        count: events.length,
        timestamp: new Date().toISOString()
      }
    });
  })
);

// Get active security alerts
router.get('/alerts', 
  requireMFA,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    const alerts = await securityMonitoringService.getActiveSecurityAlerts();
    
    // Log alerts access
    logSecurityEvent(
      'SECURITY_ALERTS_ACCESSED',
      AuditEventSeverity.LOW,
      req,
      {
        userId: user.id,
        userRole: user.role,
        alertCount: alerts.length
      }
    );
    
    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        timestamp: new Date().toISOString()
      }
    });
  })
);

// Get security trends
router.get('/trends', 
  requireMFA,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const hours = parseInt(req.query.hours as string) || 24;
    
    const trends = await securityMonitoringService.getSecurityTrends(hours);
    
    // Log trends access
    logSecurityEvent(
      'SECURITY_TRENDS_ACCESSED',
      AuditEventSeverity.LOW,
      req,
      {
        userId: user.id,
        userRole: user.role,
        hours
      }
    );
    
    res.json({
      success: true,
      data: {
        trends,
        period: `${hours} hours`,
        timestamp: new Date().toISOString()
      }
    });
  })
);

// Create security alert
router.post('/alerts',
  [
    body('type')
      .isIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
      .withMessage('Alert type must be CRITICAL, HIGH, MEDIUM, or LOW'),
    body('title')
      .notEmpty()
      .withMessage('Alert title is required'),
    body('description')
      .notEmpty()
      .withMessage('Alert description is required'),
    body('source')
      .notEmpty()
      .withMessage('Alert source is required')
  ],
  requireMFA,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: errors.array()
        }
      });
    }

    const user = (req as any).user;
    const { type, title, description, source, metadata } = req.body;
    
    const alert = await securityMonitoringService.createSecurityAlert(
      type,
      title,
      description,
      source,
      metadata
    );
    
    // Log alert creation
    logSecurityEvent(
      'SECURITY_ALERT_CREATED_BY_USER',
      AuditEventSeverity.MEDIUM,
      req,
      {
        userId: user.id,
        userRole: user.role,
        alertId: alert.id,
        alertType: type,
        alertTitle: title
      }
    );
    
    res.json({
      success: true,
      data: {
        alert,
        timestamp: new Date().toISOString()
      },
      message: 'Security alert created successfully'
    });
  })
);

// Acknowledge security alert
router.post('/alerts/:alertId/acknowledge',
  requireMFA,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { alertId } = req.params;
    
    const success = await securityMonitoringService.acknowledgeSecurityAlert(alertId);
    
    if (success) {
      // Log alert acknowledgment
      logSecurityEvent(
        'SECURITY_ALERT_ACKNOWLEDGED',
        AuditEventSeverity.LOW,
        req,
        {
          userId: user.id,
          userRole: user.role,
          alertId
        }
      );
      
      res.json({
        success: true,
        message: 'Security alert acknowledged successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'ALERT_ACKNOWLEDGMENT_FAILED',
          message: 'Failed to acknowledge security alert'
        }
      });
    }
  })
);

// Resolve security alert
router.post('/alerts/:alertId/resolve',
  requireMFA,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { alertId } = req.params;
    
    const success = await securityMonitoringService.resolveSecurityAlert(alertId);
    
    if (success) {
      // Log alert resolution
      logSecurityEvent(
        'SECURITY_ALERT_RESOLVED',
        AuditEventSeverity.LOW,
        req,
        {
          userId: user.id,
          userRole: user.role,
          alertId
        }
      );
      
      res.json({
        success: true,
        message: 'Security alert resolved successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'ALERT_RESOLUTION_FAILED',
          message: 'Failed to resolve security alert'
        }
      });
    }
  })
);

// Get system health status
router.get('/health', 
  requireMFA,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    const dashboardData = await securityMonitoringService.getSecurityDashboardData();
    
    // Log health check access
    logSecurityEvent(
      'SECURITY_HEALTH_CHECKED',
      AuditEventSeverity.LOW,
      req,
      {
        userId: user.id,
        userRole: user.role,
        overallHealth: dashboardData.systemHealth.overall
      }
    );
    
    res.json({
      success: true,
      data: {
        health: dashboardData.systemHealth,
        timestamp: new Date().toISOString()
      }
    });
  })
);

// Get security summary
router.get('/summary', 
  requireMFA,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    const [metrics, alerts, events] = await Promise.all([
      securityMonitoringService.getSecurityMetrics(),
      securityMonitoringService.getActiveSecurityAlerts(),
      securityMonitoringService.getRecentSecurityEvents(10)
    ]);
    
    const summary = {
      overallHealth: alerts.filter(a => a.type === 'CRITICAL' && !a.resolved).length > 0 ? 'CRITICAL' : 'HEALTHY',
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.type === 'CRITICAL' && !a.resolved).length,
      recentEvents: events.length,
      failedLogins: metrics.authentication.failedLogins,
      encryptionOperations: metrics.encryption.totalEncryptions + metrics.encryption.totalDecryptions,
      systemUptime: metrics.system.uptime
    };
    
    // Log summary access
    logSecurityEvent(
      'SECURITY_SUMMARY_ACCESSED',
      AuditEventSeverity.LOW,
      req,
      {
        userId: user.id,
        userRole: user.role,
        overallHealth: summary.overallHealth
      }
    );
    
    res.json({
      success: true,
      data: {
        summary,
        timestamp: new Date().toISOString()
      }
    });
  })
);

export default router;
