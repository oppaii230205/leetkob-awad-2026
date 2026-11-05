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
