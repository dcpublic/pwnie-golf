import { Router } from 'express';
import { query } from '../db.js';
import { validateSignature } from '../validate.js';

export const guestbookRouter = Router();

guestbookRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, handle, message, created_at AS "createdAt"
       FROM guestbook ORDER BY created_at DESC LIMIT 50`
    );
    res.json({ signatures: rows });
  } catch (err) {
    next(err);
  }
});

guestbookRouter.post('/', async (req, res, next) => {
  const result = validateSignature(req.body);
  if (!result.ok) {
    return res.status(400).json({ error: 'Validation failed', details: result.errors });
  }
  const { handle, message } = result.value;
  try {
    const { rows } = await query(
      `INSERT INTO guestbook (handle, message)
       VALUES ($1, $2)
       RETURNING id, handle, message, created_at AS "createdAt"`,
      [handle, message]
    );
    res.status(201).json({ signature: rows[0] });
  } catch (err) {
    next(err);
  }
});
