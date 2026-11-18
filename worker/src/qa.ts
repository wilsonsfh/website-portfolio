import { MAX_OPEN_QUESTIONS, buildAnswersSection, normalizeQuestion, type Answered } from "./logic.ts";

/** Log a question the assistant could not answer. Dedupes on the normalized text. Never throws. */
export async function logUnknown(db: D1Database | undefined, question: string): Promise<void> {
  if (!db) return;
  try {
    const q = question.trim().slice(0, 500);
    const normalized = normalizeQuestion(q);
    if (!normalized) return;
    const now = new Date().toISOString();
    const bumped = await db
      .prepare("UPDATE questions SET asked_count = asked_count + 1, last_asked = ? WHERE normalized = ?")
      .bind(now, normalized)
      .run();
    if (bumped.meta.changes > 0) return;
    // new question: skip when the open list is already full (abuse limit)
    await db
      .prepare(
        "INSERT INTO questions (question, normalized, first_asked, last_asked) SELECT ?1, ?2, ?3, ?3 WHERE (SELECT COUNT(*) FROM questions WHERE status = 'open') < ?4 ON CONFLICT (normalized) DO NOTHING",
      )
      .bind(q, normalized, now, MAX_OPEN_QUESTIONS)
      .run();
  } catch (e) {
    console.error("logUnknown failed", e);
  }
}

const TTL = 5 * 60_000;
let cache: { rows: Answered[]; at: number } | null = null;

/** Wilson's answers (newest 40), cached in memory for 5 minutes so most requests skip D1. */
async function answeredRows(db: D1Database): Promise<Answered[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.rows;
  try {
    const { results } = await db
      .prepare("SELECT question, answer FROM questions WHERE status = 'answered' AND answer IS NOT NULL ORDER BY answered_at DESC LIMIT 40")
      .all<Answered>();
    cache = { rows: results, at: Date.now() };
  } catch (e) {
    console.error("answers load failed", e);
    cache = { rows: cache?.rows ?? [], at: Date.now() - TTL + 30_000 }; // retry in 30s
  }
  return cache.rows;
}

/** Prompt section for both providers; the Groq one is smaller because of its token limit. */
export async function answersSections(db: D1Database | undefined): Promise<{ full: string; short: string }> {
  if (!db) return { full: "", short: "" };
  const rows = await answeredRows(db);
  return { full: buildAnswersSection(rows, 40, 6000), short: buildAnswersSection(rows, 20, 3000) };
}
