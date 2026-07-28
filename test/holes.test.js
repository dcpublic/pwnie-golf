import { describe, it, expect } from 'vitest';
import { HOLES } from '../server/data/holes.js';

describe('course data integrity', () => {
  it('has exactly 18 holes', () => {
    expect(HOLES).toHaveLength(18);
  });

  it('numbers the holes 1..18 with no gaps or dupes', () => {
    const numbers = HOLES.map((hole) => hole.number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 18 }, (_, index) => index + 1));
  });

  it('gives every hole a sane par (2..5)', () => {
    for (const hole of HOLES) {
      expect(hole.par, `hole ${hole.number}`).toBeGreaterThanOrEqual(2);
      expect(hole.par, `hole ${hole.number}`).toBeLessThanOrEqual(5);
    }
  });

  it('gives every hole a non-empty name and concept', () => {
    for (const hole of HOLES) {
      expect(hole.name.trim().length, `hole ${hole.number} name`).toBeGreaterThan(0);
      expect(hole.concept.trim().length, `hole ${hole.number} concept`).toBeGreaterThan(10);
    }
  });

  it('ends on The Gibson', () => {
    expect(HOLES.at(-1).name).toBe('The Gibson');
  });
});
