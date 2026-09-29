import { randomUUID } from "node:crypto";

import type {
  CreateReservationRequest,
  Reservation,
  Resource,
  ResourceType,
} from "../types/reservation";

const resources: Resource[] = [
  {
    id: "res-room-302",
    name: "Study Room 302",
    type: "ROOM",
    location: "North Hall, Floor 3",
    isAvailable: true,
  },
  {
    id: "res-printer-a",
    name: "3D Printer A",
    type: "EQUIPMENT",
    location: "Innovation Center, Maker Space",
    isAvailable: true,
  },
  {
    id: "res-biology-lab-1",
    name: "Biology Teaching Lab 1",
    type: "LAB",
    location: "Science Building, Floor 2",
    isAvailable: true,
  },
];

const reservations: Reservation[] = [];

export type CreateReservationResult =
  | { kind: "created"; reservation: Reservation }
  | { kind: "resource-not-found" }
  | { kind: "resource-unavailable" }
  | { kind: "conflict" };

export function listResources(type?: ResourceType): Resource[] {
  return resources
    .filter((resource) => type === undefined || resource.type === type)
    .map((resource) => ({ ...resource }));
}

export function createReservation(
  input: CreateReservationRequest,
): CreateReservationResult {
  const resource = resources.find(({ id }) => id === input.resourceId);
  if (!resource) {
    return { kind: "resource-not-found" };
  }
  if (!resource.isAvailable) {
    return { kind: "resource-unavailable" };
  }

  const requestedStart = Date.parse(input.startTime);
  const requestedEnd = Date.parse(input.endTime);
  const hasConflict = reservations.some((reservation) => {
    if (
      reservation.resourceId !== input.resourceId ||
      reservation.status === "CANCELLED"
    ) {
      return false;
    }

    return (
      Date.parse(reservation.startTime) < requestedEnd &&
      Date.parse(reservation.endTime) > requestedStart
    );
  });

  if (hasConflict) {
    return { kind: "conflict" };
  }

  const reservation: Reservation = {
    ...input,
    id: randomUUID(),
    status: "PENDING",
  };
  reservations.push(reservation);

  return { kind: "created", reservation: { ...reservation } };
}

export function listActiveReservationsForUser(userId: string): Reservation[] {
  return reservations
    .filter(
      (reservation) =>
        reservation.userId === userId && reservation.status !== "CANCELLED",
    )
    .map((reservation) => ({ ...reservation }));
}
