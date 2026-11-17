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
