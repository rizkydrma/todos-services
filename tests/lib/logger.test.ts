import { describe, it, expect, vi, afterEach } from 'vitest';
import { levelForStatus, logError, statusClass } from '../../src/lib/logger';

describe('levelForStatus', () => {
  it('maps any 5xx to error, any 4xx to warn, else info', () => {
    expect(levelForStatus(500)).toBe('error');
    expect(levelForStatus(502)).toBe('error');
    expect(levelForStatus(503)).toBe('error');
    expect(levelForStatus(400)).toBe('warn');
    expect(levelForStatus(401)).toBe('warn');
    expect(levelForStatus(403)).toBe('warn');
    expect(levelForStatus(404)).toBe('warn');
    expect(levelForStatus(409)).toBe('warn');
    expect(levelForStatus(429)).toBe('warn');
    expect(levelForStatus(200)).toBe('info');
  });
});

describe('statusClass', () => {
  it('classifies ranges', () => {
    expect(statusClass(400)).toBe('4xx');
    expect(statusClass(429)).toBe('4xx');
    expect(statusClass(500)).toBe('5xx');
    expect(statusClass(503)).toBe('5xx');
    expect(statusClass(200)).toBe('other');
  });
});

describe('logError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes structured JSON to console.error for 5xx', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logError('error', {
      requestId: 'req_1',
      method: 'GET',
      path: '/todos',
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'boom',
    });

    expect(spy).toHaveBeenCalledOnce();
    const line = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({
      level: 'error',
      type: 'http_error',
      statusClass: '5xx',
      requestId: 'req_1',
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'boom',
    });
    expect(parsed.ts).toBeDefined();
  });

  it('writes structured JSON to console.warn for any 4xx', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logError('warn', {
      requestId: 'req_2',
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Missing token',
    });

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('warn');
    expect(parsed.statusClass).toBe('4xx');
    expect(parsed.status).toBe(401);
  });
});
