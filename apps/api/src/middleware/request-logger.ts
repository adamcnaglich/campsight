import pinoHttp from 'pino-http';
import { logger } from '../lib/logger';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from './local-user';

/**
 * HTTP request logging middleware.
 *
 * Logs every request with:
 *  - method, url, status code, response time
 *  - userId & userEmail when authenticated
 *  - request ID for correlating logs within a single request
 *
 * Successful requests (< 400) log at INFO level.
 * Client errors (4xx) log at WARN level.
 * Server errors (5xx) log at ERROR level.
 */
export const requestLogger = pinoHttp({
  logger,

  // Generate a lightweight request ID
  genReqId: (req) =>
    (req.headers['x-request-id'] as string) ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,

  // Choose log level based on status code
  customLogLevel: (_req, res, err) => {
    if (err || (res.statusCode && res.statusCode >= 500)) return 'error';
    if (res.statusCode && res.statusCode >= 400) return 'warn';
    return 'info';
  },

  // Attach useful context to every log line
  customProps: (req) => {
    const authReq = req as AuthenticatedRequest;
    return {
      ...(authReq.userId && {
        userId: authReq.userId,
        userEmail: authReq.userEmail,
      }),
    };
  },

  // Simplify the serialized request object
  serializers: {
    req: (req: Request) => ({
      method: req.method,
      url: req.url,
      userAgent: req.headers?.['user-agent'],
    }),
    res: (res: Response) => ({
      statusCode: res.statusCode,
    }),
  },

  // Customise the one-line message
  customSuccessMessage: (req, res) => {
    const r = req as Request;
    return `${r.method} ${r.url} ${(res as Response).statusCode}`;
  },
  customErrorMessage: (req, _res, err) => {
    const r = req as Request;
    return `${r.method} ${r.url} failed: ${err.message}`;
  },

  // Skip logging the health check to keep logs clean
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
});
