import * as Sentry from '@sentry/node';
import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

let sentryEnabled = false;

/**
 * Initialise Sentry error monitoring.
 * Must be called as early as possible in the process lifecycle.
 * If SENTRY_DSN is not set the function is a no-op and all Sentry
 * helpers remain safe no-ops — the app boots normally without a DSN.
 *
 * Uses @sentry/node v10 API: expressIntegration is added via integrations
 * array and handles request context automatically (no separate request
 * handler middleware required).
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log('Sentry disabled (no SENTRY_DSN)');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
    integrations: [
      Sentry.expressIntegration(),
    ],
  });

  sentryEnabled = true;
  console.log(`Sentry enabled (env=${process.env.NODE_ENV || 'production'})`);
}

/**
 * Capture an exception in Sentry with optional extra context.
 * Safe no-op when Sentry is disabled.
 */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!sentryEnabled) return;

  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(err);
    });
  } else {
    Sentry.captureException(err);
  }
}

/**
 * Returns a no-op request-handler middleware placeholder.
 *
 * In @sentry/node v10, request context is captured automatically via the
 * expressIntegration() added in initSentry() — no explicit request handler
 * middleware is required. This function exists so that call-sites can be
 * written uniformly; it always returns a pass-through middleware.
 */
export function getSentryRequestHandler(): (req: Request, res: Response, next: NextFunction) => void {
  // v10: expressIntegration handles request context automatically.
  // Return a no-op middleware regardless of whether Sentry is enabled.
  return (_req: Request, _res: Response, next: NextFunction) => next();
}

/**
 * Returns the Sentry error handler middleware that must be added
 * BEFORE the app's own global error handler.
 * Returns a pass-through no-op error middleware when Sentry is disabled.
 */
export function getSentryErrorHandler(): ErrorRequestHandler {
  if (!sentryEnabled) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (err: any, _req: Request, _res: Response, next: NextFunction) => next(err);
  }
  return Sentry.expressErrorHandler() as ErrorRequestHandler;
}
