# Spike B (desktop) progress

## Done
- M1: power-off screen, CRT line switch-on, 4-line boot text (~1.0s), desktop top bar (wilson, clock, plain site →), Escape/"plain site →" to MainPage, sessionStorage (`greeting-b`: plain|desktop), `?intro=1` forces power-off, reduced-motion fade path, page behind inert + no scroll.
- M2: 6 icons + windows (about.txt, work, projects, activities, photos, contact) with real shared content; pointer-captured drag clamped to viewport; click-to-front; open scale .95 + fade 200ms ease-out, close 120ms; photos scroll-snap strip; phone (<640px) full-screen sheets under the top bar with "← back", 3-col icon grid, no drag.
- M3: terminal (help, whoami, ls, cat about.txt, open <x>, exit; unknown prints hint).
- M4: focus handling (window/desktop/terminal input focus, focus returns to icon on close), 360px checked by reasoning.
- Shared copy lives in `src/copy.ts` (MainPage imports it; output unchanged).

## In progress
- nothing

## Next
- Real-device check; decide if concept survives vs. plain page.

## Known issues
- Nothing visually verified (no screenshots allowed): CRT timing, window cascade positions, photo strip sizing, phone layout.
- On phone about.txt is not auto-opened (a sheet would hide the icons).
- Photos have empty alt in photos.json; strip is labelled as a group only.
- No way back to the desktop after "plain site" except `?intro=1`.
- Window z-order is not trapped; Tab leaves overlay to browser chrome (main is inert).

## Unknowns discovered
- A desktop adds a click and a window layer between a recruiter and the resume text; on phones sheets one-at-a-time work but cost more taps than the accordion.
- Drag/stack only has value on pointer devices; on phones it is pure overhead.
- Boot sequence is ~1.3s every first visit; must stay skippable.
