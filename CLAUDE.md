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

JSON files in `src/data/` (`work-experience.json`, `projects.json`, `activities.json`, `skills.json`) are imported via ES modules in `src/pages/index.astro` and spread as props into card components. The index page composes all sections in order: Navbar → Hero → About → Work Experience → Projects → Activities → Blog (placeholder) → Contact.

### Navigation

File-based routing with a single page (`src/pages/index.astro`). In-page navigation uses anchor links (`#about`, `#work-experience`, `#projects`, etc.) with CSS smooth scrolling handled in `Layout.astro`.

Floating prev/next section buttons are rendered in `index.astro` and controlled by the `sectionIds` array (`["hero", "about", "work-experience", "projects", "activities", "blog", "contact"]`). **Keep this array in sync** when adding or removing sections.

### Styling System

- **Dark mode**: `class` strategy in Tailwind config. Theme stored in `localStorage`, toggled via `dark` class on `<html>`. An inline `<script>` in `Layout.astro` applies it before paint to avoid flash. Use `dark:` prefix for dark variants.
- **Custom colors** defined in `tailwind.config.mjs`:
  - `background` / `background-alt` — beige `#FAF7F2` / `#F0ECE3` (light)
  - `background-dark` / `background-dark-alt` — dark navy `#1A1A2E` / `#16213E` (dark)
  - `foreground` / `foreground-muted` — dark gray `#2D2D2D` / `#6B6B6B` (light)
  - `foreground-dark` / `foreground-dark-muted` — `#E8E8E8` / `#A0A0B0` (dark)
  - `accent` — purple `#6B5B95`, with `accent-hover`, `accent-light`, `accent-dark`, `accent-dark-light`, `accent-dark-hover` variants
- **Max width**: `max-w-site` = 1152px.
- **Fonts** (configured in `tailwind.config.mjs`):
  - `font-heading` — Playfair Display (loaded from Google Fonts CDN in `Layout.astro`)
  - `font-body` — Inter (local woff2 in `public/fonts/`)
  - `font-mono` — JetBrains Mono (local woff2 in `public/fonts/`)
- **Design convention**: lowercase text throughout (`lowercase` Tailwind class).
- **`dot-grid-bg`** — a CSS utility class applied to alternating sections (About, Projects) for a subtle dot-grid background texture.
- **Flash prevention**: `Layout.astro` includes inline `<style is:inline>` with hardcoded bg/text colors for `html:not(.dark)` and `html.dark` to prevent FOUC before Tailwind loads.

### Client-Side Interactivity Patterns

All client-side logic uses vanilla JS in inline `<script>` tags:
- **Scroll reveal**: Intersection Observer in `index.astro` observes `.scroll-reveal`, `.scroll-reveal-left`, `.scroll-reveal-right` elements and adds `.revealed`. Use the `<ScrollReveal>` wrapper component for bottom-up reveals; apply directional classes directly for left/right reveals (the component only emits `scroll-reveal`).
- **Typewriter effect**: `requestAnimationFrame` loop in `TypewriterText.astro`
- **Photo carousel**: Infinite auto-scroll + drag with `requestAnimationFrame` in `About.astro`, includes lightbox modal triggered by clicking carousel items
- **Mobile menu**: Hamburger toggle in `Navbar.astro`
- **Section navigation**: Floating prev/next buttons in `index.astro` track the active section via `getBoundingClientRect`

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
