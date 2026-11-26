# portfolio chat worker

Cloudflare Worker behind the portfolio chat. Workers AI first (no key, `AI` binding), Groq as text-only fallback.
Decisions: `../docs/ai-chat-decisions.md`.

## Endpoints

- `POST /api/chat` body `{"messages":[{"role":"user","content":"..."}],"mode":"text"}`
  - ok: `{"answer","provider":"workers-ai"|"groq","fallback":bool,"reason"?,"imageAvailable"?}`
  - `fallback:true` means Workers AI's daily limit is used up and Groq answered (text only). The UI should show
    "today's limit is reached, now on groq (text only)" and hide the image button (`imageAvailable:false`).
- `POST /api/image` body `{"prompt":"..."}` -> `{"image":"<base64 jpeg>","mime":"image/jpeg"}`.
  When the daily limit is used up: 503 `{"error":"image_unavailable","reason":"daily_limit","message"}`.
- Errors: 400 bad input, 403 origin not allowed, 429 `rate_limited`, 502 upstream, 503 no fallback.

One worker serves both the built site (`../dist`, static assets) and `/api/*` (this code), at
`https://portfolio.wilsonsoon.workers.dev`. The site calls `/api/...` on its own origin through `src/lib/ai.ts`, so there
is no API URL setting and production calls are same-origin (the origin check still runs). In dev, `vite.config.ts` proxies `/api` to the deployed worker, so
`localhost:4321` must stay in `ALLOWED_ORIGINS`.

## Commands you run yourself

```sh
cd worker
npm install
npx wrangler login             # opens browser; use the PERSONAL account on Workers Free
npx wrangler secret put GROQ_API_KEY   # paste the key from console.groq.com when prompted
cd .. && npm run deploy        # builds the site, then deploys site + worker together
```

Local without login: `npx wrangler dev --local` (routing, CORS, rate limits work; AI calls fail with
"Binding AI needs to be run remotely"). `npx wrangler dev` (remote) uses real Neurons and needs login.
Checks: `npm run typecheck`, `npm test`.
Gemma 4 is a thinking model: the chat call passes `chat_template_kwargs: { enable_thinking: false }`, otherwise it spends
`max_tokens` on reasoning and `content` comes back null (`empty_answer`).

## Rate limits

- Burst, per IP: Rate Limiting binding (chat 8 per 60s, image 1 per 60s). The binding only allows 10s or 60s periods
  and counts per Cloudflare location, so it is approximate.
- Daily, per IP: in-memory fixed window (chat 60, image 4), per isolate, so best effort and reset when the isolate recycles.
- Backstop: Workers Free stops at 10,000 Neurons/day, so the worst case is the chat going dark, not a bill. Keep the account on Workers Free.
  Once Workers AI answers 3036 the Worker skips it until 00:00 UTC.
- A strict global image cap would need a Durable Object or KV counter; not built (not needed for correctness, only for tighter budgeting).

## Models (env vars in wrangler.jsonc, change without code edits)

`TEXT_MODEL` `@cf/google/gemma-4-26b-a4b-it`, `IMAGE_MODEL` `@cf/black-forest-labs/flux-1-schnell`,
`GROQ_MODEL` `openai/gpt-oss-20b`. Re-check the Workers AI catalog before deploy: models get deprecated often.

## Knowledge

`knowledge.md` (Workers AI) and `knowledge-short.md` (Groq, under ~1,500 tokens for its ~8K tokens/minute free tier)
are hand-written and edited directly; nothing regenerates them. Keep them inside the allowlist in
`../docs/ai-chat-decisions.md`, and keep the preparation-time app paragraph word for word.

## Unanswered questions (D1 + admin)

When the model can't answer from the knowledge it replies with the sentinel `UNKNOWN`. The Worker swaps that for a fixed
friendly line and logs the visitor's latest message (only that, no conversation, no IP, no identifier) to D1 table
`questions`, deduped on a normalized form with an `asked_count`. At most 500 questions can be open; past that, new ones
are not logged. Wilson answers at `https://portfolio.wilsonsoon.workers.dev/admin`; saved answers (newest 40, capped by
size, cached 5 minutes) are added to the prompt as "Wilson's own answers" for both Workers AI and Groq.
Design notes: `../docs/design-rationale.md` section 12.

Pieces: `../db/migrations/` (schema), `src/qa.ts` (D1 logging and answers), `src/admin/` (admin page + JSON API,
`handleAdmin` mounted by `src/index.ts`), `../scripts/wiki-excerpt.mjs` (private wiki excerpt uploader). The repo is
public: the wiki excerpt lives only in D1 and in gitignored local files.

### Admin auth

`/admin` serves a page that only shows a password box. Every `/admin/api/*` call needs the `ADMIN_TOKEN` Worker secret in
an `X-Admin-Token` header (constant-time compare). The page keeps what you type in sessionStorage only. 10 failed attempts
per IP in 10 minutes lock that IP out for the rest of the window (in-memory per isolate, best effort). With no secret set
the API answers 503. Responses send `Cache-Control: no-store` and `X-Robots-Tag: noindex`. Use a long random token.

### Go-live steps (in order, run by Wilson)

```sh
cd worker
npx wrangler d1 create portfolio-qa            # prints a database_id; paste it into database_id in wrangler.jsonc
npx wrangler d1 migrations apply portfolio-qa --remote   # creates the tables
npx wrangler secret put ADMIN_TOKEN            # the /admin password (long random string)
cd .. && npm run deploy                        # site + chat + /admin, with the DB binding
```

### Wiki excerpt (suggestions)

```sh
# 1. create scripts/wiki-pages.local.txt (gitignored): one wiki page path per line, relative to the wiki root
node scripts/wiki-excerpt.mjs --dry-run --root ~/Projects/Personal_LLM_Wiki/wiki   # what would upload
node scripts/wiki-excerpt.mjs --root ~/Projects/Personal_LLM_Wiki/wiki             # writes scripts/wiki-upload.local.sql
cd worker && npx wrangler d1 execute portfolio-qa --remote --file ../scripts/wiki-upload.local.sql   # REPLACES all chunks
```

Pages are cut by heading into about 300 to 600 word chunks (frontmatter, links and "related" sections stripped). The
"suggest" button retrieves the best chunks (FTS5, porter stemming) and asks Workers AI for a draft from them only.
Suggestions are stored in `questions.suggestion`, are never read by the chat and never shown to visitors. The draft is
only a starting point: Wilson edits before saving, and only saved answers go live.

### Local dev

```sh
cd worker
npx wrangler d1 migrations apply portfolio-qa --local
echo 'ADMIN_TOKEN=test' > .dev.vars        # gitignored
mkdir -p ../dist && npx wrangler dev --local   # /admin on port 8787
```

`AI` calls fail locally, so logging an unknown question and drafting suggestions need a stubbed `env.AI` (a wrapper entry
that calls the real handler with a fake `AI`). The D1 paths work as is. Checks: `npm test` and `npm run typecheck`.

### Separate admin Worker (alternative)

`handleAdmin(req, env, { base, authorize })` is a mountable seam. To host it as its own Worker behind Cloudflare Access
instead (git history has that version), call it from a new Worker with `base: ""` and an `authorize` that checks the
`Cf-Access-Jwt-Assertion` header or JWT, and drop the `/admin` route here.


## Optional LangSmith tracing

No CLI login is needed. The Worker uses the `langsmith` SDK directly; LangChain and LangGraph are not required.
Tracing is disabled in `wrangler.jsonc` until both `LANGSMITH_TRACING=true` and a server-side API key are present.

For production, create an API key in LangSmith → Settings → API Keys, then from `worker/` run:

```sh
npx wrangler secret put LANGSMITH_API_KEY
```

Set `LANGSMITH_TRACING` to `"true"` in `wrangler.jsonc` and deploy with the root `npm run deploy`.
For local development, copy `.dev.vars.example` to `.dev.vars` and set the key/flag there.
The default project is `portfolio-assistant`; optional `LANGSMITH_ENDPOINT` selects the account's API region,
and `LANGSMITH_WORKSPACE_ID` selects a workspace where required by the API key. Never use a `VITE_` variable
for these secrets. To disable exports, set the flag back to `"false"` and redeploy.

Open the `portfolio-assistant` project in LangSmith. A fallback request appears as:

```text
portfolio.chat [provider=groq, fallback=true, status_code=200]
├─ workers-ai.chat [model, error=MODEL_FAILED]
└─ groq.chat [model, tokens when reported]
```

Image requests appear as `portfolio.image` with one `workers-ai.image` or `workers-ai.image.reference` span.
Authenticated admin drafts appear as `portfolio.admin.suggest` with a `workers-ai.suggest` span.
The public UI and existing D1 logging are unchanged. Each request has its own tracing client, and
`ctx.waitUntil()` flushes its batch after responding so serverless shutdown does not discard queued spans.
Trace-export failures are best effort and do not fail the assistant request.

| Stage | Model | Input → output | Parallelism | On failure |
|-------|-------|----------------|-------------|------------|
| Text answer | `TEXT_MODEL` (Workers AI) | Knowledge, approved answers, recent conversation → answer | One call | Recognized capacity/limit failures use Groq; other errors retain existing responses |
| Text fallback | `GROQ_MODEL` | Short knowledge and recent conversation → answer | After primary failure, or when primary is blocked/forced off | Existing unavailable/error response; no new retries |
| Image | `IMAGE_MODEL` or `WILSON_IMAGE_MODEL` | Prompt, optional reference assets → image | Separate endpoint | Existing limit/error response; no image fallback |
| Admin suggestion | `TEXT_MODEL` | Retrieved wiki chunks and question → private draft | Separate authenticated request | Existing admin error response; draft still needs manual saving |
| LangSmith export | None | Routing metadata, counts, timing and status → trace batch | After response | Two-second network timeout, no configured retries; does not alter app responses |

Only metadata is exported. Prompts, conversation text, knowledge/wiki excerpts, visitor IDs/IPs, answers,
image prompts, reference photos, generated images, keys and raw provider errors are not sent to LangSmith.
Numeric token usage is recorded only when returned by a provider. This keeps content-based evaluation disabled;
adding such evaluations would require a separate decision about what content to export.

`npm test` includes real SDK serialization with mocked providers and trace ingestion, testing hierarchy,
fallbacks, HTTP errors, image branches, disabled/missing credentials and trace failures without API spend.
