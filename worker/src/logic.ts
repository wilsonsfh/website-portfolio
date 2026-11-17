// Pure logic (no Workers APIs) so it can be unit-tested with plain node.

export type Msg = { role: "user" | "assistant"; content: string };

export const CAPS = { maxMessages: 6, maxMsgChars: 500, maxTotalChars: 1500, maxImagePrompt: 300 };

/** Why Workers AI cannot serve a request right now, or null if it is some other error. */
export function limitReason(err: unknown): "daily_limit" | "capacity" | null {
  const e = err as { message?: string; status?: number; code?: number } | undefined;
  const text = `${e?.message ?? err ?? ""}`;
  if (/\b3036\b/.test(text) || /daily free allocation/i.test(text)) return "daily_limit";
  if (/\b3040\b/.test(text) || /capacity/i.test(text)) return "capacity";
  if (e?.status === 429 || /\b429\b/.test(text)) return "daily_limit";
  return null;
}

/** Fixed-window counter per key. Per-isolate memory, so best effort (see README). */
export class FixedWindow {
  private m = new Map<string, { n: number; reset: number }>();
  /** true = allowed. */
  hit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
    if (this.m.size > 5000) for (const [k, v] of this.m) if (v.reset <= now) this.m.delete(k);
    const cur = this.m.get(key);
    if (!cur || cur.reset <= now) {
      this.m.set(key, { n: 1, reset: now + windowMs });
      return true;
    }
    if (cur.n >= limit) return false;
    cur.n++;
    return true;
  }
}

export function validateChat(body: unknown): { ok: true; messages: Msg[] } | { ok: false; error: string } {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: "messages must be a non-empty array" };
  const msgs: Msg[] = [];
  for (const m of raw.slice(-CAPS.maxMessages)) {
    const r = (m as Msg)?.role, c = (m as Msg)?.content;
    if ((r !== "user" && r !== "assistant") || typeof c !== "string") return { ok: false, error: "bad message" };
    if (c.length > CAPS.maxMsgChars) return { ok: false, error: `message over ${CAPS.maxMsgChars} chars` };
    msgs.push({ role: r, content: c });
  }
  if (msgs[msgs.length - 1].role !== "user") return { ok: false, error: "last message must be from user" };
  if (msgs.reduce((n, m) => n + m.content.length, 0) > CAPS.maxTotalChars) return { ok: false, error: "conversation too long" };
  return { ok: true, messages: msgs };
}

export function validateImagePrompt(body: unknown): { ok: true; prompt: string } | { ok: false; error: string } {
  const p = (body as { prompt?: unknown })?.prompt;
  if (typeof p !== "string" || !p.trim()) return { ok: false, error: "prompt required" };
  if (p.length > CAPS.maxImagePrompt) return { ok: false, error: `prompt over ${CAPS.maxImagePrompt} chars` };
  return { ok: true, prompt: p.trim() };
}

/** Echo the Origin back only if it is in the allow list. */
export function allowedOrigin(origin: string | null, list: string): string | null {
  if (!origin) return null;
  return list.split(",").map((s) => s.trim()).filter(Boolean).includes(origin) ? origin : null;
}

/** Workers AI text models answer either {response} or OpenAI-style {choices:[{message:{content}}]}. */
export function extractText(res: any): string {
  const t = res?.response ?? res?.choices?.[0]?.message?.content ?? res?.result?.response;
  return typeof t === "string" ? t.trim() : "";
}

/** Next 00:00 UTC (when the Neuron allowance resets). */
export function nextUtcMidnight(now = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}
