import pino, { type Logger } from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        },
      }
    : {}),
  base: {
    service: 'pathfinder-server',
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.OPENAI_API_KEY'],
    censor: '[REDACTED]',
  },
});

export function child(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}
