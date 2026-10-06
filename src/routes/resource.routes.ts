import { Router } from "express";

import { getResources } from "../controllers/resource.controller";

export const resourceRouter = Router();

resourceRouter.get("/resources", getResources);
