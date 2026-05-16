/**
 * Domain-level error classes. Always throw these (never raw `Error`) so the
 * global error middleware can map them to proper HTTP responses.
 */

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'DB_ERROR'
  | 'AI_ERROR'
  | 'INTERNAL';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super('BAD_REQUEST', message, 400, details);
    this.name = 'BadRequestError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class UpstreamError extends AppError {
  constructor(message = 'Upstream service failure', details?: unknown) {
    super('UPSTREAM_ERROR', message, 502, details);
    this.name = 'UpstreamError';
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database error', details?: unknown) {
    super('DB_ERROR', message, 500, details);
    this.name = 'DatabaseError';
  }
}

export class AIServiceError extends AppError {
  constructor(message = 'AI service error', details?: unknown) {
    super('AI_ERROR', message, 502, details);
    this.name = 'AIServiceError';
  }
}

export class RateLimitedError extends AppError {
  constructor(retryAfterSeconds = 60) {
    super('RATE_LIMITED', 'Too many requests', 429, { retryAfterSeconds });
    this.name = 'RateLimitedError';
  }
}
