/**
 * Logger utility that respects environment settings
 * In production, only warnings and errors are logged
 * In development, all logs are shown
 * Integrates with Sentry for error tracking in production
 */

import { Sentry } from '../lib/sentry';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

const colors = {
  debug: '#9CA3AF',
  info: '#3B82F6',
  warn: '#F59E0B',
  error: '#EF4444',
};

const icons = {
  debug: '\u{1F50D}',
  info: '\u2139\uFE0F',
  warn: '\u26A0\uFE0F',
  error: '\u274C',
};

function formatMessage(level: LogLevel, message: string, context?: LogContext): unknown[] {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${icons[level]}`;

  if (context && Object.keys(context).length > 0) {
    return [
      `%c${prefix} ${message}`,
      `color: ${colors[level]}; font-weight: bold;`,
      context,
    ];
  }

  return [
    `%c${prefix} ${message}`,
    `color: ${colors[level]}; font-weight: bold;`,
  ];
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (isDevelopment) {
      const args = formatMessage('debug', message, context);
      console.log(...args);
    }
  },

  info(message: string, context?: LogContext): void {
    if (isDevelopment) {
      const args = formatMessage('info', message, context);
      console.info(...args);
    }
  },

  warn(message: string, context?: LogContext): void {
    const args = formatMessage('warn', message, context);
    console.warn(...args);
  },

  error(message: string, context?: LogContext): void {
    const args = formatMessage('error', message, context);
    console.error(...args);

    if (isProduction) {
      const error = context?.error instanceof Error
        ? context.error
        : new Error(message);

      Sentry.captureException(error, {
        extra: { message, ...context, timestamp: new Date().toISOString() },
      });
    }
  },

  exception(error: Error, message?: string, context?: LogContext): void {
    this.error(message || error.message, {
      ...context,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    });
  },

  scope(scope: string) {
    return {
      debug: (message: string, context?: LogContext) =>
        logger.debug(`[${scope}] ${message}`, context),
      info: (message: string, context?: LogContext) =>
        logger.info(`[${scope}] ${message}`, context),
      warn: (message: string, context?: LogContext) =>
        logger.warn(`[${scope}] ${message}`, context),
      error: (message: string, context?: LogContext) =>
        logger.error(`[${scope}] ${message}`, context),
      exception: (error: Error, message?: string, context?: LogContext) =>
        logger.exception(error, `[${scope}] ${message || error.message}`, context),
    };
  },
};

// Pre-configured scoped loggers
export const authLogger = logger.scope('Auth');
export const deliveryLogger = logger.scope('Delivery');
export const chatLogger = logger.scope('Chat');
export const driverLogger = logger.scope('Driver');
export const locationLogger = logger.scope('Location');
export const paymentLogger = logger.scope('Payment');
export const pushLogger = logger.scope('Push');
export const offlineLogger = logger.scope('Offline');
export const gamificationLogger = logger.scope('Gamification');

export default logger;
