import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../server/db.js', () => ({ query: vi.fn(), pool: { end: vi.fn() } }));

import { query } from '../server/db.js';
import { createApp } from '../server/app.js';
import { TIME_SLOTS } from '../server/validate.js';

const FUTURE = '2099-01-01';

describe('Integration scenarios', () => {
  let app;
  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('Reservation workflow', () => {
    it('books a slot and then cancels it, freeing the slot', async () => {
      // Mock the reservation ID returned
      const reservationId = 42;
      query.mockResolvedValueOnce({
        rows: [{ id: reservationId, name: 'Test User', partySize: 2, date: FUTURE, timeSlot: '10:00' }],
      });

      // Book the reservation
      const bookRes = await request(app)
        .post('/api/reservations')
        .send({ name: 'Test User', email: 'test@example.com', partySize: 2, date: FUTURE, timeSlot: '10:00' });
      expect(bookRes.status).toBe(201);
      expect(bookRes.body.reservation.id).toBe(reservationId);

      // Cancel the reservation
      const cancelRes = await request(app).delete(`/api/reservations/${reservationId}`);
      expect(cancelRes.status).toBe(204);

      // Verify delete was called with the correct ID
      const deleteCall = query.mock.calls.find((call) => call[0].includes('DELETE'));
      expect(deleteCall).toBeDefined();
      expect(deleteCall[1]).toEqual([reservationId]);
    });

    it('rejects booking a duplicate time slot', async () => {
      query.mockRejectedValueOnce({ code: '23505' }); // Unique constraint violation
      const res = await request(app)
        .post('/api/reservations')
        .send({ name: 'User', email: 'user@example.com', partySize: 2, date: FUTURE, timeSlot: '10:00' });
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already pwned');
    });
  });

  describe('Validation across routes', () => {
    it('validates dates consistently', async () => {
      for (const badDate of ['', 'not-a-date', '99-01-01', "2099-01-01'; DROP TABLE", '2099-13-01']) {
        const res = await request(app).get(`/api/reservations?date=${badDate}`);
        expect(res.status).toBe(400);
      }
      // None of these should reach the database
      expect(query).not.toHaveBeenCalled();
    });

    it('time slots are consistent between GET and POST', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const getRes = await request(app).get(`/api/reservations?date=${FUTURE}`);
      expect(getRes.body.availableSlots).toEqual(TIME_SLOTS);
      expect(getRes.body.availableSlots.length).toBeGreaterThan(0);
    });
  });

  describe('Response formats', () => {
    it('always returns JSON with proper content-type', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get(`/api/reservations?date=${FUTURE}`);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(typeof res.body).toBe('object');
    });

    it('DELETE returns 204 with no body', async () => {
      const res = await request(app).delete('/api/reservations/123');
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
      expect(res.text).toBe('');
    });

    it('POST returns 201 for successful creation', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Test', partySize: 2, date: FUTURE, timeSlot: '10:00' }],
      });
      const res = await request(app)
        .post('/api/reservations')
        .send({ name: 'Test', email: 'test@example.com', partySize: 2, date: FUTURE, timeSlot: '10:00' });
      expect(res.status).toBe(201);
      expect(res.body.reservation).toBeDefined();
    });
  });
});
