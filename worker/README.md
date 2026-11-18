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
are not logged. Wilson answers in the admin; saved answers (newest 40, capped by size, cached 5 minutes) are added to the
prompt as "Wilson's own answers" for both Workers AI and Groq. Design notes: `../docs/design-rationale.md` section 12.

Pieces: `../db/migrations/` (schema), `src/qa.ts` (public Worker D1 code), `../admin/` (Worker `portfolio-admin`: one HTML
page + JSON API, `handleAdmin` in `admin/src/handler.ts`), `../scripts/wiki-excerpt.mjs` (private wiki excerpt uploader).
The repo is public: the wiki excerpt lives only in D1 and in gitignored local files.

### Go-live steps (in order, run by Wilson)

```sh
cd worker
npx wrangler d1 create portfolio-qa            # prints a database_id
# paste it into database_id in worker/wrangler.jsonc AND admin/wrangler.jsonc (replace the 0000... placeholder)
npx wrangler d1 migrations apply portfolio-qa --remote   # run from worker/ (or admin/); creates the tables
cd ../admin && npm install                     # admin has its own package.json
cd .. && npm run deploy                        # public worker (site + chat) with the DB binding
npm run deploy:admin                           # portfolio-admin
```

Then turn on Cloudflare Access for the admin Worker only (Zero Trust dashboard; Access is free for up to 50 users):
1. Workers & Pages -> `portfolio-admin` -> Settings -> Domains & Routes -> on the `workers.dev` row choose "Enable Cloudflare
   Access" (this creates the Access application for that hostname). Leave `portfolio` open.
2. Edit the application's policy: Allow, Include "Emails" = Wilson's email only.
3. Defence in depth: the Worker returns 403 to any request without the `Cf-Access-Jwt-Assertion` header
   (`REQUIRE_ACCESS="true"` in `admin/wrangler.jsonc`). To also verify the JWT signature, set `ACCESS_TEAM_DOMAIN`
   (e.g. `yourteam.cloudflareaccess.com`) and `ACCESS_AUD` (the application's AUD tag) in `admin/wrangler.jsonc` and redeploy.
   Until both are set only the header's presence is checked.
4. Open `https://portfolio-admin.wilsonsoon.workers.dev` in a private window: you should get the Access login, not the page.

### Wiki excerpt (suggestions)

```sh
# 1. create admin/wiki-pages.local.txt (gitignored): one wiki page path per line, relative to the wiki root
node scripts/wiki-excerpt.mjs --dry-run --root ~/Projects/Personal_LLM_Wiki/wiki   # what would upload
node scripts/wiki-excerpt.mjs --root ~/Projects/Personal_LLM_Wiki/wiki             # writes admin/wiki-upload.local.sql
cd admin && npx wrangler d1 execute portfolio-qa --remote --file wiki-upload.local.sql   # REPLACES all chunks
```

Pages are cut by heading into about 300 to 600 word chunks (frontmatter, links and "related" sections stripped). The
"suggest" button retrieves the best chunks (FTS5, porter stemming) and asks Workers AI for a draft from them only.
Suggestions are stored in `questions.suggestion`, are never read by the public Worker and never shown to visitors.
Only publish text you would be fine seeing public: the draft is only a starting point, Wilson edits before saving.

### Local dev

```sh
cd admin && npx wrangler d1 migrations apply portfolio-qa --local --persist-to ../.wrangler/state
echo 'REQUIRE_ACCESS=false' > admin/.dev.vars        # gitignored; skips the Access check locally only
(cd worker && npx wrangler dev --local --persist-to ../.wrangler/state) &    # port 8787
(cd admin && npx wrangler dev --local --persist-to ../.wrangler/state --port 8788)
```

Both read the same local D1 through `--persist-to`. `AI` calls fail locally, so unknown-question logging only triggers
with a stubbed model. The public worker needs `../dist` to exist (`mkdir dist`) because of its assets config.
Checks: `npm test` and `npm run typecheck` in `worker/` and in `admin/`.

### Moving the admin onto the public Worker (`/admin`)

`handleAdmin(req, env, { base, authorize })` is mountable from either Worker. Switching: import it in `worker/src/index.ts`,
route `/admin*` to `handleAdmin(req, env, { base: "/admin", authorize: tokenCheck })`, add `"/admin*"` to `run_worker_first`,
write the `ADMIN_TOKEN` check (constant-time compare, failed-attempt rate limit, page keeps the token in sessionStorage and
sends it as a header; not built yet), then delete `admin/` and its Access application.
