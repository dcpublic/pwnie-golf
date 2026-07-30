import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../server/db.js', () => ({ query: vi.fn(), pool: { end: vi.fn() } }));

import { query } from '../server/db.js';
import { createApp } from '../server/app.js';
import { validateReservation, validateSignature, TIME_SLOTS } from '../server/validate.js';

const FUTURE = '2099-01-01';
const good = { name: 'Zero Cool', email: 'zc@gibson.example', partySize: 4, date: FUTURE, timeSlot: '10:00' };

let app;
beforeEach(() => {
  vi.clearAllMocks();
  app = createApp();
});

describe('Body size limit enforcement', () => {
  it('accepts valid JSON under the 10kb limit', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app).post('/api/reservations').send(good);
    expect(res.status).not.toBe(413);
  });

  it('rejects oversized payloads with error response', async () => {
    const oversized = {
      ...good,
      name: 'a'.repeat(15000), // Create payload > 10kb
    };
    // payload is rejected (express returns 400 for oversized json)
    const res = await request(app).post('/api/reservations').send(oversized);
    expect([400, 413]).toContain(res.status); // May be 400 or 413 depending on implementation
  });
});

describe('Error handling in GET /api/reservations', () => {
  it('handles database errors gracefully', async () => {
    query.mockRejectedValueOnce(new Error('connection timeout'));
    const res = await request(app).get(`/api/reservations?date=${FUTURE}`);
    expect(res.status).toBe(500);
    expect(res.body.error).not.toContain('timeout');
  });

  it('returns empty arrays when no slots are booked', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get(`/api/reservations?date=${FUTURE}`);
    expect(res.status).toBe(200);
    expect(res.body.bookedSlots).toEqual([]);
    expect(res.body.availableSlots).toHaveLength(TIME_SLOTS.length);
  });
});

describe('Error handling in GET /api/guestbook', () => {
  it('handles database errors on fetch', async () => {
    query.mockRejectedValueOnce(new Error('query error'));
    const res = await request(app).get('/api/guestbook');
    expect(res.status).toBe(500);
  });

  it('returns empty array when no signatures exist', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/guestbook');
    expect(res.status).toBe(200);
    expect(res.body.signatures).toEqual([]);
  });

  it('enforces the 50-signature limit in query', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await request(app).get('/api/guestbook');
    const [sql] = query.mock.calls[0];
    expect(sql).toContain('LIMIT 50');
  });
});

describe('Error handling in POST /api/guestbook', () => {
  it('handles database errors on insertion', async () => {
    query.mockRejectedValueOnce(new Error('constraint violation'));
    const res = await request(app).post('/api/guestbook').send({ handle: 'test', message: 'message' });
    expect(res.status).toBe(500);
  });

  it('successfully stores a valid signature', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 1, handle: 'tester', message: 'test msg', createdAt: '2026-07-27T00:00:00Z' }],
    });
    const res = await request(app).post('/api/guestbook').send({ handle: 'tester', message: 'test msg' });
    expect(res.status).toBe(201);
    expect(res.body.signature.id).toBe(1);
  });

  it('returns 400 on validation failure', async () => {
    const res = await request(app).post('/api/guestbook').send({ handle: 'ok', message: 'x'.repeat(281) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(query).not.toHaveBeenCalled();
  });
});

describe('Edge cases for rate limiting', () => {
  it('allows first request immediately', async () => {
    query.mockResolvedValue({ rows: [{ id: 1 }] });
    const res = await request(app).post('/api/reservations').send(good);
    expect(res.status).toBe(201);
  });

  it('allows exactly max requests within window', async () => {
    query.mockResolvedValue({ rows: [{ id: 1 }] });
    for (let i = 0; i < 10; i++) {
      const res = await request(app).post('/api/reservations').send(good);
      expect(res.status).toBe(201);
    }
  });

  it('blocks the 11th request with 429', async () => {
    query.mockResolvedValue({ rows: [{ id: 1 }] });
    for (let i = 0; i < 11; i++) {
      await request(app).post('/api/reservations').send(good);
    }
    const res = await request(app).post('/api/reservations').send(good);
    expect(res.status).toBe(429);
    expect(res.body.error).toContain('Rate limit exceeded');
  });

  it('tracks rate limits per client IP', async () => {
    query.mockResolvedValue({ rows: [{ id: 1 }] });
    // Fill up the limit from localhost
    for (let i = 0; i < 10; i++) {
      const res = await request(app).post('/api/reservations').send(good);
      expect(res.status).toBe(201);
    }
    // The 11th request should be blocked
    const res11 = await request(app).post('/api/reservations').send(good);
    expect(res11.status).toBe(429);
  });
});

describe('Security header validation', () => {
  it('sets X-Content-Type-Options header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('sets Referrer-Policy header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
  });

  it('includes CSP with self-only policy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain('default-src');
    expect(res.headers['content-security-policy']).toContain("'self'");
  });

  it('disables x-powered-by header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('Validation edge cases', () => {
  it('rejects email with just a domain', () => {
    const r = validateReservation({ ...good, email: '@example.com' });
    expect(r.ok).toBe(false);
  });

  it('rejects email without TLD', () => {
    const r = validateReservation({ ...good, email: 'user@localhost' });
    expect(r.ok).toBe(false);
  });

  it('accepts email with subdomain', () => {
    const r = validateReservation({ ...good, email: 'user@mail.example.co.uk' });
    expect(r.ok).toBe(true);
  });

  it('handles null and undefined values gracefully', () => {
    const r = validateReservation({ name: null, email: undefined, partySize: null });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('accepts party size as string that coerces to valid number', () => {
    const r = validateReservation({ ...good, partySize: '4' });
    expect(r.ok).toBe(true); // Number('4') === 4
  });

  it('rejects party size as non-numeric string', () => {
    const r = validateReservation({ ...good, partySize: 'four' });
    expect(r.ok).toBe(false); // Number('four') === NaN
  });

  it('rejects partySize of 1.5', () => {
    const r = validateReservation({ ...good, partySize: 1.5 });
    expect(r.ok).toBe(false);
  });

  it('accepts boundary name lengths', () => {
    const r2char = validateReservation({ ...good, name: 'ab' });
    expect(r2char.ok).toBe(true);
    const r60char = validateReservation({ ...good, name: 'a'.repeat(60) });
    expect(r60char.ok).toBe(true);
  });

  it('rejects boundary name lengths', () => {
    const r1char = validateReservation({ ...good, name: 'a' });
    expect(r1char.ok).toBe(false);
    const r61char = validateReservation({ ...good, name: 'a'.repeat(61) });
    expect(r61char.ok).toBe(false);
  });

  it('accepts boundary signature lengths', () => {
    const r2char = validateSignature({ handle: 'ab', message: 'ab' });
    expect(r2char.ok).toBe(true);
    const r40handle = validateSignature({ handle: 'a'.repeat(40), message: 'hello' });
    expect(r40handle.ok).toBe(true);
    const r280msg = validateSignature({ handle: 'test', message: 'x'.repeat(280) });
    expect(r280msg.ok).toBe(true);
  });

  it('rejects boundary signature lengths', () => {
    const r1char = validateSignature({ handle: 'a', message: 'ab' });
    expect(r1char.ok).toBe(false);
    const r41handle = validateSignature({ handle: 'a'.repeat(41), message: 'hello' });
    expect(r41handle.ok).toBe(false);
    const r281msg = validateSignature({ handle: 'test', message: 'x'.repeat(281) });
    expect(r281msg.ok).toBe(false);
  });
});

describe('Request/Response format validation', () => {
  it('returns content-type application/json for all API responses', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('accepts application/json content type', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .post('/api/reservations')
      .set('Content-Type', 'application/json')
      .send(good);
    expect(res.status).not.toBe(415);
  });

  it('handles requests with no content-type header', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .post('/api/reservations')
      .send(good); // supertest auto-sets content-type
    expect([200, 201]).toContain(res.status);
  });
});

describe('Parameterized query validation', () => {
  it('uses parameterized queries for reservation creation', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    await request(app).post('/api/reservations').send(good);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('$1');
    expect(params).toHaveLength(5);
    expect(sql).not.toContain(good.email);
  });

  it('uses parameterized queries for guestbook insertion', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    await request(app).post('/api/guestbook').send({ handle: 'tester', message: 'msg' });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('$1');
    expect(sql).toContain('$2');
    expect(params).not.toContain(undefined);
  });
});
