# Wilson Soon

Hi, I'm Wilson, a Computer Science undergrad at NUS. This is my personal site to show what I've worked on, what I think about, and a bit of who I am outside of code.

**→ [wilsonsoon-website-portfolio.vercel.app](https://wilsonsoon-website-portfolio.vercel.app/)**

---

## Motivation behind tech stack

A portfolio is mostly static content. My projects, work experience, and about page don't change between page loads and don't need to respond to live data, so I didn't want to ship a JavaScript framework to handle all of that.

Most popular frameworks like React, Vue, and Next.js use a virtual DOM: a lightweight in-memory copy of the page that the framework diffs against the real DOM whenever state changes. That machinery has a cost. The diffing algorithm, the reconciler, and the runtime all ship to the browser as JavaScript. React alone sends about 45KB before you've written a single line of application code. Frameworks that do server-side rendering also require hydration: after the HTML loads, the browser re-executes all the components and attaches event listeners to the existing nodes, creating a window where the page looks interactive but isn't.

[Astro](https://astro.build) renders everything to plain HTML at build time. There's no virtual DOM to ship and no hydration to reason about. The HTML the browser receives is already the final output. The only JS that ships is what I explicitly write in `<script>` blocks: about 270 lines covering dark mode, the mobile nav, photo lightbox, scroll reveal, and the typewriter effect. Minified, that's roughly 3-5KB, compared to React's 45KB before a single line of my own code.

For a personal site I plan to keep updating over time, that simplicity is also worth a lot as an author. There's no "is this running on the server or the client" to reason about, no hydration timing to debug, no framework version to stay current with. What I write is what the browser gets.

---

## Stack

- **[Astro 5](https://astro.build)** -- static site generation, `.astro` component templates, file-based routing
- **[Tailwind CSS 3](https://tailwindcss.com)** via `@astrojs/tailwind` with a custom design system: beige background (`#FAF7F2`), dark charcoal foreground (`#2D2D2D`), purple accent (`#6B5B95`), and full dark mode variants for each
- **Vanilla JS** -- ~270 lines total across inline `<script>` blocks, zero external runtime libraries

---

## Features

### Typewriter

My favourite part of the site. The hero intro has a typewriter effect that cycles through words like "software engineer", "dancer", "tea lover", and more. It's a state machine with a `charIndex` counter and a `deleting` flag, driven by `setTimeout` wrapped inside `requestAnimationFrame`. The word list is stored as JSON in a `data-words` attribute on the span at build time, so no extra fetches are needed. It respects `prefers-reduced-motion`, switching to a simple 3-second word swap for users who prefer no animation.

### Photo Lightbox

The about section has a grid of photos I took. Clicking any photo opens a lightbox overlay that covers the screen and shows the image full-size. Clicking anywhere outside or pressing Escape closes it. About 25 lines of vanilla JS using `classList` to toggle a `hidden` class and swapping the `src` on a single shared `<img>` element.

### Dark and Light Mode

Theme preference is stored in `localStorage` and applied by an inline script inside `<head>` before the page renders, so there's no flash of the wrong theme on load. Tailwind's `class` strategy is used throughout: `dark:` prefix styles only apply when the `<html>` element has the `.dark` class. The toggle button in the navbar flips that class and syncs it back to `localStorage`.

### Floating Navigation Buttons

Two small circular buttons sit fixed at the bottom-right corner. One scrolls to the previous section, one to the next. They track the active section by checking each section's `getBoundingClientRect().top` on scroll, debounced with `requestAnimationFrame`. The up button hides on the hero section; the down button hides on the contact section. An `isManualScrolling` flag with a 1-second timeout prevents the scroll listener from conflicting with the button-triggered scroll.

---

## Local Dev

```bash
npm install
npm run dev      # localhost:4321
npm run build    # production build to ./dist/
npm run preview  # preview the built site
```

---

## Structure

```
src/
├── components/   # one .astro file per section or card type
├── data/         # JSON files (work-experience, projects, activities)
├── layouts/      # Layout.astro with <head> and dark mode init
├── pages/        # index.astro -- single page composing all sections
└── styles/       # global.css with scroll-reveal and base resets
public/
├── fonts/        # local woff2 files (Poppins, Inter, JetBrains Mono)
├── images/       # hero.jpg
└── photos/       # photography grid images
```
