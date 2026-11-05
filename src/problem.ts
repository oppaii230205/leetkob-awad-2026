export const problems = {
  "invalid-json": [400, "Malformed JSON", "The body must contain valid JSON."],
  validation: [400, "Invalid request", "One or more inputs are invalid."],
  "authentication-required": [
    401,
    "Authentication required",
    "A valid bearer credential is required.",
  ],
  forbidden: [403, "Forbidden", "Only an assigned TA may publish a lab."],
  "not-found": [404, "Not found", "The requested resource was not found."],
  "method-not-allowed": [
    405,
    "Method not allowed",
    "Use POST for this endpoint.",
  ],
  "deadline-not-reached": [
    409,
    "Submission window open",
    "The submission deadline has not been reached.",
  ],
  "judging-pending": [
    409,
    "Judging pending",
    "Counted submissions are still being judged.",
  ],
  "reviews-pending": [
    409,
    "Reviews pending",
    "Required TA reviews are not complete.",
  ],
  "payload-too-large": [
    413,
    "Payload too large",
    "The request body exceeds 4096 bytes.",
  ],
  "unsupported-media-type": [
    415,
    "Unsupported media type",
    "Send uncompressed UTF-8 application/json.",
  ],
  "publication-unavailable": [
    503,
    "Publication unavailable",
    "Publication is temporarily unavailable; retry later.",
  ],
  internal: [500, "Internal error", "The request could not be completed."],
} as const;

export type ProblemKind = keyof typeof problems;
export type FieldError =
  | { pointer: string; detail: string }
  | { parameter: string; detail: string };

export class Problem extends Error {
  readonly kind: ProblemKind;
  readonly errors: FieldError[] | undefined;

  constructor(kind: ProblemKind, errors?: FieldError[]) {
    super(problems[kind][2]);
    this.kind = kind;
    this.errors = errors;
  }
}
