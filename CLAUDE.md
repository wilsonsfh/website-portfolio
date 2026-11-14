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

JSON files in `src/data/` (`work-experience.json`, `projects.json`, `activities.json`, `skills.json`, `photos.json`) are imported in `src/components/MainPage.astro`, which renders the whole v2 page inside `<main id="main">`. `src/pages/index.astro` is just Layout + MainPage. `photos.json` is the shared list of resized photos in `public/photos/reel/`. The v1 components (Navbar, Hero, About, cards, etc.) are still in `src/components/` but unused.

### Navigation

Single page, no navbar. Five rows (about, work, projects, activities, get in touch) are `<button aria-expanded aria-controls>` that expand in place via a CSS grid-rows (0fr/1fr) + opacity transition; several can be open at once. Mount anything that should sit in front of the page before or around `<main id="main">`.

### Styling System

- **Dark mode**: `class` strategy in Tailwind config. Theme stored in `localStorage` (`theme`), toggled via `dark` class on `<html>` by the footer text toggle in `MainPage.astro`. An inline `<script>` in `Layout.astro` applies it before paint. Flash-prevention colours are an inline `<style>` in `Layout.astro`.
- **CSS variables** (`src/styles/global.css`, imported in `Layout.astro`): `--bg`, `--fg`, `--muted`, `--line`, `--line-strong`, `--accent`; `:root.dark` overrides them. Light `#FCFCFC` / `#111`, dark `#0E0E0E` / `#EDEDED`. Accent purple `#6B5B95` (`#9B8CC4` in dark), only for link hover and focus rings.
- **Tailwind colours** (`tailwind.config.mjs`) carry the same neutral values for the old components (`background`, `foreground`, `accent` families).
- **Font**: Inter only (local woff2 in `public/fonts/`, weights 400/500). Lowercase convention for labels.
- **Motion**: transitions only, `cubic-bezier(0.23,1,0.32,1)`, open 220ms, close 160ms, reduced motion keeps opacity only.

### Client-Side Interactivity Patterns

Vanilla JS in inline `<script>` tags (row toggles and theme toggle in `MainPage.astro`). The scroll-reveal, typewriter, carousel and section-navigation code belonged to the unused v1 components.

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
