# SPIKE-PROGRESS (base)

## Done
- M1: `MainPage.astro` with name, paragraph and five expanding rows from real data; used by `index.astro`; `global.css` now imported in Layout (it was never imported before).
- M2: neutral palette (tailwind tokens, CSS vars, flash-prevention), Playfair request removed, footer text theme toggle, `src/data/photos.json`, resized photos committed.
- M3: focus rings, reduced-motion path, 44px+ hit areas, CLAUDE.md updated. Dev server check: 5 aria-expanded buttons served.

## In progress
- none

## Next
- Greeting agents mount in front of `<main id="main">`.

## Known issues
- v1 does not link /resume.pdf, so the page does not either.
- Inter local files are 400/500 only, so hierarchy uses size and 500.
- Not visually checked (no screenshots per budget): 360px layout and dark mode are from CSS reasoning only.
- Old v1 components and JetBrains/Poppins font files remain unused.
