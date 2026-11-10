# CS 5500 Lab 7 Testing Report

## Test architecture

CampusHub remains a PostgreSQL application. The lab's MongoDB Memory Server is
an example rather than a required database, so `src/test/setup.ts` supplies an
in-memory implementation of the PostgreSQL query contract used by the services.
It resets before every test, models reservation transactions, and serializes
concurrent booking attempts without connecting to a developer database.

Supertest exercises the real Express routes, controllers, validation, error
handler, and services. The only replaced boundary is the PostgreSQL pool.

## Adversarial scenarios

- Exact-boundary double bookings
- Overlap by one millisecond
- Adjacent, non-overlapping reservations
- End time equal to or earlier than start time
- Invalid and missing request fields
- Invalid ISO date-time strings
- Missing and unavailable resources
- Two concurrent attempts for the same resource and time
- Cancellation and confirmation of missing reservations
- Confirmation after cancellation
- Invalid resource filter values and shapes

## Verification result

Run on November 9, 2026:

| Metric     | Coverage |
| ---------- | -------: |
| Statements |     100% |
| Branches   |   98.64% |
| Functions  |     100% |
| Lines      |     100% |

Both suites passed with 30 tests total. Reproduce the checks with:

```sh
npm run typecheck
npm run build
npm test
npm run test:coverage
```

The generated detailed report is written to the ignored `coverage/` directory.
