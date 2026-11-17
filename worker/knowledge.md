# Knowledge about Wilson Soon (built from an allowlist; see docs/ai-chat-decisions.md)

## Project page: apple-notestox

### AppleNotestoX

A public local-first macOS knowledge pipeline that preserves familiar capture in
Apple Notes while adding inspectable raw evidence, LLM-owned synthesis, and repeated
study/review. Public repository: <https://github.com/wilsonsfh/AppleNotestoX>.

### Motivation

Apple Notes is strong for capture but does not itself provide a traceable, connected,
reviewable knowledge pipeline. AppleNotestoX keeps capture local and familiar while
preserving screenshot position, traceability, unsynthesized backlog visibility, and
multiple outputs from the same evidence.

### Product and architecture

```text
Apple Notes / Notion / video
        -> immutable raw Markdown + original assets
        -> external LLM synthesis
        -> static study data
        -> flashcards + concept map + narrated recap
```

- SwiftUI coordinates product state while actor-owned services handle AppleScript,
  export, Notion, transcription, and other long-running work.
- A shared block model feeds Markdown and Notion; traceability-stamped wiki export copies
  original assets with positional placement.
- AVFoundation and Apple Speech provide on-device transcription/keyframes; a Node tool
  imports bounded, validated Notion content.
- The app owns capture into `raw/`; the LLM workflow owns interpretation in `wiki/`;
  a generated static app owns retrieval practice.

### Status

| Gate | State |
| --- | --- |
| Public GitHub | Public, anonymous access verified; default `main` |
| Release attribution | Release/progress commits attributed to `wilsonsfh` |
| Build and credential-free harnesses | Passed, including 103/103 importer security tests and 12 conversion checks |
| Synthetic native UI | Minimum/default-size Study, Capture, Settings, and archive views rendered |
| Final publication review | `READY` |
| Permissioned integrations | Real Apple Notes, Speech/video, live Notion, browser TTS/light mode remain |
| Accessibility acceptance | Headed VoiceOver/keyboard blocked by macOS TCC `-25211` |
| Licensing | No license; public visibility does not grant reuse rights |

### Choices and trade-offs

| Choice | Why | Trade-off |
| --- | --- | --- |
| Immutable raw / derived wiki | Protect evidence and permit re-synthesis | Extra ingest step |
| External LLM synthesis | Keep model, prompts, review, and traceability replaceable | Less one-click automation |
| Title/folder search | Avoid expensive per-note body retrieval | No full-text search |
| Original assets | Preserve visual context | More disk use |
| Native macOS stack | Privacy, system semantics, small dependency surface | Permission-dependent and macOS-only |
| On-device Speech only | No hidden network fallback | Recognition varies by locale/device |
| Static review app | Portable, no build dependency | Browser-local history and platform-dependent voice |

### Reliability and security hardening

- Independent progress channels plus a single-flight gate prevent operation-state
  aliasing.
- Exclusive no-clobber writes combine suffix retry with identity-aware rollback, so a
  failed transaction cannot delete another writer's replacement.
- Consumer-owned marker-scoped cleanup preserves temporary files until every downstream
  use finishes.
- Notion downloads re-check public-address policy at connection time, bound redirects and
  bytes, validate MIME/raster signatures, and reject SVG/HTML/arbitrary data.
- Synthetic project-domain fixtures replaced personal/demo content in committed and visual
  evidence.

### Results

- Public release commits, comprehensive README, public visibility, anonymous access, and
  GitHub attribution were verified.
- The app ships Apple Notes hierarchy/search/export, optional Notion archive/import,
  on-device video processing, a synthesis backlog, and static study views.
- Build, security, conversion, traceability, cleanup, concurrency, rollback, state probes,
  syntax, diff, secret, and synthetic visual gates passed at release.

### How to use and why useful

Use the macOS app to select Apple Notes or import supported Notion/video material, export
it into traceability-stamped `raw/journal` plus `raw/assets`, run the separate synthesis
workflow, then generate the static Study hub. This is useful when capture convenience
matters but evidence must stay auditable and reusable across Markdown, archives,
transcripts, flashcards, maps, and recaps.

### Personal and career learnings

- A portfolio project becomes more legible when its README explains motivation,
  architecture, rejected alternatives, safety boundaries, evidence, and honest gaps.
- Publication review can create technical leverage: documenting claims exposed overwrite,
  cleanup, YAML, SSRF, and evidence-level defects before release.
- Native controls and restrained system materials can improve product character and
  accessibility together rather than trading one for the other.
- The project is a concrete personal instance of a local-first knowledge pipeline:
  capture remains low-friction while traceability and synthesis remain separate.

### Remaining proof

Run Xcode/CI XCTest, real screenshot-heavy Apple Notes export, real/long Speech video,
live Notion signed-image integration, browser TTS/light mode, and headed VoiceOver/keyboard
acceptance. Decide whether to add a license.

### 2026-08-11 — the portability claim was sitting uncommitted

The project status sweep found that the
uncommitted work **was the substance of the README's own claim**: the `Makefile`, `bin/doctor`,
the CI workflow, the runtime `review/` resolution chain and the removal of the hardcoded vault
path *are* the clean-clone portability the README asserted. `make check` was verified green
(build + 103 node tests) before committing.

### 2026-10-22 — stash committed, bugs fixed, demo added

Session, 21–22 Oct 2026:

- A forgotten 26-file WIP stash (19 Sep) was reviewed and pushed. Exports now go to
  **`raw/apple-notes/<category>/`** instead of `raw/journal/`. The Duplicates tab now also catches
  near-duplicate notes (Jaccard over 3-word shingles, 0.8 threshold) and has a line diff. Merge to Note
  dropped its broken image staging.
- Review fixes:
  - a path-traversal delete (`../` asset links could trash files outside the vault)
  - the diff showing old and new swapped
  - similarity inflated by the shared provenance banner
  - substring keyword matching ("ai" matching inside "said")
- **Found by running the app on demo data:** the same-day re-export ordering bug (older file marked
  Newest, newer file pre-selected for the Trash). Fixed test-first.
- **The XCTest gate in "Remaining proof" is now met:** `swift test` under Xcode, **199 passing**.
- README: demo GIF, six screenshots, Wilson's own "Why I built this". `demo/` holds labelled sample
  data. `make install` replaced the 10 May build in /Applications.

> Folder contract changed
> "How to use" above describes `raw/journal`, which was correct at publication. Apple Notes exports
> now land in `raw/apple-notes/<category>/`. The Notion importer still writes `raw/journal/`.
>

## Project page: x-bookmark-injector

### X Bookmark Injector

A personal Chromium extension that puts one random saved X post at the very top of
For You, turning a hoarded bookmark archive into a visible reading-and-clearing loop.
Public GitHub:
<https://github.com/wilsonsfh/x-bookmark-injector>.

### Status

> Card actions moved to a compact top header 2026-07-13
> The action controls (Open on X, Keep for later, Done · Remove, Show another bookmark) moved from a
> bottom footer into a top-of-card header, in line with the provenance + author rows, then shrunk
> after owner feedback ("too outstanding"). Pushed `55e18b0..b5eebb5` (`627f08e` feat, `b5eebb5`
> docs). 313/313 tests, build, real-render at wide + default widths verified; live reload acceptance
> pending. 

> Original read/sync loop live-accepted; destructive release gate pending
> Option B works in the owner's logged-in X: sync, author data, native first-position
> card, six-line expansion and exact-status navigation passed. Keep/Delete/Undo and the
> remaining release checklist are still open.

| Gate | State |
| --- | --- |
| Design/spec/plan | Complete |
| Automated tests | 313/313 passed (added quoted/re-roll, link-preview, auto-sync suites) |
| Build | `dist/` generated successfully |
| Dependency audit | 0 vulnerabilities |
| Whole-branch review | Prior branch PASS; new streams pending design + code review |
| Card enrichment + auto-sync | Pushed `14d833b` (+ `4cc1b0c` docs); gate green, owner live E2E pending |
| Logged-in X / Chromium E2E | Core read/sync Option B passed; quoted/re-roll/preview/auto-sync + destructive checks pending |
| Public GitHub | Published on `wilsonsfh/x-bookmark-injector` default `main`; conventional-commit style (`feat:`/`fix:`/`docs:`) |

### Card enrichment + auto-sync (shipped 2026-07-13)

Shipped to `main` (commits `14d833b` feat, `4cc1b0c` docs):

1. **Quoted post inline expand + re-roll.** `Show quoted post` reveals one quoted post as
   its own sibling link (no nested `<a>`); `Show another bookmark` swaps a different eligible
   bookmark in place. Hardened after review: a single shared Keep/Done/re-roll lock, a
   stale-re-roll ownership guard, isolated quote extraction, and focus restoration.
2. **Link/article preview.** A shared-link or X-Article bookmark whose text is only a `t.co`
   shortlink now renders a native preview (thumbnail + domain + title) parsed from
   `card.binding_values` / `article.article_results`; inline `t.co` links expand to display
   URLs. Fixes the owner's PostHog "Stop being the code review bottleneck" report.
3. **Auto-sync on bookmark change.** The MAIN world detects same-device `CreateBookmark`/
   `DeleteBookmark` and the content script debounces a background sync (**15s**, min **30-min**
   gap); the extension's own mutations bypass detection, so no loop. Prior behaviour was a
   24h on-Home or manual sync only.

**Sync-freshness design.** A just-added bookmark does not need instant resurfacing (the card
shows old backlog), so the auto-sync gap is deliberately generous (fewer full re-paginations
of X's API — and note the extension uses **no AI API**; "sync" is X's own GraphQL parsed in
plain JS). The on-Home staleness backstop was lowered 24h → **12h**; the owner clarified its
real job is **cross-device (mobile)** catch-up, since the same-device add/remove detector
cannot observe bookmarks changed on another device.

Remaining: owner reloads `dist/` + Syncs once (cached items re-normalize only on sync) and
live-verifies the three behaviors; design + code review of the new streams; destructive
Keep/Delete/Undo E2E still open. Open question: whether the link preview should open the
article's external URL vs the X post.

### Product decision

- **Placement:** first item in the selected For You timeline, not another inbox.
- **Selection:** random each open.
- **Visual:** look like a normal X post, not a dashboard. One muted traceability line,
  normal avatar/author/date/text/media/engagement anatomy, then compact Read/Keep/
  Done-Remove controls. The owner explicitly rejected rail/tint/chips/full-width chrome.
- **Truthful context:** `Saved #k of N` where #1 is oldest, plus the tweet's real
  posted date and remaining count. X does not provide historical bookmark-click time.
- **Actions:** Keep = local cooldown; Done = real X removal with six-second Undo.
- **Desktop path:** Chromium MV3 + the already logged-in X browser session. No X
  developer app or backend.
- **iOS:** native X cannot be injected. A future iOS path would be a separate Swift
  widget/app using the official OAuth API.

### Architecture

```text
x.com page (MAIN world)
  capture allowlisted GraphQL operation shapes
  execute only bounded x.com/i/api/graphql requests
        ↕ validated bridge
content script (ISOLATED world)
  For You detection · random card · Keep/Done/Undo UI
        ↕ Chrome runtime messages
background service worker
  bounded sync · rank/dedupe · durable delete saga · local state
        ↕
chrome.storage.local/session
        ↕
popup
  progress · sync/errors · chronological list · actions/recovered Undo
```

### Reliability and safety

- Full pagination publishes transactionally; partial/schema-invalid/rate-limited sync
  retains the previous cache.
- Only three operation IDs are persisted. Bearer/CSRF/request templates remain in
  memory; no backend or telemetry exists.
- Mutation responses are operation-schema validated. Known rejections clear intent;
  ambiguous 5xx/post-dispatch outcomes enter bounded reconciliation.
- Delete writes a durable pre-mutation intent and bookmark snapshot. Undo authorization
  survives MV3 worker restart in session storage, restores a cache entry removed by a
  concurrent sync, and remains user-visible in feed/popup.
- Popup and feed guard duplicate Done actions, stale responses, expiring Undo, focus,
  error coexistence and restart recovery.

### Loop contract

- **Start:** open X Home or press Sync.
- **Autonomous work:** read/cache bookmarks and inject one card.
- **Write gate:** only explicit Done/Undo mutates X.
- **Proof:** automated suite/build/audit + the live release checklist.
- **Unwind:** unload extension; Undo restores a just-deleted bookmark; failed sync keeps
  prior cache.
- **Survives:** local cache, clear history, query IDs, settings, tests and fixtures.

This is a personal instance of the controlled run as a product:
the hard part was not rendering a card, but bounding an undocumented API and destructive
action across browser/service-worker failure boundaries.

### Personal learning

- Digital minimalism can be built into an environment: don't rely only
  on self-control; change what the high-frequency surface shows.
- The "inject it like an ad" idea borrows scarce-attention placement from ad tech while redirecting it toward self-chosen value.
- Random discovery and chronological legibility can coexist: surprise chooses the item;
  rank explains its place.
- A destructive button is a distributed-systems problem once remote X state, extension
  storage and an ephemeral MV3 worker must agree.
- Review loops created leverage: race, schema, restart, focus, contrast and recovery gaps
  became permanent tests instead of undocumented caveats.
- Loading an unpacked extension from a disposable worktree made the Reload path vanish
  after cleanup; stable-path live testing belongs in the delivery checklist.
- A fake DOM that reflected ARIA attributes as properties hid a real browser bug. Test
  doubles must model standards semantics, then still yield to a human browser gate.
- Publishing the architecture and rejected alternatives made the engineering legible:
  the portfolio value is not merely "Chrome extension," but the reasons behind its
  trust boundaries, fail-closed parser, pagination exception and mutation saga.
- A layout ask ("put the buttons at the top") was a structural refactor, not a CSS tweak,
  because the tests hard-coded the card anatomy — the fix updated the anatomy test to a
  better structure while preserving its invariants (no interactive nesting inside an `<a>`;
  body links to the status). Rendering three layouts with the real CSS decided it far faster
  than arguing; the shipped module (not just the mockup) was rendered to prove it; and "too
  outstanding" was answered with size + right-alignment down to the a11y target-size floor
  (≥24 CSS px).

### Next proof

1. Load the extension's `dist` folder from `chrome://extensions`.
2. Log into X; open Bookmarks; bookmark/unbookmark one disposable tweet to capture the
   current three operation shapes.
3. Reload the unpacked extension after the native-design rebuild and verify the current
   post has no rail, tint or stat chips.
4. Run the repository's E2E checklist without marking unavailable evidence.
5. Only then call the extension live-working/release-ready.

## Work experience (public site data)

### Solutions Engineering Intern, Cloudflare (May 2026 - Aug 2026, Singapore, Singapore)
- Delivered technical demos to senior Solutions Engineering leadership at a cross-regional meeting of 80+ SEs, shadowed SEs on live customer engagements, and supported outbound client acquisition at a regional client summit
- Built a security assessment tool that automates analysis of client accounts against Cloudflare's WAF, SSL/TLS, Rate Limiting, and Bot Management products, giving SEs discovery and upsell talking points and a simpler way to convey remediations to clients
- Scoped and shipped scoring improvements across those products from SE user research, now used across client accounts and still active post-handover
- Built a browser-based Linux desktop on Cloudflare Containers powering a hands-on lab series, letting clients and SEs configure and test security policies without a VM or local install
Tags: Zero Trust, Workers, Durable Objects, KV

### Product Management Intern, Glints (Dec 2025 – Apr 2026, Singapore, Singapore & Jakarta, Indonesia)
- Led user research interviews with jobseekers and SME employers to map hiring behaviour and needs, with findings used by PM and Engineering teams to prioritise features for localisation and expansion into Singapore and Malaysia
- Represented Glints at school events and industry sharing sessions to gather direct product feedback and engage potential clients
- Grew jobseeker DAU by more than 2x through data-driven experiments and partnerships, and wrote SQL queries in Metabase to prioritise scope and cut manual database lookup time
Tags: SQL, Metabase, User Research, Product Analytics

### Software Engineering Intern, NUS Enterprise Minimum Viable Product Studio (May 2025 – Jul 2025, Singapore, Singapore)
- Worked on a full-stack web application for researchers to analyse bird patterns with React and Django with PostgreSQL
- Improved bird species identification across geographic regions by integrating BirdNET Machine Learning classifier using eBird API and GPS coordinate data, increasing classification accuracy compared to manual labeling
- Enhanced cloud data pipeline with Python scripting to batch ingest and synchronize large volumes of bird audio recordings between local storage and Google Cloud Storage, reducing manual data entry time
Tags: React, Django, PostgreSQL, Python, Google Cloud Storage, BirdNET

### Software Engineering Intern, Singapore Land Authority (Nov 2020 – Feb 2021, Singapore, Singapore)
- Enhanced extraction of building data for geospatial applications such as Autodesk Revit by implementing C# plugin and open-source Buildings and Habitats object Model (BHoM)
Tags: C#, Autodesk Revit, BHoM

## Projects (public site data)

### AppleNotestoX
Local-first macOS pipeline that turns Apple Notes into a durable, reviewable knowledge wiki.
- Built a macOS webapp that exports Apple Notes content to a Markdown format and Notion, preserving inline media and traceability with source note identifier and date
- Equipped on-device video transcription with Apple Speech and AVFoundation keyframes, feeding an AI-synthesized wiki that doubles as a study app with flashcards and narrated recaps of personal notes
Tags: SwiftUI, AppleScript, AVFoundation, Apple Speech, Node.js, Notion API
github: https://github.com/wilsonsfh/AppleNotestoX
live: https://applenotestox-demo.wilsonsfh.workers.dev
livePseudo: true

### X Bookmark Injector
A Chromium extension that resurfaces a random saved X bookmark at the top of your For You feed.
- Manifest V3 extension that reuses X's own logged-in GraphQL session to sync, de-duplicate, and rank bookmarks, then injects one as a native-looking post — zero backend, zero telemetry, all state local to the browser profile
- Durable delete/undo saga survives service-worker restarts with a fail-closed response schema; 290 passing unit, integration, and race tests
Tags: Chromium MV3, JavaScript, esbuild, Vitest
github: https://github.com/wilsonsfh/x-bookmark-injector
live: https://x-bookmark-injector-demo.wilsonsfh.workers.dev
livePseudo: true

### TradingSignalandHelper
A local, paper-first US-stock signal desk with a human-in-the-loop trade helper.
- Turns price candles into BUY/SELL/HOLD calls via an EMA-crossover strategy, then routes each through a review-ticket dashboard showing take-profit, stop-loss, and live broker state before any order is confirmed
- Production-minded order lifecycle — SQLite persistence, restart recovery, cross-process duplicate protection, replay-resistant webhooks, and a moomoo/OpenD paper-trading adapter; 152 tests, mock-first by default
Tags: Python, Flask, SQLite, yfinance, moomoo / OpenD
github: https://github.com/wilsonsfh/TradingSignalandHelper

### ClearerToday
AI speech coach for enunciation practice and adaptive pronunciation feedback.
- Built an AI speech coach for enunciation based on analysis of phoneme-level mouth-shape gaps with MediaPipe Face Mesh and ElevenLabs transcription
- Developed an adaptive feedback loop that stores persistent user gap profiles in Convex to rerank future guidance, retrieving live pronunciation references with Exa and generating next-drill instructions scored primarily by OpenAI frontier model.
Tags: Next.js, React, TypeScript, Convex, MediaPipe Face Mesh, ElevenLabs, Exa
github: https://github.com/wilsonsfh/ClearerToday

### CorrectiveRehabApp
End-to-end biomechanical analysis pipeline for gym exercises.
- Detects 8 lift-specific form issues (knee valgus, hip shift, butt wink, forward lean, etc.) with 0–100 symmetry scores and severity grading per rep across 6 exercises
- Mobile skeleton visualizer renders react-native-svg overlays (24 joint connections, teal/orange/red severity coloring) with a side-by-side session diff view classifying issues as improved/regressed/resolved/new
Tags: React Native, Expo, FastAPI, MediaPipe, Google Cloud Run, Supabase, PostgreSQL
github: https://github.com/wilsonsfh/CorrectiveRehabApp

### Concept Visualizer | Mar 2026
Visual learn technical concepts through AI-powered step-through animated node graph.
- Covers only computer science domains in networking, algorithms, databases, and system design
- AI explanations (Groq llama-3.3-70b) rendered as interactive React Flow graphs with Dagre auto-layout
Tags: Next.js, Tailwind CSS, React Flow, Redis, Groq API
github: https://github.com/wilsonsfh/concept-visualizer
live: https://concept-visualizer-seven.vercel.app/

## Activities (public site data)

### Hackathons
- Competitions: AI Engineer Hackathon Singapore 2026, TinyFish Hackathon Singapore 2026, Cursor Hackathon Singapore 2025, GovTech-NTU Product Club Hackathon 2025, SAP Cloud Accelerated Learning Experience 2025.

### ItsRainingRaincoats | Product Manager | Sep 2025 – Nov 2025
- Worked on product requirements document (PRD) features to develop a donation collection scheduling chatbot for a non-profit organisation supporting migrant workers in Singapore.

### Student Ambassadorial Programmes | Microsoft Student Ambassador · Perplexity Student Growth Partner
- Microsoft Student Ambassador (Jan 2026 – Jun 2026): Collaborated with a team of student ambassadors to drive large-scale Copilot Chat student activations in Singapore, by organising technical workshops and events.
- Perplexity Student Growth Partner (Aug – Dec 2025): Drove campus adoption and awareness of the AI-powered Comet Browser through community engagement.

### NUS Students' Computing Club | Vice President of External Relations | Aug 2024 – Aug 2025
- Represented 6000+ computing students, led a 72-strong team, and raised $54,450 through partnerships.

## Cloudflare APJC Tech Summit
Wilson attended the Cloudflare APJC Tech Summit in Kuala Lumpur, 3 to 6 August 2026.

## Preparation-time app
At Cloudflare, Wilson built an app that integrates and automates criteria matching for clients, so customer engineers prepare better and spend less time on technical preparation before meeting a client. It primes them with what they need from the client's data before the conversation, so they don't have to gather it all themselves. 100+ customer engineers use it. After his internship people kept using it and building on it, because its source is open to the rest of the Cloudflare team.

## AI workflow
Wilson uses MCP servers and agent skills in his AI and agentic workflow, for example a Canvas MCP, a Socratic tutor skill and a 4-step Karpathy-guidelines skill.
