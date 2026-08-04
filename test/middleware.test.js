import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { securityHeaders, rateLimit } from '../server/middleware.js';

function mockRes() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    set(obj) { Object.assign(this.headers, obj); return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

describe('securityHeaders', () => {
  it('sets the hardening headers and calls next', () => {
    const res = mockRes();
    const next = vi.fn();
    securityHeaders({}, res, next);
    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(res.headers['X-Frame-Options']).toBe('DENY');
    expect(res.headers['Referrer-Policy']).toBe('no-referrer');
    expect(res.headers['Content-Security-Policy']).toContain("default-src 'self'");
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('rateLimit', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('allows up to max requests then blocks with 429', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 3 });
    const next = vi.fn();
    const results = [];
    for (let i = 0; i < 4; i++) {
      const res = mockRes();
      limiter({ ip: '10.0.0.1' }, res, next);
      results.push(res.statusCode);
    }
    expect(next).toHaveBeenCalledTimes(3);
    expect(results[3]).toBe(429);
  });

  it('resets the counter once the window elapses', () => {
    const limiter = rateLimit({ windowMs: 1_000, max: 1 });
    const next = vi.fn();

    const first = mockRes();
    limiter({ ip: '10.0.0.2' }, first, next);
    expect(next).toHaveBeenCalledTimes(1);

    const blocked = mockRes();
    limiter({ ip: '10.0.0.2' }, blocked, next);
    expect(blocked.statusCode).toBe(429);

    vi.advanceTimersByTime(1_001);
    const afterWindow = mockRes();
    limiter({ ip: '10.0.0.2' }, afterWindow, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(afterWindow.statusCode).toBe(200);
  });

  it('tracks limits per client IP independently', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1 });
    const next = vi.fn();

    const a = mockRes();
    limiter({ ip: '1.1.1.1' }, a, next);
    const b = mockRes();
    limiter({ ip: '2.2.2.2' }, b, next); // different IP — should pass, not share the bucket
    expect(next).toHaveBeenCalledTimes(2);
    expect(b.statusCode).toBe(200);
  });
});
