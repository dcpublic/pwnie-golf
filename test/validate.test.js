import { describe, it, expect } from 'vitest';
import {
  TIME_SLOTS,
  isValidDateString,
  isPastDate,
  validateReservation,
  validateSignature,
} from '../server/validate.js';

const FUTURE = '2099-01-01';

describe('TIME_SLOTS', () => {
  it('runs every 30 minutes from 10:00 through 21:30', () => {
    expect(TIME_SLOTS[0]).toBe('10:00');
    expect(TIME_SLOTS.at(-1)).toBe('21:30');
    expect(TIME_SLOTS).toHaveLength(24);
  });
});

describe('isValidDateString', () => {
  it('accepts real YYYY-MM-DD dates', () => {
    expect(isValidDateString('2099-02-28')).toBe(true);
  });
  it.each(['2099-02-30', '2099-13-01', 'not-a-date', '2099/01/01', 20990101, null])(
    'rejects %s',
    (bad) => expect(isValidDateString(bad)).toBe(false)
  );
});

describe('isPastDate', () => {
  const today = new Date('2026-07-27T12:00:00Z');
  it('flags yesterday as past', () => expect(isPastDate('2026-07-26', today)).toBe(true));
  it('allows today', () => expect(isPastDate('2026-07-27', today)).toBe(false));
  it('allows tomorrow', () => expect(isPastDate('2026-07-28', today)).toBe(false));
});

describe('validateReservation', () => {
  const good = { name: 'Zero Cool', email: 'zc@gibson.example', partySize: 4, date: FUTURE, timeSlot: '10:00' };

  it('accepts a valid reservation and trims strings', () => {
    const r = validateReservation({ ...good, name: '  Zero Cool  ' });
    expect(r.ok).toBe(true);
    expect(r.value.name).toBe('Zero Cool');
  });

  it.each([
    ['short name', { name: 'Z' }],
    ['long name', { name: 'x'.repeat(61) }],
    ['bad email', { email: 'not-an-email' }],
    ['party too small', { partySize: 0 }],
    ['party too big', { partySize: 7 }],
    ['fractional party', { partySize: 2.5 }],
    ['bad date', { date: '13/01/2099' }],
    ['past date', { date: '1998-01-01' }],
    ['unknown slot', { timeSlot: '03:33' }],
    ['slot injection', { timeSlot: "10:00'; DROP TABLE reservations;--" }],
  ])('rejects %s', (_label, patch) => {
    const r = validateReservation({ ...good, ...patch });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('collects multiple errors at once', () => {
    const r = validateReservation({});
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe('validateSignature', () => {
  it('accepts a valid signature', () => {
    const r = validateSignature({ handle: 'acidburn', message: 'mess with the best' });
    expect(r.ok).toBe(true);
  });
  it.each([
    ['short handle', { handle: 'a', message: 'hello there' }],
    ['long handle', { handle: 'h'.repeat(41), message: 'hello there' }],
    ['short message', { handle: 'acidburn', message: 'x' }],
    ['long message', { handle: 'acidburn', message: 'x'.repeat(281) }],
    ['missing fields', {}],
    ['non-string fields', { handle: 42, message: ['die'] }],
  ])('rejects %s', (_label, body) => {
    expect(validateSignature(body).ok).toBe(false);
  });
});
