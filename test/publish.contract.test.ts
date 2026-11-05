import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { createApp } from "../src/app.ts";
import type { AppOptions } from "../src/app.ts";
import { PublicationRepository } from "../src/repository.ts";
import type { Principal } from "../src/repository.ts";

const now = "2026-11-05T08:00:00.000Z";
const identities: Record<string, Principal> = {
  own: { id: "ta-own", role: "ta" },
  colleague: { id: "ta-colleague", role: "ta" },
  foreign: { id: "ta-foreign", role: "ta" },
  student: { id: "student-1", role: "student" },
  admin: { id: "admin-1", role: "admin" },
};

async function fixture(t: TestContext, override: Partial<AppOptions> = {}) {
  const directory = mkdtempSync(join(tmpdir(), "leetkob-contract-"));
  const path = join(directory, "app.db");
  const repository = new PublicationRepository(path);
  repository.db.exec(`
    INSERT INTO labs VALUES (1, 10, '${now}'), (2, 20, '${now}');
    INSERT INTO ta_classes VALUES ('ta-own', 10), ('ta-colleague', 10), ('ta-foreign', 20);
    INSERT INTO counted_submissions VALUES (11, 1, 'student-1', 'AC', 70), (12, 1, 'student-2', 'WA', 0);
    INSERT INTO review_items VALUES (11, 'C1', 'violation'), (11, 'C2', 'pass');
  `);
  const server = createApp({
    repository,
    authenticate: (request) => {
      const value = request.headers.authorization;
      return value?.startsWith("Bearer ")
        ? identities[value.slice(7)]
        : undefined;
    },
    clock: () => new Date(now),
    ...override,
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    repository.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const request = (
    options: {
      path?: string;
      token?: string;
      body?: string;
      type?: string;
      method?: string;
      encoding?: string;
    } = {},
  ) =>
    fetch(base + (options.path ?? "/v1/labs/1/publish"), {
      method: options.method ?? "POST",
      headers: {
        Authorization: `Bearer ${options.token ?? "own"}`,
        "Content-Type": options.type ?? "application/json",
        ...(options.encoding ? { "Content-Encoding": options.encoding } : {}),
      },
      ...((options.method ?? "POST") === "GET"
        ? {}
        : { body: options.body ?? "{}" }),
    });
  return { repository, request, path, base };
}

async function problem(
  response: Response,
  status: number,
  slug: string,
  title: string,
) {
  assert.equal(response.status, status);
  assert.equal(
    response.headers.get("content-type"),
    "application/problem+json",
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.type, `https://leetkob.example/problems/${slug}`);
  assert.equal(body.title, title);
  assert.equal(body.status, status);
  assert.equal(typeof body.detail, "string");
  assert.equal(typeof body.instance, "string");
  assert.ok((body.detail as string).length > 0);
  assert.doesNotMatch(
    JSON.stringify(body),
    /SELECT |INSERT |private\.db|secret-fixture|Error:|\.ts:\d/,
  );
  assert.deepEqual(
    Object.keys(body).sort(),
    [
      ...["type", "title", "status", "detail", "instance"],
      ...(slug === "validation" ? ["errors"] : []),
    ].sort(),
  );
  return body;
}

function noPublication(repository: PublicationRepository) {
  for (const table of [
    "publications",
    "published_marks",
    "publication_audit",
  ]) {
    assert.deepEqual(
      repository.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get(),
      { count: 0 },
    );
  }
}

test("§§3-4: publish snapshots prepared marks and records exactly one auditable receipt", async (t) => {
  const { repository, request } = await fixture(t);
  const response = await request();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("idempotent-replayed"), null);
  assert.deepEqual(await response.json(), {
    labId: 1,
    status: "published",
    publishedAt: now,
    publishedBy: "ta-own",
    submissionCount: 2,
  });
  const marks = repository.db
    .prepare(
      "SELECT submission_id, score_tenths FROM published_marks ORDER BY submission_id",
    )
    .all();
  assert.deepEqual(
    marks.map((row) => ({ ...row })),
    [
      { submission_id: 11, score_tenths: 70 },
      { submission_id: 12, score_tenths: 0 },
    ],
  );
  assert.deepEqual(
    { ...repository.db.prepare("SELECT * FROM publication_audit").get() },
    { lab_id: 1, actor_id: "ta-own", at: now, event: "lab.published" },
  );
});

test("§4: repeated POST is 200 and byte-identical, including another assigned TA and changed clock", async (t) => {
  let time = new Date(now);
  const { request, repository } = await fixture(t, { clock: () => time });
  const first = await request();
  const original = await first.text();
  time = new Date("2026-11-06T00:00:00.000Z");
  repository.db.exec("UPDATE counted_submissions SET score_tenths = 100");
  const second = await request({
    token: "colleague",
    body: '{"publishedBy":"imposter","score":100}',
  });
  assert.equal(second.status, 200);
  assert.equal(second.headers.get("idempotent-replayed"), "true");
  assert.equal(await second.text(), original);
  assert.equal(
    repository.db
      .prepare("SELECT COUNT(*) AS count FROM publication_audit")
      .get()?.count,
    1,
  );
  assert.equal(
    repository.db
      .prepare(
        "SELECT score_tenths FROM published_marks WHERE submission_id = 11",
      )
      .get()?.score_tenths,
    70,
  );
});

test("§§1-2: missing/invalid credentials are 401 and advertise Bearer", async (t) => {
  const { request, base, repository } = await fixture(t);
  for (const response of [
    await request({ token: "invalid" }),
    await fetch(`${base}/v1/labs/1/publish`, { method: "POST", body: "{}" }),
  ]) {
    await problem(
      response,
      401,
      "authentication-required",
      "Authentication required",
    );
    assert.equal(
      response.headers.get("www-authenticate"),
      'Bearer realm="leetkob"',
    );
  }
  noPublication(repository);
});

test("§1: students and admins are 403; neither is a TA bypass", async (t) => {
  const { request, repository } = await fixture(t);
  for (const token of ["student", "admin"])
    await problem(await request({ token }), 403, "forbidden", "Forbidden");
  noPublication(repository);
});

test("§§1,4: foreign TA and missing lab have identical non-disclosing 404 bodies", async (t) => {
  const { request, repository } = await fixture(t);
  const foreign = await problem(
    await request({ token: "foreign", body: "invalid", type: "text/plain" }),
    404,
    "not-found",
    "Not found",
  );
  const missing = await problem(
    await request({ path: "/v1/labs/999/publish" }),
    404,
    "not-found",
    "Not found",
  );
  assert.deepEqual({ ...foreign, instance: "" }, { ...missing, instance: "" });
  noPublication(repository);
});

test("§4: published receipts do not bypass revoked class ownership", async (t) => {
  const { request, repository } = await fixture(t);
  assert.equal((await request()).status, 200);
  repository.db.exec("DELETE FROM ta_classes WHERE ta_id = 'ta-own'");
  await problem(await request(), 404, "not-found", "Not found");
  await problem(
    await request({ token: "foreign" }),
    404,
    "not-found",
    "Not found",
  );
  assert.equal(
    repository.db
      .prepare("SELECT COUNT(*) AS count FROM publication_audit")
      .get()?.count,
    1,
  );
});

test("§4: ownership is checked again inside the write transaction", async (t) => {
  const { request, repository } = await fixture(t);
  const original = repository.assertAccess.bind(repository);
  repository.assertAccess = (labId, principal) => {
    original(labId, principal);
    repository.db.exec("DELETE FROM ta_classes WHERE ta_id = 'ta-own'");
  };
  await problem(await request(), 404, "not-found", "Not found");
  noPublication(repository);
});

test("§§1-2: invalid IDs, trailing slash and unknown routes are safe 404 problems", async (t) => {
  const { request, repository } = await fixture(t);
  for (const id of ["0", "-1", "01", "1.0", "1e0", "9007199254740992", "abc"]) {
    const result = await problem(
      await request({ path: `/v1/labs/${id}/publish` }),
      404,
      "not-found",
      "Not found",
    );
    assert.equal(result.instance, "/v1");
  }
  for (const path of [
    "/v1/labs/1/publish/",
    "/v1/unknown?token=secret-fixture",
  ]) {
    await problem(await request({ path }), 404, "not-found", "Not found");
  }
  noPublication(repository);
});

test("§2: wrong method is 405 with Allow POST", async (t) => {
  const { request, repository } = await fixture(t);
  for (const method of ["GET", "PUT", "DELETE"]) {
    const response = await request({ method });
    await problem(response, 405, "method-not-allowed", "Method not allowed");
    assert.equal(response.headers.get("allow"), "POST");
  }
  noPublication(repository);
});

test("§2: malformed or empty JSON is invalid-json, not a server failure", async (t) => {
  const { request, repository } = await fixture(t);
  for (const body of ["", "{", '{"a":}', "NaN"])
    await problem(
      await request({ body }),
      400,
      "invalid-json",
      "Malformed JSON",
    );
  noPublication(repository);
});

test("§§2,4: non-object JSON and every query name get validation field errors", async (t) => {
  const { request, repository } = await fixture(t);
  for (const body of ["null", "[]", "42", "true", '"text"']) {
    const result = await problem(
      await request({ body, path: "/v1/labs/1/publish?foo=1&bar=2&foo=3" }),
      400,
      "validation",
      "Invalid request",
    );
    assert.deepEqual(result.errors, [
      { pointer: "", detail: "must be a JSON object" },
      { parameter: "foo", detail: "query parameters are not supported" },
      { parameter: "bar", detail: "query parameters are not supported" },
    ]);
  }
  const result = await problem(
    await request({ path: "/v1/labs/1/publish?bad=1" }),
    400,
    "validation",
    "Invalid request",
  );
  assert.deepEqual(result.errors, [
    { parameter: "bad", detail: "query parameters are not supported" },
  ]);
  noPublication(repository);
});

test("§4: byte limit rejects >4096 bytes, accepts exactly 4096 and counts UTF-8 bytes", async (t) => {
  const { request, repository } = await fixture(t);
  await problem(
    await request({ body: "{}" + " ".repeat(4095) }),
    413,
    "payload-too-large",
    "Payload too large",
  );
  await problem(
    await request({ body: JSON.stringify({ value: "é".repeat(2050) }) }),
    413,
    "payload-too-large",
    "Payload too large",
  );
  noPublication(repository);
  assert.equal((await request({ body: "{}" + " ".repeat(4094) })).status, 200);
});

test("§4: only JSON UTF-8 and identity encoding are accepted", async (t) => {
  const { request, repository } = await fixture(t);
  for (const type of [
    "text/plain",
    "application/jsonp",
    "application/json; charset=latin1",
    "application/json; other=1",
  ]) {
    await problem(
      await request({ type }),
      415,
      "unsupported-media-type",
      "Unsupported media type",
    );
  }
  await problem(
    await request({ encoding: "gzip" }),
    415,
    "unsupported-media-type",
    "Unsupported media type",
  );
  noPublication(repository);
  assert.equal(
    (
      await request({
        type: 'Application/JSON; Charset="UTF-8"',
        encoding: "identity",
      })
    ).status,
    200,
  );
});

test("§4: one millisecond before deadline is 409; exact deadline succeeds", async (t) => {
  let time = new Date(Date.parse(now) - 1);
  const { request, repository } = await fixture(t, { clock: () => time });
  await problem(
    await request(),
    409,
    "deadline-not-reached",
    "Submission window open",
  );
  noPublication(repository);
  time = new Date(now);
  assert.equal((await request()).status, 200);
});

test("§4: queued/running judges block before review check; failed attempts can later succeed", async (t) => {
  const { request, repository } = await fixture(t);
  repository.db.exec("UPDATE review_items SET decision = NULL");
  for (const state of ["queued", "running"]) {
    repository.db
      .prepare("UPDATE counted_submissions SET judge_status = ? WHERE id = 11")
      .run(state);
    await problem(await request(), 409, "judging-pending", "Judging pending");
    noPublication(repository);
  }
  repository.db.exec(
    "UPDATE counted_submissions SET judge_status = 'AC'; UPDATE review_items SET decision = 'pass'",
  );
  assert.equal((await request()).status, 200);
});

test("§4: every undecided required review blocks; deciding it allows publication", async (t) => {
  const { request, repository } = await fixture(t);
  repository.db.exec(
    "UPDATE review_items SET decision = NULL WHERE constraint_id = 'C2'",
  );
  await problem(await request(), 409, "reviews-pending", "Reviews pending");
  noPublication(repository);
  repository.db.exec(
    "UPDATE review_items SET decision = 'pass' WHERE constraint_id = 'C2'",
  );
  assert.equal((await request()).status, 200);
});

test("§4: an empty lab can publish; another class pending item cannot block an owned lab", async (t) => {
  const { request, repository } = await fixture(t);
  const empty = await request({ path: "/v1/labs/2/publish", token: "foreign" });
  assert.equal(empty.status, 200);
  assert.equal(
    ((await empty.json()) as { submissionCount: number }).submissionCount,
    0,
  );
  repository.db.exec(
    "INSERT INTO counted_submissions VALUES (21, 2, 'foreign-student', 'running', 0); INSERT INTO review_items VALUES (21, 'C1', NULL)",
  );
  assert.equal((await request()).status, 200);
});

test("§4: 24 simultaneous requests converge on one publication, marks snapshot and audit event", async (t) => {
  const { request, repository } = await fixture(t);
  const responses = await Promise.all(
    Array.from({ length: 24 }, () => request()),
  );
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal(
    responses.filter(
      (response) => response.headers.get("idempotent-replayed") === null,
    ).length,
    1,
  );
  assert.equal(
    new Set(await Promise.all(responses.map((response) => response.text())))
      .size,
    1,
  );
  assert.equal(
    repository.db.prepare("SELECT COUNT(*) AS count FROM publications").get()
      ?.count,
    1,
  );
  assert.equal(
    repository.db.prepare("SELECT COUNT(*) AS count FROM published_marks").get()
      ?.count,
    2,
  );
  assert.equal(
    repository.db
      .prepare("SELECT COUNT(*) AS count FROM publication_audit")
      .get()?.count,
    1,
  );
});

test("§4: independent reopened store replays persisted receipt without generating a new timestamp", async (t) => {
  const { request, path } = await fixture(t);
  const original = await (await request()).text();
  const reopened = new PublicationRepository(path);
  try {
    const result = reopened.publish(
      1,
      { id: "ta-colleague", role: "ta" },
      new Date("2027-01-01T00:00:00.000Z"),
    );
    assert.equal(result.replayed, true);
    assert.equal(result.receipt, original);
  } finally {
    reopened.close();
  }
});

test("§§2,4: write contention is safe 503 with Retry-After; retry succeeds after release", async (t) => {
  const { request, repository, path } = await fixture(t);
  const other = new PublicationRepository(path);
  try {
    other.db.exec("BEGIN IMMEDIATE");
    const response = await request();
    await problem(
      response,
      503,
      "publication-unavailable",
      "Publication unavailable",
    );
    assert.equal(response.headers.get("retry-after"), "1");
    noPublication(repository);
  } finally {
    other.db.exec("ROLLBACK");
    other.close();
  }
  assert.equal((await request()).status, 200);
});

test("§§2,4: audit failure rolls back receipt and marks; retry succeeds with no partial state", async (t) => {
  const { request, repository } = await fixture(t);
  repository.db.exec(
    "CREATE TRIGGER fail_audit BEFORE INSERT ON publication_audit BEGIN SELECT RAISE(ABORT, 'secret-fixture /private.db SQL failure'); END",
  );
  const body = await problem(
    await request(),
    500,
    "internal",
    "Internal error",
  );
  assert.equal(body.detail, "The request could not be completed.");
  noPublication(repository);
  repository.db.exec("DROP TRIGGER fail_audit");
  assert.equal((await request()).status, 200);
});

test("§2: unexpected identity adapter exception is a generic 500 without its secret", async (t) => {
  const { request, repository } = await fixture(t, {
    authenticate: () => {
      throw new Error("secret-fixture /private.db");
    },
  });
  const body = await problem(
    await request(),
    500,
    "internal",
    "Internal error",
  );
  assert.equal(body.detail, "The request could not be completed.");
  noPublication(repository);
});

test("§4: invalid replay input remains invalid and leaves one audit event", async (t) => {
  const { request, repository } = await fixture(t);
  assert.equal((await request()).status, 200);
  await problem(
    await request({ body: "{" }),
    400,
    "invalid-json",
    "Malformed JSON",
  );
  await problem(
    await request({ type: "text/plain" }),
    415,
    "unsupported-media-type",
    "Unsupported media type",
  );
  assert.equal(
    repository.db
      .prepare("SELECT COUNT(*) AS count FROM publication_audit")
      .get()?.count,
    1,
  );
});
