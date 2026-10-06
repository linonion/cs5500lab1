import { randomUUID } from "node:crypto";

import { getDatabasePool } from "../config/database";
import type { ReservationRecord } from "../models/Reservation.model";
import type {
  CreateReservationRequest,
  Reservation,
} from "../types/reservation";

export type CreateReservationResult =
  | { kind: "created"; reservation: Reservation }
  | { kind: "resource-not-found" }
  | { kind: "resource-unavailable" }
  | { kind: "conflict" };

function toReservationResponse(record: ReservationRecord): Reservation {
  return {
    id: record.id,
    resourceId: record.resourceId,
    userId: record.userId,
    startTime: record.startTime.toISOString(),
    endTime: record.endTime.toISOString(),
    status: record.status,
  };
}

export async function createReservation(
  input: CreateReservationRequest,
): Promise<CreateReservationResult> {
  const database = getDatabasePool();
  const client = await database.connect();
  let transactionStarted = false;
  const requestedStart = new Date(input.startTime);
  const requestedEnd = new Date(input.endTime);

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const resourceResult = await client.query<{ isAvailable: boolean }>(
      `SELECT is_available AS "isAvailable"
       FROM resources WHERE id = $1 FOR UPDATE`,
      [input.resourceId],
    );
    const resource = resourceResult.rows[0];

    if (!resource) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return { kind: "resource-not-found" };
    }
    if (!resource.isAvailable) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return { kind: "resource-unavailable" };
    }

    const conflictResult = await client.query<{ id: string }>(
      `SELECT id FROM reservations
       WHERE resource_id = $1
         AND status <> 'CANCELLED'
         AND start_time < $3
         AND end_time > $2
       LIMIT 1`,
      [input.resourceId, requestedStart, requestedEnd],
    );

    if (conflictResult.rowCount) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return { kind: "conflict" };
    }

    const insertResult = await client.query<ReservationRecord>(
      `INSERT INTO reservations
         (id, resource_id, user_id, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')
       RETURNING id, resource_id AS "resourceId", user_id AS "userId",
                 start_time AS "startTime", end_time AS "endTime", status`,
      [
        randomUUID(),
        input.resourceId,
        input.userId,
        requestedStart,
        requestedEnd,
      ],
    );

    await client.query("COMMIT");
    transactionStarted = false;
    return {
      kind: "created",
      reservation: toReservationResponse(insertResult.rows[0]),
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function listActiveReservationsForUser(
  userId: string,
): Promise<Reservation[]> {
  const { rows } = await getDatabasePool().query<ReservationRecord>(
    `SELECT id, resource_id AS "resourceId", user_id AS "userId",
            start_time AS "startTime", end_time AS "endTime", status
     FROM reservations
     WHERE user_id = $1 AND status <> 'CANCELLED'
     ORDER BY start_time`,
    [userId],
  );

  return rows.map(toReservationResponse);
}
