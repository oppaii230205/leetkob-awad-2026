import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PublicationRepository } from "../src/repository.ts";

const path = process.env.DATABASE_PATH ?? "data/leetkob.db";
mkdirSync(dirname(path), { recursive: true });
const repository = new PublicationRepository(path);
try {
  repository.db.exec(`
    BEGIN IMMEDIATE;
    INSERT OR IGNORE INTO labs VALUES (1, 1, '2026-01-01T00:00:00.000Z');
    INSERT OR IGNORE INTO ta_classes VALUES ('ta-demo', 1);
    INSERT OR IGNORE INTO counted_submissions VALUES (1, 1, 'student-demo', 'AC', 100);
    INSERT OR IGNORE INTO review_items VALUES (1, 'C1', 'pass');
    COMMIT;
  `);
  console.info("Seeded closed, reviewed demo lab 1; no personal student data.");
} finally {
  repository.close();
}
