import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { test } from "node:test";
import { demoAuthenticator } from "../src/auth.ts";

test("demo authentication fails closed and never accepts fixture identities or supplied roles", () => {
  assert.throws(() => demoAuthenticator(""), /at least 32/);
  const token = "local-test-only-opaque-credential-000000000";
  const authenticate = demoAuthenticator(token);
  const request = (authorization?: string) =>
    ({ headers: { authorization } }) as IncomingMessage;
  for (const value of [
    undefined,
    "",
    "Bearer own",
    "Bearer ta-own",
    "Basic ignored",
    `Bearer ${token} extra`,
    `Bearer ${token}x`,
  ]) {
    assert.equal(authenticate(request(value)), undefined);
  }
  assert.deepEqual(authenticate(request(`Bearer ${token}`)), {
    id: "ta-demo",
    role: "ta",
  });
});
