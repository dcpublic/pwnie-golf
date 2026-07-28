import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../server/db.js', () => ({ query: vi.fn(), pool: { end: vi.fn() } }));

import { createApp } from '../server/app.js';

let app;
beforeEach(() => {
  app = createApp();
});

describe('GET /api/holes', () => {
  it('returns all 18 hole concepts', async () => {
    const res = await request(app).get('/api/holes');
    expect(res.status).toBe(200);
    expect(res.body.holes).toHaveLength(18);
    expect(res.body.holes[17].name).toBe('The Gibson');
    for (const h of res.body.holes) {
      expect(h).toMatchObject({
        number: expect.any(Number),
        par: expect.any(Number),
        name: expect.any(String),
        concept: expect.any(String),
      });
    }
  });
});

describe('app hardening', () => {
  it('sets security headers and hides x-powered-by', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('serves the SPA shell for unknown non-API paths', async () => {
    const res = await request(app).get('/some/deep/route');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('health check responds', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toContain('OK');
  });
});
