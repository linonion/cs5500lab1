import type { QueryResultRow } from "pg";

import { RESOURCE_TYPES } from "../types/reservation";
import type { ResourceType } from "../types/reservation";

export interface ResourceRecord extends QueryResultRow {
  id: string;
  name: string;
  type: ResourceType;
  location: string;
  isAvailable: boolean;
}

export type NewResourceRecord = Omit<ResourceRecord, "id">;

export const CREATE_RESOURCE_TABLE = `
  CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN (${RESOURCE_TYPES.map((type) => `'${type}'`).join(", ")})),
    location TEXT NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE
  )
`;

export const CREATE_RESOURCE_TYPE_INDEX = `
  CREATE INDEX IF NOT EXISTS resources_type_idx ON resources (type)
`;
