import type { RequestHandler, Response } from "express";

import { listResources } from "../services/resource.service";
import { RESOURCE_TYPES } from "../types/reservation";
import type { ErrorResponse, ResourceType } from "../types/reservation";

const sendError = (
  response: Response,
  status: number,
  code: string,
  message: string,
): void => {
  const error: ErrorResponse = { code, message };
  response.status(status).json(error);
};

const isResourceType = (value: string): value is ResourceType =>
  RESOURCE_TYPES.some((resourceType) => resourceType === value);

export const getResources: RequestHandler = async (
  request,
  response,
): Promise<void> => {
  const type = request.query.type;
  if (
    type !== undefined &&
    (typeof type !== "string" || type.trim().length === 0)
  ) {
    sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "type must be a non-empty string.",
    );
    return;
  }

  if (typeof type === "string" && !isResourceType(type)) {
    sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "type must be ROOM, EQUIPMENT, or LAB.",
    );
    return;
  }

  try {
    const resources = await listResources(type);
    response.status(200).json(resources);
  } catch {
    sendError(
      response,
      500,
      "INTERNAL_SERVER_ERROR",
      "An unexpected server error occurred.",
    );
  }
};
