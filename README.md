# LeeTKOB - PA2 harness and quality gate

CSC13114, Advanced Web Application Development, 2026-2027. Team: Nguyễn Hưng Thịnh (23120200), Lê Thành Công (23120222), Nguyễn Phúc Hậu (23120252).

LeeTKOB helps a TA review lab constraints before publishing marks. This checkpoint implements a tested publishing boundary and the engineering harness for later work. It does not yet execute student C++, call a model, or provide the full student/TA UI.

Start with [PA2 evidence](PA2.md), [requirements and scope](docs/requirements.md), [endpoint contract](docs/contract/publish-lab.md), [AI collaboration log](AI-LOG.md) and [self-assessment](SELF_ASSESSMENT_REPORT.md).

## Fresh clone and checks

Install **Node 24.11.0** (the version in `.node-version`, also used in CI) with its bundled npm. No database server, Docker, secret or API account is needed to run the checks.

```sh
git clone https://github.com/oppaii230205/leetkob-awad-2026.git
cd leetkob-awad-2026
git checkout pa2
npm ci
npm run lint
npm run format:check
npm run typecheck
npm test
```

| Required check                        | Local command          | CI command             |
| ------------------------------------- | ---------------------- | ---------------------- |
| lint                                  | `npm run lint`         | `npm run lint`         |
| format                                | `npm run format:check` | `npm run format:check` |
| typecheck                             | `npm run typecheck`    | `npm run typecheck`    |
| tests (including HTTP contract tests) | `npm test`             | `npm test`             |

Each command returns nonzero on a failure. `npm run format` is the optional fixing command; CI uses the read-only format check. Contract tests are included in `npm test`, so a separate optional suite cannot be forgotten. Node's SQLite experimental warning is informational and is not suppressed or mistaken for a test failure.

GitHub Actions runs the same four commands for every PR targeting main, pushes on main, and the `pa2` tag. It has read-only repository permissions, pinned action revisions, no secrets, no skipped-path filters and no `continue-on-error`. Main requires all four checks, an up-to-date branch and a PR, including for the administrator. We use merge commits so the actual failing and repaired commits remain reachable in history.

## Local HTTP demonstration

Only run the standalone server on a trusted development machine. Its default bind address is loopback. PA2's small authentication adapter maps one locally generated secret to `ta-demo`; the test-only identity labels do not work on it. This adapter is not the planned multi-user account system.

PowerShell:

```powershell
$env:DEMO_AUTH_TOKEN = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
npm run demo:seed
npm start
```

In another PowerShell window, set the same token securely (do not commit or paste it into reports), then:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/v1/labs/1/publish -Headers @{ Authorization = "Bearer $env:DEMO_AUTH_TOKEN" } -ContentType application/json -Body '{}'
```

Call twice: the body remains identical; the second response has `Idempotent-Replayed: true`. For response headers, use `Invoke-WebRequest` with the same arguments. The fixture lab is already closed and human-reviewed. Seeding is repeatable and does not erase existing publications. No real student data is used.

POSIX shells can set the token using `export DEMO_AUTH_TOKEN="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"`, then run the same npm commands. Keep the value private.

## Configuration and spending cap

All application variables are listed, without values, in `.env.example`. The application reads the process environment and does not auto-load `.env` files.

| Variable          | Default when absent   | Meaning                              |
| ----------------- | --------------------- | ------------------------------------ |
| `HOST`            | `127.0.0.1`           | Development bind address             |
| `PORT`            | `3000`                | Integer 1-65535                      |
| `DATABASE_PATH`   | `data/leetkob.db`     | Local SQLite file; ignored by Git    |
| `DEMO_AUTH_TOKEN` | none; startup refuses | At least 32 characters; demo TA only |

**Active model provider/model: none in PA2. Model spending cap: USD 0 per lab and USD 0 total. Actual model cost per lab: USD 0.** No model API key is provisioned, no environment variable accepts one, and no model client is connected. No test calls a real model. Before PA3, the team must approve the provider/model, token/cost accounting, a hard per-lab cap and a provider-side spending cap. This report does not claim an external billing cap was configured for an account we did not use.

See [assistant permissions](docs/permissions.md) for allowed/ask-first/never tiers and the future sandbox secret boundary.

## Architecture and guarantees

- `src/app.ts`: native HTTP routing, authentication/role boundary, bounded JSON parsing and safe RFC 9457 responses.
- `src/repository.ts`: parameterized SQL, class membership checked within `BEGIN IMMEDIATE`, permanent receipt replay, mark snapshot and one audit event in the same transaction.
- `src/auth.ts`: fail-closed local demo token adapter; fixture authentication is injected only by tests.
- `test/`: HTTP contract tests plus authentication unit tests. No live model, external service or shared test database.
- `scripts/seed-demo.ts`: synthetic upstream state for one closed lab.

The publication operation consumes prepared counted submissions and required human-review decisions. Selecting the last eligible submission, calculating TA-approved deductions, and creating the review queue are future upstream features. Marks are persisted as integer tenths out of 100. A repeat publish returns the original receipt and cannot silently overwrite later grade corrections.

The tests exercise errors, class isolation, deadline equality, pending judges/reviews, retry after refusal, 24 concurrent requests, a separate database connection, lock contention, injected audit failure and rollback. [Coverage map](docs/contract/coverage.md) connects the clauses to named tests; [PA2](PA2.md) contains the real red/repair evidence.

## Submission and remaining work

Submit the repository including `.git`, excluding `node_modules`, databases and local secrets, in `23120200-23120222-23120252_100.zip` if the final verified assessment remains 100. The submission tag is `pa2`. One member submits from their student email by **11 November 2026, 22:00, Asia/Ho_Chi_Minh**. This repository does not claim that Classroom submission has already occurred.

The full isolated C++ judge and its attack cases, real identity/accounts, model integration, dev-set evaluation, TA interface, appeals, deployment, telemetry and 80-submission load test remain scheduled for later milestones. They are not evidence for this PA2 mark.
