import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Principal } from "./repository.ts";

export function demoAuthenticator(
  token: string,
): (request: IncomingMessage) => Principal | undefined {
  if (token.length < 32)
    throw new Error("DEMO_AUTH_TOKEN must have at least 32 characters.");
  const expected = createHash("sha256").update(token).digest();
  return (request) => {
    const header = request.headers.authorization;
    if (!header || !/^Bearer [^\s]+$/.test(header)) return undefined;
    const supplied = createHash("sha256").update(header.slice(7)).digest();
    return timingSafeEqual(expected, supplied)
      ? { id: "ta-demo", role: "ta" }
      : undefined;
  };
}
