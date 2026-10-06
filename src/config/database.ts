import { Pool } from "pg";

import { appConfig } from "./app.config";
import {
  CREATE_RESERVATION_RESOURCE_INDEX,
  CREATE_RESERVATION_TABLE,
  CREATE_RESERVATION_USER_INDEX,
} from "../models/Reservation.model";
import {
  CREATE_RESOURCE_TABLE,
  CREATE_RESOURCE_TYPE_INDEX,
} from "../models/Resource.model";

let pool: Pool | undefined;

export function getDatabasePool(): Pool {
  if (!appConfig.databaseUrl) {
    throw new Error("DATABASE_URL must be set before starting the API.");
  }

  pool ??= new Pool({ connectionString: appConfig.databaseUrl });
  return pool;
}

export async function connectToDatabase(): Promise<void> {
  const database = getDatabasePool();
  await database.query("SELECT 1");
  await database.query(CREATE_RESOURCE_TABLE);
  await database.query(CREATE_RESOURCE_TYPE_INDEX);
  await database.query(CREATE_RESERVATION_TABLE);
  await database.query(CREATE_RESERVATION_RESOURCE_INDEX);
  await database.query(CREATE_RESERVATION_USER_INDEX);
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    const currentPool = pool;
    pool = undefined;
    await currentPool.end();
  }
}
