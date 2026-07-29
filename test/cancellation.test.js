import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../server/db.js', () => ({ query: vi.fn(), pool: { end: vi.fn() } }));

import { query } from '../server/db.js';
import { createApp } from '../server/app.js';

describe('DELETE /api/reservations/:id', () => {
  let app;
  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  it('cancels a reservation and frees the slot', async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
    const res = await request(app).delete('/api/reservations/1');
    expect(res.status).toBe(204);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM reservations'),
      [1]
    );
  });
});
