CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  email VARCHAR(120) NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size BETWEEN 1 AND 6),
  date DATE NOT NULL,
  time_slot VARCHAR(5) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_tee_time UNIQUE (date, time_slot)
);

CREATE TABLE IF NOT EXISTS guestbook (
  id SERIAL PRIMARY KEY,
  handle VARCHAR(40) NOT NULL,
  message VARCHAR(280) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
