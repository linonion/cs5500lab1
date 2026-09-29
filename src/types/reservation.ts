export const RESOURCE_TYPES = ["ROOM", "EQUIPMENT", "LAB"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  location: string;
  isAvailable: boolean;
}

export interface CreateReservationRequest {
  resourceId: string;
  userId: string;
  startTime: string;
  endTime: string;
}

export interface Reservation extends CreateReservationRequest {
  id: string;
  status: ReservationStatus;
}

export interface ErrorResponse {
  code: string;
  message: string;
}
