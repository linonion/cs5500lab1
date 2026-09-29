import express from "express";

import { healthRouter } from "./routes/health.routes";
import { reservationRouter } from "./routes/reservation.routes";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());
app.use("/api/v1", healthRouter);
app.use("/api/v1", reservationRouter);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`CampusHub API listening on port ${port}`);
  });
}

export default app;
