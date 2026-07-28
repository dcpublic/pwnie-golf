import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../server/db.js', () => ({ query: vi.fn(), pool: { end: vi.fn() } }));

import { query } from '../server/db.js';
import { createApp } from '../server/app.js';

let app;
beforeEach(() => {
  vi.clearAllMocks();
  app = createApp();
});

describe('GET /api/guestbook', () => {
  it('lists signatures newest first', async () => {
    query.mockResolvedValueOnce({
      rows: [
        { id: 2, handle: 'Neo', message: 'Whoa.', createdAt: '2026-07-25T00:00:00Z' },
        { id: 1, handle: 'Zero Cool', message: 'HACK THE PLANET!', createdAt: '2026-07-01T00:00:00Z' },
      ],
    });
    const res = await request(app).get('/api/guestbook');
    expect(res.status).toBe(200);
    expect(res.body.signatures.map((s) => s.handle)).toEqual(['Neo', 'Zero Cool']);
    expect(query.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
  });
});

describe('POST /api/guestbook', () => {
  it('stores a signature via parameterized insert', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 3, handle: 'Hackerman', message: 'I hacked time.', createdAt: '2026-07-27T00:00:00Z' }],
    });
    const res = await request(app)
      .post('/api/guestbook')
      .send({ handle: 'Hackerman', message: 'I hacked time.' });
    expect(res.status).toBe(201);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('VALUES ($1, $2)');
    expect(params).toEqual(['Hackerman', 'I hacked time.']);
  });

  it('stores XSS payloads inertly as data (escaping happens at render, not storage)', async () => {
    const payload = '<script>alert("pwned")</script> nice course';
    query.mockResolvedValueOnce({ rows: [{ id: 4, handle: 'mallory', message: payload }] });
    const res = await request(app).post('/api/guestbook').send({ handle: 'mallory', message: payload });
    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(/application\/json/); // JSON, never HTML
    expect(query.mock.calls[0][1]).toEqual(['mallory', payload]); // parameterized, not concatenated
  });

  it('rejects out-of-bounds lengths without a db call', async () => {
    const cases = [
      { handle: 'x', message: 'valid message' },
      { handle: 'valid', message: 'x'.repeat(281) },
      { handle: '', message: '' },
    ];
    for (const body of cases) {
      const res = await request(app).post('/api/guestbook').send(body);
      expect(res.status).toBe(400);
    }
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON bodies', async () => {
    const res = await request(app)
      .post('/api/guestbook')
      .set('Content-Type', 'application/json')
      .send('{"handle": broken');
    expect(res.status).toBe(400);
  });
});
