import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// Audit log types
export enum AuditEventType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  SECURITY_EVENT = 'SECURITY_EVENT',
  SYSTEM_EVENT = 'SYSTEM_EVENT',
  USER_ACTION = 'USER_ACTION'
}

export enum AuditEventSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AuditEvent {
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditEventSeverity;
  userId?: string;
  userRole?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  action: string;
  resource: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  details?: Record<string, unknown>;
  riskScore?: number;
}

// Audit log directory setup
const auditLogDir = path.join(process.cwd(), 'logs', 'audit');
if (!fs.existsSync(auditLogDir)) {
  fs.mkdirSync(auditLogDir, { recursive: true });
}

const auditLogFile = path.join(auditLogDir, `audit-${new Date().toISOString().split('T')[0]}.log`);

// Write audit event to file
function writeAuditEvent(event: AuditEvent): void {
  const logEntry = JSON.stringify(event) + '\n';
  
  try {
    fs.appendFileSync(auditLogFile, logEntry);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

// Calculate risk score based on event
function calculateRiskScore(event: AuditEvent): number {
  let score = 0;
  
  // Base score by severity
  switch (event.severity) {
    case AuditEventSeverity.LOW: score += 1; break;
    case AuditEventSeverity.MEDIUM: score += 3; break;
    case AuditEventSeverity.HIGH: score += 7; break;
    case AuditEventSeverity.CRITICAL: score += 10; break;
  }
  
  // Add score for failure outcomes
  if (event.outcome === 'FAILURE') score += 2;
  
  // Add score for security events
  if (event.eventType === AuditEventType.SECURITY_EVENT) score += 3;
  
  // Add score for authentication failures
  if (event.action.includes('LOGIN_FAILED') || event.action.includes('AUTH_FAILED')) score += 5;
  
  // Add score for privilege escalation attempts
  if (event.action.includes('PRIVILEGE_ESCALATION') || event.action.includes('UNAUTHORIZED_ACCESS')) score += 8;
  
  return Math.min(score, 10); // Cap at 10
}

// Create audit event
export function createAuditEvent(
  eventType: AuditEventType,
  severity: AuditEventSeverity,
  action: string,
  resource: string,
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL',
  req: Request,
  details?: Record<string, unknown>
): AuditEvent {
  const event: AuditEvent = {
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    userId: req.user?.userId,
    userRole: req.user?.role,
    sessionId: req.sessionID,
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    action,
    resource,
    outcome,
    details
  };
  
  event.riskScore = calculateRiskScore(event);
  
  return event;
}

// Log audit event
export function logAuditEvent(event: AuditEvent): void {
  // Write to audit log file
  writeAuditEvent(event);
  
  // Log high-risk events to console
  if (event.riskScore && event.riskScore >= 7) {
    console.warn(`🚨 HIGH RISK AUDIT EVENT: ${event.action} by ${event.userId || 'anonymous'} (Risk: ${event.riskScore}/10)`);
  }
  
  // Log critical events to error log
  if (event.severity === AuditEventSeverity.CRITICAL) {
    console.error(`🚨 CRITICAL AUDIT EVENT: ${event.action} - ${JSON.stringify(event)}`);
  }
}

// Audit logging middleware
export const auditLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Override res.json to capture response details
  const originalJson = res.json;
  res.json = function(data: unknown) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Determine outcome based on status code
    let outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL' = 'SUCCESS';
    if (statusCode >= 400) outcome = 'FAILURE';
    else if (statusCode >= 300) outcome = 'PARTIAL';
    
    // Determine event type and severity based on endpoint and outcome
    let eventType = AuditEventType.USER_ACTION;
    let severity = AuditEventSeverity.LOW;
    
    if (req.url.includes('/auth/')) {
      eventType = AuditEventType.AUTHENTICATION;
      severity = outcome === 'FAILURE' ? AuditEventSeverity.HIGH : AuditEventSeverity.MEDIUM;
    } else if (req.url.includes('/sysadmin/') || req.url.includes('/admin/')) {
      eventType = AuditEventType.AUTHORIZATION;
      severity = AuditEventSeverity.MEDIUM;
    } else if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      eventType = AuditEventType.DATA_MODIFICATION;
      severity = AuditEventSeverity.MEDIUM;
    } else if (req.method === 'GET') {
      eventType = AuditEventType.DATA_ACCESS;
      severity = AuditEventSeverity.LOW;
    }
    
    // Create and log audit event
    const auditEvent = createAuditEvent(
      eventType,
      severity,
      `${req.method} ${req.url}`,
      req.url,
      outcome,
      req,
      {
        statusCode,
        duration,
        responseSize: JSON.stringify(data).length
      }
    );
    
    logAuditEvent(auditEvent);
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Specific audit logging functions for security events
export const logSecurityEvent = (
  action: string,
  severity: AuditEventSeverity,
  req: Request,
  details?: Record<string, unknown>
) => {
  const event = createAuditEvent(
    AuditEventType.SECURITY_EVENT,
    severity,
    action,
    req.url,
    'FAILURE',
    req,
    details
  );
  
  logAuditEvent(event);
};

export const logAuthenticationEvent = (
  action: string,
  outcome: 'SUCCESS' | 'FAILURE',
  req: Request,
  details?: Record<string, unknown>
) => {
  const severity = outcome === 'FAILURE' ? AuditEventSeverity.HIGH : AuditEventSeverity.MEDIUM;
  
  const event = createAuditEvent(
    AuditEventType.AUTHENTICATION,
    severity,
    action,
    req.url,
    outcome,
    req,
    details
  );
  
  logAuditEvent(event);
};

export const logDataAccessEvent = (
  action: string,
  resource: string,
  req: Request,
  details?: Record<string, unknown>
) => {
  const event = createAuditEvent(
    AuditEventType.DATA_ACCESS,
    AuditEventSeverity.LOW,
    action,
    resource,
    'SUCCESS',
    req,
    details
  );
  
  logAuditEvent(event);
};
