# LeeTKOB API contract - publish a lab, version 1

Status: PA2 contract, 5 November 2026. This file is the specification; source must follow it. Its five sections follow IA3's CONTRACT.md. Tests refer to section numbers. Product sources: class brief §§3-4 and [the product-owner FAQ, entries FAQ-01, FAQ-09 and FAQ-12](https://github.com/tkob-team/LeeTKOB-FAQ/blob/2b82b90ca3696fa81c68464f8a51ceb86406fef6/FAQ.md). The pinned revision is recorded in source provenance.

## 1. Conventions

- Endpoint: `POST /v1/labs/{labId}/publish`. `labId` is a canonical decimal positive safe integer (1 through 9007199254740991); no sign, leading zero, decimal, suffix or exponent. All other paths are not found. A trailing slash is a different path.
- Transport: HTTP; JSON UTF-8. Production transport must use HTTPS. Times are UTC ISO 8601 with milliseconds. The server clock is authoritative.
- Authentication: `Authorization: Bearer <opaque-token>`. A missing, malformed, invalid or revoked credential is 401. Tokens never appear in bodies or logs. The standalone PA2 demo recognizes one configured token; the HTTP application accepts a trusted identity adapter for the later account system.
- Caller must have role `ta` and currently be assigned to the lab's class. A student or admin is 403. An authenticated TA cannot distinguish a missing lab from a lab outside their classes: both use the identical 404 representation apart from the request's own canonical `instance` path. Authentication alone never grants ownership.
- Every response carries `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. Clients ignore unknown response members. Requests may include unknown object members for additive compatibility; they have no effect and cannot set identity, status, scores or timestamps.
- Clients need no pagination: this is one operation on one lab, with a bounded receipt. There is no student list or student code in its response.

## 2. Errors

Every non-2xx response is RFC 9457 problem details with `Content-Type: application/problem+json`. As required by HTTP semantics, HEAD retains the error status and headers but omits the body. Members: `type` (the exact URI below), `title` (exact title below), `status` (integer equal to HTTP status), `detail` (one safe occurrence-specific sentence) and `instance` (canonical path, without query). Unknown paths use `/v1` as instance rather than echoing untrusted input. No stack trace, database path, SQL, bearer token, foreign class, student identity, code or pending counts are returned.

Type prefix: `https://leetkob.example/problems/`. These identifiers are stable reserved-domain identifiers; clients branch on `type`, not human wording. They do not promise a hosted documentation service.

| Slug                      | Status | Title                   | Trigger / client action                                                                                                                                                      |
| ------------------------- | -----: | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid-json`            |    400 | Malformed JSON          | Body is empty or not parseable JSON; send `{}`.                                                                                                                              |
| `validation`              |    400 | Invalid request         | Valid JSON is not an object, or any query parameter is present. `errors` contains every applicable `{pointer, detail}` or `{parameter, detail}`; whole-body pointer is `""`. |
| `authentication-required` |    401 | Authentication required | Missing/invalid credentials. Includes `WWW-Authenticate: Bearer realm="leetkob"`. Obtain a valid credential.                                                                 |
| `forbidden`               |    403 | Forbidden               | Authenticated role is not TA; obtain TA authorization.                                                                                                                       |
| `not-found`               |    404 | Not found               | Unknown path, invalid ID, absent lab or foreign lab. Do not infer existence or retry with another student's ID.                                                              |
| `method-not-allowed`      |    405 | Method not allowed      | Valid route shape, method other than POST; includes `Allow: POST`.                                                                                                           |
| `deadline-not-reached`    |    409 | Submission window open  | Owned unpublished lab has `now < submissionDeadline`. Wait until the deadline.                                                                                               |
| `judging-pending`         |    409 | Judging pending         | At least one counted submission is queued or running. Wait for final judge results and resulting review items.                                                               |
| `reviews-pending`         |    409 | Reviews pending         | Any required queue item lacks a TA decision, including unsure, violation or sampled pass items. Complete the human review.                                                   |
| `payload-too-large`       |    413 | Payload too large       | Body exceeds 4096 UTF-8 bytes, including whitespace. Send a small object.                                                                                                    |
| `unsupported-media-type`  |    415 | Unsupported media type  | Content-Type is not `application/json` (optional `charset=utf-8` only), or Content-Encoding is neither absent nor identity.                                                  |
| `publication-unavailable` |    503 | Publication unavailable | SQLite lock prevents the transaction. Includes `Retry-After: 1`; retry the same POST.                                                                                        |
| `internal`                |    500 | Internal error          | Unexpected adapter/store/serialization failure. Fixed detail: `The request could not be completed.` Safely retry; no partial publication may persist.                        |

Example:

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json
Cache-Control: no-store

{
  "type": "https://leetkob.example/problems/reviews-pending",
  "title": "Reviews pending",
  "status": 409,
  "detail": "Required TA reviews are not complete.",
  "instance": "/v1/labs/1/publish"
}
```

`errors` appears only for `validation`. Other problem types have no field errors. Every failure leaves publications, published marks and publication audit records unchanged.

## 3. Resources

**Publication receipt**

```json
{
  "labId": 1,
  "status": "published",
  "publishedAt": "2026-11-05T08:00:00.000Z",
  "publishedBy": "ta-demo",
  "submissionCount": 2
}
```

| Member            | Rule                                                                               |
| ----------------- | ---------------------------------------------------------------------------------- |
| `labId`           | Requested positive safe integer                                                    |
| `status`          | Literal `published`                                                                |
| `publishedAt`     | First successful transaction's server time in UTC; immutable on retries            |
| `publishedBy`     | Stable opaque principal ID of the TA who first published; not a name or credential |
| `submissionCount` | Nonnegative integer count of counted submissions snapshotted in that transaction   |

One lab has at most one publication and one `lab.published` audit event. A published mark snapshot contains one prepared score for each counted submission. The receipt is not a grade list. Later grade corrections/appeals are separate audited operations; republishing does not recompute marks.

PA2 storage input boundary: `counted_submissions` contains the last eligible pre-deadline submission per student, selected by the future ingestion/judge pipeline (FAQ-02). Each has a final judge status and a prepared score in tenths of a mark, from 0 through 100. `review_items` contains all required human-review items. This endpoint never creates a model verdict, selects latest submissions, computes penalties or changes a human decision. Those upstream features are not claimed as implemented here.

## 4. Endpoint behavior

### Request

```http
POST /v1/labs/1/publish HTTP/1.1
Authorization: Bearer <your-opaque-token>
Content-Type: application/json

{}
```

Body: a JSON object, at most 4096 bytes. No required fields. Unknown members are ignored, so `{ "publishedBy": "someone-else" }` cannot impersonate another TA. No query parameters. A valid media type may use ASCII case variations and optional UTF-8 charset. Compressed bodies are not accepted.

### Ordered checks

1. Route/ID, then method. Return 404 or 405 as specified.
2. Authenticate (401), then role (403).
3. Check lab existence and class assignment (non-disclosing 404). Do this before parsing body so an outsider cannot probe state or malformed-input behavior for a foreign lab.
4. Check Content-Type/Encoding (415), body byte limit (413), JSON syntax (400 invalid-json), then object shape and all query names (400 validation). Repeated query names produce one field error per distinct name. Object fields do not require validation because they are ignored.
5. Start an immediate write transaction and recheck lab ownership. If already published, return its original persisted receipt. Membership is checked again on every retry, even by another TA of the same class.
6. For a new publication, require server time at or after the deadline, no queued/running counted submissions, and no review item without a TA decision, in that order. Return the corresponding 409 if blocked. An empty lab may publish after its deadline.
7. Atomically store the receipt, snapshot the prepared marks, and append one publication audit event. Commit before sending 200. Any failure rolls all three back.

### Success and retries

- Initial success: `200`, `Content-Type: application/json`, receipt as above; no `Idempotent-Replayed` header.
- Repeat by a currently assigned TA: `200`, **byte-identical persisted JSON receipt**, `Idempotent-Replayed: true`. `publishedBy` remains the first TA. No additional snapshots or audit records and no revised timestamp. This applies across a server restart and separate connections sharing the same database.
- Natural idempotency is keyed by lab, not a client header. There is no `Idempotency-Key` requirement or expiry; publication is permanent. Unknown request members have no effect on equality.
- Concurrent successful requests serialize through SQLite. They converge on the same receipt; exactly one is original and others are replays. A busy write lock returns 503 and no side effect; retrying later is safe.
- A refusal is not remembered as a success. A request blocked by pending reviews can succeed after those reviews finish.
- A retry after lost membership is 404 even if a publication exists. Replays do not bypass authentication, ownership, media, size or input validation.

### Runnable example

After following README demo setup, use a shell variable for the secret:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/v1/labs/1/publish -Headers @{ Authorization = "Bearer $env:DEMO_AUTH_TOKEN" } -ContentType application/json -Body '{}'
```

No real token is shown in documentation. The seeded lab is closed and fully reviewed. Running this twice returns the same receipt.

## 5. Versions and change policy

Within `/v1` only additive changes: optional ignored request members, new response members and new endpoints. Clients ignore unfamiliar response members. Renaming/removing a field, changing a status, role/ownership rule, unit, idempotency behavior or error type requires `/v2` and a separately reviewed contract change; existing `/v1` clients keep their behavior until an announced deprecation/sunset plan. This PA2 endpoint has no legacy predecessor and no current sunset date.

Tests are an external check on implementation. A green run does not prove the entire specification; the coverage matrix and deliberate mutations describe what is actually checked. Never silently change tests or this contract to accommodate a broken implementation.
