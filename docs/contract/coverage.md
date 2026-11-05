# Contract coverage map

The HTTP suite uses an actual native HTTP server, an isolated file-backed SQLite database per test, a controlled server clock and synthetic principals. Expected statuses, problem types and body fields are asserted independently of the implementation's problem table. Authentication also has a unit test for the standalone demo adapter. Contract tests run inside the required `tests` CI check via `npm test`.

| Contract clause                | Test name or distinctive name fragment     | Assertions                                                                                                                    |
| ------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| §§3-4 initial success          | `publish snapshots prepared marks`         | Full receipt shape/types/values; security headers; prepared score snapshots; one audit event with actor/time                  |
| §4 natural idempotency         | `repeated POST is 200 and byte-identical`  | Original has no replay header; repeated assigned TA gets identical bytes, original publisher/time and original mark snapshots |
| §§1-2 401                      | `missing/invalid credentials`              | RFC 9457 envelope, exact type/status/title and WWW-Authenticate                                                               |
| §1 403                         | `students and admins are 403`              | Both non-TA roles denied; no writes                                                                                           |
| §§1,4 404 ownership            | `foreign TA and missing lab`               | Identical safe errors except canonical instance; foreign access denied before parsing body; no writes                         |
| §4 replay authorization        | `published receipts do not bypass revoked` | Revoked TA and foreign TA denied after publication; existing audit remains single                                             |
| §4 transactional authorization | `ownership is checked again`               | Revocation between initial access and publication prevents all writes                                                         |
| §§1-2 invalid route            | `invalid IDs, trailing slash`              | Canonical positive-safe-integer rules; unknown route does not echo query secrets                                              |
| §2 405                         | `wrong method`                             | GET/PUT/DELETE, RFC 9457 and Allow POST                                                                                       |
| §2 400 syntax                  | `malformed or empty JSON`                  | Empty/malformed/non-JSON numeric token cases, safe body and no writes                                                         |
| §§2,4 400 fields               | `non-object JSON and every query name`     | Null, array, number, boolean, string; whole-body JSON Pointer, query parameter names, aggregation and deduplication           |
| §4 413                         | `byte limit rejects`                       | ASCII >4096, multibyte UTF-8 >4096, exact limit accepted                                                                      |
| §4 415                         | `only JSON UTF-8`                          | Wrong media types/charset/encoding rejected; case-insensitive UTF-8/identity accepted                                         |
| §4 deadline                    | `one millisecond before deadline`          | Refusal without writes before boundary, success at equality                                                                   |
| §4 409 judge                   | `queued/running judges block`              | Both in-flight states; precedence over pending review; no cached refusal                                                      |
| §4 409 human review            | `every undecided required review`          | Any undecided item blocks; decision enables retry; no premature snapshot                                                      |
| §4 class/empty scope           | `an empty lab can publish`                 | Empty receipt count; another lab's pending work does not interfere                                                            |
| §4 concurrent retries          | `24 simultaneous requests`                 | All successful bodies equal, exactly one original, one publication, two mark snapshots, one audit                             |
| §4 persistence                 | `independent reopened store`               | A separate database connection replays persisted receipt with changed actor/clock                                             |
| §§2,4 503                      | `write contention`                         | Held write transaction produces 503/Retry-After and zero writes; release allows retry                                         |
| §§2,4 rollback/500             | `audit failure rolls back`                 | Failure after publication/marks inserts leaves all three tables empty; generic detail; retry succeeds                         |
| §2 unexpected 500              | `identity adapter exception`               | Secret-bearing internal exception is not disclosed; no writes                                                                 |
| §4 replay input checks         | `invalid replay input remains invalid`     | Existing publication does not bypass malformed JSON or media checks                                                           |
| Standalone identity adapter    | `demo authentication fails closed`         | Missing/short token startup fails, fixture identities cannot authenticate, only exact opaque token maps to demo TA            |

Every response error type in contract §2 is exercised, with more than status-only assertions. Deliberate source-only regressions and their immutable CI evidence are linked in `PA2.md`. The contract and tests remain unchanged during each negative experiment and repair.

Limits: the separate-connection case checks persistent storage behavior directly; it is not a claim of a multi-process load test. Twenty-four concurrent HTTP calls are a retry check, not the future 80-submission load requirement. Full upstream review selection, identity integration, future grade corrections and the C++/model pipeline are outside this suite.
