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

From the site (Vite): `fetch(`${import.meta.env.VITE_CHAT_URL}/api/chat`, {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({messages, mode:"text"})})`.
`VITE_CHAT_URL` is just the public worker URL (not a secret). Add the site origin to `ALLOWED_ORIGINS` in `wrangler.jsonc`.

## Commands you run yourself

```sh
cd worker
npm install
npx wrangler login             # opens browser; use the PERSONAL account on Workers Free
npx wrangler secret put GROQ_API_KEY   # paste the key from console.groq.com when prompted
# edit ALLOWED_ORIGINS in wrangler.jsonc to include the real site origin(s)
npx wrangler deploy
```

Local without login: `npx wrangler dev --local` (routing, CORS, rate limits work; AI calls fail with
"Binding AI needs to be run remotely"). `npx wrangler dev` (remote) uses real Neurons and needs login.
Checks: `npm run typecheck`, `npm test`.

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
