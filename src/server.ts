import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./app.ts";
import { demoAuthenticator } from "./auth.ts";
import { PublicationRepository } from "./repository.ts";

const token = process.env.DEMO_AUTH_TOKEN ?? "";
const authenticate = demoAuthenticator(token);
const databasePath = process.env.DATABASE_PATH ?? "data/leetkob.db";
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? "3000");
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be 1 through 65535.");
mkdirSync(dirname(databasePath), { recursive: true });
const repository = new PublicationRepository(databasePath);
const server = createApp({ repository, authenticate });
server.listen(port, host, () => {
  console.info(
    `LeeTKOB demo listening on ${host}:${port}; model spending disabled.`,
  );
});
function shutdown(): void {
  server.close(() => {
    repository.close();
  });
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
