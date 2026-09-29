import type { RequestHandler } from "express";

import {
  createReservation as createReservationInMemory,
  listActiveReservationsForUser,
  listResources,
} from "../services/reservation.service";
import { RESOURCE_TYPES } from "../types/reservation";
import type {
  CreateReservationRequest,
  ErrorResponse,
} from "../types/reservation";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isIsoDateTime = (value: unknown): value is string => {
  if (typeof value !== "string") {
    return false;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!match || !Number.isFinite(Date.parse(value))) {
    return false;
  }

  const [
    ,
    yearValue,
    monthValue,
    dayValue,
    hourValue,
    minuteValue,
    secondValue,
    offsetValue,
  ] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const second = Number(secondValue);
  const daysInMonth = [
    31,
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth[month - 1] ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return false;
  }

  if (offsetValue !== "Z") {
    const offsetMatch = /^[+-](\d{2}):(\d{2})$/.exec(offsetValue);
    if (
      !offsetMatch ||
      Number(offsetMatch[1]) > 23 ||
      Number(offsetMatch[2]) > 59
    ) {
      return false;
    }
  }

  return true;
};

const sendError = (
  response: Parameters<RequestHandler>[1],
  status: number,
  code: string,
  message: string,
): void => {
  const error: ErrorResponse = { code, message };
  response.status(status).json(error);
};

const isResourceType = (value: string): boolean =>
  RESOURCE_TYPES.some((resourceType) => resourceType === value);

export const getResources: RequestHandler = (request, response): void => {
  const type = request.query.type;
  if (type === undefined) {
    response.status(200).json(listResources());
    return;
  }

  if (typeof type !== "string" || type.trim().length === 0) {
    sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "type must be a non-empty string.",
    );
    return;
  }

  if (!isResourceType(type)) {
    sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "type must be ROOM, EQUIPMENT, or LAB.",
    );
    return;
  }

  response
    .status(200)
    .json(listResources(type as (typeof RESOURCE_TYPES)[number]));
};

export const postReservation: RequestHandler = (request, response): void => {
  const body: unknown = request.body;
  if (!isRecord(body)) {
    sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "Request body must be a JSON object.",
    );
    return;
  }

  const { resourceId, userId, startTime, endTime } = body;
  if (
    !isNonEmptyString(resourceId) ||
    !isNonEmptyString(userId) ||
    !isIsoDateTime(startTime) ||
    !isIsoDateTime(endTime)
  ) {
    sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "resourceId and userId must be non-empty strings; startTime and endTime must be valid ISO 8601 date-time strings.",
    );
    return;
  }

  if (Date.parse(startTime) >= Date.parse(endTime)) {
    sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "endTime must be later than startTime.",
    );
    return;
  }

  const input: CreateReservationRequest = {
    resourceId,
    userId,
    startTime,
    endTime,
  };

  try {
    const result = createReservationInMemory(input);
    if (result.kind === "resource-not-found") {
      sendError(
        response,
        404,
        "RESOURCE_NOT_FOUND",
        "The requested resource does not exist.",
      );
      return;
    }
    if (result.kind === "resource-unavailable") {
      sendError(
        response,
        409,
        "RESOURCE_UNAVAILABLE",
        "The resource is not available.",
      );
      return;
    }
    if (result.kind === "conflict") {
      sendError(
        response,
        409,
        "DOUBLE_BOOKING",
        "Resource is already reserved for this time slot.",
      );
      return;
    }

    response.status(201).json(result.reservation);
  } catch {
    sendError(
      response,
      500,
      "INTERNAL_SERVER_ERROR",
      "An unexpected server error occurred.",
    );
  }
};

export const getUserReservations: RequestHandler = (
  request,
  response,
): void => {
  const { userId } = request.params;
  if (!isNonEmptyString(userId)) {
    sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "userId must be a non-empty string.",
    );
    return;
  }

  try {
    response.status(200).json(listActiveReservationsForUser(userId));
  } catch {
    sendError(
      response,
      500,
      "INTERNAL_SERVER_ERROR",
      "An unexpected server error occurred.",
    );
  }
};
