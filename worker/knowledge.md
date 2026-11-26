# About Wilson Soon

This is everything the chat may say about Wilson. Hand-written and hand-edited. See docs/ai-chat-decisions.md for what is allowed in.

## Who he is
Based in Singapore, studying computer science at the National University of Singapore (NUS), and passionate about building all things tech and aesthetics. He has worked in solutions engineering, product management and software engineering.

## Work experience

### Solutions Engineering Intern, Cloudflare (May 2026 to Aug 2026, APJC)
- Built a security assessment web app (on an existing codebase) to replace gathering client data by hand. It gives guided fixes, historical comparisons, a scored view of an account's security posture with live traffic summaries, and auto-generated slide decks. This shortened the time Customer Engineers spend preparing for technical discovery.
- Built a Linux desktop that runs in the browser on isolated Cloudflare Containers, for hands-on labs where users set up and test security policies against their own accounts. Each container's traffic goes through the WARP client over a VPN-like tunnel.
- Found why containers re-enrolled as new WARP devices on every restart, and added automatic deregistration so unused entries did not overload the device inventory before a workshop.
- Tags: Zero Trust, Workers, Durable Objects, KV.

### Product Management Intern, Glints (Dec 2025 to Apr 2026, Singapore and Jakarta, Indonesia)
- Grew daily active users among jobseekers looking at small and medium businesses (SMEs) and SME employers, through A/B-tested job navigation and partnerships with organisations and communities to raise brand awareness.
- Ran competitor analysis across Singapore's talent ecosystem and led 10 user research interviews with jobseekers on how they search and navigate the job portal. Turned the findings and triaged bug reports into technical requirements, such as a better bottom navigation bar placement and a map-based nearby job search.
- Built reusable SQL database views for the Singapore and Malaysia jobseeker and employer funnels, and automated daily KPI reporting for the regional growth team, cutting database lookup time.
- Tags: SQL, Metabase, User Research, Product Analytics.

### Software Engineering Intern, NUS Enterprise (May 2025 to Jul 2025, Singapore)
- Worked on an existing web app that supports researchers with bioacoustic analysis of birds.
- Improved bird species identification across sub-regions of Singapore by integrating a bird machine learning classifier, an open database and GPS coordinate data, to make classification more accurate.
- Tags: React, Django, PostgreSQL, Python, Google Cloud Storage, BirdNET.

### Software Engineering Intern, Singapore Land Authority (Nov 2020 to Feb 2021, Singapore)
- Integrated the open-source Buildings and Habitats object Model (BHoM) as a common format so building data works across software.
- Wrote plug-in code to standardise data transfer between software applications.
- Tags: C#, Autodesk Revit, BHoM.

## The preparation-time app at Cloudflare

At Cloudflare, Wilson built an app that integrates and automates criteria matching for clients, so customer engineers prepare better and spend less time on technical preparation before meeting a client. It primes them with what they need from the client's data before the conversation, so they don't have to gather it all themselves. 100+ customer engineers use it. After his internship people kept using it and building on it, because its source is open to the rest of the Cloudflare team.

## Cloudflare APJC Tech Summit

Wilson attended the Cloudflare APJC Tech Summit in Kuala Lumpur, 3 to 6 August 2026.

## Projects

### AppleNotestoX
A public macOS app that turns Apple Notes into a study wiki. Notes stay on his Mac, and he can see exactly where each piece of the wiki came from. GitHub: https://github.com/wilsonsfh/AppleNotestoX. Demo: https://applenotestox-demo.wilsonsfh.workers.dev

Why he built it: Apple Notes is great for jotting things down, but it doesn't help you connect notes, trace them back, or review them. AppleNotestoX keeps capture local and familiar. It keeps where each screenshot sat in the note, shows which notes are not yet synthesised, and can produce several outputs from the same source material.

What it does:
- Exports Apple Notes to Markdown and to Notion. It keeps inline images and media, and stamps each export with the source note's ID and date.
- Transcribes video on the device using Apple Speech, and pulls keyframes with AVFoundation. Nothing is sent over the network for this.
- An AI then turns the notes into a wiki. The wiki also works as a study app with flashcards, a concept map and narrated recaps.
- It also has an optional Notion archive and import, a backlog of notes waiting to be synthesised, and search by title and folder (not full text).
- The flow: Apple Notes, Notion or video, then raw Markdown plus the original images, then AI synthesis, then a static study app. The app handles capture. A separate AI step handles interpretation. The generated study app handles review.
- Built with SwiftUI, AppleScript, AVFoundation, Apple Speech, Node.js and the Notion API. It is macOS only and needs some system permissions.

Why it is built this way:
- Raw notes are never edited, so the evidence stays safe and the wiki can be rebuilt.
- The AI step is separate, so the model and prompts can be swapped. The trade-off is less one-click automation.
- Original images are kept for context. This uses more disk space.
- The study app is static and portable, but its history lives in the browser and voice quality depends on the device.

Safety work:
- Writes never overwrite existing files, and a failed write cannot delete someone else's file.
- Temporary files are kept until everything using them has finished.
- Notion image downloads are checked: only public addresses, limited redirects and size, only real image types, and no SVG or HTML.
- The sample data in the repo and in screenshots is made up, not personal.

Where it stands:
- Public on GitHub with a full README, and it has no licence, so others cannot reuse it by default.
- At release it passed 103 out of 103 importer security tests and 12 conversion checks.
- Still to test: real screenshot-heavy Apple Notes exports, long videos, live Notion images, browser voice and light mode, and VoiceOver and keyboard checks (blocked by a macOS permission error, -25211).

Update, 11 August 2026: the README promised that a fresh clone would just work, and the work needed for that had never been committed. Wilson committed it: a Makefile, a doctor script, a CI workflow, and a fix for the hardcoded vault path. `make check` passed (build plus 103 node tests).

Update, 21 to 22 October 2026:
- He reviewed and pushed an old 26-file stash.
- Apple Notes now export to raw/apple-notes/<category>/ instead of raw/journal/. The Notion importer still writes to raw/journal/.
- The Duplicates tab now also finds near-duplicate notes (Jaccard similarity over 3-word shingles, 0.8 threshold) and shows a line diff. Merge to Note no longer breaks its image staging.
- Fixed bugs: a path-traversal delete (`../` asset links could trash files outside the vault), a diff that showed old and new swapped, similarity inflated by the shared provenance banner, and keyword matching inside other words ("ai" in "said").
- Running the app on demo data exposed a bug where, after two exports on the same day, the older file was marked newest and the newer one was picked for the Trash. He fixed it test-first.
- `swift test` under Xcode now passes: 199 tests.
- The README got a demo GIF, six screenshots and his own "Why I built this". The demo/ folder has labelled sample data. `make install` replaced the 10 May build in /Applications.

What he learned:
- A project is easier to follow when its README explains why it exists, how it works, what was rejected, where the limits are and what is still missing.
- Reviewing the project before release found real bugs in overwriting, cleanup, YAML, SSRF and evidence.
- Native controls and restrained system materials can improve both the look and the accessibility.
- Quick capture and traceable synthesis can stay separate.

### X Bookmark Injector
A Chromium extension that puts one random saved X bookmark at the top of your For You feed. The idea is to turn a pile of hoarded bookmarks into something you actually read and clear. GitHub: https://github.com/wilsonsfh/x-bookmark-injector. Demo: https://x-bookmark-injector-demo.wilsonsfh.workers.dev

What it does:
- It is a Manifest V3 extension. It uses X's own logged-in session to sync, de-duplicate and rank bookmarks, then shows one as a post that looks native. There is no backend and no telemetry. Everything stays in the browser profile. It uses no AI API.
- Delete and undo survive the extension's background worker restarting, and it rejects any response it does not recognise. It has 313 passing tests (the site's project card still says 290).
- Built with Chromium MV3, JavaScript, esbuild and Vitest.

How it behaves:
- The card is the first item in For You, picked at random each time. It looks like a normal X post, not a dashboard. Wilson rejected side rails, tints, chips and full-width banners.
- It shows "Saved #k of N" (#1 is the oldest), the post's real date and how many are left. X doesn't give the time a bookmark was saved.
- Actions: Open on X, Keep for later (a local cooldown), Done and Remove (really removes it on X, with a six-second Undo), and Show another bookmark.
- It runs on desktop Chromium in an already logged-in X session. No X developer app is needed. Native X on iOS can't be modified. A future iOS version would be a separate Swift widget using the official OAuth API.
- On 13 July 2026 the action buttons moved from a footer to a compact header at the top of the card, then were shrunk after Wilson said they were "too outstanding". They are right-aligned and still at least 24 CSS pixels, the accessibility minimum.
- Also added that day: show a quoted post inline, and a native preview (thumbnail, domain, title) for bookmarks that are only a shortened link or an X article.
- Auto-sync: when a bookmark is added or removed on the same device, it waits 15 seconds and then syncs, with at least 30 minutes between syncs. A just-added bookmark doesn't need to come back right away, so the gap is generous. A 12-hour check when Home opens (it was 24 hours) catches changes made on another device, such as a phone.

How it keeps your data safe:
- A sync that is partial, invalid or rate-limited keeps the previous cache.
- Only three operation IDs are stored. Tokens stay in memory.
- A delete first saves a snapshot of the bookmark, and Undo still works after the extension's worker restarts. Responses that are unclear get checked again before anything is assumed.
- The extension only changes anything on X when you press Done or Undo.

Where it stands (as of mid-July 2026): 313 of 313 tests pass, the build works and the dependency audit found 0 vulnerabilities. Reading and syncing were checked live in a logged-in X. Still open: the live check of the new features, and the Keep, Delete and Undo end-to-end checks before calling it release-ready. Open question: should a link preview open the article's own page or the X post?

What he learned:
- You can build digital minimalism into the place where you spend your time, instead of relying on self-control.
- Placing a card like an ad borrows the ad world's way of catching attention, aimed at something you chose.
- Random picks and a clear order can work together: chance picks the item, the rank explains where it sits.
- A delete button gets tricky once X, extension storage and a worker that keeps shutting down all have to agree.
- Review rounds turned races, restarts, focus and contrast problems into permanent tests.
- A fake page used in tests hid a real browser bug, so a real-browser check still matters.
- Moving the buttons to the top looked like a style tweak but was a structural change. Trying three layouts with the real styles settled it faster than debating.
- Loading the extension from a throwaway folder broke the reload path later, so live testing should use a stable path.

### TradingSignalandHelper
A local US-stock signal desk that starts with paper trading, with a human in the loop. GitHub: https://github.com/wilsonsfh/TradingSignalandHelper
- Turns price candles into BUY, SELL or HOLD calls with an EMA-crossover strategy. Each call goes to a review dashboard showing take-profit, stop-loss and live broker status before any order is confirmed.
- Built to be careful about orders: SQLite storage, recovery after a restart, protection against duplicates across processes, webhooks that can't be replayed, and a moomoo/OpenD paper-trading adapter. 152 tests, and it uses mocks by default.
- Tags: Python, Flask, SQLite, yfinance, moomoo / OpenD.

### 2unemployment
A job board for Singapore full-time new-grad software engineering roles. Each listing shows its source, and salary estimates are kept separate from advertised pay. GitHub: https://github.com/wilsonsfh/2unemployment. Live demo: https://2unemployment.wilsonsoon.workers.dev/
- A daily job fetches public Greenhouse, Lever and Ashby feeds from ten configured boards. It keeps Singapore, full-time, graduate-level roles. It uses no LLM and no paid jobs API.
- Matching and lifecycle rules are deterministic. A role missing from two successful fetches is marked closed, and a failed source keeps its previous records.
- Architecture: Astro renders the public job pages, and a paginated Worker API serves a React search, filter and compare view. The daily snapshot is imported into Cloudflare D1 in one transaction.
- Signed-in users track their own applications with Better Auth (Google, GitHub or email code). Every query is scoped to the user ID the server derives, never one the browser sends.
- 69 offline tests, and the build and a Wrangler dry run happen before each deploy.
- Tags: Astro, React, TypeScript, Cloudflare Workers, Cloudflare D1, SQLite, Better Auth, Node.js, Wrangler, GitHub Actions.

### Architecture Relive
Pick a real Gothic cathedral, read its checked facts, play its history as a short storyline, and step inside a simplified 3D nave. GitHub: https://github.com/wilsonsfh/architecture-relive. Live demo: https://architecture-relive.wilsonsoon.workers.dev/
- Facts come from a checked build. Wikidata and Wikipedia data is stored with its retrieval date, and the build refuses to run if a curated scene or feature quote is not found word for word in the stored Wikipedia text. It covers four cathedrals and 21 scenes, and every claim shown carries a status such as VERIFIED, CURATED or ILLUSTRATIVE.
- A server-side resolver accepts a typed name only if Wikipedia and Wikidata return a real place with coordinates. It keeps only photos under Creative Commons or public domain licences, with the author and licence stored.
- The AI model is optional. It is called through OpenRouter with an ordered fallback list, and its scene text is kept only if each quote appears verbatim in the article. Without a key, extracted article sentences are used instead.
- The browser app is plain JavaScript with hash routes for the result, story and interior screens. GSAP drives the timelines, and Three.js builds a procedural nave of over 150 meshes, labelled as a simplified model and not a scan.
- The public version is a Cloudflare Worker that serves the static site and answers the API from a saved catalogue, so it has no live lookup or generation.
- Tags: Node.js, JavaScript, GSAP, Three.js, OpenRouter, Wikidata, Wikipedia API, Wikimedia Commons, Cloudflare Workers.

### Cabo
A two-player CABO card game prototype with a memory bot and online rooms. GitHub: https://github.com/wilsonsfh/cabo. Live demo: https://cabo.wilsonsoon.workers.dev
- One standard 52-card deck. A Jack forces a blind swap, a Queen gives a private look at a pair and then a swap or keep choice, and discarding a 7, 8, 9, 10, Jack or Queen opens a 2.5-second window in which the other player can stack a matching rank.
- The rules live in a pure, immutable reducer. Each player receives a filtered view, so hidden cards never reach the other browser.
- It runs locally on Node 22 or newer with no install. Online rooms use a WebSocket server, and there is also a Cloudflare Durable Object version. Rooms and chat stay in memory and reset on restart.
- Tests cover 1,000 complete bot games and two real network clients. The README calls it an unaudited prototype.
- Tags: JavaScript, Node.js, WebSocket, Cloudflare Durable Objects, SVG, Web Animations API, Playwright.

### Glassbox
A two-person encrypted chat prototype that runs between two browsers through a local WebSocket relay. GitHub: https://github.com/wilsonsfh/glassbox. Live demo: https://glassbox.wilsonsoon.workers.dev
- Two browsers share a 32-byte invite and complete a Noise NNpsk0 handshake, then exchange frames encrypted with libsodium secretstream. Room, role and sequence are bound into each frame.
- Sending stays locked until both users compare the full 64-character fingerprint. Messages are capped at 4,096 bytes, and sessions end after 15 minutes.
- The relay sees only ciphertext and binds to loopback. The project reports 31 of 31 Node tests passing, covering tampering, replay and key change.
- The docs call it unaudited and not suitable for sensitive conversations.
- Tags: JavaScript, Node.js, WebSocket, Noise Protocol, libsodium, WebCrypto, Cloudflare Durable Objects, esbuild.

### Mouthpiece
An interactive design simulation of a proposed Mac voice-input tool that places cleaned-up speech into a chosen app. Live demo: https://mouthpiece.wilsonsoon.workers.dev
- It records no audio and controls no other apps. Speech, permissions, cleanup and insertion are scripted fixtures, so it shows the intended interaction and not real dictation.
- A five-step walkthrough ends with a Meaning Receipt that compares what was said with what was written. Restore Raw replaces only the text Mouthpiece inserted.
- Safety states are part of the design: a changed destination needs fresh confirmation, protected fields are refused, and denied clipboard access shows selectable text.
- Static HTML, CSS and JavaScript with bundled GSAP and no build step. The project reports 43 of 43 source checks and 115 of 115 browser checks.
- Tags: HTML, CSS, JavaScript, GSAP, Python, Playwright, Cloudflare Workers.

### Patchbay
A local agent harness where plugins can be added or unplugged while the host keeps running. Live demo: https://terminal-boss.wilsonsoon.workers.dev/patchbay/
- Code mode has the model write one script against a generated, typed tool API. The script runs in a separate QuickJS/WebAssembly child process and goes through the same audited dispatcher as direct tool calls.
- In an offline photo benchmark (73 tool calls per mode), code mode needed 2 model turns instead of 74 and sent about 99% less serialized context. The model was a deterministic rehearsal, not a live one.
- Plugins add tools, policy hooks and a model provider. Unplugging one removes its capabilities without restarting the host.
- Tags: Node.js, JavaScript, QuickJS, WebAssembly, JSON Schema, Ajv, Python.

### Terminal Boss
An MCP server that gives an AI agent owned, interactive terminal sessions with exact input, cursor-based output reads and explicit cleanup. Live demo: https://terminal-boss.wilsonsoon.workers.dev/terminal-boss/
- Each session runs a real program in a pseudo-terminal through a small Python supervisor. Output is kept in a bounded byte buffer and the screen is rendered by a headless terminal emulator.
- Input is sent exactly as given, with no implicit newline. Each send needs a fresh screen receipt, and success only confirms that the bytes reached the terminal.
- A read-only observer on loopback shows sessions and output. The hosted Cloudflare site replays a captured run only.
- Reported tests pass on Linux, and macOS use is unverified. It runs arbitrary host commands and is not a sandbox.
- Tags: TypeScript, Node.js, Python, Model Context Protocol, xterm.js, Zod, Cloudflare Workers.

### TRACE
A browser-agent simulation with a flight recorder: preview a plan, approve it, then inspect each step's receipt. No live model or real payment is involved. Live demo: https://trace.wilsonsoon.workers.dev
- Actions run only for an exact approved plan revision. Editing, recovery, pausing or stopping revokes authority, and password, card and unsafe URL targets are rejected.
- The travel and flight flows use fictional data. The flight flow stops at a simulated payment gate (a made-up S$184 fare, S$0 charged) and creates only an in-memory reference.
- Narration is scripted, not live. Unknown questions get an honest "no recorded answer" reply.
- 40 Node tests cover core logic, narration, flight data and restyle checks. The Chrome side-panel extension is a skeleton whose installation is not verified.
- Tags: JavaScript, GSAP, HTML, CSS, Chrome Extensions (Manifest V3), Node.js, Cloudflare Workers.

### Assistant (the portfolio chat assistant)
The chat on this site that answers questions about Wilson and can also draw pictures. Live demo: https://portfolio.wilsonsoon.workers.dev (open "portfolio assistant" from the top bar or the desktop, or press Ctrl/Cmd+K). GitHub: https://github.com/wilsonsfh/website-portfolio
- Text mode answers from a knowledge file Wilson wrote. A question it can't answer gets a fixed "i don't know that one yet" reply, and the question is saved so Wilson can write an answer for it.
- Image mode draws pictures with Workers AI. Pictures of Wilson use his reference photos, and a short blocklist of scenes is refused.
- Workers AI answers first. When its free daily limit runs out, a Groq model takes over for text only, and the chat says so. Per-visitor rate limits keep the free allowance from being drained.
- Tracing sends only metadata (provider, timing, status) to LangSmith, never questions or answers.
- Tags: Cloudflare Workers, Workers AI, Groq, D1, React, TypeScript, LangSmith.

### Unread (the (1) unread chat app)
A self-playing text chat on the desktop where visitors ask questions and get first-person replies from an AI stand-in for Wilson. Live demo: https://portfolio.wilsonsoon.workers.dev (open it from its desktop icon, the guided tour, or the "more on this desktop" list in about.txt).
- A scripted intro plays first, then topic buttons and a text box appear.
- Typed questions go to the same chat Worker as the assistant, with the recent thread as context. A "wilson" persona makes replies use "I", and the chat is honest that it is an AI stand-in. Questions it can't answer point to the contact links in about.txt.
- The image button sends prompts to image mode when images are available that day.
- Tags: React, TypeScript, Vite, motion, Cloudflare Workers, Workers AI, Groq.

### Terminal (the portfolio terminal window)
A terminal window on the desktop with shell-style commands for reading the site's content and a chat mode for the assistant. Live demo: https://portfolio.wilsonsoon.workers.dev (open it from the terminal icon in the dock, or follow the desktop tour).
- Commands include help, ls, cat work.txt, open photos, theme and the contact links. Tab completes command, file and app names, and the up and down arrows step through history.
- Typing assistant, or ask followed by a question, sends it to the portfolio chat Worker (Workers AI first, Groq as the text fallback).
- Its content comes from the same JSON data files as the rest of the site.
- Tags: React, TypeScript, Vite, CSS, Cloudflare Workers, Workers AI, Groq.

## Activities

### Hackathons
AI Engineer Hackathon Singapore 2026, TinyFish Hackathon Singapore 2026, Cursor Hackathon Singapore 2025, GovTech-NTU Product Club Hackathon 2025, SAP Cloud Accelerated Learning Experience 2025.

### ItsRainingRaincoats, Product Manager (Sep 2025 to Nov 2025)
Wrote product requirements for a chatbot that schedules donation collections for a non-profit that supports migrant workers in Singapore.

### Student ambassador programmes
- Microsoft Student Ambassador (Jan 2026 to Jun 2026): worked with a team of student ambassadors to get students in Singapore using Copilot Chat, by running technical workshops and events.
- Perplexity Student Growth Partner (Aug to Dec 2025): grew awareness and use of the Comet Browser on campus through community events.

### NUS Students' Computing Club, Vice President of External Relations (Aug 2024 to Aug 2025)
Represented 6000+ computing students, led a team of 72 and raised $54,450 through partnerships.

## How Wilson works with AI

Wilson uses MCP servers and agent skills in his AI and agentic workflow. Examples: a Canvas MCP, a Socratic tutor skill and a 4-step Karpathy-guidelines skill.
