# Portfolio v2: design rationale

Written 2026-11-18. It covers why v2 looks and works the way it does, and how it was built. Sources: `SPIKE-PROGRESS.md`,
`docs/v2-research-notes.md`, `docs/ai-chat-decisions.md`, `docs/ai-chat-proposal.md`, `worker/README.md`, `learnings.md`,
the git history of `v2` and the branches merged into it, and a skim of the code. Anything I inferred rather than read is
marked "(inferred)". Nothing here is a secret value.

## 1. Purpose and audience

The site shows who Wilson is and what he has built. Readers are recruiters, engineers and peers (research notes). Two
needs pull against each other:

- Be memorable. Wilson's brief was a greeting that is interactive but does not waste the visitor's time.
- Never block the content. Every résumé fact has to stay reachable fast, on a phone too, with reduced motion on.

Most choices below are one of those two needs winning an argument.

## 2. Overall concept

**What.** The site opens as a small desktop on a retro green screen: a top bar, app icons (about.txt, work, projects,
activities, photos, contact, a terminal, the "(1) unread" messages app, `plaintextversion.html`), draggable windows, a
dock for minimised windows. The plain, minimal page sits below it in the same document.

**Why a desktop.** Three combined concepts were prototyped on 2026-11-15: A "screening room" (doors, then a photo strip),
B "desktop" and C "messages" (a self-playing chat). Wilson picked B. The spike notes also recorded B's cost: it adds a
click and a window between a recruiter and the résumé text, and on phones sheets cost more taps than the plain page's
accordion. That finding drove the next two decisions.

**Why the plain version stays.**
- The plain page is the real content. It is always one icon away (`plaintextversion.html`, the top-bar icon right of the
  clock) and it stays in the document below the desktop so crawlers and no-JS readers get it ("Keep MainPage below for
  crawlers").
- It started as a "plain site →" text link and an Escape shortcut. Wilson then chose a small icon placed like a macOS
  menu-bar item and dropped the Escape shortcut, the "↓ plain site" cues and the power-off screen's link. Cue and
  shortcut removal was his call; the sources do not give his reason (inferred: they cluttered the screen).
- Return visitors land on the desktop already on, not on the boot screen (sessionStorage; first visit gets power-off then
  boot).

**Alternatives.** A and C are kept as `archive/spike-a-screening-room` and `archive/spike-c-messages`. C's chat survived as
an app inside B. A's paper-scroll idea survived as the photo scrolls. The stack changed before the spikes, at Wilson's
request: v1 was Astro 5 + Tailwind 3 + vanilla JS; v2 is Vite + React 19 + TypeScript + Tailwind v4 + `motion`. v1 stays on
`main` and `version-one`.

## 3. Visual design

### Theme: retro green two-tone print
- **What.** Deep green ink (`#123D2B`) on cream paper (`#F1EAD3`), accent green, a static film-grain layer, and a dark
  mode in green-black with cream text. Wallpaper is a grayscale photo mapped between two greens, so any photo lands inside
  the palette.
- **Why.** Wilson's reference was a grainy two-tone print desktop (blue); he asked for green. He also asked for less
  translucency than the first pass had, and bigger icons and windows. The first desktop used a neutral veil over photos;
  the retro pass replaced it with solid paper panels.
- **Alternative.** The v1 palette (beige, navy, purple) was not carried over; the greeting overrides the site tokens only
  inside `.gr-root` and the tooltips, so the plain page keeps the v1 look.

### Type
- The plain page keeps Inter (body) and the lowercase-everything convention from v1. The terminal and boot text use the
  system monospace stack (read in `greeting.css`). Windows open larger by default so text is readable without zooming.
  Whether the desktop UI uses Inter for titles and labels I did not verify (inferred).

### Colour discipline
- Colour is the theme and the accent; the messages app uses plain matte ink bubbles (dark ink for Wilson, paper for the
  visitor) switched by CSS variables. Dark mode is a class on `<html>`, same mechanism as v1.
- Contrast for the wallpaper veil was computed by hand, not measured in a browser (spike notes, flagged "unverified").

### Icons
- Bigger, more prominent app icons came from Wilson's round-3 request. The AI icon had to be original and plain, "NOT a
  Siri icon".
- Layout (round 4, Wilson's exact arrangement): two columns for rows 1–5 (about.txt | (1) unread, work | terminal,
  projects, involvements, plaintext-version.html), then contact, photos, timeline in row 6 from the far left. Why two
  columns: the timeline scrolls start right after the icon block, so a narrow block gives them more room. Short screens
  (under ~780px tall) tighten the rows so row 6 never clips.
- Glyphs: projects is a static bulb with three rays (a flicker-on-hover version was built and rejected: Wilson didn't
  like it); involvements (renamed from activities) is a puzzle piece; timeline is a film strip.
- Clicking an open app's icon closes its window (a minimised one is restored instead), so icons work as toggles.

### Windows
- Pointer-captured drag, 8 resize handles, maximise (button or double-click), minimise to a bottom dock, and tooltips
  rendered in a portal because a fixed tooltip inside a transformed, overflow-hidden window mispositioned. Title-bar
  buttons have a 44px-tall hit area. Phone widths (<640px) use full-screen sheets, no drag.
- Why: the concept is a desktop, so windows should behave like ones. On phones drag has no value, so it is dropped
  (spike "Unknowns": drag and stack are pure overhead on touch).

### Cursor
- An original pixel cursor on fine pointers only (`d24c0dd`). Wilson's reference was a MapleStory cursor set. His rule:
  original lookalikes only, never copy or download Nexon sprites or the rw-designer cursors.

### Boot
- A retro progress bar with an original pixel star-eyed slime and an orange-capped mushroom; hover or tap makes a big hop
  (`BootBar.tsx`). MapleStory-flavoured, "not over-themed" (Wilson). Copyright is the reason the art is original. The boot
  must stay skippable and short: first-visit only, noted at about 1.0 to 1.3s.
- Power-off and switch-on: CRT line and collapse, a static burst and a sine glide on Web Audio, with a persisted sound
  toggle (default on). This is the first-visit "delight" moment and is allowed to be longer.

### Phones
- More minimal. The rolled-up scroll stub that would have covered the first icon column on a phone was removed: the
  rolled scroll hides, and the photos icon brings it back. No photo stub on phones.

## 4. Motion principles

These come from Emil Kowalski's rules, condensed in `docs/v2-research-notes.md`. The ones that shaped the build:

| Principle | Where it is applied |
|---|---|
| Frequency gate: rare moments may have delight, frequent or keyboard-driven ones get none | Boot, CRT off and scroll roll-out are first-time or rare. Keyboard moves in the photo grid and viewer are instant. |
| Easing: `cubic-bezier(0.23,1,0.32,1)` for enter/exit, `(0.32,0.72,0,1)` for drawer-like motion, `linear` for constant motion, never ease-in | Window minimise/maximise FLIP 240ms; scroll roll-out 900ms with 110ms stagger; scroll drift is linear. |
| Durations: press 100-160ms, UI under 300ms, exits faster than entrances | Press `scale(0.97)` 160ms; window open 200ms in, 120ms out; roll-up 320ms vs roll-out 900ms. |
| Never enter from `scale(0)` | Windows open from `scale(0.95)` plus fade. |
| Animate `transform` and `opacity`; no `transition: all` | Windows, dock, viewer slides, FLIP. |
| Interruptible: WAAPI or transitions on anything re-triggerable | Roll-up continues from the current progress if toggled mid-roll; an interrupted maximise restarts from the visible rect; grabbing the viewer mid-slide continues from the visible position. |
| Drag tracks 1:1, pointer capture, rubber-band, release velocity, momentum `v/1000 * 0.998/(1-0.998)` | Scroll lanes (drift resumes 2s after release) and the photo viewer (rubber band 0.35, commit at 25% width or 0.11px/ms). |
| Tooltips: delay only the first | 400ms first delay, neighbours instant until the pointer has left all triggers for 300ms. |
| Hover behind a fine-pointer query | Tooltips and cursor are for fine pointers only. |
| Reduced motion: gentler, not zero | Opacity-only, 150-200ms fades; no roller, momentum, bounce or stagger. |
| Slow where the visitor decides, fast where the system responds | Boot is slow once; windows are fast. |

One exception, by choice: sound ignores reduced motion (spike notes); it has its own toggle instead.
Verification of motion was done by eye in desktop Chrome. Real touch, iOS Safari and reduced motion were not checked as of
the last handover.

## 5. Information architecture

- **Apps** map to the v1 sections: about, work, projects, activities, contact, plus the terminal, messages, photos and the
  plain-site window. Their content is the same JSON the plain page uses (`src/data/*.json`, shared copy in `src/copy.ts`),
  so there is one source of truth. Chosen so that updating a project updates both views.
- **Terminal** (`help`, `whoami`, `ls`, `cat about.txt`, `open <x>`, `unroll`, `exit`): a second route to the same content
  for people who like it; unknown input prints a hint.
- **Timeline scrolls** (round 4: their own film-strip icon, "timeline"; the photos icon opens the gallery) are the
  greeting for photos: four paper lanes (career, people, me, scenery) that unroll over the
  desktop. The idea came from Wilson's anime reference videos (paper hand-scroll with a roller; the research notes say the
  border pattern must be his own, not the anime's). Final behaviour after rounds 2-3: lanes loop forever, a top strip
  holds a close button and an "open photos app" button, and clicking a photo opens it in the Photos viewer. Why circular:
  Wilson asked for no empty gap at the end. Round 4: nothing is visible until timeline is clicked (no rolled-up stub on any
  width); the close button and "all photos" are cream chips (the old × was dark green on the dark green wallpaper, so it
  looked missing); roll-up takes 0.8s with a soft ease; lanes unroll in a shuffled order with small random gaps (motion
  borrowed from Wilson's scroll reference video: fast start, long settle, no bounce). Opening the scrolls no longer
  minimises open windows (that caused a stray "about.txt" dock chip); the scrolls sit above windows instead.
- **No page below the desktop** (round 4): the old plain page under the greeting was removed; the plaintext-version.html
  window and the top-bar icon cover it, and the terminal's `exit` opens that window.
- **Photos app** is iCloud-style: chronological grid, sidebar of albums, month jump, square/original toggle, a viewer with
  swipe, zoom to 4x, filmstrip and info. It exists so the 114 photos can be browsed, not only watched drifting.
- **Story data** is `src/data/story.json`: lanes plus items with date, caption and `src`. Wilson edited captions (68
  applied) and dates through small local HTML editors that print `id = caption` or `id = date` lines he pastes back
  (method, section 9). Undated items sort last. Photos are stripped of metadata and resized by `npm run photos:add`.
- **Messages "(1) unread"** is Spike C's thread as an app. The scripted opening (8 lines, about 6.7s) stays; everything
  after it is answered by the AI. Why script the opening: it is the part where Wilson's reviewed wording matters most
  (every line was reviewed by him, with a `needsReview` flag until then). The chat-script topic answers are now unused and
  left in place.

## 6. AI assistant

### What the visitor sees
A plain AI icon in the top bar opens a glow animation and a retro Spotlight-style bar; the same backend answers in
(1) unread. Both have a clear "image" button. All of it is original design, no Apple assets.

### Architecture (text diagram)

```
visitor's browser
   |  fetch("/api/chat")  or  fetch("/api/image")      (same origin, no URL setting)
   v
Cloudflare Worker "portfolio"  -- https://portfolio.wilsonsoon.workers.dev
   |- path not /api/*  -> static assets from dist/ (Worker code never runs)
   |- /api/*           -> worker code (run_worker_first)
        checks: origin allowed -> burst rate limit -> daily per-IP limit -> input size/shape
        /api/chat  -> Workers AI (gemma-4-26b-a4b-it, AI binding, no key)
                        \-- on daily-limit error 3036 -> Groq (gpt-oss-20b, text only, key is a Worker secret)
        /api/image -> Workers AI (flux-1-schnell); 503 image_unavailable when the daily allocation is gone
```
In dev, `vite.config.ts` proxies `/api` to the deployed worker, so local testing uses the real free allowance.

### Provider choices
- **Primary: Workers AI on Wilson's personal Cloudflare account (Workers Free).** From the proposal's comparison table:
  it is the only option with a hard daily stop, no card, hundreds of answers a day, and no key to leak because the Worker
  uses a binding. Worst case is the chat going dark for the day, never a bill. Condition: the account must stay on Workers
  Free; a work account must not be used.
- **Alternatives in the proposal:** Groq as the only host (8K tokens/minute and 200K/day cap it near 40 to 60 answers a
  day), OpenRouter free (50 requests/day unless $10 is bought), Gemini free tier (one click from pay-as-you-go, and free
  content is used to improve Google products), WebLLM in the browser (best privacy, but 0.5B-1B models and 300MB-1GB
  downloads, poor on phones).
- **Text model.** The proposal suggested llama-3.1-8b-instruct-fp8-fast. The build uses `@cf/google/gemma-4-26b-a4b-it`; the
  sources do not record why it was swapped (inferred: a newer and stronger catalog model; ids are env vars so they change
  without code edits).
- **Thinking off.** Gemma 4 is a thinking model. Without `chat_template_kwargs.enable_thinking=false` it spends
  `max_tokens` on reasoning and returns null content (`empty_answer`). With it off, a test answered in 17 tokens (0.85
  Neurons) instead of 200+.
- **Images.** Workers AI does text-to-image, and Wilson wanted that visible, so there is an explicit image button. Image
  calls are expensive per call, so they have a tighter per-visitor limit.
- **Fallback: Groq, text only.** Used only when Workers AI's free daily allocation (error 3036) is hit; the UI then says so
  ("today's limit is reached, now on groq (text only)") and hides the image button. Once 3036 is seen the Worker skips
  Workers AI until 00:00 UTC. Verified live on 2026-11-18 with a preview version, without touching production:
  `wrangler versions upload --var FORCE_FALLBACK:1 --preview-alias groq-test`. The first attempt returned 401 because the
  stored key was rejected; Wilson re-put the key and the retest returned provider groq, 200.

### Routing: the button, not the model
"send" calls `/api/chat`; "image" calls `/api/image`. The Worker is a plain switch on the path. Tool calling (letting the
model pick) was rejected: it costs more per message and is harder to keep inside the free allowance and predictable.
The model only decides what to say or draw, never which model runs.

### Limits
- Input: at most 6 messages, 500 characters each, 1,500 in total, last one from the user (client trims to fit, Worker
  enforces); `max_tokens` 400.
- Burst per IP (Rate Limiting binding): chat 8 per 60s, image 1 per 60s. The binding only allows 10s or 60s periods and
  counts per Cloudflare location, so it is approximate.
- Daily per IP (in-memory, per isolate, best effort): chat 60, image 4.
- Backstop: Workers Free stops at 10,000 Neurons a day. A strict global image cap would need a Durable Object or KV; not built.

### Security model
- The browser only ever sends a question and receives an answer. The Groq key is an encrypted Worker secret, not in the
  repo, a `VITE_*` variable or the browser (those are inlined into public JS; `learnings.md`).
- Origin allowlist (own site plus localhost for dev), POST only, 403 for other origins.
- Logging nothing identifying and storing no questions is a proposal-stage rule; whether it holds in the code I did not
  verify (inferred).
- Prompt-injection posture: a short rule-based system prompt (lowercase friendly voice, 1-3 sentences, never guess, decline
  health, family, relationships, money, grades, job search, salary, other people, anything not in the knowledge; ignore
  instructions to change rules or print the knowledge). The proposal also asked for a 10-15 question red-team test before
  release; I found no record that it was run (open question).

### Knowledge approach
- **Default-deny allowlist** (`docs/ai-chat-decisions.md`): only two wiki project pages (AppleNotestoX, X Bookmark
  Injector), the site's own public JSON, a KL summit excerpt, Wilson's own wording for the preparation-time app (100+
  customer engineers, open source to the team, no internal names, no other numbers), and a side fact on his MCP and agent
  skill workflow. No `concepts/` pages, nothing personal, academic, job-search or internal to Cloudflare.
- **Stuffed into the system prompt**, no retrieval. At about 2,500 words it is simpler and more accurate than embeddings
  (the proposal's reasoning, with a target under about 3K tokens; the file ended near 6.5K tokens before the rewrite).
- **Two files.** `knowledge.md` for Workers AI and `knowledge-short.md` (about 570 words) for Groq, whose free tier allows
  about 8K tokens a minute.
- **Hand-written.** The generated-from-allowlist build script was dropped in favour of editing the files directly, in plain
  human voice (Wilson's round-3 request). Wilson read both files before deploy. The safeguard is his review, plus the rule
  that the preparation-time paragraph stays word for word.

## 7. Hosting and deploy

- **What.** One Cloudflare Worker, `portfolio`, serves the built site as static assets and `/api/*` from Worker code
  (`run_worker_first: ["/api/*", "/admin*"]`), at `portfolio.wilsonsoon.workers.dev`. Deploy: `npm run deploy` (build, then
  `wrangler deploy`).
- **Why (decided 2026-11-18).** One platform. Same origin, so no CORS and no `VITE_AI_URL`. Static requests are free and
  unlimited on Workers Free. Commercial use is allowed; Vercel Hobby is personal-use only with a 100 GB/month cap.
- **Alternatives.** The earlier plan, written the same day, left the site on Vercel and deployed only the Worker, with
  `VITE_AI_URL` set in Vercel and CORS allowing the Vercel origin. The site was briefly on Vercel (2026-11-15) as a
  temporary publish of the prebuilt Vite output while Wilson's Claude limit reset. The Vercel project and the older
  `wilson-portfolio-chat` Worker are now deleted.
- **Two Workers, then one.** Day one had two: `wilson-portfolio-chat` (AI only, while the site sat on Vercel) and then
  `portfolio` (site + AI). Renaming in `wrangler.jsonc` doesn't rename a Worker, it creates a new one, so for a while both
  existed (the new one without the Groq secret until it was set again). Once `portfolio` was verified, the old Worker was
  deleted. A second split was considered for the admin: a separate `portfolio-admin` Worker behind Cloudflare Access
  (Access covers a whole Worker on `workers.dev`, so a separate Worker was the only way to protect just the admin with it).
  It was built (commit 4439fbf) and then folded into `/admin` on the public Worker with an `ADMIN_TOKEN` password, because
  Wilson wanted one link. Result: one Worker, one database, one deploy command.
- **Gotchas recorded.** A Worker is identified only by its name: a new name makes a new Worker with no secrets. Preview
  versions snapshot secrets at upload. Run wrangler from the folder with `wrangler.jsonc`. After a preview upload, the
  newest version is the preview, so run `npm run deploy` before the next `secret put`.

## 8. Trade-offs and rejected alternatives

| Choice | Rejected | Why |
|---|---|---|
| Concept B (desktop) | A (screening room), C (messages first) | Wilson's pick. A's and C's best parts were reused. |
| Desktop with plain site one icon away | Desktop only | The desktop costs taps and is poor on phones; the plain page must stay easy to reach. |
| Workers AI first | Groq-only, OpenRouter, Gemini, WebLLM | Hard stop, no card, no key, most answers per day. |
| Button picks the endpoint | Model tool calling | Cost, predictability, free-tier safety. |
| Stuff knowledge in the prompt | Embeddings or keyword retrieval | Small file; accuracy; simplicity. |
| Hand-written knowledge | Generated from the wiki by a script | Tone control and review; Wilson asked for it. |
| One Worker for site and API | Vercel site + Worker | See section 7. |
| Original pixel art and cursor | Nexon sprites, rw-designer cursors | Copyright. |
| Scripted opening in messages, AI after | Fully scripted, fully AI | Reviewed wording up front, open questions answered live. |
| Desktop-only polish (drag, windows) | Same on phones | Touch has no use for it; phones get sheets. |
| Retro green theme limited to the greeting | Re-theming the whole site | Surgical: the plain page keeps v1. |
| No `git add -A` in agent worktrees | | A symlinked `node_modules` once got committed (fixed in 4004403). |

## 9. Methods and process

- **Worktrees plus parallel subagents.** Each feature gets its own branch and worktree under
  `wilson-portfolio-worktrees/` (`v2-desktop`, `v2-messages`, `v2-scroll`, `v2-plain`, `v2-windows`, `v2-photosapp`,
  `v2-ai`, `v2-knowledge`, `v2-scrolls2`, `v2-retro`, `v2-assistant`, `v2-boot`, and others), run by a subagent, then merged
  into `v2` with a merge commit. Wilson asked for this explicitly ("subagents per component, each in its own worktree").
  Rule: commit only the named files, never `git add -A`. Merged worktrees are left on disk until Wilson says remove.
- **Spikes before commitment.** Three concepts were built as throwaway spikes, each with its own `SPIKE-PROGRESS.md`, and
  kept on `archive/*` branches. Wilson chose after seeing them.
- **Handover notes.** `SPIKE-PROGRESS.md` is the shared memory: dated handovers, "done", "needs a browser check", and
  Wilson's answers. A new agent can start from it. Newest handover wins where it contradicts an older one.
- **Decisions recorded where they are made.** Research and options in `docs/ai-chat-proposal.md`, Wilson's answers in
  `docs/ai-chat-decisions.md`, motion rules in `docs/v2-research-notes.md`, lessons in `learnings.md`, commit messages for
  what changed and when.
- **Verification.** In desktop Chrome at 1512x746 (power on/off, windows, scrolls, photos grid, viewer, filmstrip). The
  Chrome window cannot go below 606px, so phone checks load the site in a 375x700 iframe (and a 900x450 iframe for short
  viewports). That found real bugs: viewer images rendering at natural size, a wrapping "← grid" label, and the phone
  unroll hiding the lanes behind a sheet. The worker has unit tests for its pure logic (`worker/test/logic.test.ts`). The
  Groq fallback was tested live through a preview version. Not checkable in this setup: real touch gestures, fullscreen,
  reduced motion on a device, iOS Safari, sound loudness.
- **Content review loop.** Wilson reviews message lines, captions, dates and knowledge text; he used local HTML editors for
  captions and dates that emit paste-back lines. Lines he had not reviewed carry `needsReview`.
- **Surgical changes.** Each subagent touches only its feature; fixes found in review are separate commits. Stack decisions
  (Karpathy-style: state assumptions, minimum code, verify) follow `~/.claude/CLAUDE.md`.
- **Sources before building.** The AI proposal marks every figure as official, secondhand or unverified and lists open
  questions for Wilson before anything was built.

## 10. Round 4 (2026-11-18), done

Scrolls hidden until clicked with a visible close chip, gradual roll-up and varied unroll order; photos/timeline split;
page below the desktop removed; icon layout, names and glyphs; answer-directly prompt rule plus a "who he is" knowledge
line; the unanswered-questions database with `/admin` (section 12). All deployed to https://portfolio.wilsonsoon.workers.dev.

## 11. Open questions

- Real-device checks are still owed: touch, iOS Safari, reduced motion, sound, boot bar at 375px and at live speed.
- Whether the red-team test of the assistant was run.
- Whether to prerender: a plain React app ships no prebuilt HTML, which matters for crawlers (research notes flagged it;
  I did not find the resolution).
- The README on `v2` still describes the Astro v1 site and the deleted Vercel URL, and needs a rewrite. A design-story doc
  was planned "at the very end"; this file may be it.
- Keyboard Enter/Space on an icon to close its window is untested (clicks are tested).

## 12. Unanswered questions

The assistant answers only from its knowledge file, so some visitor questions (hobbies, say) have no answer. They now
reach Wilson, and his answers feed back into the chat. Choices:

- **Sentinel detection, not guessing.** The model is told to reply exactly `UNKNOWN` when a question about Wilson is not in
  the knowledge. The Worker tests that deterministically (trimmed, case-insensitive, or starts with it), logs the question
  and returns one fixed lowercase line. Phrase-matching "i don't know" in free text would miss variants and misfire on
  real answers. Declined topics (health, family, money) and non-Wilson questions are declined, not logged.
- **Minimal logging.** Only the latest user message, trimmed to 500 characters, deduped on a normalized form (lowercase,
  punctuation and spacing collapsed) with a count and first/last dates. No IP or identifier. A cap of 500 open questions
  bounds abuse. Dismissed questions stay in the table so repeats only bump their count.
- **One D1 database (`portfolio-qa`), one Worker.** The public Worker writes questions, reads answers and serves the
  admin at `/admin`. Answers are cached in memory for 5 minutes, so most chat requests never touch D1, and a saved answer goes
  live within that window. Both providers get the answers (Groq a shorter list, because of its token limit).
- **Admin at `/admin` on the public Worker, token-gated.** Wilson wanted one link. Cloudflare Access on `workers.dev`
  covers a whole Worker, not a path, so it cannot protect `/admin` alone (a custom domain would allow path-scoped Access
  later). Instead the page is public but shows only a password box, and every admin API call needs the `ADMIN_TOKEN`
  secret (constant-time compare, per-IP failed-attempt lockout, token kept in sessionStorage, `no-store` and `noindex`).
  The admin is one mountable handler with a pluggable `authorize`, so moving it to its own Worker behind Access is a small change.
- **The wiki excerpt lives in D1, never in the repo.** The repo is public. Whole wiki pages mix safe and private sections
  (the entity page puts interests next to health and family), so the excerpt is a hand-written file,
  `scripts/wiki-excerpt.local.md` (gitignored), with only what Wilson approved: hobbies and interests, four personal
  projects, career direction. A local script chunks it and uploads with `wrangler d1 execute`, replacing all chunks each
  time so the file stays the single source of truth. Retrieval is FTS5 in D1; because word search misses synonyms
  ("hobbies" vs "interests"), a small excerpt (8 chunks or fewer) is sent whole when nothing matches.
- **Suggestions are never public.** A draft is stored in its own column, shown only in the admin and written from the wiki
  excerpt only. Nothing reaches visitors until Wilson edits and saves it as an answer.
- **Known limits.** A follow-up message ("and what about that?") is logged without its context. The admin has one shared password (the token) and no accounts.
