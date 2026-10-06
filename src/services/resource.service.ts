import { getDatabasePool } from "../config/database";
import type { ResourceRecord } from "../models/Resource.model";
import type { Resource, ResourceType } from "../types/reservation";

export async function listResources(type?: ResourceType): Promise<Resource[]> {
  const database = getDatabasePool();
  const query =
    type === undefined
      ? database.query<ResourceRecord>(
          `SELECT id, name, type, location, is_available AS "isAvailable"
           FROM resources ORDER BY name`,
        )
      : database.query<ResourceRecord>(
          `SELECT id, name, type, location, is_available AS "isAvailable"
           FROM resources WHERE type = $1 ORDER BY name`,
          [type],
        );
  const { rows } = await query;

  return rows.map((record) => ({
    id: record.id,
    name: record.name,
    type: record.type,
    location: record.location,
    isAvailable: record.isAvailable,
  }));
}
