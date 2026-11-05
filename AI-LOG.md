# AI collaboration record - PA2

Team: Nguyễn Hưng Thịnh (23120200), Lê Thành Công (23120222), Nguyễn Phúc Hậu (23120252).

Date: 5 November 2026 (Asia/Ho_Chi_Minh). Tool: OpenAI Codex desktop, using local shell, Git, GitHub REST, web reading and PDF extraction. No independent subagents were used. The precise backend model identifier is not exposed by this session, so we do not guess it.

## Authorship and evidence boundary

Thịnh requested this work on behalf of the team and authorized repository operations and publication. Codex assists with requirements analysis, design, source, tests, verification and report drafting. Reports are written for the student team, with this assistance disclosed. The team retains responsibility for understanding, adopting and submitting the result. This log does not claim that Công or Hậu took part in this session, that a human personally ran an agent-run command, or that any member has already completed the final review.

The user's actual brief asked us to examine all requirements before implementing, finish the assignment, provide a ZIP including Git history, and show professional AI use with no fabrication. Tables below summarize actual analysis and decisions; they are not an invented transcript or verbatim questions from teammates.

## A01 - Understand the task before writing code

**Input:** Two attached PDFs, Classroom assignment text, FAQ URL, team roster and the existing AWAD workspace.

**Analysis:** Read both PDFs completely; inspect the existing repository and source metadata; read the live product-owner FAQ. Compare scored PA2 work with later milestone work. The previous repository is IA3's restaurant API; the downloaded report template also describes that unrelated restaurant final project.

**Changed:** Create a separate LeeTKOB project with a PA2-specific evidence matrix. Preserve the previous assignment. Use the five-section IA3 contract structure, without copying restaurant behavior.

**Rejected:** Retitle the old restaurant reports or reuse their test successes as LeeTKOB evidence. This would leave criterion 5 unsatisfied and misattribute earlier individual work to this team.

## A02 - Define the acceptance boundary

**Analysis questions:** Which operation most needs a hard refusal? Who owns a lab? Is admin a bypass? When can the deadline be checked? What if judging is still queued? How can retries be safe across a restart? Which failures should the client retry? Can an error disclose another class's data?

**Decision proposal:** Implement only publishing at this checkpoint, with a TA/class ownership check, non-disclosing 404, explicit pending-state errors, persistent natural idempotency and an atomic publication/audit transaction. Document extra choices separately from FAQ requirements.

**Rejected:** Build the full sandbox/model flow now and imply it has passed the later milestone safety/eval gates. No submitted C++ is executed in PA2 and no model service is connected.

See `docs/requirements.md` for the answers and source hierarchy. Subsequent entries are added only after their work and experiments occur.

## A03 - Diagnose a test-harness defect rather than mislabel it an API defect

**Observed:** The first local run on Node 24.11.0 passed 8 of 24 tests. Sixteen failed at the shared no-side-effects assertion: SQLite returns a null-prototype row, while the helper compared that row's prototype with an ordinary object. HTTP status/body assertions preceding the helper passed. Lint and type checking passed.

**Changed:** In a separate test-only correction after implementation commit `2917cec`, assert the scalar `count` equals zero for each of publications, marks and audit tables. This preserves the entire no-side-effect requirement and avoids asserting a database-driver implementation detail. No API source or contract clause changed.

**Rejected:** Loosen expected API statuses, skip the failed tests, or report the initial run as green. The rules forbid changing a test to excuse an implementation defect; they do permit an explained repair to an objectively incorrect test oracle. Git history makes this correction reviewable.

## A04 - Resolve dependency risk without ignoring peer constraints

**Observed:** The initial pinned development-tool set reported seven moderate advisories, all propagated from a minimatch denial-of-service advisory. ESLint 9 also reported that its release line is unsupported. An attempted in-place upgrade hit npm peer-resolution errors because the old lock/tree still selected the previous ESLint/parser versions.

**Changed:** Resolve a fresh lock from a clean temporary package directory, upgrade ESLint to 10 with its compatible TypeScript-ESLint peer range, and pin a fixed minimatch override. Install that lock with standard `npm ci`. The resulting audit reports zero vulnerabilities. Runtime application dependencies remain zero.

**Rejected:** Use `--force` or `--legacy-peer-deps`, hide audit output, or claim a development-only vulnerability is irrelevant. A manually requested dependency-directory cleanup was rejected by automatic command review; the safe alternative used npm's own clean-install workflow without that filesystem command.

## A05 - Inspect the actual CI environment

**Observed:** The initial GitHub Actions runs passed on the pinned application runtime but warned that the pinned v4 checkout/setup actions targeted deprecated Node 20. The runner forced them onto Node 24. This is separate from the Node 24.11.0 used by our application checks.

**Changed:** Resolve the official v6 tags through the upstream GitHub API, then pin their exact commit hashes in a later reviewed harness change. Keep the same four command invocations, read-only permissions, complete checkout, and no persistent Git credential.

**Rejected:** Rely on moving action tags, suppress the warning, or confuse an action's internal runtime with the tested application runtime.

## A06 - Prove a real merge refusal for a replay regression

**Experiment:** After enabling main protection, deliberately change only `src/app.ts` so a repeated publish returns 201 instead of the contracted 200. Commit `b68fe2a`, [PR #1](https://github.com/oppaii230205/leetkob-awad-2026/pull/1). Neither the contract nor tests changed.

**Observed:** [Run 42063214659](https://github.com/oppaii230205/leetkob-awad-2026/actions/runs/42063214659) passed lint, format and typecheck but failed two tests: repeated POST and simultaneous retry convergence. The test log records `201 !== 200`. GitHub reported the PR `blocked`; an authenticated merge request returned HTTP 405, `Required status check "tests" is failing.` Administrator enforcement was active.

**Changed:** Restore the response status in source-only repair `6d789ba`. [Run 42063503823](https://github.com/oppaii230205/leetkob-awad-2026/actions/runs/42063503823) passed all four checks; only then merge through the PR. The final source equals the pre-experiment source.

**Rejected:** Change the expected test status to 201, remove contract tests from `npm test`, set continue-on-error, or bypass main protection. The report labels this as a deliberate experiment, not an accidental bug or a human discovery we did not observe. The replay rule in AGENTS.md now points to this evidence.

## A07 - Probe class isolation independently of a status regression

**Experiment:** In `b870d02`, replace the exact TA membership SQL predicate with one that only checks a supplied identity is non-null. [PR #2](https://github.com/oppaii230205/leetkob-awad-2026/pull/2). Again, change source only; keep tests and contract fixed.

**Observed:** [Run 42063766722](https://github.com/oppaii230205/leetkob-awad-2026/actions/runs/42063766722) failed three tests: foreign ownership, revoked membership on replay, and membership recheck inside the transaction. Two responses were 200 where the contract requires 404; the malformed foreign request reached a 415 parser error instead of the non-disclosing 404. This demonstrates why check ordering matters as well as ownership itself. Lint/format/types stayed green. GitHub reported blocked and rejected another merge attempt with HTTP 405.

**Changed:** Source-only repair `95d5759` restores `t.ta_id = ?`. [Run 42064026830](https://github.com/oppaii230205/leetkob-awad-2026/actions/runs/42064026830) passed all four checks and 24 tests; PR #2 then merged. The class-ownership rule in AGENTS.md now traces directly to this real failed experiment. The source after repair equals the pre-experiment source.

**Rejected:** Role-only authorization, checking membership only before a body read, or treating an already-published lab as permission to return its receipt to any TA.

## How we use and evaluate the assistant

The assistant receives the source hierarchy and acceptance contract before code work. The rules file provides persistent project context; permissions bound tool actions; typed interfaces bound the implementation; tests turn contract clauses into executable checks; protected main turns check failures into a merge refusal. A tool run is evidence only when its actual exit status/result is recorded.

The assistant wrote both source and tests, so common misunderstandings are possible. We reduce that risk with a clause-to-test matrix, literal HTTP expectations independent of the implementation's error table, real SQLite/HTTP boundaries, injected transaction failure, fixed-clock boundary cases, and two source-only mutations that the unchanged tests catch. Green checks establish the tested behaviors, not all future product safety or a guaranteed lecturer mark.

All four checks use the same documented local and CI commands. The local test-harness correction is separate from API implementation; the two deliberate bad commits and both repairs change no tests. Git history and immutable run links allow a reviewer to verify those statements.

## A08 - Verify the secret boundary and the runnable demo

**Observed:** Gitleaks 8.30.1, downloaded from its official release and checked against the published SHA-256, found no leaks in all reachable history at capture time or the candidate-file snapshot. The repository is also readable without credentials through GitHub's public API. The reports preserve scan scope and limitations instead of saying a scanner can prove absolute absence.

**Changed:** Record raw redacted scan reports, public-visibility metadata, dependency audit and original CI diagnostics under `docs/evidence/`. Run the real standalone server with a randomly generated in-memory token and a temporary synthetic database: initial 200, repeat 200 with identical receipt and replay header, test-only identity denied with 401. The token is not saved or printed. Model calls remain zero.

**Rejected:** Include a demo secret in README, reuse an actual student submission as fixture data, or treat passing an injected-authentication test as proof that the standalone adapter rejects fixture identities. The demo has its own independent smoke evidence.

## Release evidence and final responsibility

The submitted source is identified by the pushed `pa2` tag. PA2.md links the exact tag's checks and the release record, which is populated after tag CI completes to avoid a self-referencing source commit. Archive integrity, extracted-checkout checks and the numeric final CI run are recorded in `.git/pa2-release-verification.json` and the release verification. These packaging records are not disguised as extra source commits.

The team coordinator's brief authorizes this implementation and release workflow. Submitting the artifact remains the student's final acceptance and responsibility. This session does not attest a human review or Classroom upload that was not observed.

## Team responsibility allocation

Thịnh requested that all execution remain under his GitHub account and that the report allocate the work equally. We allocate one third of team responsibility to each member: Thịnh for integration/release evidence, Công for harness/CI review, and Hậu for contract/behavior review. This is an allocation of responsibility for the team deliverable, not a fabricated claim of separate commits or completed individual review. All agent execution in this session is attributed to the requesting account with AI assistance.
