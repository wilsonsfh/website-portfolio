# learnings

Things I learned building this site that I want to remember.

## 2026-11-18: how a backend keeps an API key secret

Anything your browser downloads, a visitor can read: right-click → Inspect → Network shows every request the page
makes, including its headers.

- **Browser calls Groq directly:** a request to Groq has to carry the key in a header. If the page called Groq itself,
  the key would sit in the page's JavaScript and travel in every request. Anyone could copy it from DevTools and use up
  my quota.
- **Through the Worker:** the browser sends only the question to the Worker. The Worker reads the key from Cloudflare's
  encrypted secret store and calls Groq itself. The browser only ever gets the answer back, so the key never reaches
  anyone's computer.

The Worker is on the internet, on Cloudflare's servers worldwide, not on my laptop. "In between" is just the order of
the chain: **visitor's browser → Worker (Cloudflare's servers) → AI model (Cloudflare's GPUs, or Groq)**. It only runs
on my laptop when I test with `wrangler dev`.

The Worker also rate-limits each visitor and only accepts requests from my own site, which is what makes a public URL
safe to expose.

## Same day, smaller ones

- **`*.workers.dev`** is a free subdomain on Cloudflare's domain: `<worker-name>.<account-subdomain>.workers.dev`. I set
  the account subdomain to `wilsonsoon`, so the Worker `portfolio` lives at `portfolio.wilsonsoon.workers.dev`.
  Changing the subdomain moves every Worker; for a minute or so browsers show `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`
  until the new certificate is issued.
- **`wrangler secret put NAME`** takes the secret's name; the value goes in at the prompt. Pasting the key as the
  argument makes the key the *name* and leaks it into shell history and wrangler's logs (rotate it if that happens).
  Run wrangler from the folder with `wrangler.jsonc`, or it asks for `--name`.
- **`VITE_*` variables** are pasted into the JavaScript at build time: public, and a change needs a rebuild. Never put
  secrets in them. Serving the site and the API from one Worker removed the one I had (`VITE_AI_URL`).
- **Thinking models** (Gemma 4 here) can spend the whole `max_tokens` on hidden reasoning and return an empty answer.
  Turning thinking off (`enable_thinking: false`) gave the right answer in 17 tokens instead of 200+.
- **Free hosting:** Cloudflare Workers Free serves static files free and unlimited and allows commercial use; Vercel
  Hobby has 100 GB/month and is personal use only. One platform for site + API is simpler.

## 2026-11-18: how `/api`, `/api/chat` and the Worker fit together

`/api` is just a prefix: a label meaning "this request is for the code, not for a file". `/api/chat` and `/api/image`
are the two endpoints under it. `fetch("/api/chat")` has no domain, which means "the same address this page came from",
so the same line works on localhost and deployed.

- **Deployed:** every request to `portfolio.wilsonsoon.workers.dev` hits Cloudflare, which checks the path. `/api/*`
  runs the Worker code (`/api/chat` asks the AI, `/api/image` makes an image, anything else is 404). Every other path
  (`/`, `/assets/…`, photos) is served straight from the uploaded `dist/` files and the Worker code never runs. That
  split is `"run_worker_first": ["/api/*"]` in `wrangler.jsonc`.
- **Localhost:** Vite serves the site but has no AI code, so `vite.config.ts` forwards anything starting with `/api` to
  the live Worker and hands the answer back. The browser thinks it talked to localhost, and local testing uses the real
  daily free limit.

**Who picks the endpoint:** the button, not the model. "send" → `askChat()` → `/api/chat` → text model; "image" →
`makeImage()` → `/api/image` → image model. The Worker is a plain switch on the path (after origin, rate-limit and
size checks). The model is the only non-deterministic part: it decides what to say or draw, never which model runs.
Letting the model decide ("tool calling") is more magical but costs more per message and is harder to keep free.

**Deploys and names:** `wrangler.jsonc` is just a file on my laptop; Cloudflare knows nothing until I deploy, and
nothing syncs on its own. Cloudflare identifies a Worker only by its `name`, not by which file or folder it came from:
deploy a name that exists and that Worker gets a new version; deploy a new name and you get a brand-new Worker (with no
secrets, since secrets belong to one Worker). Use `npm run deploy` from the repo root so the site is rebuilt first.

**Testing safely:** `wrangler versions upload --var FORCE_FALLBACK:1 --preview-alias groq-test` uploads a version with
its own URL (`groq-test-portfolio.wilsonsoon.workers.dev`) while production keeps serving the old one. That is how I
tested the Groq fallback without touching the live site.

## 2026-11-18: D1, an admin page, and the unanswered-questions loop

- **D1 is a real SQL database (SQLite) inside Cloudflare**, not key-value storage (that's KV). Free: 500 MB per database,
  100k rows written and 5M read per day; hitting a limit stops queries until 00:00 UTC, never bills.
- **Migrations** are SQL files that set up the structure; `apply` runs only the ones not run yet (tracked in a hidden
  `d1_migrations` table); `--remote` = the real database, `--local` = a copy on my laptop.
- **Constraints do the guarding:** `NOT NULL` refuses empty required columns, `DEFAULT` fills values the code leaves out,
  `UNIQUE` lets the database itself guarantee one row per question (with `ON CONFLICT`), `CHECK` allows only listed values.
- **A sentinel beats guessing:** the model replies exactly `UNKNOWN` when it can't answer, so the Worker detects it
  deterministically, logs the question and shows a fixed friendly line.
- **Full-text search matches words, not meaning** ("hobbies" didn't find "interests"); for a tiny corpus, send it whole.
- **A public repo changes where private text can live:** the wiki excerpt is a gitignored local file uploaded straight
  into D1.
- **`wrangler d1 create` offering to edit the config** added a second entry instead of filling mine, so `migrations
  apply` hit the placeholder id. Answer "no" and paste the id yourself.
