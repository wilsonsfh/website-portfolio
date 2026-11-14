# CLAUDE.md

Guidance for Claude Code in this repository.

## Commands

- `npm run dev` — Vite dev server (default localhost:5173; pass `-- --port 4330 --strictPort`)
- `npm run build` — `tsc -b && vite build` to `./dist/`
- `npm run preview` — serve the built site

No lint or test scripts. Never use `pkill`; stop a dev server you started by its PID.

## Stack

Vite + React 19 + TypeScript (strict) + Tailwind v4 via `@tailwindcss/vite` (CSS-first, no tailwind config file). The `motion` package is installed (`import { ... } from "motion/react"`) for greeting/intro animation; the base page does not use it.

## Structure

- `index.html` — title/meta, flash-prevention colours, pre-paint theme script, `<div id="root">`.
- `src/main.tsx` -> `src/App.tsx` -> `src/components/MainPage.tsx`.
- `src/styles/global.css` — Tailwind import, `@theme` tokens, CSS variables, and all page styles (class names like `.row`, `.panel`).
- `src/data/*.json` — `work-experience`, `projects`, `activities`, `skills`, `photos` (16 resized photos in `public/photos/reel/`, shared list for intros).
- `public/` — fonts (Inter 400/500), images, `resume.pdf` (not linked).

## Page

`MainPage` renders `<main id="main">`: name, one paragraph, five rows (about, work, projects, activities, get in touch), footer with theme toggle. Rows are `<button aria-expanded aria-controls>` inside `<h2>`; several can be open. Expand/collapse is a CSS transition on `grid-template-rows` 0fr/1fr plus opacity (220ms open, 160ms close, `cubic-bezier(0.23,1,0.32,1)`), interruptible; closed panels use `visibility: hidden`. Reduced motion keeps opacity only. Hover styles sit behind `@media (hover: hover) and (pointer: fine)`.

## Where a greeting mounts

`src/App.tsx` has a commented slot before `<MainPage />`. An intro should overlay the page (`position: fixed`), be skippable and never block it.

## Tokens and theme

- Dark mode: `dark` class on `<html>`, stored in `localStorage.theme` (`"dark"` or `"light"`). `index.html` applies it before paint; the footer toggle in `MainPage.tsx` writes it. Tailwind `dark:` variant is `&:where(.dark, .dark *)`.
- CSS variables in `global.css`: `--bg`, `--fg`, `--muted`, `--line`, `--line-strong`, `--accent`; `:root.dark` overrides. Light `#FCFCFC`/`#111111`, dark `#0E0E0E`/`#EDEDED`. Accent `#6B5B95` (`#9B8CC4` dark), used only for link hover and focus rings.
- Same values as Tailwind tokens in `@theme` (`bg-background`, `text-foreground`, `text-accent`, ...). Keep `index.html` flash colours in sync.
- Font: Inter only. Lowercase convention for labels. No gradients, shadows, cards, pills or monospace labels.
- Motion: transitions over keyframes for anything re-triggerable; see docs/v2-research-notes.md in the main repo.
