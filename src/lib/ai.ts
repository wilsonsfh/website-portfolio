// client for the portfolio worker (worker/README.md). Same origin: the worker serves the site and /api/*;
// in dev, vite proxies /api to the deployed worker (vite.config.ts).
export const LIMIT_NOTE = "today's limit is reached, now on groq (text only)";
export const IMAGE_OFF = "image generation is unavailable today";

export type Turn = { role: "user" | "assistant"; content: string };
export type Result<T> = ({ ok: true } & T) | { ok: false; message: string };

// what the worker has told us this session; both only ever turn on
export const flags = { fallback: false, imageOff: false };
export const imageAvailable = () => !flags.fallback && !flags.imageOff;

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

// a random id per browser tab, so the chat log can group one visitor's messages (no IP or account behind it)
const visitor = () => {
  try {
    let v = sessionStorage.getItem("visitor-id");
    if (!v) { v = crypto.randomUUID(); sessionStorage.setItem("visitor-id", v); }
    return v;
  } catch { return undefined; }
};

async function post(path: string, body: object, signal?: AbortSignal): Promise<Result<{ data: any }>> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, visitor: visitor() }), signal });
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

// a message that plainly asks for a picture ("draw a cat", "image of wilson", "can you make a pixel art wallpaper"):
// the assistant and unread send it to image mode instead of the chat
const IMAGE_NOUN = "(?:image|picture|pic|photo|drawing|painting|illustration|portrait|sketch|pixel art|wallpaper|avatar)";
const MADE_NOUN = "(?:image|picture|pic|drawing|painting|illustration|portrait|sketch|pixel art|wallpaper|avatar)"; // not "photo": "show me his photos" means the real ones
const IMAGE_ASK = new RegExp(
  `^\\s*(?:(?:can|could|would|will) you\\s+|please\\s+|pls\\s+)?(?:draw|sketch|paint|illustrate|doodle)\\b` +
  `|\\b${IMAGE_NOUN}s?\\s+of\\b` +
  `|^\\s*(?:(?:can|could|would|will) you\\s+|please\\s+|pls\\s+)?(?:generate|create|make|render|show me|give me)\\b.*\\b${MADE_NOUN}s?\\b`,
  "i",
);
export const wantsImage = (q: string) => IMAGE_ASK.test(q);

export async function makeImage(prompt: string, signal?: AbortSignal): Promise<Result<{ src: string }>> {
  const r = await post("/api/image", { prompt: prompt.slice(0, 300) }, signal);
  if (!r.ok) return r;
  return { ok: true, src: `data:${r.data.mime ?? "image/jpeg"};base64,${r.data.image}` };
}
