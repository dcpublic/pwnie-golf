import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../server/db.js', () => ({ query: vi.fn(), pool: { end: vi.fn() } }));

import { query } from '../server/db.js';
import { createApp } from '../server/app.js';

// TODO(pubtests-1): implement reservation cancellation.
// Guests need a way to free a tee time they can no longer make so the slot
// reopens for others. This test is written red first — the DELETE route does
// not exist yet, so the app currently serves the SPA fallback instead of 204.
// Implement DELETE /api/reservations/:id in server/routes/reservations.js,
// then this test should pass.
describe('DELETE /api/reservations/:id (not yet implemented)', () => {
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
