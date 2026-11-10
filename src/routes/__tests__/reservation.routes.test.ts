import request from "supertest";

import app from "../../app";
import { seedReservation, seedResource } from "../../test/setup";

const room = {
  id: "room-101",
  name: "Alpha Room",
  type: "ROOM" as const,
  location: "North Campus",
  isAvailable: true,
};

const reservationRequest = {
  resourceId: room.id,
  userId: "student-1",
  startTime: "2026-11-10T10:00:00.000Z",
  endTime: "2026-11-10T11:00:00.000Z",
};

describe("CampusHub reservation routes", () => {
  beforeEach(() => {
    seedResource(room);
    seedResource({
      id: "lab-closed",
      name: "Beta Lab",
      type: "LAB",
      location: "South Campus",
      isAvailable: false,
    });
  });

  it("returns 201 Created for a valid reservation", async () => {
    const response = await request(app)
      .post("/api/v1/reservations")
      .send(reservationRequest)
      .expect(201);

    expect(response.body).toMatchObject({
      ...reservationRequest,
      status: "PENDING",
    });
    expect(response.body.id).toEqual(expect.any(String));
  });

  it("returns 409 Conflict for an overlapping reservation", async () => {
    seedReservation({
      id: "existing",
      ...reservationRequest,
      status: "CONFIRMED",
    });

    const response = await request(app)
      .post("/api/v1/reservations")
      .send({ ...reservationRequest, userId: "student-2" })
      .expect(409);

    expect(response.body.code).toBe("DOUBLE_BOOKING");
  });

  it("returns filtered resources", async () => {
    const response = await request(app)
      .get("/api/v1/resources")
      .query({ type: "ROOM", isAvailable: true })
      .expect(200);

    expect(response.body).toEqual([room]);
  });

  it("returns all resources without filters", async () => {
    const response = await request(app).get("/api/v1/resources").expect(200);

    expect(response.body).toHaveLength(2);
  });

  it.each([
    [{}, "resourceId and userId"],
    [{ ...reservationRequest, startTime: "not-a-date" }, "valid ISO 8601"],
    [
      {
        ...reservationRequest,
        startTime: "2026-11-10T11:00:00.000Z",
        endTime: "2026-11-10T11:00:00.000Z",
      },
      "later than startTime",
    ],
  ])(
    "returns 400 for an invalid reservation payload",
    async (body, message) => {
      const response = await request(app)
        .post("/api/v1/reservations")
        .send(body)
        .expect(400);

      expect(response.body.message).toContain(message);
    },
  );

  it("returns 400 when the JSON body is not an object", async () => {
    const response = await request(app)
      .post("/api/v1/reservations")
      .send([reservationRequest])
      .expect(400);

    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("maps missing and unavailable resources to the correct errors", async () => {
    const missing = await request(app)
      .post("/api/v1/reservations")
      .send({ ...reservationRequest, resourceId: "missing" })
      .expect(404);
    const unavailable = await request(app)
      .post("/api/v1/reservations")
      .send({ ...reservationRequest, resourceId: "lab-closed" })
      .expect(409);

    expect(missing.body.code).toBe("RESOURCE_NOT_FOUND");
    expect(unavailable.body.code).toBe("RESOURCE_UNAVAILABLE");
  });

  it.each([
    ["?type=", "type must be a non-empty string"],
    ["?type=GYM", "type must be ROOM, EQUIPMENT, or LAB"],
    ["?type=ROOM&type=LAB", "type must be a non-empty string"],
    ["?isAvailable=yes", "isAvailable must be true or false"],
  ])("returns 400 for invalid resource filters", async (query, message) => {
    const response = await request(app)
      .get(`/api/v1/resources${query}`)
      .expect(400);

    expect(response.body.message).toBe(`${message}.`);
  });

  it("lists user reservations", async () => {
    seedReservation({
      id: "reservation-1",
      ...reservationRequest,
      status: "PENDING",
    });

    const response = await request(app)
      .get("/api/v1/reservations/user/student-1")
      .expect(200);

    expect(response.body).toHaveLength(1);
  });

  it("cancels an existing reservation and reports a missing one", async () => {
    seedReservation({
      id: "reservation-1",
      ...reservationRequest,
      status: "PENDING",
    });

    const cancelled = await request(app)
      .patch("/api/v1/reservations/reservation-1/cancel")
      .expect(200);
    const missing = await request(app)
      .patch("/api/v1/reservations/missing/cancel")
      .expect(404);

    expect(cancelled.body.status).toBe("CANCELLED");
    expect(missing.body.code).toBe("RESERVATION_NOT_FOUND");
  });

  it("confirms pending reservations and rejects cancelled ones", async () => {
    seedReservation({
      id: "pending",
      ...reservationRequest,
      status: "PENDING",
    });
    seedReservation({
      id: "cancelled",
      ...reservationRequest,
      status: "CANCELLED",
    });

    const confirmed = await request(app)
      .patch("/api/v1/reservations/pending/confirm")
      .expect(200);
    const invalid = await request(app)
      .patch("/api/v1/reservations/cancelled/confirm")
      .expect(409);
    const missing = await request(app)
      .patch("/api/v1/reservations/missing/confirm")
      .expect(404);

    expect(confirmed.body.status).toBe("CONFIRMED");
    expect(invalid.body.code).toBe("INVALID_STATUS_TRANSITION");
    expect(missing.body.code).toBe("RESERVATION_NOT_FOUND");
  });

  it("rejects whitespace-only path identifiers", async () => {
    await request(app).get("/api/v1/reservations/user/%20").expect(400);
    await request(app).patch("/api/v1/reservations/%20/cancel").expect(400);
    await request(app).patch("/api/v1/reservations/%20/confirm").expect(400);
  });

  it("serves the health endpoint", async () => {
    await request(app)
      .get("/api/v1/health")
      .expect(200, { status: "ok", service: "campushub-api" });
  });
});
