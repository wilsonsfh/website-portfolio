# Portfolio v2: research notes (2026-11-15)

Handoff notes from the research session. No v2 code exists yet. V1 is preserved on the local branch
`version-one` (same commit as `main`, 956e7d3, not pushed).

## Status

- Done: repo read, reference videos read, reference sites read, Emil Kowalski research.
- Waiting on Wilson: which combined concept to build (A screening room, B desktop, C messages first).
- Next after the pick: short design doc in `docs/superpowers/specs/`, then plan, then build on a new branch.

## Brief (Wilson's words, condensed)

- Minimal, empty-space-heavy main page like gordontu.com/about, holding everything v1 has, collapsed.
- A greeting that is interactive but does not waste the visitor's time.
- Idea 1: doors, closed for 1-2s, open smoothly from the centre outwards, site behind them.
- Idea 2: film-strip photo reel (16 photos now, more later, placeholders needed). Auto-scrolls; press/hold or
  click hands control to the visitor; then a "Next →" fades in bottom right (phone and desktop) with a very
  small bounce. After it, an immersive zoom-in to the plain main page.
- Other ideas: TV you switch on (autumnkyoko.com), Linux desktop (alanagoyal.com), scripted DM chat about
  Wilson that the visitor can interrupt (zara.small.world/jensenchat). Not all of them.
- Chat content: official experience only (e.g. KL tech summit, the app that shortened preparation time,
  Linux containers). Nothing personal-sensitive, nothing internal to Cloudflare.
- Sections and their mood: about (photography, tea, guitar, a different animation each); work experience
  (typing, screen light on the face); projects (work tools, lumberjack-on-wood feel); activities (presenting,
  talking to people, community); get in touch (same content, more transition frames).
- three.js is allowed, not required.

## What v1 is

- Astro 5 + Tailwind 3, no UI framework, vanilla JS in inline scripts. No tests or lint.
- Order: Navbar, Hero (typewriter), Work Experience (4), Projects (6), About (photo carousel + lightbox),
  Activities (4), Blog placeholder, Contact (email, GitHub, X, LinkedIn).
- Data in `src/data/*.json`; v2 can reuse it unchanged.
- `public/photos/photo-01..16.jpg` total 28 MB, so the reel needs resized copies.
- Palette: beige `#FAF7F2`, navy `#1A1A2E`, purple accent `#6B5B95`, amber gradient. Lowercase text convention.
- Branch `feat/ui-revamp` holds generated 3D PNGs (tea, guitar, photography, coding at night, dancing) under
  `public/images/3d/`; possible source for section artwork.

## Reference readings

- Camera-roll video (`~/Design/animation_inspiration_movie_camera_roll_demonslayer.mov`, 8s): opens zoomed
  in on one tilted frame, pulls back and levels out to show a bordered film strip sliding sideways over a
  cloudy background.
- Scroll reference (`~/Downloads/portfolio-DemonSlayerPromotionReel-scrollidea.mp4`, 5 min; the scroll is at
  about 0:29-0:38 and 3:05-3:20): the strip is a paper hand-scroll, not film. Wide patterned border bands top
  and bottom, pictures with brushed edges, and a rolled cylinder on a wooden roller at the leading end with
  an ember glow where the paper leaves it. The roll travels and leaves the pictures revealed behind it. It
  opens tilted and close on one picture, then pulls back and levels. Later the scroll runs in several tilted
  segments that zigzag across the sky, each unrolled by its own roller. Wilson wants spike A's strip to
  unroll this way (asked 2026-11-15); the border pattern should be his own, not the anime's green check.
- `portfolio-animation-references.mp4` (19s): Terminal Industries site. Scroll-driven scene changes: full-bleed
  hero, text that types in, a panel wiping up over the previous scene, masked shapes revealing the next one.
- `portfolio-interaction-reference-zarasDMIDEA.mp4` (3.5 min): iMessage-style thread that plays itself with
  typing indicators; the visitor can type a question at any time; ends with a link card.
- gordontu.com/about: name + face, three social icons, one row of lowercase text links (about, projects,
  writing, contact) to separate pages, three paragraphs of 30-40 words. No intro. Styling not readable from
  the fetch.
- autumnkyoko.com: client-rendered; visible controls "CH ▼ CH ▲ MUTE ⏻", "press ⏻ to turn on".
- alanagoyal.com: client-rendered, nothing readable from the fetch.
- inspora.design: curated feed, no door/film-strip/zoom/chat entries found by title.

## Emil Kowalski rules (from the emilkowalski/skills repo and articles)

1. Frequency gate: 100+ times/day or keyboard-triggered gets no animation; rare or first-time moments may
   have delight. Every animation needs a purpose.
2. Easing: enter/exit `cubic-bezier(0.23,1,0.32,1)`; on-screen movement `cubic-bezier(0.77,0,0.175,1)`;
   drawer `cubic-bezier(0.32,0.72,0,1)` at 500ms; hover/colour `ease`; constant motion `linear`; never
   `ease-in`.
3. Durations: press 100-160ms; tooltips 125-200ms; dropdowns 150-250ms; modals/drawers 200-500ms; other UI
   under 300ms; first-run moments may run longer; exits faster than entrances.
4. Press: `:active { transform: scale(0.97) }`, 160ms ease-out.
5. Entry: never from `scale(0)`; start at `scale(0.9-0.97)` + `opacity: 0`.
6. Transform origin: popovers from their trigger; modals from centre.
7. Animate `transform` and `opacity` (`clip-path` allowed; measured height tolerated for accordions). Never
   `transition: all`.
8. `will-change: transform` only after seeing a 1px shift or measured jank.
9. Do not drive a child's transform through an inherited CSS variable; write `transform` on the element.
10. CSS or WAAPI for motion that must play while the page is busy.
11. Interruptible: transitions or springs for anything re-triggerable or touchable; no keyframes on anything
    a gesture can touch.
12. Springs: default `duration 0.5, bounce 0`; bounce 0.1-0.3 only after a flick or drag release.
13. Drag: follow the pointer 1:1 while down; pointer capture; rubber-band at edges; release with the release
    velocity; momentum projection `pos + (v/1000) * 0.998/(1-0.998)`; `touch-action: pan-y` for horizontal
    drag; hit targets at least 44px.
14. Stagger: product UI 30-80ms steps, under 300ms total; intro 100-150ms steps on 0.5-0.6s entrances; one
    entrance per container; `animation-fill-mode: both`; exits together and shorter; never block interaction.
15. Tooltips: delay only the first; neighbours open instantly with no animation.
16. Hover behind `@media (hover: hover) and (pointer: fine)`.
17. Reduced motion: gentler, not zero. Drop movement and bounce, keep opacity, drop stagger.
18. `blur(2px)` can mask an awkward crossfade.
19. Slow where the visitor decides, fast where the system responds.
20. Review at 2-5x slow motion and on a real phone.

Applied to this site:

- Intro: first-time tier, so longer motion is fine, but skippable and never gating content.
- Photo strip: auto-scroll is `linear`; on pointer down stop it and track 1:1 from the live position; on
  release carry the velocity, then resume; pause auto-scroll under reduced motion.
- Expand/collapse: a transition (not keyframes), about 200ms ease-out on measured height + opacity.
- "Next →": one-off fade with a small rise; first bounce after about 2.5s, repeat about every 6s, stop while
  the visitor interacts; removed under reduced motion.

The locally installed Emil skills are older than the repo, and `/learn-taste` is not installed.
`npx skills@latest add emilkowalski/skills` updates them (not run).

## Spike results (2026-11-15)

Stack changed at Wilson's request: Vite + React 19 + TypeScript + Tailwind v4 + `motion`, no Astro.
Worktrees under `/Users/WilsonSoon/Projects/wilson-portfolio-worktrees/` (`base`, `a`, `b`, `c`); each has
`SPIKE-PROGRESS.md`. Checked in desktop Chrome with no console errors; phone widths not checked.

- A screening room (port 4321, `spike/a-screening-room`): doors, strip, drag, Next and zoom to the main page
  all work. Being reworked from film strip to unrolling scroll. Found: a visitor who scrolls or presses a key
  before about 3.3s gets a plain fade, not the zoom; a passive visitor waits about 6s for Next; iOS Safari may
  ignore the page scroll lock.
- B desktop (port 4322, `spike/b-desktop`): power-on, boot text, icons, draggable windows, terminal work.
  Found: reaching résumé text costs a click plus a window; on phones windows become full-screen sheets, which
  cost more taps than the plain page; no way back to the desktop after choosing the plain site.
- C messages (port 4323, `spike/c-messages`): self-playing thread, chips, typed questions, replay work.
  Found: the opening runs about 20s; chips plus input take about 220px of a phone screen; the thread scrolls
  inside the page; 8 script lines are flagged `needsReview` in `src/data/chat-script.json`.
- Later the same day Wilson asked that the entrance stay reachable by scrolling up from the main page:
  - A (commit 8f2d3b9): the intro is a 320dvh section with a sticky stage above the page; one scroll-derived
    progress value drives doors (0-0.25), unroll (0.25-0.55), dwell with auto-scroll and drag (0.55-0.82) and
    zoom/fade into the page (0.82-1). First visit autoplays by animating the window scroll; return visits land
    on the page. Strip is now a paper scroll with a travelling roll. Verified in desktop Chrome.
  - B (commit f41696d): the desktop is a 100dvh section above the page; "plain site →" scrolls down; power
    state is remembered for the session; "power off" replays the switch-on. Verified in desktop Chrome.
  - Still unchecked for both: phone widths, iOS Safari (per-frame scrollTo, dvh changes), reduced motion.
- Shared: the main page stays focusable behind an overlay unless it is made inert; a plain React app has no
  prebuilt HTML, so the chosen variant needs pre-rendering.

## Routing for the build session

```
Design Read: personal portfolio (landing + single page); recruiters, engineers, peers; calm, cinematic on arrival then quiet; Astro 5 + Tailwind 3, vanilla JS, v1 JSON data; fast to content, phone + desktop, reduced motion, no gating
Pack routing: Layers=Skip: problem is known to be surface and brand | Taste=Use: portfolio, brand direction | Impeccable=Skip: not product UI | Emil/Apple=Use: intro, drag strip, collapse motion
```
