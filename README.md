# CampusHub

CampusHub is a TypeScript, Express, and PostgreSQL API for listing campus
resources and managing reservations.

## Local setup

1. Install and start PostgreSQL 17:

   ```sh
   brew install postgresql@17
   brew services start postgresql@17
   ```

2. Create the local role and database:

   ```sh
   /opt/homebrew/opt/postgresql@17/bin/createuser --createdb campushub
   /opt/homebrew/opt/postgresql@17/bin/createdb --owner=campushub campushub
   ```

3. Create a local `.env` file based on `.env-example`. For a default Homebrew
   installation using local socket authentication, this connection string is
   sufficient:

   ```dotenv
   PORT=3000
   DATABASE_URL=postgresql://campushub@localhost:5432/campushub
   ```

4. Install dependencies, create the tables, and seed the sample resources:

   ```sh
   npm install
   npm run seed
   ```

5. Start the API:

   ```sh
   npm run dev
   ```

The API is available at `http://localhost:3000/api/v1`. The application creates
its tables and indexes at startup. The OpenAPI contract is in
[`docs/openapi.yaml`](docs/openapi.yaml).

## Verification

```sh
npm run typecheck
npm run build
```

Useful endpoint checks:

```sh
curl http://localhost:3000/api/v1/health
curl http://localhost:3000/api/v1/resources
curl 'http://localhost:3000/api/v1/resources?type=ROOM'
curl -X POST http://localhost:3000/api/v1/reservations \
  -H 'Content-Type: application/json' \
  -d '{"resourceId":"res-room-302","userId":"student-1","startTime":"2026-10-06T17:00:00Z","endTime":"2026-10-06T18:00:00Z"}'
curl http://localhost:3000/api/v1/reservations/user/student-1
```
