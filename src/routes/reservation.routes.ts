import { Router } from "express";

import {
  cancelReservation,
  confirmReservation,
  getUserReservations,
  postReservation,
} from "../controllers/reservation.controller";

export const reservationRouter = Router();

reservationRouter.post("/reservations", postReservation);
reservationRouter.get("/reservations/user/:userId", getUserReservations);
reservationRouter.patch("/reservations/:id/cancel", cancelReservation);
reservationRouter.patch("/reservations/:id/confirm", confirmReservation);
