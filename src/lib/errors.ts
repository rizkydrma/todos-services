export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR';

const statusMap: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = statusMap[code];
    this.details = details;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }

  static validation(message: string, details?: unknown) {
    return new AppError('VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError('UNAUTHORIZED', message);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError('FORBIDDEN', message);
  }

  static notFound(resource: string) {
    return new AppError('NOT_FOUND', `${resource} not found`);
  }

  static conflict(message: string) {
    return new AppError('CONFLICT', message);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new AppError('TOO_MANY_REQUESTS', message);
  }

  static internal(message = 'Internal server error') {
    return new AppError('INTERNAL_ERROR', message);
  }
}
