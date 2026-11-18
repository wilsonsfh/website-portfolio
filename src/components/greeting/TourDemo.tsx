import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "@fontsource/caveat/500.css";
import { WORDS } from "../Typewriter";

// the tour shows rather than tells: a pixel cursor acts out each stop (press expand then collapse, type in the terminal,
// poke the spirits...). Any real press or key stops it; reduced motion skips it. Portalled to <body> with the note, so
// both sit above the assistant panel (also portalled there).
const MOVE_MS = 600;
const OPEN_WAIT = 700; // the maximised window settles first
const COMMANDS = ["whoami", "ls"];
const IMAGE_ASK = "show wilson in pixel art"; // typed, not sent: every tour would otherwise spend the daily image quota

type Cursor = {
  to: (el: Element) => Promise<void>;
  toPt: (x: number, y: number) => Promise<void>;
  press: (el: HTMLElement, opts?: { hold?: number; poke?: boolean }) => Promise<void>;
  type: (input: HTMLInputElement, text: string) => Promise<boolean>;
  note: (x: number, y: number, below: boolean) => void;
  wait: (ms: number) => Promise<void>;
  alive: () => boolean;
};
type Script = (c: Cursor) => Promise<void>;

const win = (title: string) => document.querySelector<HTMLElement>(`[role="dialog"][aria-label="${CSS.escape(title)}"]`);
const btn = (root: ParentNode | null, sel: string, text?: string) =>
  [...(root?.querySelectorAll<HTMLElement>(sel) ?? [])].find((b) => text === undefined || b.textContent?.trim() === text) ?? null;

// about: point just right of the typewriter's longest word, and pin a handwritten note there
const about: Script = async (c) => {
  const tw = win("about.txt")?.querySelector<HTMLElement>(".dk-tw");
  if (!tw) return;
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.font = getComputedStyle(tw).font;
  const longest = Math.max(...WORDS.map((w) => ctx.measureText(w).width));
  const b = tw.getBoundingClientRect();
  const right = b.left + longest + 14;
  const below = right + 230 > window.innerWidth; // no room on the right (phones): the note goes under the line
  const x = below ? b.left + 12 : right;
  const y = below ? b.bottom + 4 : b.top + b.height / 2;
  await c.toPt(x, y);
  c.note(x, y, below);
};

// a list window: press its first expand, then collapse a second later
const list = (title: string): Script => async (c) => {
  const b = btn(win(title), ".item-toggle");
  if (!b) return;
  await c.to(b);
  await c.press(b);
  await c.wait(1000);
  await c.press(b);
};

// desktop: poke the mushroom and the slime, then press stop and hop (the visitor's setting ends where it started)
const desktop: Script = async (c) => {
  const row = document.querySelector(".dk-mobs");
  for (const sel of [".gr-mush", ".gr-slime"]) {
    const m = row?.querySelector<HTMLElement>(sel);
    if (!m) continue;
    await c.to(m);
    await c.press(m, { poke: true });
    await c.wait(350);
  }
  const toggle = () => row?.querySelector<HTMLElement>(".spirit-btn");
  const t = toggle();
  if (!t) return;
  await c.to(t);
  await c.press(t);
  await c.wait(1000);
  const back = toggle();
  if (back) await c.press(back);
};

const photos: Script = async (c) => {
  const w = win("photos");
  const orig = btn(w, ".ph-seg button", "original");
  if (!orig) return;
  await c.to(orig);
  await c.press(orig);
  await c.wait(1200);
  const sq = btn(w, ".ph-seg button", "square");
  if (!sq) return;
  await c.to(sq);
  await c.press(sq);
};

const terminal: Script = async (c) => {
  const input = win("terminal")?.querySelector<HTMLInputElement>(".dk-term input");
  if (!input) return;
  await c.to(input);
  await c.press(input, { hold: 260 }); // press and hold, then type
  input.focus({ preventScroll: true });
  for (const cmd of COMMANDS) {
    if (!(await c.type(input, cmd))) return;
    await c.wait(250);
    if (!c.alive()) return;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await c.wait(900);
  }
};

// assistant: switch to image (when images are on today) and type the ask, leaving "draw" to the visitor
const assistant: Script = async (c) => {
  const panel = document.querySelector<HTMLElement>(".as-panel");
  const img = panel?.querySelector<HTMLButtonElement>('.as-ico[aria-label="image"]');
  if (img && !img.disabled) {
    await c.to(img);
    await c.press(img);
  }
  const input = panel?.querySelector<HTMLInputElement>(".as-form input");
  if (!input) return;
  await c.to(input);
  await c.press(input);
  input.focus({ preventScroll: true });
  await c.type(input, IMAGE_ASK);
};

const SCRIPTS: Record<string, Script> = {
  about, work: list("work"), projects: list("projects"), activities: list("involvements"), desktop, photos, terminal, assistant,
};

export default function TourDemo({ step }: { step: string | null }) {
  const el = useRef<HTMLDivElement>(null);
  const noteEl = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const run = step ? SCRIPTS[step] : undefined;
    const cur = el.current;
    const nt = noteEl.current;
    if (!run || !cur || !nt || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    const stop = (e: Event) => { if (e.isTrusted) { alive = false; cur.hidden = true; } };
    window.addEventListener("pointerdown", stop, true);
    window.addEventListener("keydown", stop, true);
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const at = { x: window.innerWidth - 60, y: window.innerHeight - 90 }; // starts by the tour bar
    const place = () => { cur.style.transform = `translate3d(${at.x}px,${at.y}px,0)`; };
    const glide = async (x: number, y: number, glove: boolean) => {
      if (!alive) return;
      at.x = x;
      at.y = y;
      cur.classList.toggle("glove", glove);
      place();
      await wait(MOVE_MS);
    };
    // the input is controlled by react: set the value the way a keystroke would
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    const c: Cursor = {
      alive: () => alive,
      wait,
      toPt: (x, y) => glide(x, y, false),
      to: (target) => {
        const b = target.getBoundingClientRect();
        return glide(b.left + Math.min(b.width / 2, 24), b.top + b.height / 2, true);
      },
      press: async (target, { hold = 140, poke = false } = {}) => {
        if (!alive) return;
        cur.classList.add("press");
        if (poke) target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        await wait(hold);
        cur.classList.remove("press");
        if (alive && !poke) target.click();
        await wait(120);
      },
      type: async (input, text) => {
        for (let i = 1; i <= text.length; i++) {
          if (!alive) return false;
          setValue.call(input, text.slice(0, i));
          input.dispatchEvent(new Event("input", { bubbles: true }));
          await wait(80);
        }
        return alive;
      },
      note: (x, y, below) => {
        nt.classList.toggle("below", below);
        nt.style.transform = `translate3d(${x}px,${y}px,0)`;
        nt.hidden = false;
      },
    };
    (async () => {
      await wait(OPEN_WAIT);
      if (!alive) return;
      cur.style.transition = "none";
      place();
      cur.hidden = false;
      void cur.offsetWidth; // start from here, then glide
      cur.style.transition = "";
      await run(c);
      await wait(500);
      cur.hidden = true;
    })();
    return () => {
      alive = false;
      cur.hidden = true;
      nt.hidden = true;
      cur.classList.remove("glove", "press");
      window.removeEventListener("pointerdown", stop, true);
      window.removeEventListener("keydown", stop, true);
    };
  }, [step]);
  return createPortal(
    <>
      {/* handwritten, pinned beside the typewriter on the about stop: tells people the word is still coming */}
      <div className="dk-note" ref={noteEl} hidden aria-hidden="true">
        <svg width="46" height="26" viewBox="0 0 46 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M44 20c-12 4-26 2-38-12 M6 8l1 8 M6 8l8 1" />
        </svg>
        <span>this keeps changing!</span>
      </div>
      <div className="dk-touch dk-demo" ref={el} hidden aria-hidden="true" />
    </>,
    document.body,
  );
}
