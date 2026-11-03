export type ResourceType = "ROOM" | "EQUIPMENT" | "LAB";

export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

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
