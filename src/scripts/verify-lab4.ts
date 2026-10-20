import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import app from "../app";
import { appConfig } from "../config/app.config";
import {
  closeDatabase,
  connectToDatabase,
  getDatabasePool,
} from "../config/database";

interface ApiResponse {
  status: number;
  body: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

async function requestJson(
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<ApiResponse> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const responseText = await response.text();
  const body: unknown = responseText ? JSON.parse(responseText) : undefined;
  return { status: response.status, body };
}

function jsonRequest(method: "POST" | "PATCH", body?: unknown): RequestInit {
  return {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

function getReservationId(response: ApiResponse): string {
  assert.ok(isRecord(response.body));
  const id = response.body.id;
  if (typeof id !== "string") {
    throw new Error("Expected the reservation response to contain an id.");
  }
  return id;
}

function assertErrorCode(response: ApiResponse, expectedCode: string): void {
  assert.ok(isRecord(response.body));
  assert.equal(response.body.code, expectedCode);
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function verifyLab4(): Promise<void> {
  const runId = randomUUID();
  const resourceId = `lab4-resource-${runId}`;
  const userId = `lab4-user-${runId}`;
  let server: Server | undefined;

  try {
    await connectToDatabase();
    await getDatabasePool().query(
      `INSERT INTO resources (id, name, type, location, is_available)
       VALUES ($1, $2, 'ROOM', 'Lab 4 Test Location', FALSE)`,
      [resourceId, `Lab 4 Verification ${runId}`],
    );

    server = await new Promise<Server>((resolve, reject) => {
      const candidate = app.listen(0, () => resolve(candidate));
      candidate.once("error", reject);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}/api/v1`;

    const unavailableResources = await requestJson(
      baseUrl,
      "/resources?type=ROOM&isAvailable=false",
    );
    assert.equal(unavailableResources.status, 200);
    assert.ok(Array.isArray(unavailableResources.body));
    assert.ok(
      unavailableResources.body.some(
        (resource: unknown) =>
          isRecord(resource) &&
          resource.id === resourceId &&
          resource.type === "ROOM" &&
          resource.isAvailable === false,
      ),
    );

    const invalidAvailability = await requestJson(
      baseUrl,
      "/resources?isAvailable=yes",
    );
    assert.equal(invalidAvailability.status, 400);
    assertErrorCode(invalidAvailability, "VALIDATION_ERROR");

    const invalidType = await requestJson(baseUrl, "/resources?type=OFFICE");
    assert.equal(invalidType.status, 400);
    assertErrorCode(invalidType, "VALIDATION_ERROR");

    const unavailableReservation = await requestJson(
      baseUrl,
      "/reservations",
      jsonRequest("POST", {
        resourceId,
        userId,
        startTime: "2035-10-19T17:00:00Z",
        endTime: "2035-10-19T18:00:00Z",
      }),
    );
    assert.equal(unavailableReservation.status, 409);
    assertErrorCode(unavailableReservation, "RESOURCE_UNAVAILABLE");

    await getDatabasePool().query(
      "UPDATE resources SET is_available = TRUE WHERE id = $1",
      [resourceId],
    );

    const baseline = await requestJson(
      baseUrl,
      "/reservations",
      jsonRequest("POST", {
        resourceId,
        userId,
        startTime: "2035-10-19T17:00:00Z",
        endTime: "2035-10-19T18:00:00Z",
      }),
    );
    assert.equal(baseline.status, 201);
    assert.ok(isRecord(baseline.body));
    assert.equal(baseline.body.status, "PENDING");
    const baselineId = getReservationId(baseline);

    const overlappingWindows = [
      ["2035-10-19T16:30:00Z", "2035-10-19T17:30:00Z"],
      ["2035-10-19T17:30:00Z", "2035-10-19T18:30:00Z"],
      ["2035-10-19T17:15:00Z", "2035-10-19T17:45:00Z"],
      ["2035-10-19T16:30:00Z", "2035-10-19T18:30:00Z"],
      ["2035-10-19T17:00:00Z", "2035-10-19T18:00:00Z"],
    ] as const;

    for (const [startTime, endTime] of overlappingWindows) {
      const overlap = await requestJson(
        baseUrl,
        "/reservations",
        jsonRequest("POST", { resourceId, userId, startTime, endTime }),
      );
      assert.equal(overlap.status, 409);
      assertErrorCode(overlap, "DOUBLE_BOOKING");
    }

    for (const [startTime, endTime] of [
      ["2035-10-19T16:00:00Z", "2035-10-19T17:00:00Z"],
      ["2035-10-19T18:00:00Z", "2035-10-19T19:00:00Z"],
    ] as const) {
      const adjacent = await requestJson(
        baseUrl,
        "/reservations",
        jsonRequest("POST", { resourceId, userId, startTime, endTime }),
      );
      assert.equal(adjacent.status, 201);
    }

    const confirmed = await requestJson(
      baseUrl,
      `/reservations/${baselineId}/confirm`,
      jsonRequest("PATCH"),
    );
    assert.equal(confirmed.status, 200);
    assert.ok(isRecord(confirmed.body));
    assert.equal(confirmed.body.status, "CONFIRMED");

    const cancelled = await requestJson(
      baseUrl,
      `/reservations/${baselineId}/cancel`,
      jsonRequest("PATCH"),
    );
    assert.equal(cancelled.status, 200);
    assert.ok(isRecord(cancelled.body));
    assert.equal(cancelled.body.status, "CANCELLED");

    const repeatedCancellation = await requestJson(
      baseUrl,
      `/reservations/${baselineId}/cancel`,
      jsonRequest("PATCH"),
    );
    assert.equal(repeatedCancellation.status, 200);

    const cancelledConfirmation = await requestJson(
      baseUrl,
      `/reservations/${baselineId}/confirm`,
      jsonRequest("PATCH"),
    );
    assert.equal(cancelledConfirmation.status, 409);
    assertErrorCode(cancelledConfirmation, "INVALID_STATUS_TRANSITION");

    const rebooked = await requestJson(
      baseUrl,
      "/reservations",
      jsonRequest("POST", {
        resourceId,
        userId,
        startTime: "2035-10-19T17:00:00Z",
        endTime: "2035-10-19T18:00:00Z",
      }),
    );
    assert.equal(rebooked.status, 201);

    const history = await requestJson(baseUrl, `/reservations/user/${userId}`);
    assert.equal(history.status, 200);
    assert.ok(Array.isArray(history.body));
    assert.equal(history.body.length, 4);
    assert.ok(
      history.body.some(
        (reservation: unknown) =>
          isRecord(reservation) &&
          reservation.id === baselineId &&
          reservation.status === "CANCELLED",
      ),
    );

    const invalidWindow = await requestJson(
      baseUrl,
      "/reservations",
      jsonRequest("POST", {
        resourceId,
        userId,
        startTime: "2035-10-19T18:00:00Z",
        endTime: "2035-10-19T17:00:00Z",
      }),
    );
    assert.equal(invalidWindow.status, 400);
    assertErrorCode(invalidWindow, "VALIDATION_ERROR");

    const missingResource = await requestJson(
      baseUrl,
      "/reservations",
      jsonRequest("POST", {
        resourceId: `missing-${runId}`,
        userId,
        startTime: "2035-10-20T17:00:00Z",
        endTime: "2035-10-20T18:00:00Z",
      }),
    );
    assert.equal(missingResource.status, 404);
    assertErrorCode(missingResource, "RESOURCE_NOT_FOUND");

    const missingCancellation = await requestJson(
      baseUrl,
      `/reservations/missing-${runId}/cancel`,
      jsonRequest("PATCH"),
    );
    assert.equal(missingCancellation.status, 404);
    assertErrorCode(missingCancellation, "RESERVATION_NOT_FOUND");

    const originalDatabaseUrl = appConfig.databaseUrl;
    await closeDatabase();
    appConfig.databaseUrl =
      "postgresql://127.0.0.1:1/campushub?connect_timeout=1";
    try {
      const databaseFailure = await requestJson(baseUrl, "/resources");
      assert.equal(databaseFailure.status, 500);
      assertErrorCode(databaseFailure, "INTERNAL_SERVER_ERROR");
    } finally {
      await closeDatabase();
      appConfig.databaseUrl = originalDatabaseUrl;
    }

    console.log(
      "Lab 4 verification passed: filters, validation, conflicts, boundaries, status transitions, history, cancellation rebooking, and server errors.",
    );
  } finally {
    if (server) {
      await closeServer(server);
    }
    if (process.env.DATABASE_URL) {
      await getDatabasePool().query(
        "DELETE FROM reservations WHERE user_id = $1",
        [userId],
      );
      await getDatabasePool().query("DELETE FROM resources WHERE id = $1", [
        resourceId,
      ]);
    }
    await closeDatabase();
  }
}

verifyLab4().catch((error: unknown) => {
  console.error("Lab 4 verification failed.", error);
  process.exitCode = 1;
});
