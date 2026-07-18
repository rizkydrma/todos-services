export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'
  | 'EMAIL_NOT_VERIFIED'
  | 'INVALID_OTP'
  | 'OTP_EXPIRED'
  | 'OTP_MAX_ATTEMPTS'
  | 'RATE_LIMITED'
  | 'EMAIL_REGISTERED_USE_PASSWORD'
  | 'IDENTITY_CONFLICT'
  | 'EMAIL_ALREADY_REGISTERED';

const statusMap: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  EMAIL_NOT_VERIFIED: 403,
  INVALID_OTP: 401,
  OTP_EXPIRED: 401,
  OTP_MAX_ATTEMPTS: 429,
  RATE_LIMITED: 429,
  EMAIL_REGISTERED_USE_PASSWORD: 409,
  IDENTITY_CONFLICT: 409,
  EMAIL_ALREADY_REGISTERED: 409,
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

  static emailNotVerified(message = 'Email not verified') {
    return new AppError('EMAIL_NOT_VERIFIED', message);
  }

  static invalidOtp(message = 'Invalid or expired code') {
    return new AppError('INVALID_OTP', message);
  }

  static otpExpired(message = 'Code expired') {
    return new AppError('OTP_EXPIRED', message);
  }

  static otpMaxAttempts(message = 'Too many attempts') {
    return new AppError('OTP_MAX_ATTEMPTS', message);
  }

  static rateLimited(message = 'Too many requests') {
    return new AppError('RATE_LIMITED', message);
  }

  static emailRegisteredUsePassword(message = 'Email already registered; use password login') {
    return new AppError('EMAIL_REGISTERED_USE_PASSWORD', message);
  }

  static identityConflict(message = 'Identity conflict') {
    return new AppError('IDENTITY_CONFLICT', message);
  }

  static emailAlreadyRegistered(message = 'Email already registered') {
    return new AppError('EMAIL_ALREADY_REGISTERED', message);
  }
}
