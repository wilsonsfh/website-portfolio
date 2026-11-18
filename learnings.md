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
