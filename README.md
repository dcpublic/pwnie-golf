# ⛳ Pwnie Golf

> Mini-golf for the elite. Par is for normies.

A hacker-themed mini-golf SPA: 18 vulnerability-themed holes, tee-time
reservations, and a guestbook pre-signed by the greatest hackers in fiction.

## Stack

- **Backend** — Node 22 + Express (ESM), serving a REST API and the static SPA
- **Frontend** — zero-dependency vanilla JS SPA with hash routing, CRT terminal aesthetic
- **Database** — PostgreSQL 16 via `pg` (parameterized queries only)
- **Tests** — Vitest + Supertest (db mocked; no live Postgres needed)
- **Runtime** — Docker Compose (`web` + `db`), config via `.env` loaded with dotenv

## Quick start

```sh
cp .env.example .env   # fill in values (the committed defaults are local-test only)
docker compose up --build
# → http://localhost:3000
```

The Postgres container applies `db/init/*.sql` on first boot: schema plus canned
guestbook signatures from Zero Cool, Acid Burn, Elliot Alderson, Hackerman, and friends.

## Tests

```sh
npm install
npm test
```

Covers validation rules (email/date/party-size/slot whitelist), reservation
booking + double-booking conflicts (409), guestbook length limits, XSS-payload
handling, rate limiting, security headers, and the SPA fallback.

## API

| Method | Path                          | Purpose                                   |
| ------ | ----------------------------- | ----------------------------------------- |
| GET    | `/api/holes`                  | The 18 hole concepts                      |
| GET    | `/api/reservations?date=…`    | Booked/available slots (no guest PII)     |
| POST   | `/api/reservations`           | Book a tee time (one party per slot)      |
| GET    | `/api/guestbook`              | Latest 50 signatures                      |
| POST   | `/api/guestbook`              | Sign the guestbook                        |
| GET    | `/api/health`                 | `root@pwnie-golf:~# OK`                   |

## Security notes

- All SQL is parameterized (`$1, $2 …`) — hole 5 is the only injection on the premises.
- User content is rendered with `textContent`, never `innerHTML`.
- Secrets live in `.env` (gitignored); `.env.example` ships placeholders.
- Security headers + CSP, JSON body limit, per-IP rate limiting on writes.
