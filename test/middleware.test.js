import { describe, it, expect, vi } from 'vitest';
import { rateLimit } from '../server/middleware.js';

describe('rateLimit', () => {
  it('falls back to "unknown" when req.ip is missing', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1 });
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    limiter({ ip: undefined }, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    limiter({ ip: undefined }, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
  });
});
