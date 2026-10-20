import { getDatabasePool } from "../config/database";
import type { ResourceRecord } from "../models/Resource.model";
import type { Resource, ResourceType } from "../types/reservation";

export interface ResourceFilters {
  type?: ResourceType;
  isAvailable?: boolean;
}

export async function listResources(
  filters: ResourceFilters,
): Promise<Resource[]> {
  const database = getDatabasePool();
  const conditions: string[] = [];
  const values: Array<ResourceType | boolean> = [];

  if (filters.type !== undefined) {
    values.push(filters.type);
    conditions.push(`type = $${values.length}`);
  }
  if (filters.isAvailable !== undefined) {
    values.push(filters.isAvailable);
    conditions.push(`is_available = $${values.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await database.query<ResourceRecord>(
    `SELECT id, name, type, location, is_available AS "isAvailable"
     FROM resources ${whereClause} ORDER BY name`,
    values,
  );

  return rows.map((record) => ({
    id: record.id,
    name: record.name,
    type: record.type,
    location: record.location,
    isAvailable: record.isAvailable,
  }));
}
