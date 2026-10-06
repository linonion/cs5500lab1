import { Router } from "express";

import {
  getUserReservations,
  postReservation,
} from "../controllers/reservation.controller";

export const reservationRouter = Router();

reservationRouter.post("/reservations", postReservation);
reservationRouter.get("/reservations/user/:userId", getUserReservations);
