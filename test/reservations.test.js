import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../server/db.js', () => ({ query: vi.fn(), pool: { end: vi.fn() } }));

import { query } from '../server/db.js';
import { createApp } from '../server/app.js';
import { TIME_SLOTS } from '../server/validate.js';

const FUTURE = '2099-01-01';
const good = { name: 'Zero Cool', email: 'zc@gibson.example', partySize: 4, date: FUTURE, timeSlot: '10:00' };

let app;
beforeEach(() => {
  vi.clearAllMocks();
  app = createApp();
});

describe('GET /api/reservations', () => {
  it('returns booked and available slots for a date', async () => {
    query.mockResolvedValueOnce({ rows: [{ time_slot: '10:00' }, { time_slot: '18:30' }] });
    const res = await request(app).get(`/api/reservations?date=${FUTURE}`);
    expect(res.status).toBe(200);
    expect(res.body.bookedSlots).toEqual(['10:00', '18:30']);
    expect(res.body.availableSlots).toHaveLength(TIME_SLOTS.length - 2);
    expect(res.body.availableSlots).not.toContain('10:00');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE date = $1'), [FUTURE]);
  });

  it('rejects a missing or malformed date without touching the db', async () => {
    for (const q of ['', '?date=zzz', "?date=2099-01-01'--"]) {
      const res = await request(app).get(`/api/reservations${q}`);
      expect(res.status).toBe(400);
    }
    expect(query).not.toHaveBeenCalled();
  });
});

describe('POST /api/reservations', () => {
  it('creates a reservation and returns 201', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 1, name: good.name, partySize: 4, date: FUTURE, timeSlot: '10:00' }],
    });
    const res = await request(app).post('/api/reservations').send(good);
    expect(res.status).toBe(201);
    expect(res.body.reservation.id).toBe(1);
    // Parameterized insert: values travel as params, never in the SQL string.
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('VALUES ($1, $2, $3, $4, $5)');
    expect(params).toEqual([good.name, good.email, 4, FUTURE, '10:00']);
  });

  it('returns 409 when the slot is already booked (unique violation)', async () => {
    query.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: '23505' }));
    const res = await request(app).post('/api/reservations').send(good);
    expect(res.status).toBe(409);
  });

  it('rejects validation failures with details and no db call', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .send({ ...good, email: 'nope', partySize: 99 });
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThanOrEqual(2);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects past dates', async () => {
    const res = await request(app).post('/api/reservations').send({ ...good, date: '1998-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('date must be today or in the future');
  });

  it('rejects time slots not on the whitelist', async () => {
    const res = await request(app).post('/api/reservations').send({ ...good, timeSlot: '10:07' });
    expect(res.status).toBe(400);
  });

  it('returns 500 with a generic message on unexpected db errors', async () => {
    query.mockRejectedValueOnce(new Error('connection reset by peer'));
    const res = await request(app).post('/api/reservations').send(good);
    expect(res.status).toBe(500);
    expect(res.body.error).not.toContain('peer'); // no internals leaked
  });

  it('rate limits after 10 posts in a minute', async () => {
    query.mockResolvedValue({ rows: [{ id: 1 }] });
    let last;
    for (let i = 0; i < 11; i++) {
      last = await request(app).post('/api/reservations').send(good);
    }
    expect(last.status).toBe(429);
  });
});
