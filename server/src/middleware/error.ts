import type { ErrorHandler, NotFoundHandler } from 'hono';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { isProd } from '../config/env.js';

export const onError: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    logger.warn(
      { code: err.code, status: err.status, path: c.req.path, details: err.details },
      err.message,
    );
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      },
      err.status as 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502,
    );
  }

  if (err instanceof z.ZodError) {
    logger.warn({ issues: err.issues, path: c.req.path }, 'Validation error');
    return c.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: 'Validation failed',
          details: err.issues,
        },
      },
      400,
    );
  }

  logger.error(
    { err: { message: err.message, stack: err.stack }, path: c.req.path },
    'Unhandled error',
  );

  return c.json(
    {
      error: {
        code: 'INTERNAL',
        message: isProd ? 'Internal server error' : err.message,
      },
    },
    500,
  );
};

export const onNotFound: NotFoundHandler = (c) =>
  c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: `Route ${c.req.method} ${c.req.path} not found`,
      },
    },
    404,
  );
