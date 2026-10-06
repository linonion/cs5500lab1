import type { QueryResultRow } from "pg";

import { RESERVATION_STATUSES } from "../types/reservation";
import type { ReservationStatus } from "../types/reservation";

export interface ReservationRecord extends QueryResultRow {
  id: string;
  resourceId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
}

export const CREATE_RESERVATION_TABLE = `
  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL REFERENCES resources (id) ON DELETE RESTRICT,
    user_id TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING'
      CHECK (status IN (${RESERVATION_STATUSES.map((status) => `'${status}'`).join(", ")})),
    CHECK (end_time > start_time)
  )
`;

export const CREATE_RESERVATION_RESOURCE_INDEX = `
  CREATE INDEX IF NOT EXISTS reservations_resource_time_idx
  ON reservations (resource_id, start_time, end_time)
`;

export const CREATE_RESERVATION_USER_INDEX = `
  CREATE INDEX IF NOT EXISTS reservations_user_status_idx
  ON reservations (user_id, status)
`;
