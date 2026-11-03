import type { ReservationStatus, ResourceType } from "../../shared/contracts";

export type {
  CreateReservationRequest,
  ErrorResponse,
  Reservation,
  ReservationStatus,
  Resource,
  ResourceType,
} from "../../shared/contracts";

export const RESOURCE_TYPES = [
  "ROOM",
  "EQUIPMENT",
  "LAB",
] as const satisfies readonly ResourceType[];

export const RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
] as const satisfies readonly ReservationStatus[];
