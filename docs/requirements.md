# PA2 requirements and decisions

Team: Nguyễn Hưng Thịnh (23120200), Lê Thành Công (23120222), Nguyễn Phúc Hậu (23120252).

## Source hierarchy

1. The lecturer's PA2 rubric defines the seven scored criteria and submission evidence.
2. The class brief defines LeeTKOB and the mandatory safety boundaries. Its later milestones are a roadmap, not claims of PA2 completion.
3. The [product-owner FAQ](https://github.com/tkob-team/LeeTKOB-FAQ/blob/main/FAQ.md) settles behavior left open by the brief; the brief wins a conflict.
4. Our endpoint contract makes explicit implementation choices where those sources are silent.

The two supplied PDFs were read in full on 5 November 2026 before source implementation. The earlier restaurant exercise is a reference for contract structure only. It is not LeeTKOB. We preserve that repository outside this new project. The downloaded self-assessment template describes the restaurant final project; we do not apply its feature deductions to this PA2 rubric.

## Questions resolved before implementation

| Question                                                | Source or decision                                                                                                                                                           |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Must PA2 implement the entire judge, model and UI?      | No. Brief §7 and the PA2 rubric require the harness, gate and one endpoint contract with executable contract tests. The full flow is PA3 onward.                             |
| Which endpoint has the most consequential failure?      | We choose publishing: incorrect authorization or an ignored pending review exposes unapproved marks.                                                                         |
| Can any authenticated TA publish any lab?               | No. FAQ-01 limits TAs to their classes; verify membership for each call, including retries.                                                                                  |
| Is admin a publishing role?                             | Our contract reserves this action for an assigned TA. Admin manages accounts/classes; it does not bypass the human gate.                                                     |
| When is publishing permitted?                           | FAQ-12: at or after the server's deadline and after all queue items have TA decisions. We also require queued judging to finish so a late judge result cannot escape review. |
| Can an unsure verdict become a deduction automatically? | No (brief §3, FAQ-09). This endpoint consumes completed human decisions; it does not resolve verdicts or invent deductions.                                                  |
| What does retry mean?                                   | Natural idempotency by lab: one persisted publication and audit event, repeated authorized POST returns its original receipt. No expiring key is needed.                     |
| Should inaccessible labs return 403 or 404?             | Non-TA is 403; a TA's inaccessible lab is 404, indistinguishable from a missing lab. No foreign identifiers or counts are disclosed.                                         |
| Where do concurrency and crash safety live?             | SQLite transaction plus unique publication per lab. In-memory flags cannot survive restarts or coordinate connections.                                                       |
| Which model and spending cap apply now?                 | None is connected in PA2. No model key exists in this project; model spending is disabled, cap USD 0 per lab and total. Real calls are prohibited in tests.                  |
| What proves a merge was blocked?                        | Required checks with administrator enforcement, failed PR check runs, a rejected merge API request, then successful checks on a repair commit.                               |
| Can we claim everyone reviewed the result?              | Only recorded participation is attributed. The requesting member remains responsible for submission; no teammate approval or work is invented.                               |

## Deliverable map

| Rubric                  | Maximum | Planned evidence                                                                      |
| ----------------------- | ------: | ------------------------------------------------------------------------------------- |
| Rules file              |      15 | Short `AGENTS.md`, four sections; incident-linked rules                               |
| Permissions and secrets |      10 | `docs/permissions.md`, empty `.env.example`, history scan, explicit zero model budget |
| One command per check   |      10 | npm scripts and README; same invocations in CI                                        |
| CI blocks merges        |      20 | Protected main, required checks, red/repair PRs, no later direct pushes               |
| One endpoint contract   |      25 | `docs/contract/publish-lab.md`, five IA3-style sections                               |
| Contract tests bite     |      15 | HTTP tests, ownership, every problem type, retries and deliberate regressions         |
| AI log                  |       5 | Tool/task record, Changed and Rejected decisions with evidence                        |

The final report will map each claim to files and real GitHub evidence. A desired 100 is not evidence; the final assessment is conditional on completing all seven criteria.

## Remaining semester scope

PA3: account integration, lab/constraint management, queued C++ judging in an isolated sandbox, hard-rule-first model review. PA4: dev-set eval gates, evidence validation, TA queue, red-team report. PA5: grade computation and appeals, live results, telemetry, 80-submission load test, deployment and incident report. Each sandbox minimum needs its own attack test before executing any submitted code. PA2 does not execute C++ or call a model.
