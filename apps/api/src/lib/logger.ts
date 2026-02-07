import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Structured application logger built on pino.
 *
 * - JSON output in production (easy to ship to Datadog, Loki, CloudWatch, etc.)
 * - Pretty-printed output in development via pino-pretty
 * - Named child loggers per module for easy filtering
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }),
});

/**
 * Pre-built child loggers for each module.
 * Use these in place of console.log / console.error throughout the API.
 *
 * Examples:
 *   log.api.info('Server started on port %d', port);
 *   log.auth.warn({ userId }, 'Token near expiry');
 *   log.scheduler.error({ campsiteId, err }, 'Failed to check availability');
 */
export const log = {
  api: logger.child({ module: 'api' }),
  auth: logger.child({ module: 'auth' }),
  db: logger.child({ module: 'db' }),
  watches: logger.child({ module: 'watches' }),
  campsites: logger.child({ module: 'campsites' }),
  scheduler: logger.child({ module: 'scheduler' }),
  notify: logger.child({ module: 'notify' }),
};
