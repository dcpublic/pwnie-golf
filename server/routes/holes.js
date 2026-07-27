import { Router } from 'express';
import { HOLES } from '../data/holes.js';

export const holesRouter = Router();

holesRouter.get('/', (req, res) => {
  res.json({ holes: HOLES });
});
