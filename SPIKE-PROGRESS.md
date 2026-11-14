# Spike A: screening room (paper hand-scroll, scroll-linked section)

## Scroll-linked rewrite (in progress)
- M1 done: Greeting is a 320dvh section with a sticky 100dvh stage in normal flow before MainPage (no overlay, no unmount, no scroll lock, no inert). p = scroll progress through the section; doors 0-0.25, unroll+camera 0.25-0.55, dwell 0.55-0.82 (strip runs/drag only here), zoom+veil 0.82-1; all written imperatively from p with eased local progress, so scrolling up reverses. Skip/next just scroll to #main for now.
- Next: M2 autoplay + return landing + next/skip rules; M3 reduced motion + dwell checks.
- Notes below describe the earlier overlay version where they differ (press-during-unroll and zoom-exit-timer no longer exist).

## Done
- Doors (unchanged): rotateY leaves hinged at outer edges, 1.2s closed then 1.0s open, warm seam light; skip, wheel/any key (not Tab/modifiers) advance; once per session via sessionStorage, `?intro=1` replays; page scroll locked while mounted.
- Scroll M1 (look): cool-grey paper band (same in both themes), two-row ink/accent `#6B5B95` check borders via CSS conic-gradient, photos with feathered left/right mask edges, 22px paper gaps, photos.json loop (min 8, 3 copies), failed-image placeholder.
- Scroll M2 (unroll): one Motion value `progress` (0..1, 1.5s, cubic-bezier(0.77,0,0.175,1), starts t=2.0s as doors open) drives (a) `clip-path: inset` on the paper band, (b) `translateX` + `scaleX` squash (1 -> 0.65) on the roll, (c) camera scale 2.6 -> 1 and rotate -8deg -> 0 (origin 30% 50%). Roll = shaded paper cylinder, wooden knobs 16px beyond the band, ember line on its left edge. Auto-scroll (60px/s linear) starts on completion. Pressing the strip mid-unroll sets progress to 1 (everything snaps) and drag follows from the live position. Reduced motion: progress starts at 1, no roll, no camera, no auto-scroll, cross-fade only.
- Scroll M3 (fixes): label `next →`; `#main` gets `inert` while the overlay is mounted, removed on unmount. Zoom exit now keys off progress === 1 (earlier exits fade).
- Drag with pointer capture and release momentum decaying toward auto speed; next button after first press or 4s after unroll start; zoom into centre frame with --bg veil, 700ms.

## In progress
- nothing

## Next
- Real-browser look: roll width, ember intensity, paper tone, camera origin; phone check.

## Known issues
- Nothing visually verified.
- iOS Safari may ignore html overflow:hidden.

## Unknowns discovered
- Camera is eased by the same in-out curve as the roll (slow start/end), not ease-out.
- Snap on press mid-unroll is abrupt (camera and roll jump); no blend.
- Roll edge uses clientWidth read per frame (cheap, but a layout read).
