import type { ErrorRequestHandler } from "express";

import type { ErrorResponse } from "../types/reservation";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
): void => {
  const isHttpError = error instanceof HttpError;
  const status = isHttpError ? error.status : 500;
  const body: ErrorResponse = isHttpError
    ? { code: error.code, message: error.message }
    : {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected server error occurred.",
      };

  if (!isHttpError) {
    console.error("Unhandled request error", error);
  }

  response.status(status).json(body);
};
