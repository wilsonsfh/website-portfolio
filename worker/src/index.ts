import knowledge from "../knowledge.md";
import knowledgeShort from "../knowledge-short.md";
import { handleAdmin } from "./admin/handler.ts";
import { FailLimiter, tokenEquals } from "./admin/logic.ts";
import { logChat, logUnknown, answersSections } from "./qa.ts";
import { FixedWindow, chatPersona, systemPrompt, unknownReply, isUnknown, visitorId, allowedOrigin, extractText, limitReason, nextUtcMidnight, validateChat, validateImagePrompt, refersToWilson, unsafeForWilson, wilsonPrompt, imageMime, type Msg } from "./logic.ts";

import { traceRequest, type RequestTrace, type TracingEnv } from "./langsmith.ts";

interface RateLimiter { limit(o: { key: string }): Promise<{ success: boolean }> }
export interface Env extends TracingEnv {
  AI: Ai;
  DB?: D1Database; // portfolio-qa: unanswered questions + Wilson's answers (optional so the worker still runs without it)
  RL_CHAT?: RateLimiter;
  RL_IMAGE?: RateLimiter;
  ALLOWED_ORIGINS: string;
  TEXT_MODEL: string;
  IMAGE_MODEL: string;
  WILSON_IMAGE_MODEL: string; // FLUX.2: takes reference photos, used when a prompt is about wilson
  ASSETS: Fetcher; // the built site, for wilson's reference photos (dist/ai-ref)
  GROQ_MODEL: string;
  ADMIN_TOKEN?: string; // secret: `wrangler secret put ADMIN_TOKEN`, the /admin password
  GROQ_API_KEY?: string; // secret
  FORCE_FALLBACK?: string; // "1" skips Workers AI so Groq answers (test via a preview version, never set in wrangler.jsonc)
}

const DAY = 86_400_000;
const DAILY = { chat: 60, image: 4 }; // per visitor per UTC-ish day (per isolate, best effort)
const day = new FixedWindow();
// When Workers AI said "daily limit", skip it until the reset instead of burning calls.
let aiBlockedUntil = 0;
const adminFails = new FailLimiter(10, 10 * 60_000); // failed /admin logins per IP


export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = allowedOrigin(req.headers.get("Origin"), env.ALLOWED_ORIGINS);
    const cors: Record<string, string> = origin
      ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" }
      : {};
    const json = (b: unknown, status = 200) =>
      new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json", ...cors } });

    const url = new URL(req.url);
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) return admin(req, env, ctx);
    if (req.method === "OPTIONS") return new Response(null, { status: origin ? 204 : 403, headers: cors });
    if (req.method !== "POST" || (url.pathname !== "/api/chat" && url.pathname !== "/api/image")) return json({ error: "not_found" }, 404);
    if (req.headers.get("Origin") && !origin) return json({ error: "origin_not_allowed" }, 403);

    const ip = req.headers.get("CF-Connecting-IP") ?? "unknown";
    const isImage = url.pathname === "/api/image";
    const binding = isImage ? env.RL_IMAGE : env.RL_CHAT;
    const burstOk = binding ? (await binding.limit({ key: ip })).success : true;
    const dayOk = day.hit(`${isImage ? "i" : "c"}:${ip}`, isImage ? DAILY.image : DAILY.chat, DAY);
    if (!burstOk || !dayOk) return json({ error: "rate_limited", message: "slow down a little, try again soon." }, 429);

    let body: unknown;
    try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

    return traceRequest(env, ctx, isImage ? "portfolio.image" : "portfolio.chat", (trace) =>
      isImage ? image(body, env, json, req.url, ctx, trace) : chat(body, env, json, ctx, trace));
  },
} satisfies ExportedHandler<Env>;

/** Wilson's unanswered-questions admin, mounted at /admin. The page is public; its API needs the ADMIN_TOKEN secret. */
async function admin(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const refuse = (error: string, status: number) =>
    new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  if (!env.DB) return refuse("no_database", 503);
  const ip = req.headers.get("CF-Connecting-IP") ?? "unknown";
  return handleAdmin(req, { ...env, DB: env.DB }, {
    base: "/admin",
    authorize: async (r) => {
      if (!env.ADMIN_TOKEN) return refuse("admin_disabled", 503); // no secret set = locked
      if (adminFails.blocked(ip)) return refuse("rate_limited", 429);
      if (tokenEquals(r.headers.get("X-Admin-Token") ?? "", env.ADMIN_TOKEN)) return null;
      adminFails.fail(ip);
      return refuse("unauthorized", 401);
    },
  }, ctx);
}

type J = (b: unknown, s?: number) => Response;

async function chat(body: unknown, env: Env, json: J, ctx: ExecutionContext, trace: RequestTrace): Promise<Response> {
  const v = validateChat(body);
  if (!v.ok) return json({ error: "bad_request", message: v.error }, 400);
  const messages: Msg[] = v.messages;
  const persona = chatPersona(body);
  const answers = await answersSections(env.DB);
  // Only the latest user message is ever logged, never the conversation.
  // every reply goes to the chat log (what the visitor saw); an UNKNOWN one also goes to the unanswered questions
  const finish = (answer: string, extra: { provider: string } & Record<string, unknown>) => {
    const question = messages[messages.length - 1].content;
    const unknown = isUnknown(answer);
    const shown = unknown ? unknownReply(persona) : answer;
    trace.metadata({ provider: extra.provider, fallback: extra.fallback === true, unknown, reason: typeof extra.reason === "string" ? extra.reason : undefined });
    ctx.waitUntil(logChat(env.DB, visitorId(body), "text", question, shown, extra.provider));
    if (unknown) ctx.waitUntil(logUnknown(env.DB, question));
    return json({ answer: shown, ...extra });
  };

  let reason: string | null = null;
  if (env.FORCE_FALLBACK === "1") reason = "forced";
  else if (Date.now() < aiBlockedUntil) reason = "daily_limit";
  else {
    try {
      const res = await trace.model("workers-ai.chat", { ls_provider: "cloudflare", ls_model_name: env.TEXT_MODEL }, () => env.AI.run(env.TEXT_MODEL as any, { messages: [{ role: "system", content: systemPrompt(persona, knowledge + answers.full) }, ...messages], max_tokens: 400, chat_template_kwargs: { enable_thinking: false } } as any));
      const answer = extractText(res);
      if (answer) return finish(answer, { provider: "workers-ai", fallback: false });
      return json({ error: "empty_answer" }, 502);
    } catch (e) {
      reason = limitReason(e);
      if (!reason) return json({ error: "upstream_error", message: String((e as Error)?.message ?? e) }, 502);
      if (reason === "daily_limit") aiBlockedUntil = nextUtcMidnight();
    }
  }

  // Fallback: Groq (text only). Its free tier allows ~8K tokens/minute, so it gets the short file.
  if (!env.GROQ_API_KEY) return json({ error: "unavailable", reason, message: "today's limit is reached and no fallback is configured." }, 503);
  trace.metadata({ fallback: true, reason, provider: "groq" });
  let r!: Response;
  let groq: unknown;
  try {
    groq = await trace.model("groq.chat", { ls_provider: "groq", ls_model_name: env.GROQ_MODEL, fallback: true }, async () => {
      r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.GROQ_API_KEY}` },
        body: JSON.stringify({ model: env.GROQ_MODEL, messages: [{ role: "system", content: systemPrompt(persona, knowledgeShort + answers.short) }, ...messages], max_tokens: 400, reasoning_effort: "low" }),
      });
      if (!r.ok) throw new Error("GROQ_HTTP_ERROR");
      return r.json();
    });
  } catch (error) {
    if (r && !r.ok) return json({ error: "fallback_failed", reason, status: r.status }, 503);
    throw error;
  }
  const answer = extractText(groq);
  return finish(answer, { provider: "groq", fallback: true, reason, imageAvailable: false });
}

// wilson's face for FLUX.2: two crops under 512px (the model's limit), served from the site's own assets
const REFS = ["/ai-ref/wilson-1.jpg", "/ai-ref/wilson-2.jpg"];

async function image(body: unknown, env: Env, json: J, url: string, ctx: ExecutionContext, trace: RequestTrace): Promise<Response> {
  const v = validateImagePrompt(body);
  if (!v.ok) return json({ error: "bad_request", message: v.error }, 400);
  const unavailable = () => json({ error: "image_unavailable", reason: "daily_limit", message: "image generation is unavailable today: the daily limit is reached." }, 503);
  if (Date.now() < aiBlockedUntil) return unavailable();
  const ofWilson = refersToWilson(v.prompt);
  trace.metadata({ provider: "workers-ai", image_kind: ofWilson ? "reference" : "text-to-image" });
  if (ofWilson && unsafeForWilson(v.prompt)) return json({ error: "bad_request", message: "let's keep pictures of wilson friendly. try another scene." }, 400);
  try {
    let res: { image?: string };
    if (ofWilson) {
      // FLUX.2 takes multipart form data; the photos go in as input_image_0 and input_image_1
      const form = new FormData();
      form.append("prompt", wilsonPrompt(v.prompt));
      form.append("width", "768");
      form.append("height", "768");
      for (const [i, path] of REFS.entries()) {
        const r = await env.ASSETS.fetch(new Request(new URL(path, url)));
        if (!r.ok) return json({ error: "reference_missing" }, 500);
        form.append(`input_image_${i}`, await r.blob());
      }
      const body = new Response(form);
      res = (await trace.model("workers-ai.image.reference", { ls_provider: "cloudflare", ls_model_name: env.WILSON_IMAGE_MODEL }, () => env.AI.run(env.WILSON_IMAGE_MODEL as any, { multipart: { body: body.body, contentType: body.headers.get("content-type") } } as any))) as { image?: string };
    } else {
      res = (await trace.model("workers-ai.image", { ls_provider: "cloudflare", ls_model_name: env.IMAGE_MODEL }, () => env.AI.run(env.IMAGE_MODEL as any, { prompt: v.prompt, steps: 4 } as any))) as { image?: string };
    }
    if (!res?.image) return json({ error: "empty_image" }, 502);
    ctx.waitUntil(logChat(env.DB, visitorId(body), "image", v.prompt, "(image)", "workers-ai"));
    return json({ image: res.image, mime: imageMime(res.image), provider: "workers-ai" });
  } catch (e) {
    const reason = limitReason(e);
    if (!reason) return json({ error: "upstream_error", message: String((e as Error)?.message ?? e) }, 502);
    if (reason === "daily_limit") aiBlockedUntil = nextUtcMidnight();
    return unavailable();
  }
}
