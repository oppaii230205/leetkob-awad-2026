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

## Team responsibility allocation

## A04 - Resolve dependency risk without ignoring peer constraints

**Observed:** The initial pinned development-tool set reported seven moderate advisories, all propagated from a minimatch denial-of-service advisory. ESLint 9 also reported that its release line is unsupported. An attempted in-place upgrade hit npm peer-resolution errors because the old lock/tree still selected the previous ESLint/parser versions.

**Changed:** Resolve a fresh lock from a clean temporary package directory, upgrade ESLint to 10 with its compatible TypeScript-ESLint peer range, and pin a fixed minimatch override. Install that lock with standard `npm ci`. The resulting audit reports zero vulnerabilities. Runtime application dependencies remain zero.

**Rejected:** Use `--force` or `--legacy-peer-deps`, hide audit output, or claim a development-only vulnerability is irrelevant. A manually requested dependency-directory cleanup was rejected by automatic command review; the safe alternative used npm's own clean-install workflow without that filesystem command.

## Team responsibility allocation (continued)

Thịnh requested that all execution remain under his GitHub account and that the report allocate the work equally. We allocate one third of team responsibility to each member: Thịnh for integration/release evidence, Công for harness/CI review, and Hậu for contract/behavior review. This is an allocation of responsibility for the team deliverable, not a fabricated claim of separate commits or completed individual review. All agent execution in this session is attributed to the requesting account with AI assistance.
