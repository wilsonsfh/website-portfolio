// client for the portfolio worker (worker/README.md). VITE_AI_URL = the worker's public url, no trailing slash needed.
const BASE = (import.meta.env.VITE_AI_URL as string | undefined)?.trim().replace(/\/+$/, "");

export const NOT_CONNECTED = "the assistant isn't connected yet.";
export const LIMIT_NOTE = "today's limit is reached, now on groq (text only)";
export const IMAGE_OFF = "image generation is unavailable today";

export type Turn = { role: "user" | "assistant"; content: string };
export type Result<T> = ({ ok: true } & T) | { ok: false; message: string };

// what the worker has told us this session; both only ever turn on
export const connected = !!BASE;
export const flags = { fallback: false, imageOff: false };
export const imageAvailable = () => !!BASE && !flags.fallback && !flags.imageOff;

// the worker caps: 6 messages, 500 chars each, 1500 in total, last one from the user
const fit = (turns: Turn[]): Turn[] => {
  const out: Turn[] = [];
  let total = 0;
  for (const t of turns.slice(-6).reverse()) {
    const content = t.content.slice(0, 500);
    if (total + content.length > 1500 && out.length) break;
    total += content.length;
    out.unshift({ role: t.role, content });
  }
  while (out.length > 1 && out[0].role !== "user") out.shift();
  return out;
};

async function post(path: string, body: unknown, signal?: AbortSignal): Promise<Result<{ data: any }>> {
  if (!BASE) return { ok: false, message: NOT_CONNECTED };
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    return { ok: false, message: "couldn't reach the assistant. try again in a bit." };
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, data };
  if (data.error === "image_unavailable") { flags.imageOff = true; return { ok: false, message: `${IMAGE_OFF}.` }; }
  if (res.status === 429) return { ok: false, message: data.message ?? "slow down a little, try again soon." };
  if (data.error === "unavailable" || data.error === "fallback_failed") return { ok: false, message: "the assistant is out of answers for today. the contact links are the best way to ask." };
  return { ok: false, message: data.message ?? "something went wrong, try again." };
}

export async function askChat(turns: Turn[], signal?: AbortSignal): Promise<Result<{ answer: string }>> {
  const r = await post("/api/chat", { messages: fit(turns), mode: "text" }, signal);
  if (!r.ok) return r;
  if (r.data.fallback) flags.fallback = true;
  return { ok: true, answer: String(r.data.answer ?? "") };
}

export async function makeImage(prompt: string, signal?: AbortSignal): Promise<Result<{ src: string }>> {
  const r = await post("/api/image", { prompt: prompt.slice(0, 300) }, signal);
  if (!r.ok) return r;
  return { ok: true, src: `data:${r.data.mime ?? "image/jpeg"};base64,${r.data.image}` };
}
