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
