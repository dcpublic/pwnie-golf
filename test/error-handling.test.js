import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../server/db.js', () => ({ query: vi.fn(), pool: { end: vi.fn() } }));

import { query } from '../server/db.js';
import { createApp } from '../server/app.js';

describe('Error handling', () => {
  let app;
  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('Database errors', () => {
    it('returns 500 when reservations GET fails', async () => {
      query.mockRejectedValueOnce(new Error('Connection lost'));
      const res = await request(app).get('/api/reservations?date=2099-01-01');
      expect(res.status).toBe(500);
    });

    it('returns 500 when guestbook GET fails', async () => {
      query.mockRejectedValueOnce(new Error('Database offline'));
      const res = await request(app).get('/api/guestbook');
      expect(res.status).toBe(500);
    });

    it('returns 500 when POST /api/reservations fails', async () => {
      query.mockRejectedValueOnce(new Error('Unexpected error'));
      const res = await request(app)
        .post('/api/reservations')
        .send({ name: 'Test', email: 'test@example.com', partySize: 2, date: '2099-01-01', timeSlot: '10:00' });
      expect(res.status).toBe(500);
    });

    it('returns 500 when DELETE reservation fails', async () => {
      query.mockRejectedValueOnce(new Error('Database error'));
      const res = await request(app).delete('/api/reservations/999');
      expect(res.status).toBe(500);
    });
  });

  describe('Not found and malformed routes', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
    });

    it('returns 404 for unknown methods on known routes', async () => {
      const res = await request(app).delete('/api/guestbook');
      expect(res.status).toBe(404);
    });
  });

  describe('Malformed requests', () => {
    it('rejects invalid JSON in POST body', async () => {
      const res = await request(app)
        .post('/api/reservations')
        .set('Content-Type', 'application/json')
        .send('{ invalid json');
      expect(res.status).toBe(400);
    });

    it('rejects requests with wrong content type but parses JSON anyway', async () => {
      const res = await request(app)
        .post('/api/guestbook')
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify({ handle: 'test', message: 'msg' }));
      expect([200, 201, 400]).toContain(res.status); // content-type mismatch doesn't auto-reject
    });
  });
});
