# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `npm run dev` — Start dev server at localhost:4321
- `npm run build` — Build production site to `./dist/`
- `npm run preview` — Preview built site locally

No lint or test scripts are configured.

## Architecture

Single-page portfolio website built with **Astro 5** and **Tailwind CSS 3**. No UI framework (React/Vue) — all components are `.astro` files with vanilla JS in inline `<script>` blocks.

### Data Flow

JSON files in `src/data/` (work-experience, projects, activities) are imported via ES modules in `src/pages/index.astro` and spread as props into card components. The index page composes all sections in order: Navbar → Hero → About → Work Experience → Projects → Activities → Blog (placeholder) → Contact.

### Navigation

File-based routing with a single page (`src/pages/index.astro`). In-page navigation uses anchor links (`#about`, `#work-experience`, `#projects`, etc.) with CSS smooth scrolling.

### Styling System

- **Dark mode**: `class` strategy in Tailwind config. Theme stored in `localStorage`, toggled via `dark` class on `<html>`. Use `dark:` prefix for dark variants.
- **Custom colors** defined in `tailwind.config.mjs`: `background` (beige #FAF7F2), `foreground` (dark gray #2D2D2D), `accent` (purple #6B5B95) — each with hover/light/dark variants.
- **Fonts**: Poppins (`font-heading`), Inter (`font-body`), JetBrains Mono (`font-mono`) — loaded as local woff2 files from `public/fonts/`.
- **Design convention**: lowercase text throughout (`lowercase` class).

### Client-Side Interactivity Patterns

All client-side logic uses vanilla JS in inline `<script>` tags:
- **Scroll reveal**: Intersection Observer in index.astro adds `.revealed` class to `.scroll-reveal` elements
- **Typewriter effect**: `requestAnimationFrame` loop in TypewriterText.astro
- **Photo carousel**: Infinite scroll with `requestAnimationFrame` in About.astro, includes lightbox modal
- **Mobile menu**: Hamburger toggle in Navbar.astro

All animations respect `prefers-reduced-motion`.

### Component Pattern

Components use TypeScript `Props` interfaces in frontmatter, receive data via props, and render with Astro's template syntax. Example:
```astro
---
interface Props {
  company: string;
  role: string;
  tags: string[];
}
const { company, role, tags } = Astro.props;
---
<div>...</div>
```
