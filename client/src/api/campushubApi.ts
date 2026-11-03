import type {
  CreateReservationRequest,
  ErrorResponse,
  Reservation,
  Resource,
  ResourceType,
} from "../../../shared/contracts";

export type {
  CreateReservationRequest,
  Reservation,
  ReservationStatus,
  Resource,
  ResourceType,
} from "../../../shared/contracts";

export const RESOURCE_TYPES = [
  "ROOM",
  "EQUIPMENT",
  "LAB",
] as const satisfies readonly ResourceType[];

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, body: ErrorResponse) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
  }
}

export const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "/api/v1";

function isApiErrorBody(value: unknown): value is ErrorResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.code === "string" && typeof candidate.message === "string"
  );
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const errorBody: ErrorResponse = isApiErrorBody(body)
      ? body
      : {
          code: "HTTP_ERROR",
          message: `Request failed with status ${response.status}.`,
        };
    throw new ApiError(response.status, errorBody);
  }

  return body as T;
}

export async function fetchResources(type?: ResourceType): Promise<Resource[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  const response = await fetch(`${apiBaseUrl}/resources${query}`);
  return parseResponse<Resource[]>(response);
}

export async function createReservation(
  payload: CreateReservationRequest,
): Promise<Reservation> {
  const response = await fetch(`${apiBaseUrl}/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<Reservation>(response);
}

export async function fetchUserReservations(
  userId: string,
): Promise<Reservation[]> {
  const response = await fetch(
    `${apiBaseUrl}/reservations/user/${encodeURIComponent(userId)}`,
  );
  return parseResponse<Reservation[]>(response);
}

export async function cancelReservation(
  reservationId: string,
): Promise<Reservation> {
  const response = await fetch(
    `${apiBaseUrl}/reservations/${encodeURIComponent(reservationId)}/cancel`,
    { method: "PATCH" },
  );
  return parseResponse<Reservation>(response);
}
