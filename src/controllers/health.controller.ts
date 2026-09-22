import type { RequestHandler } from 'express';

import { getHealthStatus } from '../services/health.service';

export const getHealth: RequestHandler = (_request, response): void => {
  response.status(200).json(getHealthStatus());
};
