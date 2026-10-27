# CampusHub

CampusHub is a TypeScript, Express, and PostgreSQL API for listing campus
resources and managing reservations. The React and TypeScript client lives in
`client/`.

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

## Frontend setup

The frontend requires Node.js 20 or newer. With the API running on port
3000, start the Vite client in a second terminal:

```sh
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. During development, Vite proxies `/api/v1`
requests to the backend. To use a different API origin, create an ignored
`client/.env.local` file with `VITE_API_BASE_URL` set to the complete API base
URL, such as `http://localhost:3000/api/v1`.

## Verification

```sh
npm run typecheck
npm run build
npm run verify:lab4
cd client && npm run typecheck && npm run build
```

`verify:lab4` starts the app on an ephemeral port, verifies the Lab 4 resource
and reservation flows against PostgreSQL, and removes its isolated test data.

Useful endpoint checks:

```sh
curl http://localhost:3000/api/v1/health
curl http://localhost:3000/api/v1/resources
curl 'http://localhost:3000/api/v1/resources?type=ROOM'
curl 'http://localhost:3000/api/v1/resources?type=ROOM&isAvailable=true'
curl -X POST http://localhost:3000/api/v1/reservations \
  -H 'Content-Type: application/json' \
  -d '{"resourceId":"res-room-302","userId":"student-1","startTime":"2026-10-06T17:00:00Z","endTime":"2026-10-06T18:00:00Z"}'
curl http://localhost:3000/api/v1/reservations/user/student-1
curl -X PATCH http://localhost:3000/api/v1/reservations/RESERVATION_ID/confirm
curl -X PATCH http://localhost:3000/api/v1/reservations/RESERVATION_ID/cancel
```
