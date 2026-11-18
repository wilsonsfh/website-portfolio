# Spike B (desktop) progress

## Handover to Claude (2026-11-15)
- Wilson wants B (the desktop/website-lookalike concept) temporarily published at `https://wilsonsoon-website-portfolio.vercel.app/` while his Claude limit resets. B is now live there as Vercel production deployment `dpl_CcidsDXUvuPkddtqW2AwkB91qDWr`, deployed 2026-11-15 from the `v2` worktree's prebuilt static output. `src/App.tsx` mounts B's greeting before the plain main page. Local preview: `npm run dev -- --host 127.0.0.1 --port 4322 --strictPort` from this worktree.
- The Vercel project still has an Astro framework preset, and `main` remains the old Astro site. This deployment used prebuilt Vite output without changing those settings or branches; a later production deployment from `main` can replace B. Adjust deployment settings deliberately when the final approach is chosen.
- Continue the requested portfolio work with Wilson after the limit resets, keeping the concepts separate until he decides otherwise. B is preserved at `archive/spike-b-desktop`; A and C are preserved at `archive/spike-a-screening-room` and `archive/spike-c-messages`. The `v2` branch currently builds on B; `main` remains the original Astro site.
- `npm run build` passed on 2026-11-15. The scrollable desktop follow-up still needs real-device and visual verification, including phone layout, return visits, scrolling over windows, and reduced motion. The older known-issues bullets below predate that follow-up where they conflict with it: scrolling back up returns to the desktop, and the main page is no longer inert.

## Done
- M1: power-off screen, CRT line switch-on, 4-line boot text (~1.0s), desktop top bar (wilson, clock, plain site →), Escape/"plain site →" to MainPage, sessionStorage (`greeting-b`: plain|desktop), `?intro=1` forces power-off, reduced-motion fade path, page behind inert + no scroll.
- M2: 6 icons + windows (about.txt, work, projects, activities, photos, contact) with real shared content; pointer-captured drag clamped to viewport; click-to-front; open scale .95 + fade 200ms ease-out, close 120ms; photos scroll-snap strip; phone (<640px) full-screen sheets under the top bar with "← back", 3-col icon grid, no drag.
- M3: terminal (help, whoami, ls, cat about.txt, open <x>, exit; unknown prints hint).
- M4: focus handling (window/desktop/terminal input focus, focus returns to icon on close), 360px checked by reasoning.
- Shared copy lives in `src/copy.ts` (MainPage imports it; output unchanged).

## Follow-up: scrollable desktop (done, one commit for both milestones)
- Desktop is now a `100dvh` `<section id="desktop">` in normal flow before `<main id="main">`; nothing unmounts; scroll lock and inert removed. Windows and phone sheets are absolute inside the section and clamped to it (width uses clientWidth).
- `plain site →`, `↓ plain site` cue (bottom edge, off screen and desktop) and Escape smooth-scroll to `#main` (instant under reduced motion). Terminal `exit` too. Escape only acts while the desktop is still on screen.
- `history.scrollRestoration = "manual"`. sessionStorage `greeting-b`: absent = first visit (top, power-off), `seen-off` / `seen-on` = return visit (useLayoutEffect jumps to top of #main; `seen-on` shows desktop already on, no boot, about.txt open on desktop widths without stealing focus). Scrolling past half a viewport also marks the visit as seen. `?intro=1` behaves like a first visit.
- `power off` in the top bar returns the section to the power-off screen.

## In progress
- nothing

## Next
- Real-device check; decide if concept survives vs. plain page.

## Known issues
- Follow-up unverified visually: return-visit landing, scroll behaviour over windows, top bar fit at 360px (grid auto/1fr/auto, two right buttons).
- Nothing visually verified (no screenshots allowed): CRT timing, window cascade positions, photo strip sizing, phone layout.
- On phone about.txt is not auto-opened (a sheet would hide the icons).
- Photos have empty alt in photos.json; strip is labelled as a group only.
- No way back to the desktop after "plain site" except `?intro=1`.
- Window z-order is not trapped; Tab leaves overlay to browser chrome (main is inert).

## Unknowns discovered
- A desktop adds a click and a window layer between a recruiter and the resume text; on phones sheets one-at-a-time work but cost more taps than the accordion.
- Drag/stack only has value on pointer devices; on phones it is pure overhead.
- Boot sequence is ~1.3s every first visit; must stay skippable.

## M1 desktop (v2-desktop worktree)
Done (all builds pass):
- Top bar: "wilson soon, 2026", clock, power icon button, sound icon button (aria-pressed), "plain site →". Press scale 0.97 / 160ms on all.
- Power button press: scale 0.97 plus a 300ms expanding ring (button stays mounted, inert, fading during boot so the ring is visible). Power off: CRT collapse 420ms (picture to a line at 45%, line to a dot, dot fades); reduced motion = 200ms opacity fade in both directions.
- `sound.ts`: Web Audio only, context created lazily in click handlers. Static burst on power on (peak gain 0.12, ~550ms decay), sine glide 660 to 220Hz (~120ms, peak 0.09) on power off. Toggle persisted in localStorage `v2-sound` (default on). Sound ignores reduced motion.
- `Wallpaper.tsx`: random start, next photo every 40s, decoded before fading, 1200ms opacity crossfade (200ms reduced), timer paused while tab hidden; veil rgba(232,229,224,.62) light / rgba(10,10,10,.68) dark. Contrast computed by hand (worst case black or white photo under the veil gives roughly 6:1 or better for labels), not measured in browser.
- `Tooltip.tsx`: 400ms first delay, neighbours instant until pointer is off all triggers for 300ms, typed at 22ms/char with 150ms opacity fade, hover (fine pointer, not touch) and focus-visible, aria-describedby to an sr-only copy, hides on scroll/resize. Copy for icons lives in `apps.tsx` (`tip`).

Unverified visually: top bar fit at 360px, CRT collapse look and timing, ring visibility during boot, actual audio loudness, wallpaper veil legibility on all 16 photos in both themes, tooltip placement and clamping at 360px, tooltip over windows (z-index 3000 inside the desktop).

## Messages app

- Spike C's thread ported as a desktop app, "(1) unread" (`src/components/greeting/Messages.tsx`, `messages.css`, `src/data/chat-script.json`), registered in `apps.tsx`.
- Opening is 8 lines, about 6.7s (0.4s beat, 350-700ms typing, 120ms gaps), then chips + input. Chips are one scrolling row, input one line (~100px on phone).
- Pause/resume button; auto-pauses while the visitor types and when the tab is hidden. Closing the window keeps state (module-level), reopening continues the queue.
- Neutral matte ink bubbles via CSS variables switched on `:root.dark`. Reduced motion: opacity-only bubbles, static dots.
- Content: dropped the internal-sounding Cloudflare security tool answer. 7 lines carry `needsReview` (3 kept from C, 2 new/changed Cloudflare lines, others unchanged).
- Needs a browser check: phone height of chips+input, bubble contrast, scroll containment, pause on typing.

## Photo scrolls (v2-scroll worktree)

- After the first power-on of a session (sessionStorage `scrolls-b`), four paper lanes (career, people, me, scenery) unroll over the desktop. The `photos` icon toggles them (`aria-expanded`, tooltip "unroll my photos" / "roll them up"); the old photos window is gone, `open photos` in the terminal unrolls them. Phone has a 44px close button because the lanes cover the icons.
- Data: `src/data/story.json` (lanes + items; `src` null = captioned placeholder card, `type: "video"` gets a muted looping `<video>` with a play badge). Items sort by date per lane. Component `Scrolls.tsx`, styles `scrolls.css`.
- Roll-out: per lane `clip-path` reveal plus a travelling roller, both WAAPI, 900ms `cubic-bezier(0.32,0.72,0,1)`, 110ms stagger top first. Roll-up: together, 320ms `cubic-bezier(0.23,1,0.32,1)`, continues from the current progress if toggled mid-roll. Reduced motion: 200ms opacity fade, no roller.
- Drift after the roll-out: linear, 22 + 2 per lane px/s, alternating direction, eased in/out over 500ms. Pointer down tracks 1:1 (pointer capture, `touch-action: pan-y`), release coasts with `v/1000 * 0.998/(1-0.998)`, drift resumes 2s later. Paused on mouse hover, hidden tab, reduced motion (no momentum either).
- Placeholder cards show caption and date inside the card and have no caption underneath (avoids duplicating the text). Each lane renders enough copies to cover its width (2x or more), so 115 items means about 60 cells per lane; images use `loading="lazy"`.
- Needs a browser check: roller/paper lockstep, picture heights at laptop size (about 138px at 900px tall), icon column clearance, light and dark paper, phone scroll and close button, drag/momentum feel, reduced motion, icons usable during unroll.

## plaintextversion.html (v2-plain worktree)

- New desktop icon `plaintextversion.html` (tooltip "the boring version, all of it", app id `plain` in `apps.tsx`) opens `<MainPage embedded />` in a window: 640px wide, 80% of viewport height (clamped, new optional `hFrac` on `App`), body scrolls internally. Phone: full-screen sheet like the others.
- `MainPage` got an `embedded` prop: renders a `div` without `id="main"` (no duplicate id or second main landmark), no `min-height: 100dvh`, tighter column padding (`.embedded` rules in `global.css`). Row ids now use `useId` (two instances would otherwise collide on `aria-controls`). The footer theme toggle follows `<html class>` via MutationObserver so both instances stay in sync.
- Top-bar "plain site →" now opens/raises this window (`open("plain")`) instead of scrolling. The power-off screen's "plain site →", "↓ plain site" cue, terminal `exit` and Escape still scroll to `#main`.
- Needs a browser check: icon label wrapping in the 88px icon (21 chars, wraps anywhere), window size and internal scroll, accordion inside the window, phone sheet, theme toggle in both places, dark mode.

## Window management (v2-windows worktree)

- Default size: windows open at the app's `w`/`h` (clamped to the desktop area; already true). Body is `overflow: auto` with `overscroll-behavior: contain`.
- Resize: 8 invisible handles (6px edges, 12px corners) inside `.dk-pos`, pointer capture, 1:1, min 280x180, clamped to the desktop area, no animation. A resized size lives on the window state (`w`/`h`) and is clamped again on viewport resize.
- Maximize: title-bar button or double-click on the title bar; fills the area below the top bar with an 8px inset. FLIP on the outer `.dk-pos` (WAAPI transform, 240ms `cubic-bezier(0.23,1,0.32,1)`); an interrupted flip restarts from the visible rect. Content is scaled during the flip (not counter-scaled). Reduced motion: 150ms opacity crossfade. Maximized windows can't be dragged or resized.
- Minimize: window stays mounted (state kept), shrinks to 0.9 and fades while translating to its dock entry, 200ms; restore grows back out of the entry, 240ms (`cubic-bezier(0.23,1,0.32,1)` both). Reduced motion: opacity only, 150ms. Dock: bottom centre, only while something is minimized, matte neutral, 44px entries (glyph + title, tooltip "restore <title>"). Clicking an entry or the desktop icon (or the top-bar "plain site") restores and focuses. Minimized windows are `inert` and `visibility: hidden`.
- Title-bar buttons: minimize, maximize/restore, close (inline SVG, tooltips, aria-labels, press 0.97, 40x36 visual, 44px tall hit area via `::after`). Phone sheets unchanged, no new controls.
- Tooltip now renders through a portal to `document.body`: a fixed tooltip inside a transformed, overflow-hidden window was mispositioned and clipped.
- Bug fix: about.txt no longer auto-opens on the first power-on while the photo scrolls auto-open.
- Needs a browser check: FLIP look (text stretch), dock-entry targeting for first and later entries, tooltip placement over windows, corner handles vs title buttons, focus after minimize/restore, Photos app window (other worktree) with the new controls.

## Photos app (v2-photosapp worktree)

- `photos` icon now opens `PhotosApp.tsx` (+ `PhotoViewer.tsx`, `photosData.ts`, `photos.css`): 860x600 window (clamped), flush body, full-screen sheet on phone. The paper scrolls are still the first-power-on greeting; the toolbar "unroll" button and terminal `unroll` toggle them (`Ctx.unroll`). Tooltip: "browse my photos".
- Sidebar (library, career, people, me, scenery, videos) becomes a segmented row under 640px window width. Toolbar: title + count, jump-to-month select, square/original toggle, 3-step size slider. Grid is oldest first, sticky month headers, undated last, 2px gaps, lazy images, video tiles show a play badge.
- Grid keys: arrows (up/down found from layout), Home/End, Space/Enter open, instant, 2px neutral outline. Esc in the grid still goes to the desktop's plain-site shortcut; Esc in the viewer is swallowed.
- Viewer: 3 panes on a track; drag tracks 1:1 (pointer capture, `touch-action: none` because swipe-down and pinch need the gestures), rubber band 0.35 at ends, commit at 25% width or 0.11px/ms, 280ms `cubic-bezier(0.32,0.72,0,1)` WAAPI slide, grabbing mid-slide continues from the visible position. Keys swap instantly. Reduced motion: no slides or scales, 150ms fade.
- Zoom 1x-4x (slider, -/+, =/-/0 keys, double-click or double-tap at point, ctrl/cmd+wheel or trackpad pinch, two-finger pinch), pan by drag. Touch: swipe down dismisses (scale to 0.85, background and chrome fade, 120px or 0.11px/ms), tap toggles chrome. F = Fullscreen API on the viewer (falls back to hiding chrome), I = info.
- Filmstrip: original ratios, 56px (44px phone), 2px gaps, current thumb has wider gaps and full opacity (others 0.7). Own transform-based scroller: click jumps with a 240ms tween recentre, drag/wheel scrub with the thumb under the centre becoming current live, momentum projection then snap; keys recentre instantly. During a scrub the wide gap is switched off to avoid layout jitter.
- Scroll fixes: lane height now accounts for a 44px foot strip (min picture 80px, then vertical scroll); the close button moved into that strip; the "plain site" cue sits in the same strip, so neither covers a lane. The close button now shows at all widths (the icon no longer toggles the scrolls).
- Needs a browser check: everything above visually; strip jump when the current thumb's gaps change, slide/dismiss feel on a real phone, fullscreen inside the window, video drag area (gestures ignore the video element itself), light/dark contrast, 1512x690 lane fit.

## Handover (2026-11-17 evening)
Merged into `v2` and building: desktop M1 (top bar, power/sound icons, CRT off, Web Audio, tooltips, wallpaper),
`(1) unread` messages app (all lines reviewed by Wilson), four-lane photo scrolls (greeting), 114 real photos via
`npm run photos:add`, `plaintextversion.html` app, window manager (resize, minimize to dock, maximize), iCloud-style
Photos app + viewer (`PhotosApp.tsx`, `PhotoViewer.tsx`) and scroll layout fixes.

Verified in Chrome (desktop width): power on/off, tooltips, wallpaper, messages, scrolls with real photos, window
resize/maximize/minimize/dock. NOT yet verified: Photos app + viewer + filmstrip (merged 600db4f), scroll layout fixes,
375px phone (Chrome window can't go below 606px: load the site in a 375px iframe), reduced motion, iOS Safari, sounds.

Next, in order:
1. DONE 2026-11-17 (dccad8c): Photos app + scroll fixes checked in Chrome at 1512x746, a 375x700 iframe and a 900x450
   iframe. Grid keys, Enter/Escape, viewer keys, mouse swipe, filmstrip jump, zoom/pan, info all work. Fixed: viewer
   images rendered at natural size (pane `right:0` + auto grid rows), "← grid" wrapped, phone "unroll" hid the lanes
   behind the sheet (z 3 vs 12+). Not checkable here: real touch (swipe-down dismiss, pinch), fullscreen, reduced motion,
   iOS Safari. Open: on desktop "unroll" inside the Photos window unrolls the lanes behind that window (asked Wilson).
2. C1 (Wilson picked B: icon right after "wilson soon, 2026"; remove the power-off screen's "plain site →" too) (Wilson): remove Escape → plain site and the "↓ plain site" cue; no keyboard shortcut for plain site. Move the
   top-bar "plain site →" text to a small icon placed like a macOS menu-bar item (toward the middle, not far right):
   ask Wilson with 2-3 ASCII previews first. Return visitors land on the desktop. Keep MainPage below for crawlers.
3. AI chat: build per `docs/ai-chat-decisions.md` (Workers AI + image button, Groq fallback, server-side keys only).
   Show the knowledge file before deploying; deployment needs Wilson's `wrangler login` and Groq key.
4. Captions: 68 applied (6104466). 5 sent empty (career-060, career-057, life-003, life-011, life-013): kept, asked.
   Wilson edits dates himself next. Earlier: Wilson pastes `id = caption` lines from his caption editor; apply them to `src/data/story.json`.
   Open: "laos overseas ___ hall programme" (voice note said "breakfast"; maybe Raffles?); L39 = life-052-undated needs a date.
5. At the very end: Prompt 2 (docs/DESIGN-STORY.md + README) from Wilson's handover prompt.
Gotcha: agent worktrees use a symlinked node_modules; never `git add -A` there (it once got committed).
Merged worktrees still on disk: v2-desktop, v2-messages, v2-scroll, v2-plain, v2-windows, v2-photosapp (ask before removing).

## Handover (2026-11-17 night) — Wilson's new requests, supersede the list above where they overlap
1. Data: `life-051-2026-10-14` ("utr, at the pool table") is not Wilson: move it out of the `me` lane. Blank captions stay.
2. Plain site (C1, decided): small icon right after "wilson soon, 2026" (macOS menu position), tooltip/aria "plain site",
   opens the plaintextversion window. Remove: Escape shortcut, both "↓ plain site" cues, power-off screen's
   "plain site →". Return visitors land on the desktop. MainPage stays below for crawlers.
3. Scrolls: "unroll" (Photos toolbar) minimizes open windows to the dock first (option 1). Rolled-up state is no
   longer unmounted: lanes roll up right-to-left (current animation OK) and stop at a visible "flesh" stub just right
   of the icon column (phone: left edge), clearly clickable/tappable to unroll again.
4. Date editor: local HTML (like the caption editor) with each photo + date field, "copy changes" -> `id = date`
   lines; Wilson pastes them back; apply to story.json.
5. (1) unread: remove the play/pause button; answers come from the AI model (step 3 backend) instead of the script.
6. AI assistant: own plain minimalistic AI icon (NOT a Siri icon) at top right of the bar; opens with a Siri-like glow animation + Spotlight-style input bar;
   answers from the same AI backend with a Siri-like loading animation (original implementation, no Apple assets).
7. AI backend per docs/ai-chat-decisions.md (Workers AI + image button, Groq fallback). Show knowledge file before deploy.
Process: Wilson asked for subagents per component, each in its own worktree; never `git add -A` there.
Answers 2026-11-17: pool photo -> people (done d5b703a); (1) unread keeps the scripted opening (no play/pause), AI answers
everything after; "generate image" in BOTH the assistant bar and (1) unread; AI UI waits until Wilson's `wrangler login`
(build the Worker first). Subagents dispatched: plain-site, scrolls-stub, ai-worker, date-editor.
Merged 2026-11-17: plain-site icon + cue/Escape/power-off link removal + desktop on return + no messages pause button
(d368ef3); scrolls stub + unroll minimizes windows (c0d6a57). Checked in Chrome at 1512px: icon opens plaintextversion,
roll-up leaves a stub right of the icons with tooltip, stub click minimizes windows to the dock and unrolls.
Open: on phone the 64px stub at the left edge covers the first icon column (asked Wilson). Date editor for Wilson:
scratchpad dates.html (session ebb81044); apply his `id = date` lines to story.json. AI worker agent still running (v2-ai).
AI worker merged (9eb3257): worker/ (Workers AI gemma-4-26b-a4b-it, flux-1-schnell images, Groq openai/gpt-oss-20b
fallback on error 3036, per-IP rate limits, CORS env). Not deployed; model calls untested. Wilson is reviewing
worker/knowledge.md (~6.5K tokens; Groq free 8K TPM means about 1 fallback request/min). Next after his review +
`wrangler login` + Groq key: deploy, then assistant UI (own minimal AI icon) and (1) unread AI answers.

## Handover (2026-11-18) — Wilson's round 3 requests (newest; supersede older lists where they overlap)
Done before this: dates applied (3eec831), all photos dated. Worker merged, not deployed.
1. worker/knowledge.md: keep content, rewrite tone: plain human voice, succinct, not AI-sounding; non-technical wording
   for non-technical things, technical only where needed. Also make a SHORT knowledge version for the Groq fallback
   (Groq free 8K tokens/min).
2. Scrolls: close X at TOP right; the empty strip (foot strip) moves to the top too. Lanes loop forever (circular, never
   an empty gap at the end). Clicking a photo on a scroll opens it exactly like clicking it in the Photos app (viewer).
   Scrolls appear only when the photos icon is clicked (see answers below for stub/auto-open).
3. Top bar: plain-site icon goes just RIGHT of the centred clock (not far left).
4. Retro look, GREEN is the key: grainy two-tone print feel like ~/Downloads/retro-dekstopinspo1.jpeg (and
   retro-dekstopinspo1-withtext.PNG) but green instead of blue; wallpaper/background retro; less translucency (too much
   now); app icons more prominent; windows/text bigger and readable when opened; retro (game-like) cursor.
5. Loading/boot bar: retro, lightly MapleStory-flavoured (not over-themed): jumping star-eyed slime, jumping orange
   mushroom on top of the bar, with interaction animation. Refs: ~/Downloads/maplestory-slime-stareyes-correctdirection.jpg
   (direction), ~/Downloads/maplestorymobs.png (orange mushroom; ignore the rest). Cursor ref:
   https://www.rw-designer.com/cursor-set/original-maplestory-white
6. AI assistant: retro, original minimal AI icon (not Siri's) in the top bar; opens with a glow animation and a retro
   Spotlight-style bar; retro loading animation; image generation in both the bar and (1) unread; (1) unread answers via
   AI after its scripted opening. Research retro examples with Exa.
7. Deploy Q (answered in chat): wrangler deploys only the Worker to Cloudflare (*.workers.dev); the site stays on Vercel.
Answers (2026-11-18): photos icon unrolls the scrolls (no auto-unroll at power-on); stub stays after roll-up; the Photos
app (grid) opens from a button in the scroll's top strip or by clicking a photo (opens the viewer at that photo).
Maple art: ORIGINAL lookalikes only (own pixel star-eyed slime, own orange-capped mushroom, own white pixel-glove cursor);
never download/copy Nexon sprites or the rw-designer cursors. "Bigger": windows open larger by default (readable text).
Subagents (round 3): v2-knowledge (worker text), v2-scrolls2, v2-retro (theme+top bar+windows+cursor+boot bar), v2-assistant.
Merged 2026-11-18: knowledge rewrite (913c46a), scrolls round 3 (a119fd2). Open: phone stub z-index covers the Photos sheet's left edge (pending Wilson's phone-stub choice: 1 shift icons / 2 right edge / 3 none). Waiting: v2-retro, v2-assistant.
Merged 2026-11-18: assistant + (1) unread AI (merge after a119fd2). Tested only against a mock worker; needs VITE_AI_URL after deploy. chat-script.json topic answers now unused (left in place). Waiting: v2-retro.
Merged 2026-11-18: v2-retro (47bdd1b; kept the "unroll my photos" tip, took retro's bigger window sizes). Boot bar was NOT
in v2-retro; now on v2-boot (subagent). Worker CORS now allows https://wilsonsoon-website-portfolio.vercel.app (70fc4ff).
Deploy order: Wilson runs wrangler from worker/ (name comes from wrangler.jsonc, no --name needed) -> set VITE_AI_URL in
Vercel env -> rebuild + redeploy the site (ask first).
Merged 2026-11-18: retro boot bar (381e516, BootBar.tsx; original pixel slime + mushroom, hover/tap = big hop). Not yet eyeballed at 375px or live speed.
Merged 2026-11-18: phone has no stub (rolled scroll hides after CLOSE_MS; photos icon reopens). Desktop stub unchanged.

## Hosting (2026-11-18): one Cloudflare Worker for site + AI
Worker `portfolio` (worker/wrangler.jsonc) serves dist/ as static assets and /api/* from worker/src; target URL
https://portfolio.wilsonsoon.workers.dev (account subdomain `wilsonsoon`). VITE_AI_URL removed; site calls /api on its own
origin; vite dev/preview proxy /api to the deployed worker. Deploy: `npm run deploy` (build + wrangler deploy).
Gemma 4 needs `chat_template_kwargs.enable_thinking=false` (else content null -> empty_answer); verified via
`wrangler dev --remote`. Next: Wilson deploys `portfolio` + `secret put GROQ_API_KEY` for it; then delete the old
`wilson-portfolio-chat` Worker and take down the Vercel project (Wilson chose take-down; confirm right before). Groq
fallback still untested live. Wilson confirmed knowledge.md + knowledge-short.md read well.
Done 2026-11-18: `portfolio` deployed and live (site + chat verified). Old Worker `wilson-portfolio-chat` deleted; Vercel
project `wilsonsoon-website-portfolio` removed (URL 404). Groq test: `FORCE_FALLBACK=1` preview version (alias
groq-test-portfolio.wilsonsoon.workers.dev) -> Groq 401, i.e. the stored GROQ_API_KEY value is rejected; Wilson re-puts
the NEW key, then re-run the preview upload + curl (preview versions snapshot secrets at upload).
Groq fallback verified 2026-11-18 via groq-test preview (provider groq, 200). Newest version is that preview again: run `npm run deploy` before the next `secret put`.

## Handover (2026-11-18, end of day) — READ THIS FIRST in a new session
**Live:** https://portfolio.wilsonsoon.workers.dev (Cloudflare Worker `portfolio`, account subdomain `wilsonsoon`), version
7705a2e4 at 100%, deployed from `v2` at the commit after this note. Vercel project deleted; old Worker
`wilson-portfolio-chat` deleted. `main` is still the old Astro site (not merged; decide later).
**Docs to read:** `docs/design-rationale.md` (design + method reasoning, kept current), `technicals.md` (Wilson's technical
Q&A), `learnings.md` (short "what I learned"), `worker/README.md` (endpoints, commands, D1, admin).

**How it fits:** one Worker serves `dist/` as static assets; `/api/*` and `/admin*` run worker code (`run_worker_first`).
`/api/chat` → Workers AI `@cf/google/gemma-4-26b-a4b-it` (thinking OFF via `chat_template_kwargs.enable_thinking=false`),
Groq `openai/gpt-oss-20b` only after Workers AI's daily limit (3036). `/api/image` → Flux. Secrets: `GROQ_API_KEY`,
`ADMIN_TOKEN` (both set). D1 `portfolio-qa` (id in wrangler.jsonc, binding `DB`), migrations in `db/migrations/`.
Dev: `npm run dev -- --port 4321 --strictPort` (Vite proxies `/api` to the live Worker = real Neurons). Deploy:
`npm run deploy` from the repo root (rebuilds first). Test the Groq path safely: `wrangler versions upload --var
FORCE_FALLBACK:1 --preview-alias groq-test`, then `npm run deploy` again so the newest version is live (otherwise
`secret put` refuses).

**Done today (round 4, all deployed):** answer-directly prompt + "who he is" knowledge line; page below the desktop
removed (terminal `exit` opens plaintext window); photos icon = gallery, new film-strip **timeline** icon = scrolls;
scrolls hidden until clicked on all widths, cream × / "all photos" chips, 0.8s roll-up, shuffled unroll; stray
"about.txt" dock chip fixed; icon layout (2 columns rows 1–5, row 6 contact/photos/timeline from the left), activities →
**involvements** (puzzle), projects = static bulb with 3 rays (flicker rejected), simple-version.html; clicking an
open app's icon closes it (minimised → restore); **unanswered questions**: model replies `UNKNOWN` → question logged in
D1 (deduped, no IPs, cap 500 open) → visitor sees "i don't know that one yet…"; Wilson answers at `/admin` (password =
ADMIN_TOKEN; retro theme; tabs open/answered/dismissed/database, read-only DB view); saved answers reach the chat within
~5 min. "suggest" drafts from the wiki excerpt in D1 (`wiki_chunks`, FTS5; falls back to the whole excerpt when small).
**Wiki excerpt:** hand-written `scripts/wiki-excerpt.local.md` (GITIGNORED — repo is PUBLIC); upload =
`node scripts/wiki-excerpt.mjs --root scripts` (list in `scripts/wiki-pages.local.txt`) then
`cd worker && npx wrangler d1 execute portfolio-qa --remote --file ../scripts/wiki-upload.local.sql` (replaces all chunks).
Wilson approved its contents: hobbies/interests, 4 personal projects, career direction; never health/family/relationships,
internship internals, colleagues, specific interviews.

**Verified:** live chat answers (1.6s) and logs unknowns (test row deleted; `questions` is empty); `/admin` 401 without
or with a wrong token, `no-store`/`noindex`; suggest tested locally with the real model (hobbies → good draft, favourite
food → "nothing in the wiki"); icon positions/toggle/scrolls checked by agents in Chrome at 1512x746 and 375px.
**Not verified / owed:** Wilson logging into live `/admin` (only he has the token); Enter/Space on an icon to close its
window; reduced motion, real touch/iOS, sound; red-team prompts against the new decline/UNKNOWN rules; Groq path for
UNKNOWN logging (same code, not run).
**Open / ideas:** README.md still describes the Astro v1 site; merge `v2` → `main` when Wilson is happy; prerendering for
crawlers undecided; custom domain (≈US$10/yr) would allow Cloudflare Access on just `/admin`. Many old worktrees exist
under `../` (spike-a, spike-c, v2-*): all merged; ask Wilson before removing them. The main repo has uncommitted
`package.json`/`package-lock.json` changes from before this session — not ours, untouched.
**Gotchas:** `rm -rf` is blocked by a hook (use `trash`); never `git add -A` in worktrees (symlinked node_modules);
`wrangler d1 create` "add it for you?" → answer no; 8 chat requests/min per IP rate limit trips quick test bursts;
ask before deploying, deleting, or creating accounts/keys.

## Handover (2026-11-18, round 5) — newest; read with the one above
**State:** committed on `v2` (1661f80..d33a58b, not pushed) and deployed (version ee483bd9). Live image of Wilson
verified. Some commits are mislabelled (shared hunks went to the earliest commit; see the Haiku agent note in chat).
Vercel redirect live: wilsonsoon-website-portfolio.vercel.app → 308 to the Worker (config in deploy/vercel-redirect/).
**Done:** onboarding tour (stacked windows, next/back/skip → plaintext, phone footer bar), contact "more on this desktop"
links, app text restyle (system SF font, --warm rust, bold hierarchy), v1 icon (public/v1 = old Astro site built with
`--base /v1`), terminal rewrite (cat/open/close/ask/neofetch/theme/history, tab + ↑↓, exit closes it, iOS keyboard fix),
touch cursor (TouchCursor.tsx), timeline: no hover pause, backdrop `--sc-back`, narrow spools, timeline icon above photos,
"← timeline" back from a scroll photo, photos scroll on phones (`.ph-main` min-height 0), viewer arrows always on, top-bar
plain icon toggles, /admin back link, admin suggest uses general knowledge for non-Wilson questions, images of Wilson via
FLUX.2 klein 9B + `public/ai-ref/*.jpg` (ASSETS binding, stylised only, blocklist).
**Verified:** tsc, `vite build`, worker tests; Chrome at 1512x724 and a 375px iframe (tour, back, photos scroll,
timeline, touch cursor via synthetic touches, terminal); `wrangler dev --remote`: Wilson pixel-art image in ~4s, unsafe
prompt → 400. **Not verified:** real iPhone terminal keyboard + touch cursor; admin suggest on a general question (needs
the token); live deploy. A test question "what does wilson do for fun?" was logged to live D1 (knowledge.md has no
hobbies, so it really is a gap): answer or dismiss it in /admin.
**Follow-up (same evening):** tour bar moved to the screen's bottom-right corner; skip → plaintext keeps it (back to
the tour / finish) until finish or plaintext closes; removed `-webkit-font-smoothing: antialiased` from app text (it made
the grain look heavier). Window `extra` prop removed.
**Also:** (1) unread has the same text/image icon toggles as the assistant.

## Handover (2026-11-18, round 6) — newest
**Done:** Photos "unroll" → film icon ("unroll timeline"); timeline unrolled from Photos shows "← photos" top-left and
no ×, from its icon keeps ×; "all photos" is an icon ("show all photos"). "jump to" fixed (sticky heading offsetTop).
Tour: one window at a time; about.txt normal with the bar under its bottom-right; later steps maximised; skip on every
step left of back; solid contrasting buttons (tour + bordered app buttons). Finish: all but contact close, contact
restores from maximised, a "done" window with the mushroom + slime fades in/out (~3.4s). Picture requests typed in text
mode go to image mode (assistant + unread); prompt rule points at the picture button otherwise.
**Verified** in Chrome: jump both directions at 375px; timeline from-Photos/back/viewer/all photos/× flows; tour at
1400px (bar aligned to about's right edge, maximised steps, finish) and 375px (two-row bar); wantsImage on 22 samples
(1 accepted false positive: "image of wilson's career"); tsc, worker tests, build.
**Not verified:** real iPhone "jump to"; the new prompt rule on the live model.
**Deployed:** commit b468b16, Worker version f1287347 (live bundle checked; chat answers a vague picture request with the picture-button pointer). Not pushed.

## Round 7 (2026-11-18) — committed bc82ae5, deployed (version f0a6c664), not pushed
Every visit starts on the bare desktop (no about.txt, any width). First visit: centred "welcome / tour?" window with
no / yes (yes focused; Escape = no; blocks clicks until answered). Yes → about.txt maximised + tour; no → contact, tour
marked done. All tour steps maximised; the under-about.txt bar placement was removed. Verified in a production preview
(`vite preview`) at 1400px and 375px: question, yes, no, Escape, return visit with nothing open. Dev-only note: React
StrictMode re-runs Scrolls' mount effect, which moves focus to the timeline icon in `npm run dev` only.

## Round 7b (2026-11-18)
Public chat answers general questions from general knowledge (same split as the admin drafter; facts about Wilson still
only from knowledge.md, UNKNOWN + logged when missing); code as plain text; chat bubbles keep line breaks. Verified live:
tokyo, two sum code, internships, favourite food → UNKNOWN, a joke. /admin: dismissed (not deleted) ids 2, 3, 4, 5, 10,
11, 12, 13 (generic, junk, and test questions); open: 6, 7, 8, 9. Finish window held 1s (SEAL_MS 1700).

## Round 8 (2026-11-18) — v2 merged into main; worktrees gone. Committed, pushed, migration 0002 applied, deployed (fddf4656)
- `main` == old `v2` (7c76146) on GitHub; all worktrees and v2-* branches removed (folders in the Trash); spikes kept
  as `archive/spike-*` tags. Work in `/Users/WilsonSoon/Projects/wilson-portfolio` now. Dev server: use port 5173
  or 4321 (the live Worker only allows those localhost origins, plus 4173 for preview).
- Assistant: bubble-with-? icon, "portfolio assistant" desktop icon (grid 4/2), open state lifted to Desktop, focus
  returns to whatever opened it, conversation history in sessionStorage with "clear".
- Chat log: D1 `chat_log` (migration 0002), logged from /api/chat and /api/image with a per-tab visitor id, 30-day
  cleanup on insert, /admin "chat log" tab, notices in both chat panels. Worker tests updated (visitorId, DB_TABLES).
- Verified on localhost:5173 (desktop + 375px): icon position, open/close/focus, two-turn history with context,
  reload persistence, clear. Chat log NOT verified: needs `npx wrangler d1 migrations apply portfolio-qa --remote`
  (from worker/) and a deploy.
- Live check: one chat logged to chat_log (visitor deploy-check-0000, a test row; expires in 30 days); /admin/api/chats → 401 without or with a wrong token.

## Round 9 (2026-11-18)
Tour buttons: skip rust, back ink, next green. Finish after skip → plaintext shrinks back + done window. "there's more
on this desktop" (shared `More` in apps.tsx) also at the end of plaintext's "get in touch" (without the self-link),
both lists include "portfolio assistant" (opens the panel via `ctx.ask`). Top bar: sun/moon theme toggle left of the
assistant icon, synced with the plaintext toggle and terminal `theme`; phones (<640px): flowing bar, name "wilson",
34px icons. Verified on localhost:5173 at 1400, 375, 360px.

## Round 10 (2026-11-18)
Fewer words by default. work: one-line `summary` per job; "more" shows location, the LinkedIn bullets (replacing the
resume-level ones in work-experience.json, NUS company now "NUS Enterprise") and tags. projects: unchanged by default,
"more" shows highlights. involvements: title only, "more" shows role/date and the line. about.txt: v1's hero ("hi! i'm
wilson. i'm also a <typewriter>", based in 🇸🇬), words add "rock climber" and "(learning) guitarist". unread: a short chat
with "me". simple-version.html picks up the app windows' print colours (rust roles, green tags/links/bullets, system
font). README rewritten with GIFs in docs/media and the hopping slime + mushroom (docs/media/spirits.svg, generated from
BootBar.tsx). Verified in `vite preview` at 1400px. Not changed: worker/knowledge*.md and chat-script.json still carry
some resume-level work details (80+ SEs, 2x DAU, Metabase, BirdNET).

## Round 11 (2026-11-18)
simple-version.html gets round 10's content: "hi! i'm wilson." + typewriter + "based in 🇸🇬" header, one-line
work/projects/involvements with more/less (shared `Item.tsx`, `Typewriter.tsx`), row renamed involvements. Desktop icons
top-aligned (rows 118px; tighter rows below 840px tall) so tiles stay level when a label wraps. worker/knowledge*.md and
chat-script.json work lines rewritten from the LinkedIn version (no 80+ SEs, 2x DAU, MVP Studio). Verified in `vite
preview` at 1400x900, 1400x800, 375px; worker tests pass.

## Round 12 (2026-11-18) — committed (5ef950e), pushed, deployed (Worker `portfolio`, 26abe0b0-babf-47c3-905a-cd161601b4ca)
Split across subagents (Sonnet: content lists, desktop; Opus: chat bug) plus the tour work in the main session.
Live site returns 200.
- Lists: inline more/less replaced by a bottom-right "expand"/"collapse" with arrows-out/in icon (`Item.tsx`, no
  control when there is nothing to expand). Work shows tags by default; involvements show title + role/date, bullets
  behind expand. Same on simple-version.html.
- Expand/collapse sits after the default lines and the extra content opens below it, so the control never moves;
  text then icon.
- Spirits: desktop row under the icon grid (`.dk-mobs`, last grid row; both icon columns are full, so not literally
  under about.txt) and under the plaintext header. Quiet "stop"/"hop" and "hide" ("show spirits" once hidden) beside
  them, one shared setting in localStorage `spirits` (`Spirits.tsx`). On the desktop, while the setting is "hop",
  they alternate hop / rest every 40s, the wallpaper's photo interval (`EVERY`, exported from `Wallpaper.tsx`).
- Tour re-entry: bottom-right "tour again" only, when no tour is running (resume removed: leaving may be deliberate).
- Tour plays itself ("yes" and "tour again"): after a stop's demo the cursor waits >= 2s, still stops >= 3.5s, every
  stop padded to STOP_MS 5000 (+ ~1s glide/press on next ≈ 6s, the measured average; desktop 8.9s, terminal 7.7s,
  assistant 7.5s run longer), then the cursor presses next, through finish. Any real click/key (not Shift/Ctrl/Alt/Cmd)
  pauses it; the bar's play/pause button (right of ×) resumes, re-running the current stop's demo (playKey).
- Terminal: `assistant` starts a chat inside the terminal, after Claude Code / Codex (welcome box, `>` prompt, ⏺
  answers, "✻ thinking…", hint line; /help /clear /image <prompt> /exit, also exit or ctrl+c). Text or picture is
  auto-detected with `wantsImage` (the panel's check); /image forces one; images off -> text with a note. `open
  assistant` still opens the panel. Intro hint no longer suggests the cloudflare ask; tour types `help`, `whoami`.
- Phones: the top-left "wilson" is a home button (closes windows, rolls up the timeline, shuts the assistant, ends
  the tour). Desktop: plain name.
- End tour: a "×" on the tour bar on every stop (the desktop, timeline and assistant stops have no window to close).
  Phones: tighter bar + "assistant →" so it stays one row down to 360px.
- Credits & disclaimer after the "more on this desktop" list (contact and plaintext's get in touch): original pixel
  art inspired by maplestory's look, no game assets; maplestory is nexon's trademark, no affiliation; fonts under OFL;
  email for takedown. Not legal advice; if the sprites read as nexon's orange mushroom / slime, redraw them.
- Phones: the about note sits in the flow under the word (`.dk-note-inline`); on the desktop stop the icon grid scrolls
  the spirits clear of the caption. Demo cursor positioned with `translate` (a `scale` press used to fling it).
- Photos from the timeline: viewer has "← timeline" and "library"; library has "← back to photo" and "← timeline".
- Tour → plaintext → finish: plaintext's "get in touch" opens and scrolls into view (`touchReq` via Ctx → MainPage).
- plaintext tooltip: "the clean version".
- Tour: variant b is the only tour (no `?tour=` param any more), 11 stops: about, work, projects, involvements,
  contact, desktop, timeline, photos, terminal, (1) unread, assistant. Every stop has a one-or-two-sentence caption
  above the tour bar (`CAPTION` in Desktop.tsx). On the assistant stop the tour corner is portalled to <body> above
  the panel. The "done" window is held 1.5s (SEAL_MS 2200).
- Tour demo (`TourDemo.tsx`, portalled to <body> above the assistant panel): about: cursor points right of the
  typewriter's longest word + handwritten (Caveat, @fontsource/caveat, only use) rust note "this keeps changing!";
  work/projects/involvements: first expand, collapse 1s later; desktop: pokes mushroom + slime, presses stop then hop
  (setting unchanged); photos: original, 1.2s, square; terminal: types + runs `help`, `whoami`; assistant: image mode +
  types "show wilson in pixel art" but does NOT send (would spend the daily image quota per visitor). Any real
  pointerdown/keydown stops it; reduced motion skips it. Not tested: stopping it by hand mid-demo.
- Scrolls fade out (380ms) as they roll up, so timeline -> photos no longer shows the roll over the new window.
- Chat: "(1) unread" sends `as:"wilson"` → first-person persona (live); small talk and follow-ups no longer fall to
  UNKNOWN; limit/error notices left out of the model history. Workers AI really was out of daily neurons (4006).
  Maximise-button focus ring not reproduced, not changed.
- Verified: tsc, build, worker tests; tour step order, timeline + assistant stops, item 7, at ~606px wide; agents
  checked lists and photos at 1400px. Not seen: 375px for the photos flow.
- Open: Groq 429 after ~4 calls/min shows "out of answers for today" (misleading); chat_log has debug-agent-0001/0002
  test rows (expire in 30 days).
