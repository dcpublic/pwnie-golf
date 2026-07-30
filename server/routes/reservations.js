import { Router } from 'express';
import { query } from '../db.js';
import { validateReservation, isValidDateString, TIME_SLOTS } from '../validate.js';

export const reservationsRouter = Router();

// Availability for a date. Returns slot times only — never other guests' details.
reservationsRouter.get('/', async (req, res, next) => {
  const date = req.query.date;
  if (!isValidDateString(date)) {
    return res.status(400).json({ error: 'date query param must be YYYY-MM-DD' });
  }
  try {
    const { rows } = await query(
      'SELECT time_slot FROM reservations WHERE date = $1 ORDER BY time_slot',
      [date]
    );
    const booked = rows.map((r) => r.time_slot);
    res.json({
      date,
      bookedSlots: booked,
      availableSlots: TIME_SLOTS.filter((s) => !booked.includes(s)),
    });
  } catch (err) {
    next(err);
  }
});

reservationsRouter.post('/', async (req, res, next) => {
  const result = validateReservation(req.body);
  if (!result.ok) {
    return res.status(400).json({ error: 'Validation failed', details: result.errors });
  }
  const { name, email, partySize, date, timeSlot } = result.value;
  try {
    const { rows } = await query(
      `INSERT INTO reservations (name, email, party_size, date, time_slot)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, party_size AS "partySize", date, time_slot AS "timeSlot"`,
      [name, email, partySize, date, timeSlot]
    );
    res.status(201).json({ reservation: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That tee time is already pwned. Pick another slot.' });
    }
    next(err);
  }
});

reservationsRouter.delete('/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM reservations WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
