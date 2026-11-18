// Pure logic for the admin worker (unit-tested with plain node).

const STOP = new Set(
  "a an and are as at be been but by can could did do does for from had has have he her him his how i in is it its me my of on or our she so than that the their them they this to was we were what when where which who why will with would you your wilson soon tell about any".split(" "),
);

/** FTS5 MATCH expression for a visitor question: stop words dropped, each term quoted, OR-joined. "" if nothing is left. */
export function ftsQuery(question: string): string {
  const terms = new Set<string>();
  for (const w of question.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (w.length >= 3 && !STOP.has(w)) terms.add(w);
    if (terms.size >= 12) break;
  }
  return [...terms].map((t) => `"${t}"`).join(" OR ");
}

export type Chunk = { page: string; heading: string; text: string };

export const NOTHING = "nothing in the wiki about this";

/** Messages for drafting an answer ONLY from wiki excerpts. */
export function suggestMessages(question: string, chunks: Chunk[], maxChars = 9000) {
  let size = 0;
  const parts: string[] = [];
  for (const c of chunks) {
    const piece = `[${c.heading}]\n${c.text}`;
    if (size + piece.length > maxChars) break;
    parts.push(piece);
    size += piece.length;
  }
  const system = `you draft answers for the portfolio site of wilson soon. a visitor asked a question the site's assistant could not answer.
write a short draft answer (1 to 3 sentences) using ONLY the EXCERPT below.
rules:
- lowercase, friendly and casual, like the site. no first person ("i"): write about wilson in the third person or state the fact directly.
- start with the answer itself. no preamble, no lists.
- never invent or guess. do not add facts that are not in the excerpt.
- the draft will be published to the public after wilson reviews it, so leave out anything private: health, family, relationships, money, grades, job search, salary, other people's names.
- if the excerpt does not contain the answer, reply with exactly: ${NOTHING}
EXCERPT:
${parts.join("\n\n---\n\n")}`;
  return [{ role: "system" as const, content: system }, { role: "user" as const, content: question }];
}

/** A non-GET request must come from the admin page itself (blocks cross-site form posts riding the Access cookie). */
export function sameOrigin(origin: string | null, url: string): boolean {
  return !origin || origin === new URL(url).origin;
}

/** Constant-time string compare (no early exit on the first differing byte). */
export function tokenEquals(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return d === 0;
}

/** Failed-login counter per key (per isolate, best effort). Blocks a key for the rest of its window. */
export class FailLimiter {
  private m = new Map<string, { n: number; reset: number }>();
  private max: number;
  private windowMs: number;
  constructor(max: number, windowMs: number) {
    this.max = max;
    this.windowMs = windowMs;
  }
  blocked(key: string, now = Date.now()): boolean {
    const c = this.m.get(key);
    return !!c && c.reset > now && c.n >= this.max;
  }
  fail(key: string, now = Date.now()): void {
    if (this.m.size > 2000) for (const [k, v] of this.m) if (v.reset <= now) this.m.delete(k);
    const c = this.m.get(key);
    if (!c || c.reset <= now) this.m.set(key, { n: 1, reset: now + this.windowMs });
    else c.n++;
  }
}

/** Read-only database tab: the only tables it can show. Names come from this list, never from the request. */
export const DB_TABLES = ["questions", "wiki_chunks"] as const;
export const DB_PAGE_SIZE = 50;

/** Validate a table name and page number from the request; null = refuse. Returns bound LIMIT/OFFSET values. */
export function dbPage(table: string, pageParam: string | null): { table: (typeof DB_TABLES)[number]; page: number; limit: number; offset: number } | null {
  const t = DB_TABLES.find((x) => x === table);
  if (!t) return null;
  const raw = pageParam ?? "1";
  if (!/^\d{1,6}$/.test(raw) || Number(raw) < 1) return null;
  const page = Number(raw);
  return { table: t, page, limit: DB_PAGE_SIZE, offset: (page - 1) * DB_PAGE_SIZE };
}
