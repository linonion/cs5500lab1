import { Router } from "express";

import {
  getResources,
  getUserReservations,
  postReservation,
} from "../controllers/reservation.controller";

export const reservationRouter = Router();

reservationRouter.get("/resources", getResources);
reservationRouter.post("/reservations", postReservation);
reservationRouter.get("/reservations/user/:userId", getUserReservations);
