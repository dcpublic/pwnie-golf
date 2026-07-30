import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app.js';

describe('GET /api/holes', () => {
  it('returns all 18 holes with complete metadata', async () => {
    const app = createApp();
    const res = await request(app).get('/api/holes');
    expect(res.status).toBe(200);
    expect(res.body.holes).toHaveLength(18);
    expect(res.body.holes[0]).toHaveProperty('number');
    expect(res.body.holes[0]).toHaveProperty('name');
    expect(res.body.holes[0]).toHaveProperty('par');
    expect(res.body.holes[0]).toHaveProperty('concept');
  });

  it('includes all holes numbered 1 through 18', async () => {
    const app = createApp();
    const res = await request(app).get('/api/holes');
    const numbers = res.body.holes.map((h) => h.number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
  });

  it('starts with hole 1 and ends with The Gibson (hole 18)', async () => {
    const app = createApp();
    const res = await request(app).get('/api/holes');
    expect(res.body.holes[0].number).toBe(1);
    expect(res.body.holes.at(-1).name).toBe('The Gibson');
  });
});
