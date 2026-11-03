import type { RequestHandler } from "express";

import { HttpError } from "../middleware/errorHandler";
import {
  cancelReservation as cancelReservationInDatabase,
  confirmReservation as confirmReservationInDatabase,
  createReservation as createReservationInDatabase,
  listReservationsForUser,
} from "../services/reservation.service";
import type { CreateReservationRequest } from "../types/reservation";
import { isIsoDateTime, isNonEmptyString, isRecord } from "../utils/validation";

export const postReservation: RequestHandler = async (
  request,
  response,
): Promise<void> => {
  const body: unknown = request.body;
  if (!isRecord(body)) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Request body must be a JSON object.",
    );
  }

  const { resourceId, userId, startTime, endTime } = body;
  if (
    !isNonEmptyString(resourceId) ||
    !isNonEmptyString(userId) ||
    !isIsoDateTime(startTime) ||
    !isIsoDateTime(endTime)
  ) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "resourceId and userId must be non-empty strings; startTime and endTime must be valid ISO 8601 date-time strings.",
    );
  }

  if (Date.parse(startTime) >= Date.parse(endTime)) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "endTime must be later than startTime.",
    );
  }

  const input: CreateReservationRequest = {
    resourceId,
    userId,
    startTime,
    endTime,
  };
  const result = await createReservationInDatabase(input);

  if (result.kind === "resource-not-found") {
    throw new HttpError(
      404,
      "RESOURCE_NOT_FOUND",
      "The requested resource does not exist.",
    );
  }
  if (result.kind === "resource-unavailable") {
    throw new HttpError(
      409,
      "RESOURCE_UNAVAILABLE",
      "The resource is not available.",
    );
  }
  if (result.kind === "conflict") {
    throw new HttpError(
      409,
      "DOUBLE_BOOKING",
      "Resource is already reserved for this time slot.",
    );
  }

  response.status(201).json(result.reservation);
};

export const getUserReservations: RequestHandler = async (
  request,
  response,
): Promise<void> => {
  const { userId } = request.params;
  if (!isNonEmptyString(userId)) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "userId must be a non-empty string.",
    );
  }

  const reservations = await listReservationsForUser(userId);
  response.status(200).json(reservations);
};

export const cancelReservation: RequestHandler = async (
  request,
  response,
): Promise<void> => {
  const { id } = request.params;
  if (!isNonEmptyString(id)) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "id must be a non-empty string.",
    );
  }

  const result = await cancelReservationInDatabase(id);
  if (result.kind === "not-found") {
    throw new HttpError(
      404,
      "RESERVATION_NOT_FOUND",
      "The reservation does not exist.",
    );
  }

  response.status(200).json(result.reservation);
};

export const confirmReservation: RequestHandler = async (
  request,
  response,
): Promise<void> => {
  const { id } = request.params;
  if (!isNonEmptyString(id)) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "id must be a non-empty string.",
    );
  }

  const result = await confirmReservationInDatabase(id);
  if (result.kind === "not-found") {
    throw new HttpError(
      404,
      "RESERVATION_NOT_FOUND",
      "The reservation does not exist.",
    );
  }
  if (result.kind === "invalid-status") {
    throw new HttpError(
      409,
      "INVALID_STATUS_TRANSITION",
      "A cancelled reservation cannot be confirmed.",
    );
  }

  response.status(200).json(result.reservation);
};
