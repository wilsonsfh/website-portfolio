# Spike A: screening room (paper hand-scroll, scroll-linked section)

## Done
- Structure: `Greeting` = 320dvh section with a sticky 100dvh stage, in normal flow before `<MainPage />`. No overlay, no unmount, no scroll lock, no inert. Tab order: skip, next (dwell only), then #main.
- One progress p from window scroll through the section, imperative writes (transform/opacity/clip-path): doors 0-0.25 (rotateY leaves, ease 0.77,0,0.175,1), unroll + camera 0.25-0.55 (roll translate/squash + clip-path reveal + camera scale 2.6->1 / rotate -8deg->0, same eased local value), dwell 0.55-0.82 (strip auto-scrolls 60px/s and drags with momentum only here; outside it holds its offset; `touch-action: pan-y`), zoom 0.82-1 (scale into centre picture, ease-out, veil to `var(--bg)`). Scrolling up reverses everything.
- First visit (or `?intro=1`): scroll 0, doors closed 1.2s, then rAF `scrollTo` (instant, linear) to p=0.55 over 2.6s; wheel/touchstart/pointerdown/key or an external scroll change cancels it. Return visit: before paint, jump to top of #main, no autoplay. `history.scrollRestoration = "manual"`. sessionStorage flag.
- `next →` only in dwell (after grabbing the strip, or 4s in dwell); smooth-scrolls to #main; arrow nudge at +2.5s then every 6s, paused while pointer down. `skip` visible until the zoom range; jumps to #main instantly.
- Reduced motion: section is a plain 100dvh block, unrolled draggable strip, no doors/camera/auto-scroll/autoplay, next visible at once; return visits land on #main.
- Look: paper band, ink/accent check borders, feathered photos, roll with ember, failed-image placeholder (earlier milestones).

## Fix: blank scroll after the zoom
- `#main` now has `margin-top: -100dvh` (not in reduced motion), so the page sits under the end of the zoom. The zoom range fades the stage's opacity 1 -> 0 over the whole 0.82-1.0 range (veil removed); stage is `pointer-events: none` from p 0.82 and `visibility: hidden` from p 0.999, restored on the way back. Section is `pointer-events: none` (its box overlaps the page). Landing, `skip` and `next →` use scroll = section end minus stage height (p = 1), not `#main`'s old offset.

## In progress
- nothing

## Next
- Real-browser pass: tune section height, range split, roll/camera values; test iOS Safari and phone dvh.

## Known issues / unknowns
- Nothing visually verified.
- Autoplay is a linear scroll (sub-ranges supply the easing); an ease on the scroll would compound with them.
- Press-during-unroll no longer exists (unroll is scroll-linked, strip is inert before the dwell range).
- Zoom origin is the centre frame measured on entering the zoom range; if the page loads at p=1 it is measured at the held offset.
- iOS: programmatic per-frame scrollTo and the dvh URL-bar resize may jitter or shift p slightly; untested.
- Native smooth `next →` scroll length depends on the browser; fast wheel input can skip ranges.
