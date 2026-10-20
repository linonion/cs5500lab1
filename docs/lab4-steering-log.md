# Lab 4 Agent Steering Log

### Incident 1: Missing Cancel Endpoint

- **Initial Agent Output:** The agent created the reservation endpoint, but it
  did not add the endpoint for cancelling a reservation.
- **Root Cause:** My first prompt focused mostly on creating reservations and
  checking time conflicts, so the cancellation requirement was missed.
- **Remediation Prompt:** "Please add `PATCH /api/v1/reservations/:id/cancel`.
  Put the database update in the service, handle the response in the controller,
  and add the route. A cancelled reservation should no longer block that time
  slot."
- **Resolution:** The agent added the cancel service, controller, and route. I
  created a reservation, cancelled it, and then booked the same time again. The
  cancellation returned 200 and the new reservation returned 201. I also ran
  `npm run typecheck` and `npm run build`, and both passed.
