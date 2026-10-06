import {
  closeDatabase,
  connectToDatabase,
  getDatabasePool,
} from "../config/database";
import type { Resource } from "../types/reservation";

const resources: Resource[] = [
  {
    id: "res-room-302",
    name: "Study Room 302",
    type: "ROOM",
    location: "North Hall, Floor 3",
    isAvailable: true,
  },
  {
    id: "res-printer-a",
    name: "3D Printer A",
    type: "EQUIPMENT",
    location: "Innovation Center, Maker Space",
    isAvailable: true,
  },
  {
    id: "res-biology-lab-1",
    name: "Biology Teaching Lab 1",
    type: "LAB",
    location: "Science Building, Floor 2",
    isAvailable: true,
  },
];

async function seedResources(): Promise<void> {
  try {
    await connectToDatabase();
    await Promise.all(
      resources.map(({ id, name, type, location, isAvailable }) =>
        getDatabasePool().query(
          `INSERT INTO resources (id, name, type, location, is_available)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [id, name, type, location, isAvailable],
        ),
      ),
    );
    console.log(`Seeded ${resources.length} campus resources.`);
  } finally {
    await closeDatabase();
  }
}

void seedResources().catch((error: unknown) => {
  console.error("Failed to seed campus resources.", error);
  process.exitCode = 1;
});
