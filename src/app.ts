import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { Problem, problems } from "./problem.ts";
import type { FieldError } from "./problem.ts";
import type { Principal, PublicationRepository } from "./repository.ts";

export interface AppOptions {
  repository: PublicationRepository;
  authenticate: (request: IncomingMessage) => Principal | undefined;
  clock?: () => Date;
}

const securityHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function sendProblem(
  res: ServerResponse,
  problem: Problem,
  instance: string,
): void {
  const [status, title, detail] = problems[problem.kind];
  const extra: Record<string, string> = {};
  if (status === 401) extra["WWW-Authenticate"] = 'Bearer realm="leetkob"';
  if (status === 405) extra.Allow = "POST";
  if (status === 503) extra["Retry-After"] = "1";
  res.writeHead(status, {
    ...securityHeaders,
    ...extra,
    "Content-Type": "application/problem+json",
  });
  res.end(
    JSON.stringify({
      type: `https://leetkob.example/problems/${problem.kind}`,
      title,
      status,
      detail,
      instance,
      ...(problem.errors ? { errors: problem.errors } : {}),
    }),
  );
}

async function readObject(request: IncomingMessage, url: URL): Promise<void> {
  const contentType = request.headers["content-type"] ?? "";
  const encoding = request.headers["content-encoding"];
  if (
    !/^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?\s*$/i.test(
      contentType,
    ) ||
    (encoding !== undefined && encoding.toLowerCase() !== "identity")
  ) {
    throw new Problem("unsupported-media-type");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += bytes.byteLength;
    if (size > 4096) throw new Problem("payload-too-large");
    chunks.push(bytes);
  }
  let body: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
    body = JSON.parse(text);
  } catch {
    throw new Problem("invalid-json");
  }
  const errors: FieldError[] = [];
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    errors.push({ pointer: "", detail: "must be a JSON object" });
  }
  for (const parameter of new Set(url.searchParams.keys())) {
    errors.push({ parameter, detail: "query parameters are not supported" });
  }
  if (errors.length) throw new Problem("validation", errors);
}

export function createApp(options: AppOptions): Server {
  return createServer((request, response) => {
    let instance = "/v1";
    async function handle(): Promise<void> {
      const url = new URL(request.url ?? "/", "http://localhost");
      const match = /^\/v1\/labs\/([1-9][0-9]*)\/publish$/.exec(url.pathname);
      const labId = Number(match?.[1]);
      if (!match || !Number.isSafeInteger(labId))
        throw new Problem("not-found");
      instance = `/v1/labs/${labId}/publish`;
      if (request.method !== "POST") throw new Problem("method-not-allowed");
      const principal = options.authenticate(request);
      if (!principal) throw new Problem("authentication-required");
      if (principal.role !== "ta") throw new Problem("forbidden");
      options.repository.assertAccess(labId, principal);
      await readObject(request, url);
      const result = options.repository.publish(
        labId,
        principal,
        (options.clock ?? (() => new Date()))(),
      );
      response.writeHead(200, {
        ...securityHeaders,
        "Content-Type": "application/json",
        ...(result.replayed ? { "Idempotent-Replayed": "true" } : {}),
      });
      response.end(result.receipt);
    }
    void handle().catch((error: unknown) => {
      sendProblem(
        response,
        error instanceof Problem ? error : new Problem("internal"),
        instance,
      );
    });
  });
}
