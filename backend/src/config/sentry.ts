import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: any = null;
let sentryEnabled = false;

/**
 * Initialise Sentry error monitoring.
 * Uses dynamic import so the app boots normally even if @sentry/node is not
 * installed on the server — just set SENTRY_DSN and install the package.
 */
export async function initSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log('Sentry disabled (no SENTRY_DSN)');
    return;
  }

  try {
    Sentry = await import('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: 0.1,
      integrations: [Sentry.expressIntegration()],
    });
    sentryEnabled = true;
    console.log(`Sentry enabled (env=${process.env.NODE_ENV || 'production'})`);
  } catch {
    console.warn('Sentry failed to load — @sentry/node not installed. Run: npm install @sentry/node');
  }
}

/**
 * Capture an exception with optional context. Safe no-op when disabled.
 */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!sentryEnabled || !Sentry) return;

  if (context) {
    Sentry.withScope((scope: { setExtras: (e: Record<string, unknown>) => void }) => {
      scope.setExtras(context);
      Sentry.captureException(err);
    });
  } else {
    Sentry.captureException(err);
  }
}

/**
 * Sentry request handler — must come before routes.
 * Checks sentryEnabled at request time so async init has a chance to complete.
 */
export function getSentryRequestHandler(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!sentryEnabled || !Sentry) return next();
    return Sentry.expressRequestHandler()(req, res, next);
  };
}

/**
 * Sentry error handler — must come before the app's global error handler.
 * No-op pass-through when Sentry is disabled or not installed.
 */
export function getSentryErrorHandler(): ErrorRequestHandler {
  if (!sentryEnabled || !Sentry) {
    return (err: unknown, _req: Request, _res: Response, next: NextFunction) => next(err);
  }
  return Sentry.expressErrorHandler() as ErrorRequestHandler;
}
