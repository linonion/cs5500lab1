import express from "express";

import { appConfig } from "./config/app.config";
import { closeDatabase, connectToDatabase } from "./config/database";
import { healthRouter } from "./routes/health.routes";
import { resourceRouter } from "./routes/resource.routes";
import { reservationRouter } from "./routes/reservation.routes";

const app = express();

app.use(express.json());
app.use("/api/v1", healthRouter);
app.use("/api/v1", resourceRouter);
app.use("/api/v1", reservationRouter);

async function startServer(): Promise<void> {
  try {
    await connectToDatabase();
    app.listen(appConfig.port, () => {
      console.log(`CampusHub API listening on port ${appConfig.port}`);
    });
  } catch (error) {
    console.error("Failed to start CampusHub API.", error);
    await closeDatabase();
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void startServer();
}

export default app;
