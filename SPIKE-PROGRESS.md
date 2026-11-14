# Spike B (desktop) progress

## Done
- M1: power-off screen (power button + "press ⏻ to turn on"), CRT line switch-on, 4-line boot text (~1.1s), empty desktop with top bar (wilson, clock, plain site →), Escape + "plain site →" close to MainPage, sessionStorage memory (`greeting-b`: plain|desktop), `?intro=1` forces power-off, reduced-motion fade path, body scroll lock + inert main.
- M2: icons (about.txt, work, projects, activities, photos, contact), windows with title bar/close, pointer-captured drag clamped to viewport, click-to-front, scale(0.95) 200ms open / 120ms close via motion AnimatePresence, scrollable bodies, photos scroll-snap strip, phone (<640px) full-screen sheets under the top bar with "← back", 3-col icon grid, no drag.
- Shared copy extracted to `src/copy.ts` (MainPage now imports it; output unchanged).

## In progress
- nothing

## Next
- M3 terminal, M4 polish

## Known issues
- Not visually verified (no screenshots allowed).
- On phone about.txt is not auto-opened (a sheet would hide the icons).
- Photos have empty alt in photos.json; strip is labelled as a group.

## Unknowns discovered
- Copy in MainPage was inline, so sharing required a small refactor of MainPage.
