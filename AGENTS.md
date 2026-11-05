# LeeTKOB agent rules

## Stack

Node 24.11.0, strict TypeScript, native HTTP and SQLite. PA2 implements the publish boundary; no C++ execution or model integration yet.

## Commands

`npm ci`; `npm run lint`; `npm run format:check`; `npm run typecheck`; `npm test`.
Run all four checks before proposing a merge. CI must invoke these same commands.

## Conventions

Read `docs/contract/publish-lab.md` before source changes. Use RFC 9457 errors.
Keep class ownership checks inside the publication transaction, including retries.
Persist the receipt, marks and audit event atomically. Test through real HTTP.
Compare SQLite assertion values, not row prototypes (AI-LOG A03).
Record decisions and actual Changed / Rejected findings in `AI-LOG.md`.
Use PRs after main protection; never bypass a required check. Follow `docs/permissions.md`.

## Never

- Put a secret in source, history, logs, fixtures or a future sandbox. No host mounts, Docker socket, root execution or network in that sandbox.
- Make real model calls in unit/contract tests. PA2 model spending is disabled (USD 0).
- Edit a test, eval datum or label to make an implementation pass. A real contract change needs its own explained commit and matching tests.
- Treat authentication as class ownership, or skip ownership on a replay (AI-LOG A07).
- Use an in-memory publication flag or change a replay's stored receipt/status (AI-LOG A06).
- Run student C++ outside the future isolated judge, or publish with unresolved human reviews.
