import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

registerHooks({ load(url, context, next) {
  if (url.endsWith(".md")) return { format: "module", source: `export default ${JSON.stringify(readFileSync(new URL(url), "utf8"))}`, shortCircuit: true };
  return next(url, context);
} });
const { default: worker } = await import("../src/index.ts");
const { RequestTrace } = await import("../src/langsmith.ts");
const { handleAdmin } = await import("../src/admin/handler.ts");
const originalFetch = globalThis.fetch;
const rows: any[] = [];
let groqStatus = 200;
let groqCalls = 0;
globalThis.fetch = async (url, init) => {
  const path = String(url);
  if (path.startsWith("https://api.groq.com/")) {
    groqCalls++;
    return Response.json({ choices: [{ message: { content: "PRIVATE_GROQ_ANSWER" } }], usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 } }, { status: groqStatus });
  }
  assert.ok(path.startsWith("https://langsmith.invalid/"), "unexpected network request");
  if (path.endsWith("/info")) return Response.json({ batch_ingest_config: { use_multipart_endpoint: false } });
  const batch = JSON.parse(new TextDecoder().decode(init!.body as Uint8Array));
  rows.push(...(batch.post || []));
  return Response.json({});
};
const env: any = {
  LANGSMITH_TRACING: "true", LANGSMITH_API_KEY: "PRIVATE_LS_KEY", LANGSMITH_ENDPOINT: "https://langsmith.invalid",
  LANGSMITH_AGENT_ID: "portfolio-test", LANGSMITH_AGENT_ENVIRONMENT: "production", ALLOWED_ORIGINS: "https://portfolio.example",
  TEXT_MODEL: "text-test", IMAGE_MODEL: "image-test", WILSON_IMAGE_MODEL: "reference-test", GROQ_MODEL: "groq-test", GROQ_API_KEY: "PRIVATE_GROQ_KEY",
  AI: { run: async () => ({ response: "PRIVATE_ANSWER", usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 } }) },
  ASSETS: { fetch: async () => new Response("PRIVATE_PHOTO") },
};
async function request(path = "chat", body: unknown = { messages: [{ role: "user", content: "PRIVATE_QUESTION" }] }, overrides = {}) {
  rows.length = 0;
  const pending: Promise<unknown>[] = [];
  const response = await worker.fetch(new Request(`https://portfolio.example/api/${path}`, { method: "POST", body: JSON.stringify(body) }), { ...env, ...overrides }, { waitUntil: (p: Promise<unknown>) => pending.push(p) } as any);
  await Promise.all(pending);
  return { response, body: await response.json() as any };
}
try {
  let result = await request();
  assert.equal(result.body.answer, "PRIVATE_ANSWER");
  const root = rows.find(r => r.name === "portfolio.chat");
  const model = rows.find(r => r.name === "workers-ai.chat");
  assert.equal(root.address, "lrn:agents/portfolio-test/environments/production");
assert.equal(root.session_name, undefined);
  assert.equal(model.parent_run_id, root.id);
  assert.deepEqual(model.outputs.usage_metadata, { input_tokens: 4, output_tokens: 2, total_tokens: 6 });
  assert.equal(root.extra.metadata.fallback, false);
  assert.ok(!JSON.stringify(rows).includes("PRIVATE_"));

  // A primary capacity failure falls back, and both attempts remain in one trace.
  result = await request("chat", undefined, { AI: { run: async () => { throw new Error("capacity exhausted PRIVATE_ERROR"); } } });
  assert.equal(result.body.provider, "groq");
  assert.ok(rows.find(r => r.name === "workers-ai.chat").error);
  assert.equal(rows.find(r => r.name === "portfolio.chat").extra.metadata.fallback, true);
  assert.equal(new Set(rows.map(r => r.trace_id)).size, 1);
  assert.ok(!JSON.stringify(rows).includes("PRIVATE_"));

  groqStatus = 503;
  result = await request("chat", undefined, { FORCE_FALLBACK: "1" });
  assert.equal(result.response.status, 503);
  assert.ok(rows.find(r => r.name === "groq.chat").error);
  assert.ok(rows.find(r => r.name === "portfolio.chat").error);
  groqStatus = 200;

  for (const prompt of ["draw a cat", "draw wilson in space"]) {
    result = await request("image", { prompt }, { AI: { run: async () => ({ image: "PRIVATE_IMAGE" }) } });
    assert.equal(result.body.image, "PRIVATE_IMAGE");
    assert.equal(rows.filter(r => r.run_type === "llm").length, 1);
    assert.ok(!JSON.stringify(rows).includes("PRIVATE_"));
  }

  result = await request("chat", undefined, { LANGSMITH_TRACING: "false" });
  assert.equal(result.body.answer, "PRIVATE_ANSWER"); assert.equal(rows.length, 0);
  result = await request("chat", undefined, { LANGSMITH_API_KEY: undefined });
  assert.equal(result.body.answer, "PRIVATE_ANSWER"); assert.equal(rows.length, 0);

  // Private wiki text and admin drafts stay out of traces too.
  const pending: Promise<unknown>[] = [];
  const DB = { prepare: () => ({
    bind() { return this; },
    first: async () => ({ question: "PRIVATE_ADMIN_QUESTION" }),
    all: async () => ({ results: [{ page: "private", heading: "private", text: "PRIVATE_WIKI" }] }),
    run: async () => ({ meta: { changes: 1 } }),
  }) };
  const draft = await handleAdmin(new Request("https://portfolio.example/admin/api/questions/1/suggest", { method: "POST" }),
    { ...env, DB }, { base: "/admin", authorize: async () => null }, { waitUntil: p => pending.push(p) });
  await Promise.all(pending);
  assert.equal(draft.status, 200);
  assert.ok(rows.find(r => r.name === "portfolio.admin.suggest"));
  assert.ok(rows.find(r => r.name === "workers-ai.suggest"));
  assert.ok(!JSON.stringify(rows).includes("PRIVATE_"));

  const savedConsoleError = console.error;
  console.error = () => {};
  try {
  const offline = new RequestTrace(env, "offline", { createRun: async () => { throw Error("offline"); }, flush: async () => { throw Error("offline"); } } as any);
  assert.equal(await offline.model("model", {}, async () => "still works"), "still works");
  offline.finish(200); await offline.flush();
  } finally { console.error = savedConsoleError; }
  assert.ok(groqCalls >= 2);
  console.log("LangSmith Worker tests passed (mock providers and trace transport)");
} finally { globalThis.fetch = originalFetch; }
