import { NOTHING, ftsQuery, sameOrigin, suggestMessages, type Chunk } from "./logic.ts";
import { page } from "./page.ts";

export interface Env {
  AI: Ai;
  DB: D1Database;
  TEXT_MODEL: string;
}

/**
 * The admin as one mountable module (mounted at "/admin" by the public worker, see ../index.ts). Env needs only AI, DB
 * and TEXT_MODEL. The HTML page is public (it only shows a password box); every /api call goes through `authorize`.
 */
export interface Mount {
  base: string; // path prefix the admin is served under, e.g. "/admin"
  authorize: (req: Request) => Promise<Response | null>; // pluggable auth: null = allowed, else the refusal to send
}

const STATUSES = ["open", "answered", "dismissed"];
const ORDER: Record<string, string> = {
  open: "asked_count DESC, last_asked DESC",
  answered: "answered_at DESC",
  dismissed: "last_asked DESC",
};
const COLS = "id, question, asked_count, first_asked, last_asked, status, answer, answered_at, suggestion, suggested_at";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

export async function handleAdmin(req: Request, env: Env, mount: Mount): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.startsWith(mount.base) ? url.pathname.slice(mount.base.length) || "/" : null;
  if (path === null) return json({ error: "not_found" }, 404);

  if (req.method === "GET" && path === "/") {
    return new Response(page(mount.base), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  }
  if (!path.startsWith("/api/")) return json({ error: "not_found" }, 404);
  if (req.method !== "GET" && !sameOrigin(req.headers.get("Origin"), req.url)) return json({ error: "bad_origin" }, 403);
  const refused = await mount.authorize(req);
  if (refused) return refused;
  if (req.method === "GET" && path === "/api/questions") {
    const status = url.searchParams.get("status") ?? "open";
    if (!STATUSES.includes(status)) return json({ error: "bad_status" }, 400);
    const [list, counts] = await env.DB.batch([
      env.DB.prepare(`SELECT ${COLS} FROM questions WHERE status = ? ORDER BY ${ORDER[status]} LIMIT 200`).bind(status),
      env.DB.prepare("SELECT status, COUNT(*) AS n FROM questions GROUP BY status"),
    ]);
    return json({ questions: list.results, counts: Object.fromEntries((counts.results as { status: string; n: number }[]).map((r) => [r.status, r.n])) });
  }

  const m = path.match(/^\/api\/questions\/(\d+)(?:\/(suggest|answer|dismiss|reopen))?$/);
  if (!m) return json({ error: "not_found" }, 404);
  const id = Number(m[1]);
  const act = m[2];
  const now = new Date().toISOString();

  if (req.method === "DELETE" && !act) {
    await env.DB.prepare("DELETE FROM questions WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }
  if (req.method === "POST" && act === "dismiss") return changed(await env.DB.prepare("UPDATE questions SET status = 'dismissed' WHERE id = ?").bind(id).run());
  if (req.method === "POST" && act === "reopen") return changed(await env.DB.prepare("UPDATE questions SET status = 'open' WHERE id = ?").bind(id).run());
  if (req.method === "PUT" && act === "answer") {
    const a = ((await req.json().catch(() => null)) as { answer?: unknown } | null)?.answer;
    if (typeof a !== "string" || !a.trim() || a.length > 2000) return json({ error: "bad_answer" }, 400);
    return changed(await env.DB.prepare("UPDATE questions SET status = 'answered', answer = ?, answered_at = ? WHERE id = ?").bind(a.trim(), now, id).run());
  }
  if (req.method === "POST" && act === "suggest") return suggest(env, id, now);
  return json({ error: "not_found" }, 404);
}


const changed = (r: D1Result) => (r.meta.changes ? json({ ok: true }) : json({ error: "not_found" }, 404));

/** Draft an answer from the top wiki chunks. Stored for the admin only; never read by the public worker. */
async function suggest(env: Env, id: number, now: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT question FROM questions WHERE id = ?").bind(id).first<{ question: string }>();
  if (!row) return json({ error: "not_found" }, 404);

  const match = ftsQuery(row.question);
  const chunks = match
    ? (
        await env.DB.prepare(
          "SELECT c.page, c.heading, c.text FROM wiki_chunks_fts f JOIN wiki_chunks c ON c.id = f.rowid WHERE wiki_chunks_fts MATCH ? ORDER BY bm25(wiki_chunks_fts) LIMIT 4",
        ).bind(match).all<Chunk>()
      ).results
    : [];

  let suggestion = NOTHING;
  if (chunks.length) {
    try {
      const res = (await env.AI.run(env.TEXT_MODEL as any, { messages: suggestMessages(row.question, chunks), max_tokens: 300, chat_template_kwargs: { enable_thinking: false } } as any)) as any;
      const t = res?.response ?? res?.choices?.[0]?.message?.content;
      if (typeof t !== "string" || !t.trim()) return json({ error: "empty_answer" }, 502);
      suggestion = t.trim();
    } catch (e) {
      return json({ error: "ai_error", message: String((e as Error)?.message ?? e) }, 502);
    }
  }
  await env.DB.prepare("UPDATE questions SET suggestion = ?, suggested_at = ? WHERE id = ?").bind(suggestion, now, id).run();
  return json({ suggestion, suggested_at: now });
}
