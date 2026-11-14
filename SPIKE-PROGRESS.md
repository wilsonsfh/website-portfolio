# Spike B (desktop) progress

## Done
- M1: power-off screen (power button + "press ⏻ to turn on"), CRT line switch-on, 4-line boot text (~1.1s), empty desktop with top bar (wilson, clock, plain site →), Escape + "plain site →" close to MainPage, sessionStorage memory (`greeting-b`: plain|desktop), `?intro=1` forces power-off, reduced-motion fade path, body scroll lock + inert main.
- Shared copy extracted to `src/copy.ts` (MainPage now imports it; output unchanged).

## In progress
- nothing

## Next
- M2 icons + windows, M3 terminal, M4 polish

## Known issues
- Not visually verified (no screenshots allowed).

## Unknowns discovered
- Copy in MainPage was inline, so sharing required a small refactor of MainPage.
