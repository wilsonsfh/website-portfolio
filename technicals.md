# technicals

The technical questions I asked while building v2, with the answers. `learnings.md` has the short "cool things I
learned" version; this is the full Q&A to review later.

## Hosting: Vite, Vercel, Cloudflare

**What do Vite, Vercel and Cloudflare each do?**
- **Vite** is a build tool on my laptop, not a service. It turns the React code into plain HTML, JS and CSS (`dist/`).
- **Vercel** used to host those static files. It's gone now (project deleted 2026-11-18).
- **Cloudflare** now does everything: one Worker called `portfolio` serves the site files and runs the AI code.
  Services used: Workers (Free plan), Workers AI (Gemma for text, Flux for images), Rate Limiting, Secrets, D1.
- **Groq** is a text-only backup when Workers AI's daily free limit runs out.

**Is `something.workers.dev` a domain?** A free subdomain on Cloudflare's domain, like `*.vercel.app`. Every Worker
gets `<worker-name>.<account-subdomain>.workers.dev`. I set the account subdomain to `wilsonsoon`, so the Worker
`portfolio` is `portfolio.wilsonsoon.workers.dev`. A bare `wilsonsoon.workers.dev` isn't possible. A domain of my own
(like `wilsonsoon.com`) costs about US$10/year.

**Free Cloudflare vs free Vercel?** Cloudflare Workers Free: static files free and unlimited, 100,000 Worker requests a
day, commercial use allowed. Vercel Hobby: 100 GB/month transfer, personal non-commercial use only, pauses for 30 days
if exceeded. One platform for site and API is simpler, so everything moved to Cloudflare.

**What did `VITE_AI_URL` do?** It held the Worker's address and was pasted into the site's JavaScript at build time,
because the site (Vercel) and the AI (Cloudflare) lived at different addresses. Now they share one address, so the site
just calls `/api/chat` and the setting is gone. `VITE_*` values are always public and need a rebuild to change; never put
secrets in them.

## The Worker as a backend

**Why does AI need a backend?** The models run on Cloudflare's machines. The Worker sits in between because:
Cloudflare's free AI is only reachable from inside a Worker; it keeps the Groq key secret; and it rate-limits each
visitor so nobody burns the daily quota.

**How does the Worker keep the key secret? How would calling Groq from the browser expose it?** Anything the browser
downloads, a visitor can read (Inspect → Network shows every request and its headers). To call Groq, a request must
carry the key in a header, so if the page called Groq itself the key would be in the page's JavaScript and in every
request. Through the Worker, the browser only sends the question; the Worker reads the key from Cloudflare's encrypted
secret store and calls Groq itself; the browser only gets the answer.

**Is the Worker on the internet or my laptop?** The internet: Cloudflare's servers worldwide. "In between" is just the
order: browser → Worker → AI model. It only runs on my laptop with `wrangler dev`.

**How do `/api` and `/api/chat` work, locally and deployed?** `/api` is a prefix meaning "for the code, not a file";
`/api/chat` and `/api/image` are the endpoints. `fetch("/api/chat")` has no domain, so it goes to whatever address the
page came from.
- Deployed: Cloudflare checks the path. `/api/*` and `/admin*` run the Worker code; everything else is served straight
  from `dist/` and the code never runs. That's `"run_worker_first": ["/api/*", "/admin*"]` in `wrangler.jsonc`.
- Localhost: Vite has no AI code, so `vite.config.ts` forwards `/api` to the live Worker and hands the answer back. Local
  testing uses the real daily free limit.

**Does the model decide between `/api/chat` and `/api/image`?** No, the button does. "send" → `askChat()` →
`/api/chat` → text model; "image" → `makeImage()` → `/api/image` → image model. The Worker is a plain switch on the path
(after origin, rate-limit and size checks). The model only decides what to say or draw. Letting the model choose
("tool calling") is more magical but costs more and is harder to keep free.

**Does the Groq key work, and which is the default?** Workers AI answers everything by default. Groq only answers when
Workers AI's daily free limit (error 3036) is used up, until 00:00 UTC. The Groq path was tested with a preview version
(`wrangler versions upload --var FORCE_FALLBACK:1 --preview-alias groq-test`) and answered with `provider: "groq"`.

**What was "hedging"?** Opening with a disclaimer before the answer ("i'm not sure i can sum up… in one sentence, but…").
Fixed with a prompt rule to start with the answer, plus a "who he is" line in the knowledge file (it never said what I
study, so the model kept saying it didn't know).

## Wrangler, deploys and errors

**`Required Worker name missing … --name`?** Wrangler was run from the repo root, not `worker/`, so it couldn't find
`wrangler.jsonc` (where the name lives). Run wrangler from `worker/`; never pass `--name`.

**`wrangler secret put NAME`?** The argument is the secret's NAME; the value is pasted at the prompt. Pasting the key as
the argument made the key the secret's name and leaked it into shell history and wrangler's logs, so the key was rotated.

**"No active routes" on the dashboard?** Routes attach a Worker to your own domain; without one that's normal. At that
point the Worker was also just an empty shell made by `secret put`, because `wrangler deploy` hadn't run yet.

**The `workers_dev: false → true` / `preview_urls` warning on deploy?** The empty shell had its `workers.dev` address
switched off; deploying with my local config turned it on (wanted). Preview URLs give each upload a test address.

**`ERR_SSL_VERSION_OR_CIPHER_MISMATCH` after changing the subdomain?** Cloudflare has to issue a new certificate for
`*.wilsonsoon.workers.dev`; it was live within about a minute. The old subdomain stopped resolving.

**Why redeploy after renaming the Worker? Is deploying from `v2/worker` ok?** `wrangler.jsonc` is a file on my laptop;
Cloudflare knows nothing until I deploy, and nothing syncs by itself. A Worker's name is its ID: deploying a new name
creates a new Worker (with no secrets) instead of renaming the old one. Deploying from `worker/` works but uploads
whatever is already in `dist/`; `npm run deploy` from the repo root rebuilds first.

**Does Cloudflare tell apart which `wrangler.jsonc` was deployed?** No. It only knows the `name`. Same name = new version
of that Worker; new name = new Worker; two files with the same name overwrite each other. On deploy, the file wins over
dashboard edits.

**"Secret edit failed … latest version isn't currently deployed"? Why deploy before `secret put`?** Every upload makes a
version (code + settings + secrets); the live one serves visitors. `secret put` takes the NEWEST version, adds the secret
and deploys it. My Groq test had uploaded a preview version (with `FORCE_FALLBACK=1`) that was newest but not live, so
wrangler refused rather than deploy it by accident. Normally `secret put` needs no deploy first; only after a preview
upload.

**`database 00000000-… could not be found` on `migrations apply`?** `d1 create` offered to add the database to the
config and added a second entry with the real id, while the entry the code uses still had the placeholder id. Fixed by
putting the real id into that entry. Answer "no" to that prompt next time.

## Admin and Cloudflare Access

**Can the admin be on the same link, with only me logging in?** Cloudflare Access on a `workers.dev` address protects a
whole Worker, not one path. So: `/admin` on the same Worker behind an `ADMIN_TOKEN` password (chosen), or a separate
admin Worker behind Access, or my own domain with Access on just `/admin`. The admin page itself is public but only shows
a password box; every admin API call needs the password, compared in constant time, with 10 wrong tries per IP locking
it for 10 minutes.

## D1

**How does a wiki fit into D1? Isn't it key-value?** That's KV, a different product. D1 is a real SQL database (SQLite)
in Cloudflare: tables, rows, columns, SQL queries. Wiki text is cut at headings into rows of `wiki_chunks`, with a
full-text search index (FTS5) to find the best-matching rows for a question. The whole wiki is about 4.3 MB of text; only
an approved excerpt is uploaded (from a gitignored file, because the repo is public).

**How is `asked_count` filled in?** When the AI replies `UNKNOWN`, the Worker turns the question into a plain form
(lowercase, punctuation and extra spaces removed). If that plain form already exists, it adds 1 to `asked_count`;
otherwise it inserts a new row with 1 (unless 500 open questions already exist). Matching is by exact wording, not
meaning, so "hobbies?" and "what does he do for fun?" are two rows.

**How many rows can D1 store for free? Is it realistic?** D1 limits storage and activity, not rows: 500 MB per database
(5 GB total), 100,000 rows written and 5 million read per day. A question row is about 300 bytes. Answers are cached for
5 minutes, so reads stay tiny. Hitting a limit makes queries fail until 00:00 UTC, never a bill.

**The commands:**
1. `npx wrangler d1 create portfolio-qa` creates a new, empty database in my Cloudflare account, like a blank
   spreadsheet file with no sheets. It prints a `database_id`, the database's unique ID, which goes into
   `wrangler.jsonc` so the Worker knows which database to use.
2. `npx wrangler d1 migrations apply portfolio-qa --remote`:
   - A **migration** is a file of SQL commands that sets up or changes the database's structure. Ours is
     `db/migrations/0001_init.sql`. It creates the `questions` table, the `wiki_chunks` table and its search index. It
     defines columns, not data.
   - **`apply`** runs every migration file the database hasn't run yet. D1 keeps a hidden table (`d1_migrations`) of
     which files it has applied, so adding `0002_….sql` later and running `apply` again only runs `0002`; existing data
     stays.
   - **`--remote`** means "do this to the real database in my Cloudflare account". `--local` does it to a copy on my
     laptop instead (used for testing).
3. `npx wrangler secret put ADMIN_TOKEN` saves the admin password as a Worker secret, like the Groq key. Type the name
   exactly; paste the password only at the prompt. The code only compares against it and never prints it.
4. `npm run deploy` rebuilds the site and uploads the site plus the Worker, including the D1 binding that connects
   `env.DB` in the code to `portfolio-qa`.

Order matters: create → put the id in the config → apply the migration → set the password → deploy. Deploying before
the tables exist would make question logging fail.

**What are `normalized`, `NOT NULL`, `DEFAULT` and `UNIQUE` for?** From `0001_init.sql`:
```sql
question    TEXT NOT NULL,                 -- exactly what the visitor typed
normalized  TEXT NOT NULL UNIQUE,          -- the plain form used to spot repeats
asked_count INTEGER NOT NULL DEFAULT 1,
status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'dismissed')),
answer      TEXT,                          -- may be empty until I answer
```
- **`normalized`** is a second copy of the question in a plain form, so "Does he play any sports?" and "does he play
  any sports" count as the same question. `question` keeps what the visitor actually typed, for me to read.
- **`NOT NULL`** means the column can never be empty. A question row without its text makes no sense, so the database
  refuses it; that catches bugs instead of storing broken rows. `answer` has no `NOT NULL` because it is empty until I
  answer.
- **`DEFAULT`** is the value used when an insert doesn't give one. A new question starts with `asked_count = 1` and
  `status = 'open'` without the code having to say so.
- **`UNIQUE`** means no two rows may have the same value. On `normalized`, it makes the database itself guarantee one row
  per question, even if two visitors ask at the same moment. The code relies on it: `ON CONFLICT (normalized)` means "if
  this plain form already exists, don't add a second row".
- **`CHECK`** limits a column to allowed values, so a typo like `'answred'` can't get in.

**What is the excerpt file for?** `scripts/wiki-excerpt.local.md` holds only the wiki bits I approved, rewritten in plain
words. It's the source the admin's "suggest" button searches when drafting an answer. It never goes to git (the name
matches the gitignored `scripts/*.local.*`), so it can't reach the public repo; it's uploaded once into D1's
`wiki_chunks` table, the only wiki text in the cloud.

**What does "replaces all wiki rows" mean?** The upload file does `DELETE FROM wiki_chunks;` then one `INSERT` per chunk.
So after every upload the table holds exactly what the file holds: delete something from the file and it disappears from
the cloud too; edit something and there's no stale copy left. It never touches the `questions` table (visitor questions,
suggestions, my answers).

**Upload the excerpt before or after `npm run deploy`?** Doesn't matter. Deploy uploads code and site files; the excerpt
upload writes rows into a table that already exists (the migration made it). The only ordering rule was migration before
the first deploy with database code.

**Why did "suggest" say "nothing in the wiki" for "hobbies"?** FTS5 matches words, not meaning: the excerpt said
"Interests" and listed the activities, so "hobbies", "sports" and "fun" matched nothing. Fixed twice over: the heading now
says "Hobbies and interests (what he does for fun, sports)", and when nothing matches and the excerpt is small (8 chunks
or fewer) the whole excerpt goes to the model, which judges relevance.

**Why were there two Workers, and why is it one now?**
1. `wilson-portfolio-chat`: the first Worker, AI only, while the site was still on Vercel (the site called it through
   `VITE_AI_URL`).
2. `portfolio`: created when everything moved to Cloudflare. Changing `name` in `wrangler.jsonc` doesn't rename a Worker;
   deploying a new name creates a new Worker. So both existed for a while, and the new one had no secrets until I ran
   `secret put GROQ_API_KEY` for it. After `portfolio` was verified, the old one was deleted (`wrangler delete`).
3. A separate admin Worker (`portfolio-admin`) was also considered: Cloudflare Access on `workers.dev` protects a whole
   Worker, not one path, so a second Worker was the only way to put Access on just the admin. It was built (commit
   4439fbf) and then folded into `/admin` on `portfolio` with an `ADMIN_TOKEN` password, because I wanted one link.

Now: one Worker (`portfolio`) serves the site, `/api/*` and `/admin*`; one D1 database; one `npm run deploy`.

## Round 5 (2026-11-18 evening)

**What model do the "neurons" run on?** Neurons are Workers AI's billing unit (10,000 free a day), not a model. The chat
uses `@cf/google/gemma-4-26b-a4b-it` (Gemma 4, 26B mixture-of-experts, about 4B active per token, thinking off), with
Groq `openai/gpt-oss-20b` as the fallback once the daily free neurons run out. Images use `@cf/black-forest-labs/flux-1-schnell`,
and since round 5 `@cf/black-forest-labs/flux-2-klein-9b` for pictures of Wilson. The admin "suggest" uses the chat model.

**Why couldn't the image model draw Wilson?** FLUX.1 schnell only gets text. It has never seen his face, so "wilson" is
just a name to it. FLUX.2 (klein 9B) accepts up to 4 reference images (each under 512x512) as multipart form fields
`input_image_0..3`. When a prompt mentions wilson/you/yourself/him, the Worker reads two cropped photos
(`public/ai-ref/wilson-1.jpg`, `-2.jpg`) through the `ASSETS` binding and sends them along. The prompt is rewritten to
an illustration (pixel art, cartoon, watercolour, ...; cartoon by default) with photo words removed, so nobody can make
a photoreal fake of him. A short blocklist (weapons, nudity, drugs, ...) refuses some scenes before the model's own filter.
"me" does not count: on the visitor's side it means the visitor. Tested with `wrangler dev --remote`: about 4s per image.

**Why didn't photos scroll on a phone?** In a column flexbox, a child's `min-height` defaults to `auto`, i.e. its content
height. On narrow windows the Photos app stacks vertically, so `.ph-main` grew to the full grid (7349px) and its scroller
never had less room than content. `min-height: 0` lets it shrink to the window, and then `overflow-y: auto` scrolls.
Desktop wasn't affected because there the app is a row, where the height comes from the window.

**How does v1 live inside v2?** The old Astro site (main branch) is built with `astro build --base /v1` and its
`index.html` + `_astro/` copied into `public/v1/`. Its images, fonts and photos are the same files v2 already serves at
`/images`, `/fonts`, `/photos`, so the absolute paths in v1 still work. The v1 window is an iframe of `/v1/index.html`.
Rebuild it only if v1 changes (it shouldn't).

**The terminal on phones.** iOS only opens the keyboard when focus comes from a tap. `autoFocus` on open focused the input
without a keyboard, which shows just the bar above the keyboard; tapping again did nothing because the field was already
focused. Now there is no autofocus on touch screens, and a tap blurs and refocuses the field inside the tap, which opens
the keyboard. The `<form>` is gone too (Enter is handled on keydown), and the input line is 44px tall to be easy to hit.

**Can the old Vercel URL redirect here?** Only through Vercel: the `*.vercel.app` name belongs to a Vercel project.
Recreating a project named `wilsonsoon-website-portfolio` with a `vercel.json` that redirects every path to
`https://portfolio.wilsonsoon.workers.dev` would do it (308, permanent), if the name is still free.

**Why "jump to" in Photos missed months.** Each month heading is `position: sticky`, and `jump` scrolled to the heading's
`offsetTop`. A stuck heading reports where it is stuck (the bottom of its month once you have scrolled past it), so a
backward jump landed at the end of that month. It now scrolls to the heading's section, which is never sticky. It showed
most on phones, where you scroll further before jumping.

**How the Vercel redirect works.** `deploy/vercel-redirect/` is a tiny Vercel project with the old name
(`wilsonsoon-website-portfolio`). Its `vercel.json` has one redirect rule, `/(.*)` → `https://portfolio.wilsonsoon.workers.dev/$1`
with `permanent: true`, so Vercel's edge answers every request with a 308 and the same path (the query string is kept)
before any file is served. `index.html` is only a fallback page with a meta refresh. Redeploy from that folder with
`npx vercel deploy --prod --yes`.

**How picture requests are routed.** `wantsImage` in `src/lib/ai.ts` is a regex: the message starts with draw / sketch /
paint / illustrate (optionally after "can you" or "please"), or contains "<image word> of" (image, picture, photo,
portrait, pixel art…), or starts with generate / create / make / show me / give me and names an image word. A match in
text mode switches the toggle to image mode and calls `/api/image`. When images are off for the day it stays in chat,
and the worker prompt has a rule to answer image requests with a pointer to the picture button. A regex rather than a
model call: it is free, instant, and a miss still lands on the prompt rule.

**Does /admin work locally?** `npm run dev` only proxies `/api/*` to the deployed Worker, so `localhost:4321/admin` is
not the admin page. The live `/admin` is already deployed and is the place to answer questions; its suggest button runs
on the deployed Worker (real model, real D1). Locally, `cd worker && npx wrangler dev --local` serves `/admin` on :8787
with a local, empty D1 and `ADMIN_TOKEN` from `.dev.vars`, but suggest fails there because Workers AI only runs
remotely (see worker/README.md "Local dev").

**Why there were "two models".** There is one text model (`TEXT_MODEL`, gemma 4 26B on Workers AI). The public chat and
the /admin suggest button call it with different system prompts and different context: the chat gets `knowledge.md`
(public facts) plus saved answers; suggest gets chunks of the private wiki excerpt from D1. Since round 7 both prompts
split questions the same way: about Wilson → only from their context, anything else → general knowledge.

**Which questions end up in D1 (and why generic ones don't).** There are two decisions, made by two different things:
1. *The model decides what kind of question it is.* There is no if/else in the code that recognises "generic" vs
   "about wilson". The system prompt (`worker/src/index.ts`, `system()`) tells the model to sort every question:
   - about wilson, and the answer is in KNOWLEDGE (knowledge.md + your saved answers) → answer it;
   - about wilson, but not in KNOWLEDGE → reply with exactly the word `UNKNOWN`;
   - anything else (general, technical, small talk) → answer from general knowledge;
   - sensitive topics about wilson (health, family, money…) → politely decline (a normal reply, not `UNKNOWN`).
2. *The code makes one check on the reply.* In `chat()` → `finish()`: `if (isUnknown(answer))` (the reply starts with
   "unknown", any case, `worker/src/logic.ts`) then the visitor sees the fixed line "i don't know that one yet…" and
   `logUnknown` (`worker/src/qa.ts`) runs in the background; otherwise the model's answer is returned and nothing is stored.
   So "generic questions don't appear" because the model answers them, never replying `UNKNOWN`.
Inside `logUnknown`: only the visitor's latest message is stored (trimmed to 500 chars, no conversation, no IP). It is
normalised (lowercase, punctuation squashed) and, if that normalised text already exists, only `asked_count` and
`last_asked` go up; otherwise a new open row is inserted, unless 500 questions are already open (an abuse cap). Failures
are logged to the console and never break the chat. Picture requests normally never get here: the browser sends them
to `/api/image` before the chat sees them.
The loop back: answers you save in /admin are read by `answeredRows` (newest 40, cached 5 minutes) and added to the
prompt as "Wilson's own answers", so the same question, or a rephrasing of it, is answered next time instead of logged.
Because step 1 is a model judgement, it can misjudge: before round 7 the prompt said "decline questions not about
wilson" and the model replied `UNKNOWN` to those too, which is how two-sum and geography questions reached /admin.
No keyword is involved: "about wilson" is the model's reading of the question in context, not a check for the word
"wilson". On this site "you", "he", "his" and bare questions like "hobbies?" or "outside work?" are read as about him
(both of those were logged without the word). Vague ones ("what's your favourite language?") can go either way.

**Assistant history (in the browser).** The assistant panel keeps the conversation in `sessionStorage` (`ask-log`, last
30 exchanges): it survives closing the panel and reloads, and is gone when the tab closes. "clear" empties it. Text
turns are sent back as context, so follow-ups like "what did he do at the first one?" work. Pictures are big; if the
storage quota is hit, the words are kept and the pictures dropped ("picture not kept").

**Chat log (on the server).** Separate from the unanswered questions. Every reply from `/api/chat` and every drawn
picture from `/api/image` writes one row to D1 `chat_log` (migration `0002_chat_log.sql`): visitor, kind, question,
the reply shown (or "(image)"), provider, time. `visitor` is a random id the browser makes per tab (`visitor-id` in
sessionStorage, `crypto.randomUUID()`); the Worker accepts it only if it looks like one, otherwise "anon". No IP is
stored. Each insert runs in a batch with `DELETE ... WHERE created_at < now - 30 days`, so the table never holds more
than 30 days and a flood can't grow it forever (each row is one D1 write; the free plan allows about 100,000 a day).
/admin has a "chat log" tab (newest 300 messages, grouped by visitor, newest conversation first) and the database tab
can page through `chat_log`. Both chat panels say "questions and answers are saved for 30 days so wilson can improve
the answers." Why D1, not KV: KV's free plan allows 1,000 writes a day (one per message), D1 about 100,000, and D1 was
already bound and browsable in /admin.

## Round 12 (2026-11-18)

**How does the demo cursor type into an input React controls?** Setting `input.value = "x"` changes the DOM but React's
`onChange` never fires, and React also resets the value on the next render. `TourDemo.tsx` takes the native setter from
`HTMLInputElement.prototype`, calls it on the input, then dispatches `new Event("input", { bubbles: true })`, which is
what a keystroke produces, so React's state follows. It types one character per 80ms. Enter is a synthetic
`KeyboardEvent("keydown", { key: "Enter", bubbles: true })` on the input, because the terminal handles Enter on keydown
(no `<form>`). Buttons are pressed with `el.click()` after a short "press" class on the cursor.

**How does the script tell its own events from the visitor's?** `isTrusted`. Events the browser makes from real input are
trusted; ones made with `dispatchEvent` or `click()` are not. The demo listens for `pointerdown` and `keydown` on `window`
in the capture phase and stops (hides the cursor, sets `alive = false`) only when `e.isTrusted`. Every step checks
`alive`, so a real press ends the script mid-step. The effect cleanup also removes the listeners and hides the cursor
when the step changes. Reduced motion returns before any of this runs.

**How does it poke the spirits?** They hop on `pointerdown`, not click, so `press(el, { poke: true })` dispatches
`new PointerEvent("pointerdown", { bubbles: true })` on the mushroom and slime and does not click. The same function then
presses "stop" and, a second later, the "hop" button that replaces it, so the visitor's setting ends where it started.

**Why are the cursor, the note and the tour corner portalled to `<body>`?** The assistant panel (`.as`, `position: fixed`,
`z-index: 2000`, `assistant.css`) is portalled to `<body>`. The desktop `.dk` has `z-index: 1`, which makes it a stacking
context, so nothing inside it can rise above the panel whatever z-index it has. `TourDemo` therefore portals the cursor
(`z-index: 4000`) and the note (3999) to `document.body`. On the assistant stop the tour corner is portalled too
(`createPortal(corner, document.body)` in `Desktop.tsx`, class `.over`, `z-index: 2100`, `position: fixed`) so "next"
stays clickable above the panel; on other stops it stays inside `.dk`.

**Why did the theme tokens have to be extended?** The retro colours (`--bg`, `--fg`, `--warm`...) are defined on
`.gr-root` and `.tt` only, so the greeting does not recolour the plain page. Anything portalled to `<body>` is outside
`.gr-root` and would fall back to the site's v1 tokens (beige, navy). `greeting.css` adds `.dk-tour-corner.over` and
`.dk-note` to the selector lists, light and `:root.dark`. The cursor needed no tokens: `--cur-arrow` and `--cur-glove`
are declared on `.gr-root, .dk-touch`.

**How is the note placed beside the typewriter's longest word?** The typewriter (`src/components/Typewriter.tsx`) exports
its `WORDS`. The script creates an off-screen canvas, sets `ctx.font` to the typewriter element's computed `font`, and
takes the largest `measureText(word).width`. The note goes at `left + longest + 14px`, vertically centred on the line.
Measuring is needed because the element's own width changes as letters appear. If `right + 230` exceeds the viewport
(phones), the note goes under the line (`.below`).

**Why is the note's animation opacity only?** The note is placed with an inline `transform: translate3d(...)`, and a
`transform` keyframe would replace it. `dk-note-in` fades opacity only. The demo cursor uses a `transition` on
`transform` (600ms) instead of keyframes, which re-trigger badly when interrupted.

**How do the spirit settings sync across copies?** `src/components/Spirits.tsx`: `useSpirits()` reads `localStorage.spirits`
("still" or "hidden"; unset means hop) and returns the mode plus a setter. The setter writes localStorage (removes the key
for hop), updates its own state and dispatches `window` event `spirits-change`; every hook instance listens and re-reads.
That keeps the desktop and plaintext rows in step in one tab. (The native `storage` event only fires in other tabs, so a
custom event is needed.) Reads and writes are in try/catch for blocked storage.

**How do the desktop spirits rest?** `Desktop.tsx` flips a `resting` boolean every `EVERY` ms (40000, exported from
`Wallpaper.tsx`, the wallpaper's photo interval). The row gets `spirits-still` when the mode is "still" or `resting`. The
visitor's setting is never changed by this; it only applies while the mode is "hop".

**How does "open this row" work across windows (`touchReq`)?** A counter, not a boolean. `Desktop.tsx` keeps
`touchReq` state and bumps it when finish is pressed on plaintext; it goes through the app context (`Ctx.touchReq`,
`apps.tsx`) to `<MainPage touchReq>` and into the "get in touch" `Row` as `openReq`. `Row` (`MainPage.tsx`) runs an effect on
`[openReq]`: if non-zero it opens the row and calls `scrollIntoView({ block: "start" })`, smooth unless reduced motion.
A boolean would be true already the second time, so the effect would not re-run; a new number always does, and `0`
(the initial value) means "no request".

**How does the tour remember where it was?** `sessionStorage["tour-last"]` holds the last `TOUR` step reached
(written on every step change, validated against `TOUR` when read, cleared on finish). `tour-done` marks it finished or
skipped in this tab. With no tour running and no finish animation, `Desktop.tsx` shows "resume tour" (only if `tour-last`
is set; calls `startTour(last)`) and "tour again" (`startTour(TOUR[0])`). `startTour` sets up one maximised window, or
none for the no-window stops (`NOWIN`: desktop, timeline, assistant), and unrolls the timeline / opens the assistant when
the step is one of those. A plaintext step ("skip") keeps the step it was skipped from as `last`.

**How long does the finish window stay?** `SEAL_MS = 2200`: 300ms for contact to shrink, 400ms fade in, held 1.5s, then
out. The idle "resume/tour again" corner is hidden while it plays (`!sealed`).

**How does `as: "wilson"` reach the model?** `askChat(turns, signal, as)` in `src/lib/ai.ts` adds `as` to the
`/api/chat` body only when set. `Messages.tsx` (the "(1) unread" app) passes `"wilson"`; the assistant panel and
terminal do not. In the Worker, `chatPersona(body)` in `worker/src/logic.ts` returns "wilson" only for exactly that
value, otherwise "assistant", so an unknown value cannot select anything. The persona picks a block of the system prompt
(`systemPrompt(persona, knowledge)`) and the fixed unknown line (`unknownReply(persona)`). The facts and rules are the
same for both; only the voice differs (first person versus third person with "you are not wilson").

**Why are notices left out of the model's history?** Chat messages from the app carry `notice: true` for status lines
(the "limit reached, now on groq" note and error messages like "out of answers for today"). They are shown in the
log but `Messages.tsx` filters them out when building `turns` (`i.msg.text && !i.msg.notice`). Sent back, they would
read to the model as things it had said as wilson, and it would answer follow-ups from them ("sorry, i'm out of
answers") or copy their wording.
