import {
  cancelReservation,
  confirmReservation,
  createReservation,
  listReservationsForUser,
} from "../reservation.service";
import {
  getReservations,
  seedReservation,
  seedResource,
} from "../../test/setup";

const availableRoom = {
  id: "room-101",
  name: "Room 101",
  type: "ROOM" as const,
  location: "North Campus",
  isAvailable: true,
};

const validRequest = {
  resourceId: availableRoom.id,
  userId: "student-1",
  startTime: "2026-11-10T10:00:00.000Z",
  endTime: "2026-11-10T11:00:00.000Z",
};

describe("reservation service", () => {
  beforeEach(() => {
    seedResource(availableRoom);
  });

  it("creates a pending reservation for an available resource", async () => {
    const result = await createReservation(validRequest);

    expect(result).toMatchObject({
      kind: "created",
      reservation: { ...validRequest, status: "PENDING" },
    });
    expect(getReservations()).toHaveLength(1);
  });

  it("cancels an existing reservation", async () => {
    seedReservation({
      id: "reservation-1",
      ...validRequest,
      status: "CONFIRMED",
    });

    await expect(cancelReservation("reservation-1")).resolves.toMatchObject({
      kind: "cancelled",
      reservation: { id: "reservation-1", status: "CANCELLED" },
    });
  });

  it("rejects a double booking with the exact same boundaries", async () => {
    seedReservation({ id: "existing", ...validRequest, status: "PENDING" });

    await expect(createReservation(validRequest)).resolves.toEqual({
      kind: "conflict",
    });
  });

  it("rejects an overlap of only one millisecond", async () => {
    seedReservation({ id: "existing", ...validRequest, status: "CONFIRMED" });

    await expect(
      createReservation({
        ...validRequest,
        userId: "student-2",
        startTime: "2026-11-10T10:59:59.999Z",
        endTime: "2026-11-10T12:00:00.000Z",
      }),
    ).resolves.toEqual({ kind: "conflict" });
  });

  it("allows an adjacent reservation whose start equals the prior end", async () => {
    seedReservation({ id: "existing", ...validRequest, status: "CONFIRMED" });

    await expect(
      createReservation({
        ...validRequest,
        startTime: validRequest.endTime,
        endTime: "2026-11-10T12:00:00.000Z",
      }),
    ).resolves.toMatchObject({ kind: "created" });
  });

  it("rejects an end time before the start time at the database boundary", async () => {
    await expect(
      createReservation({
        ...validRequest,
        startTime: "2026-11-10T12:00:00.000Z",
        endTime: "2026-11-10T11:00:00.000Z",
      }),
    ).rejects.toThrow("time range constraint");
    expect(getReservations()).toHaveLength(0);
  });

  it("reports a missing resource", async () => {
    await expect(
      createReservation({ ...validRequest, resourceId: "missing" }),
    ).resolves.toEqual({ kind: "resource-not-found" });
  });

  it("reports an unavailable resource", async () => {
    seedResource({ ...availableRoom, id: "room-closed", isAvailable: false });

    await expect(
      createReservation({ ...validRequest, resourceId: "room-closed" }),
    ).resolves.toEqual({ kind: "resource-unavailable" });
  });

  it("serializes concurrent attempts so only one booking succeeds", async () => {
    const results = await Promise.all([
      createReservation(validRequest),
      createReservation({ ...validRequest, userId: "student-2" }),
    ]);

    expect(results.map(({ kind }) => kind).sort()).toEqual([
      "conflict",
      "created",
    ]);
    expect(getReservations()).toHaveLength(1);
  });

  it("lists a user's reservations in chronological order", async () => {
    seedReservation({
      id: "later",
      ...validRequest,
      startTime: "2026-11-10T12:00:00.000Z",
      endTime: "2026-11-10T13:00:00.000Z",
      status: "PENDING",
    });
    seedReservation({ id: "earlier", ...validRequest, status: "CANCELLED" });
    seedReservation({
      id: "other-user",
      ...validRequest,
      userId: "student-2",
      status: "PENDING",
    });

    const reservations = await listReservationsForUser("student-1");

    expect(reservations.map(({ id }) => id)).toEqual(["earlier", "later"]);
  });

  it("returns not found when cancelling a missing reservation", async () => {
    await expect(cancelReservation("missing")).resolves.toEqual({
      kind: "not-found",
    });
  });

  it("confirms pending reservations and handles invalid states", async () => {
    seedReservation({ id: "pending", ...validRequest, status: "PENDING" });
    seedReservation({ id: "cancelled", ...validRequest, status: "CANCELLED" });

    await expect(confirmReservation("pending")).resolves.toMatchObject({
      kind: "confirmed",
      reservation: { status: "CONFIRMED" },
    });
    await expect(confirmReservation("cancelled")).resolves.toEqual({
      kind: "invalid-status",
    });
    await expect(confirmReservation("missing")).resolves.toEqual({
      kind: "not-found",
    });
  });
});
