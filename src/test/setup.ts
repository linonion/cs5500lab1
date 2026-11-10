import type { QueryResult, QueryResultRow } from "pg";

import type { ReservationRecord } from "../models/Reservation.model";
import type { ResourceRecord } from "../models/Resource.model";
import type { Reservation, Resource } from "../types/reservation";

type QueryValues = readonly unknown[];

function result<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return {
    command: "",
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

class InMemoryPostgres {
  private resources: ResourceRecord[] = [];
  private reservations: ReservationRecord[] = [];
  private transactionTail: Promise<void> = Promise.resolve();

  reset(): void {
    this.resources = [];
    this.reservations = [];
    this.transactionTail = Promise.resolve();
  }

  seedResource(resource: Resource): void {
    this.resources.push({ ...resource });
  }

  seedReservation(reservation: Reservation): void {
    this.reservations.push({
      ...reservation,
      startTime: new Date(reservation.startTime),
      endTime: new Date(reservation.endTime),
    });
  }

  snapshotReservations(): Reservation[] {
    return this.reservations.map((reservation) => ({
      ...reservation,
      startTime: reservation.startTime.toISOString(),
      endTime: reservation.endTime.toISOString(),
    }));
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: QueryValues = [],
  ): Promise<QueryResult<T>> {
    const normalized = normalizeSql(sql);

    if (normalized === "select 1") {
      return result([
        { "?column?": 1 },
      ] as QueryResultRow[]) as unknown as QueryResult<T>;
    }

    if (normalized.includes("from resources where id = $1 for update")) {
      const resource = this.resources.find(({ id }) => id === values[0]);
      const rows = resource ? [{ isAvailable: resource.isAvailable }] : [];
      return result(rows) as unknown as QueryResult<T>;
    }

    if (
      normalized.startsWith("select id from reservations") &&
      normalized.includes("start_time < $3")
    ) {
      const [resourceId, requestedStart, requestedEnd] = values;
      const conflict = this.reservations.find(
        (reservation) =>
          reservation.resourceId === resourceId &&
          (reservation.status === "PENDING" ||
            reservation.status === "CONFIRMED") &&
          reservation.startTime < (requestedEnd as Date) &&
          reservation.endTime > (requestedStart as Date),
      );
      return result(
        conflict ? [{ id: conflict.id }] : [],
      ) as unknown as QueryResult<T>;
    }

    if (normalized.startsWith("insert into reservations")) {
      const [id, resourceId, userId, startTime, endTime] = values;
      if (!(startTime instanceof Date) || !(endTime instanceof Date)) {
        throw new Error("Reservation dates must be Date instances.");
      }
      if (endTime <= startTime) {
        throw new Error("new row violates reservation time range constraint");
      }
      const reservation: ReservationRecord = {
        id: String(id),
        resourceId: String(resourceId),
        userId: String(userId),
        startTime,
        endTime,
        status: "PENDING",
      };
      this.reservations.push(reservation);
      return result([reservation]) as unknown as QueryResult<T>;
    }

    if (
      normalized.startsWith("select id, resource_id") &&
      normalized.includes("where user_id = $1")
    ) {
      const rows = this.reservations
        .filter(({ userId }) => userId === values[0])
        .sort(
          (left, right) => left.startTime.getTime() - right.startTime.getTime(),
        );
      return result(rows) as unknown as QueryResult<T>;
    }

    if (
      normalized.startsWith("update reservations") &&
      normalized.includes("set status = 'cancelled'")
    ) {
      const reservation = this.reservations.find(({ id }) => id === values[0]);
      if (reservation) {
        reservation.status = "CANCELLED";
      }
      return result(
        reservation ? [reservation] : [],
      ) as unknown as QueryResult<T>;
    }

    if (
      normalized.startsWith("update reservations") &&
      normalized.includes("set status = 'confirmed'")
    ) {
      const reservation = this.reservations.find(
        ({ id, status }) =>
          id === values[0] && (status === "PENDING" || status === "CONFIRMED"),
      );
      if (reservation) {
        reservation.status = "CONFIRMED";
      }
      return result(
        reservation ? [reservation] : [],
      ) as unknown as QueryResult<T>;
    }

    if (normalized === "select status from reservations where id = $1") {
      const reservation = this.reservations.find(({ id }) => id === values[0]);
      return result(
        reservation ? [{ status: reservation.status }] : [],
      ) as unknown as QueryResult<T>;
    }

    if (
      normalized.startsWith("select id, name, type, location") &&
      normalized.includes("from resources")
    ) {
      let rows = [...this.resources];
      let valueIndex = 0;
      if (normalized.includes("type = $")) {
        rows = rows.filter(({ type }) => type === values[valueIndex]);
        valueIndex += 1;
      }
      if (normalized.includes("is_available = $")) {
        rows = rows.filter(
          ({ isAvailable }) => isAvailable === values[valueIndex],
        );
      }
      rows.sort((left, right) => left.name.localeCompare(right.name));
      return result(rows) as unknown as QueryResult<T>;
    }

    throw new Error(`Unsupported test query: ${normalizeSql(sql)}`);
  }

  async connect(): Promise<{
    query: <T extends QueryResultRow = QueryResultRow>(
      sql: string,
      values?: QueryValues,
    ) => Promise<QueryResult<T>>;
    release: () => void;
  }> {
    let releaseTransaction: (() => void) | undefined;

    return {
      query: async <T extends QueryResultRow = QueryResultRow>(
        sql: string,
        values: QueryValues = [],
      ): Promise<QueryResult<T>> => {
        const normalized = normalizeSql(sql);
        if (normalized === "begin") {
          const previousTransaction = this.transactionTail;
          this.transactionTail = new Promise<void>((resolve) => {
            releaseTransaction = resolve;
          });
          await previousTransaction;
          return result([]) as unknown as QueryResult<T>;
        }
        if (normalized === "commit" || normalized === "rollback") {
          releaseTransaction?.();
          releaseTransaction = undefined;
          return result([]) as unknown as QueryResult<T>;
        }
        return this.query<T>(sql, values);
      },
      release: (): void => {
        releaseTransaction?.();
        releaseTransaction = undefined;
      },
    };
  }
}

const mockDatabase = new InMemoryPostgres();

jest.mock("../config/database", () => ({
  getDatabasePool: (): InMemoryPostgres => mockDatabase,
}));

beforeEach(() => {
  mockDatabase.reset();
});

export const seedResource = (resource: Resource): void => {
  mockDatabase.seedResource(resource);
};

export const seedReservation = (reservation: Reservation): void => {
  mockDatabase.seedReservation(reservation);
};

export const getReservations = (): Reservation[] =>
  mockDatabase.snapshotReservations();
