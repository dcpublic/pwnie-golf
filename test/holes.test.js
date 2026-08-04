import { describe, it, expect } from 'vitest';
import { HOLES } from '../server/data/holes.js';

describe('course data integrity', () => {
  it('has exactly 18 holes', () => {
    expect(HOLES).toHaveLength(18);
  });

  it('numbers the holes 1..18 with no gaps or dupes', () => {
    const numbers = HOLES.map((h) => h.number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
  });

  it('gives every hole a sane par (2..5)', () => {
    for (const h of HOLES) {
      expect(h.par, `hole ${h.number}`).toBeGreaterThanOrEqual(2);
      expect(h.par, `hole ${h.number}`).toBeLessThanOrEqual(5);
    }
  });

  it('gives every hole a non-empty name and concept', () => {
    for (const h of HOLES) {
      expect(h.name.trim().length, `hole ${h.number} name`).toBeGreaterThan(0);
      expect(h.concept.trim().length, `hole ${h.number} concept`).toBeGreaterThan(10);
    }
  });

  it('ends on The Gibson', () => {
    expect(HOLES.at(-1).name).toBe('The Gibson');
  });
});
