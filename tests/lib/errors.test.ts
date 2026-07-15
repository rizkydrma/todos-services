import { describe, it, expect } from 'vitest';
import { AppError } from '../../src/lib/errors';

describe('AppError', () => {
  it('creates VALIDATION_ERROR with 400 status', () => {
    const err = AppError.validation('Invalid input', { field: 'email' });
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.status).toBe(400);
    expect(err.details).toEqual({ field: 'email' });
    expect(err.toJSON()).toEqual({ code: 'VALIDATION_ERROR', message: 'Invalid input', details: { field: 'email' } });
  });

  it('creates CONFLICT with 409 status', () => {
    const err = AppError.conflict('Email already exists');
    expect(err.code).toBe('CONFLICT');
    expect(err.status).toBe(409);
    expect(err.toJSON()).toEqual({ code: 'CONFLICT', message: 'Email already exists' });
  });

  it('creates NOT_FOUND with proper message', () => {
    const err = AppError.notFound('User');
    expect(err.status).toBe(404);
    expect(err.message).toBe('User not found');
  });

  it('creates UNAUTHORIZED with default message', () => {
    const err = AppError.unauthorized();
    expect(err.status).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });

  it('creates FORBIDDEN with default message', () => {
    const err = AppError.forbidden();
    expect(err.status).toBe(403);
    expect(err.message).toBe('Forbidden');
  });

  it('creates TOO_MANY_REQUESTS with 429 status', () => {
    const err = AppError.tooManyRequests();
    expect(err.status).toBe(429);
    expect(err.message).toBe('Too many requests');
  });

  it('creates INTERNAL_ERROR with 500 status', () => {
    const err = AppError.internal();
    expect(err.status).toBe(500);
    expect(err.message).toBe('Internal server error');
  });

  it('toJSON omits details when not set', () => {
    const err = AppError.notFound('Todo');
    expect(err.toJSON()).toEqual({ code: 'NOT_FOUND', message: 'Todo not found' });
    expect(err.details).toBeUndefined();
  });
});
