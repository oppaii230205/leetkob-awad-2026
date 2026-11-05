import { DatabaseSync } from "node:sqlite";
import { Problem } from "./problem.ts";

export interface Principal {
  id: string;
  role: "ta" | "student" | "admin";
}

export interface Publication {
  labId: number;
  status: "published";
  publishedAt: string;
  publishedBy: string;
  submissionCount: number;
}

interface Lab {
  id: number;
  deadline: string;
}

export const schema = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS labs (
    id INTEGER PRIMARY KEY CHECK (id > 0),
    class_id INTEGER NOT NULL,
    deadline TEXT NOT NULL
  ) STRICT;
  CREATE TABLE IF NOT EXISTS ta_classes (
    ta_id TEXT NOT NULL,
    class_id INTEGER NOT NULL,
    PRIMARY KEY (ta_id, class_id)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS counted_submissions (
    id INTEGER PRIMARY KEY,
    lab_id INTEGER NOT NULL REFERENCES labs(id),
    student_id TEXT NOT NULL,
    judge_status TEXT NOT NULL CHECK (judge_status IN ('queued','running','AC','WA','TLE','MLE','RE','CE')),
    score_tenths INTEGER NOT NULL CHECK (score_tenths BETWEEN 0 AND 100),
    UNIQUE (lab_id, student_id)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS review_items (
    submission_id INTEGER NOT NULL REFERENCES counted_submissions(id),
    constraint_id TEXT NOT NULL,
    decision TEXT CHECK (decision IN ('pass','violation')),
    PRIMARY KEY (submission_id, constraint_id)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS publications (
    lab_id INTEGER PRIMARY KEY REFERENCES labs(id),
    receipt TEXT NOT NULL
  ) STRICT;
  CREATE TABLE IF NOT EXISTS published_marks (
    lab_id INTEGER NOT NULL REFERENCES publications(lab_id),
    submission_id INTEGER NOT NULL REFERENCES counted_submissions(id),
    score_tenths INTEGER NOT NULL CHECK (score_tenths BETWEEN 0 AND 100),
    PRIMARY KEY (lab_id, submission_id)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS publication_audit (
    lab_id INTEGER PRIMARY KEY REFERENCES publications(lab_id),
    actor_id TEXT NOT NULL,
    at TEXT NOT NULL,
    event TEXT NOT NULL CHECK (event = 'lab.published')
  ) STRICT;
`;

export class PublicationRepository {
  readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA busy_timeout = 250;");
    this.db.exec(schema);
  }

  close(): void {
    this.db.close();
  }

  private ownedLab(labId: number, principal: Principal): Lab {
    const lab = this.db
      .prepare(
        `SELECT l.id, l.deadline FROM labs l
         JOIN ta_classes t ON t.class_id = l.class_id
         WHERE l.id = ? AND t.ta_id = ?`,
      )
      .get(labId, principal.id) as unknown as Lab | undefined;
    if (!lab) throw new Problem("not-found");
    return lab;
  }

  assertAccess(labId: number, principal: Principal): void {
    this.ownedLab(labId, principal);
  }

  publish(
    labId: number,
    principal: Principal,
    now: Date,
  ): { receipt: string; replayed: boolean } {
    try {
      this.db.exec("BEGIN IMMEDIATE");
      const lab = this.ownedLab(labId, principal);
      const existing = this.db
        .prepare("SELECT receipt FROM publications WHERE lab_id = ?")
        .get(labId) as { receipt: string } | undefined;
      if (existing) {
        this.db.exec("COMMIT");
        return { receipt: existing.receipt, replayed: true };
      }

      const deadline = Date.parse(lab.deadline);
      if (!Number.isFinite(deadline) || !Number.isFinite(now.getTime())) {
        throw new Problem("internal");
      }
      if (now.getTime() < deadline) throw new Problem("deadline-not-reached");
      const pendingJudge = this.db
        .prepare(
          `SELECT 1 FROM counted_submissions
           WHERE lab_id = ? AND judge_status IN ('queued', 'running') LIMIT 1`,
        )
        .get(labId);
      if (pendingJudge) throw new Problem("judging-pending");
      const pendingReview = this.db
        .prepare(
          `SELECT 1 FROM review_items r
           JOIN counted_submissions s ON s.id = r.submission_id
           WHERE s.lab_id = ? AND r.decision IS NULL LIMIT 1`,
        )
        .get(labId);
      if (pendingReview) throw new Problem("reviews-pending");

      const { count } = this.db
        .prepare(
          "SELECT COUNT(*) AS count FROM counted_submissions WHERE lab_id = ?",
        )
        .get(labId) as { count: number };
      const receipt: Publication = {
        labId,
        status: "published",
        publishedAt: now.toISOString(),
        publishedBy: principal.id,
        submissionCount: count,
      };
      const text = JSON.stringify(receipt);
      this.db
        .prepare("INSERT INTO publications (lab_id, receipt) VALUES (?, ?)")
        .run(labId, text);
      this.db
        .prepare(
          `INSERT INTO published_marks (lab_id, submission_id, score_tenths)
           SELECT lab_id, id, score_tenths FROM counted_submissions WHERE lab_id = ?`,
        )
        .run(labId);
      this.db
        .prepare(
          `INSERT INTO publication_audit (lab_id, actor_id, at, event)
           VALUES (?, ?, ?, 'lab.published')`,
        )
        .run(labId, principal.id, receipt.publishedAt);
      this.db.exec("COMMIT");
      return { receipt: text, replayed: false };
    } catch (error) {
      if (this.db.isTransaction) this.db.exec("ROLLBACK");
      if (
        error instanceof Error &&
        "errcode" in error &&
        (error.errcode === 5 || error.errcode === 6)
      ) {
        throw new Problem("publication-unavailable");
      }
      throw error;
    }
  }
}
