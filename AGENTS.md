# Pwnie Golf

Hacker-themed mini-golf SPA. Node 22 + Express (ESM) backend serving a REST API
and a zero-dependency vanilla-JS SPA, backed by PostgreSQL 16. See `README.md`
for the product/API overview.

## Cursor Cloud specific instructions

### Services

Single service: the Express server (`server/index.js`) serves both the REST API
and the static SPA from `public/`, on port 3000. It talks to a local PostgreSQL
16 instance via `pg`.

### Standard commands (see `package.json`)

- Tests: `npm test` (Vitest + Supertest). The DB is mocked in tests, so Postgres
  is NOT required to run the suite. One test intentionally exercises the DB error
  path and logs `Error: connection reset by peer` to stderr — that is expected,
  not a failure.
- Dev server (hot reload): `npm run dev` (`node --watch`). Requires Postgres +
  `.env` (see below). Prod-style start is `npm start`.
- There is no lint script.

### Non-obvious setup/run caveats

- Postgres is installed in the VM but the cluster is NOT auto-started. Start it
  each session with: `sudo pg_ctlcluster 16 main start`.
- The app reads DB config from `.env` (gitignored). Copy `.env.example` to `.env`.
  The local dev database uses role `pwnie` / password `pwnie` / database
  `pwniegolf` with `DB_HOST=localhost`. If those don't exist yet, recreate them:
  `sudo -u postgres psql -c "CREATE ROLE pwnie LOGIN PASSWORD 'pwnie';"`,
  `sudo -u postgres createdb -O pwnie pwniegolf`, then apply
  `db/init/01-schema.sql` and `db/init/02-seed.sql` with
  `sudo -u postgres psql -d pwniegolf -f <file>` and grant privileges on the
  public schema to `pwnie`. The `db/init/*.sql` scripts are what docker-compose
  auto-applies on first boot; run them manually when not using Docker.
- Reservation time slots start at `10:00` (see `server/validate.js` `TIME_SLOTS`);
  earlier times fail validation with "timeSlot is not an available slot".
- Docker is NOT installed. `docker compose up` (the README quick-start) does not
  work here; run the server directly with `npm run dev` against local Postgres.
