// Pure validation helpers — no I/O, fully unit-testable.

export const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 10; h <= 21; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
})();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function isPastDate(s, today = new Date()) {
  const todayStr = today.toISOString().slice(0, 10);
  return s < todayStr;
}

export function validateReservation(body, today = new Date()) {
  const errors = [];
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const partySize = Number(body?.partySize);
  const date = typeof body?.date === 'string' ? body.date.trim() : '';
  const timeSlot = typeof body?.timeSlot === 'string' ? body.timeSlot.trim() : '';

  if (name.length < 2 || name.length > 60) errors.push('name must be 2-60 characters');
  if (!EMAIL_RE.test(email) || email.length > 120) errors.push('email is invalid');
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 6) {
    errors.push('partySize must be an integer between 1 and 6');
  }
  if (!isValidDateString(date)) errors.push('date must be a valid YYYY-MM-DD string');
  else if (isPastDate(date, today)) errors.push('date must be today or in the future');
  if (!TIME_SLOTS.includes(timeSlot)) errors.push('timeSlot is not an available slot');

  return errors.length
    ? { ok: false, errors }
    : { ok: true, value: { name, email, partySize, date, timeSlot } };
}

export function validateSignature(body) {
  const errors = [];
  const handle = typeof body?.handle === 'string' ? body.handle.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (handle.length < 2 || handle.length > 40) errors.push('handle must be 2-40 characters');
  if (message.length < 2 || message.length > 280) errors.push('message must be 2-280 characters');

  return errors.length ? { ok: false, errors } : { ok: true, value: { handle, message } };
}
