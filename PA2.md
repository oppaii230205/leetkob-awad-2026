# PA2 - LeeTKOB harness and quality gate

Team: **23120200 - 23120222 - 23120252**. Nguyễn Hưng Thịnh, Lê Thành Công, Nguyễn Phúc Hậu. Submission checkpoint: **11 November 2026, 22:00, Asia/Ho_Chi_Minh**. Proposed self-assessment: **100/100**, supported criterion by criterion in [the report](SELF_ASSESSMENT_REPORT.md).

## Required evidence links

| Item                               | Evidence                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public repository                  | [oppaii230205/leetkob-awad-2026](https://github.com/oppaii230205/leetkob-awad-2026)                                                                                                                                                                                                                                                                             |
| Submission tag                     | [`pa2`](https://github.com/oppaii230205/leetkob-awad-2026/tree/pa2)                                                                                                                                                                                                                                                                                             |
| Protected main settings            | [GitHub branch settings](https://github.com/oppaii230205/leetkob-awad-2026/settings/branches), [saved API settings](docs/evidence/main-protection.json) and [gate evidence record](docs/evidence/gate-experiments.json)                                                                                                                                         |
| PR stopped by a red required check | [PR #1](https://github.com/oppaii230205/leetkob-awad-2026/pull/1), [red run](https://github.com/oppaii230205/leetkob-awad-2026/actions/runs/42063214659), [HTTP 405 merge refusal](docs/evidence/replay-merge-rejected.json)                                                                                                                                    |
| Repair commit and green PR run     | [`6d789ba`](https://github.com/oppaii230205/leetkob-awad-2026/commit/6d789ba9116c7aa143ca1f0b243f71c7efd0bbaf), [green run](https://github.com/oppaii230205/leetkob-awad-2026/actions/runs/42063503823), [same PR after repair](https://github.com/oppaii230205/leetkob-awad-2026/pull/1)                                                                       |
| Deliberate contract break          | [`b68fe2a`](https://github.com/oppaii230205/leetkob-awad-2026/commit/b68fe2a62b0c066fa1a14df1891822adb89aa748): return 201 for a replay instead of 200; [failed test log](docs/evidence/replay-red-tests.txt)                                                                                                                                                   |
| Independent ownership break        | [PR #2](https://github.com/oppaii230205/leetkob-awad-2026/pull/2), [`b870d02`](https://github.com/oppaii230205/leetkob-awad-2026/commit/b870d02ce2b0dbfd96da6135185f0d0627d43c0b), [red run](https://github.com/oppaii230205/leetkob-awad-2026/actions/runs/42063766722), [HTTP 405 refusal](docs/evidence/ownership-merge-rejected.json)                       |
| Ownership repair and green run     | [`95d5759`](https://github.com/oppaii230205/leetkob-awad-2026/commit/95d575967e61670bc0dc2b79236e814255edd6e2), [green run](https://github.com/oppaii230205/leetkob-awad-2026/actions/runs/42064026830)                                                                                                                                                         |
| CI for the submitted tag           | [Checks on the exact `pa2` commit](https://github.com/oppaii230205/leetkob-awad-2026/commit/pa2/checks), [tag-triggered workflow runs](https://github.com/oppaii230205/leetkob-awad-2026/actions/workflows/quality.yml?query=branch%3Apa2), [release verification with the direct run link](https://github.com/oppaii230205/leetkob-awad-2026/releases/tag/pa2) |

The tag links are symbolic so this committed file can point at the final tagged commit without a self-referencing commit hash. The release verification records the exact final SHA and numeric tag-run link after that run finishes. Settings access may require repository administration; the saved settings and rejected merge responses allow read-only grading without that access.

## Why the gate demonstrably blocks

Main protection was enabled immediately after bootstrap commit `b2b721e9de87937bba12936f46916f83df5d13fc`, before either experiment. Required checks are **lint, format, typecheck, tests**, restricted to the GitHub Actions integration. The branch must be current, a PR is required, administrator enforcement is enabled, and force pushes/deletions are disabled. Approval count is zero: this account cannot supply an independent teammate approval, and we do not fabricate one. The quality checks remain mandatory for the owner.

For both experiments, lint, format and typecheck passed while the required tests failed. GitHub reported `mergeable_state: blocked`, and a merge API request from the authenticated repository owner returned HTTP 405 with `Required status check "tests" is failing.` Only after a source-only repair and four green checks was each PR merged. The entire protected main history after bootstrap consists of PR merges; no code was pushed directly to main after protection began.

The red replay commit failed 2 of 24 tests; the red ownership commit failed 3 of 24. Both repaired runs passed all 24. Tests and contract files were unchanged in all four experiment/repair commits. The full negative commits remain reachable through merge history so the evidence can be replayed.

## What was built

- A short [rules file](AGENTS.md) with stack, commands, conventions and product-specific never rules, linked to real findings in [AI-LOG](AI-LOG.md).
- Explicit [three-tier assistant permissions](docs/permissions.md), empty-variable [.env.example](.env.example), ignored local secrets/data and a full-history Gitleaks scan.
- One documented command per quality check, used identically in [CI](.github/workflows/quality.yml) and [README](README.md).
- The [five-section publish contract](docs/contract/publish-lab.md) with TA/class ownership, field rules, safe problem details, deadline/pending-state behavior, permanent idempotency and version policy.
- Real HTTP/SQLite [tests](test/publish.contract.test.ts) with a [clause coverage map](docs/contract/coverage.md), and persistent, transactional receipt/marks/audit storage.

No model is connected at PA2: active provider/model none, model budget **USD 0 per lab and total**. No student C++ is executed. This follows the checkpoint boundary rather than implying that later sandbox, eval or deployment work is complete.

## Reproduce and inspect

Use Node 24.11.0, then `git checkout pa2`, `npm ci`, `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`. The README has the full fresh-clone and demo instructions. No secret or external account is needed for these checks.

To inspect negative evidence without changing the submission checkout, use a separate disposable clone and check out `b68fe2a` or `b870d02`; install with `npm ci` and run `npm test`. These commits intentionally fail. Check out `pa2` again for the submitted result. Never merge a mutation into main without its source repair.

## Archive and hand-in

The ZIP is `23120200-23120222-23120252_100.zip`, contains this repository including `.git`, the three required reports and the pushed `pa2` tag, and excludes dependency directories, SQLite databases and environment secrets. The release page records the verified archive hash. The ZIP's `.git/pa2-release-verification.json` records final tag/CI/archive contents verification; it is packaging metadata, not an extra source commit.

One team member must upload the ZIP from their `<StudentID>@student.hcmus.edu.vn` account by the stated deadline. This document records repository completion; it does not claim that a Classroom upload has already happened.
