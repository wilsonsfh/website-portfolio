# AI chat: Wilson's decisions (2026-11-17)

Research and options: `docs/ai-chat-proposal.md`. Nothing is indexed or deployed yet.

## Providers

- Primary: Cloudflare Workers AI on Wilson's PERSONAL Cloudflare account (Workers Free, hard daily Neuron cap, no card).
  Called through the Worker's `AI` binding, so there is no API key for it anywhere.
- Workers AI also does text-to-image. Make that visible to visitors: a clear "generate image" button/mode in the chat.
- When the daily Neurons run out (Workers AI returns 429 / error 3036): show a clear message that today's limit is
  reached and that the chat has fallen back to Groq, which answers text only and cannot generate images.
- Fallback: Groq free tier. `GROQ_API_KEY` lives only as a Worker secret (`wrangler secret put`), never in the repo
  or the browser. Wilson creates the key and runs `wrangler login` himself.
- Verify current model ids, Neuron costs (image generation is expensive per call) and Groq limits before building;
  add a per-visitor rate limit so image generation cannot drain the day's pool.

## Knowledge (allowlist)

Include:
- `projects/apple-notestox.md` and `projects/x-bookmark-injector.md` (whole pages; strip wikilinks and "related" sections).
  Only the `projects/` pages, none of the `concepts/` pages.
- The site's own public data: `src/data/work-experience.json`, `projects.json`, `activities.json`.
- Excerpt, KL summit: Wilson attended the Cloudflare APJC Tech Summit in Kuala Lumpur, 3 to 6 August 2026.
- Excerpt, the preparation-time app (Wilson's public wording, no internal product names): an app that integrates and
  automates criteria matching for clients, so customer engineers prepare better and spend less time on technical
  preparation before meeting a client. It primes them with what they need from the client's data before the
  conversation, so they don't have to gather it all themselves. 100+ customer engineers use it; after his internship
  people kept using it and building on it, because its source is open to the rest of the Cloudflare team.
  (No other numbers.)
- Side fact: Wilson uses MCP servers and agent skills in his AI/agentic workflow, e.g. a Canvas MCP, a Socratic tutor
  skill and a 4-step Karpathy-guidelines skill. ("kapate" in his voice note: Karpathy, confirmed 2026-11-17.)

Exclude: `concepts/docker-images-and-containers.md`, `concepts/linux-capabilities-and-tun-devices.md`,
`concepts/hypervisors-type1-type2.md`, all other `concepts/` pages, `canvas-mcp` as a page, and everything else in the wiki.
Show Wilson the final built knowledge file before deploying.
