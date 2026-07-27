import dotenv from 'dotenv';
import { createApp } from './app.js';

dotenv.config();

const port = Number(process.env.PORT || 3000);
createApp().listen(port, () => {
  console.log(`[pwnie-golf] listening on :${port} — hack the planet, sink the putt.`);
});
