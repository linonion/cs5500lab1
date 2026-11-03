import type { RequestHandler } from "express";

import { HttpError } from "../middleware/errorHandler";
import { listResources } from "../services/resource.service";
import { RESOURCE_TYPES } from "../types/reservation";
import type { ResourceType } from "../types/reservation";

const isResourceType = (value: string): value is ResourceType =>
  RESOURCE_TYPES.some((resourceType) => resourceType === value);

export const getResources: RequestHandler = async (
  request,
  response,
): Promise<void> => {
  const type = request.query.type;
  const isAvailable = request.query.isAvailable;
  if (
    type !== undefined &&
    (typeof type !== "string" || type.trim().length === 0)
  ) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "type must be a non-empty string.",
    );
  }

  if (typeof type === "string" && !isResourceType(type)) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "type must be ROOM, EQUIPMENT, or LAB.",
    );
  }

  if (
    isAvailable !== undefined &&
    isAvailable !== "true" &&
    isAvailable !== "false"
  ) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "isAvailable must be true or false.",
    );
  }

  const resources = await listResources({
    type,
    isAvailable: isAvailable === undefined ? undefined : isAvailable === "true",
  });
  response.status(200).json(resources);
};
