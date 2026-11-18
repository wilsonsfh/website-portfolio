import { useEffect, useRef } from "react";

// the tour shows rather than tells: on a list stop a pixel cursor presses the first "expand", then "collapse" a second
// later; on the terminal stop it clicks in and types two commands. Any real press or key stops it; reduced motion skips it.
const MOVE_MS = 600;
const OPEN_WAIT = 700; // the maximised window settles first
const COMMANDS = ["whoami", "ls"];

type Script = (win: HTMLElement, c: Cursor) => Promise<void>;
type Cursor = { to: (el: Element) => Promise<void>; press: (el: HTMLElement, hold?: number) => Promise<void>; wait: (ms: number) => Promise<void>; alive: () => boolean };

const lists: Script = async (win, c) => {
  const btn = win.querySelector<HTMLElement>(".item-toggle");
  if (!btn) return;
  await c.to(btn);
  await c.press(btn);
  await c.wait(1000);
  await c.press(btn);
};

const terminal: Script = async (win, c) => {
  const input = win.querySelector<HTMLInputElement>(".dk-term input");
  if (!input) return;
  await c.to(input);
  await c.press(input, 260); // press and hold, then type
  input.focus({ preventScroll: true });
  // the input is controlled by react: set the value the way a keystroke would, then press enter
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  for (const cmd of COMMANDS) {
    for (let i = 1; i <= cmd.length; i++) {
      if (!c.alive()) return;
      set.call(input, cmd.slice(0, i));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await c.wait(90);
    }
    await c.wait(250);
    if (!c.alive()) return;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await c.wait(900);
  }
};

const SCRIPTS: Record<string, Script> = { work: lists, projects: lists, activities: lists, terminal };

export default function TourDemo({ step, title }: { step: string | null; title: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const script = step ? SCRIPTS[step] : undefined;
    const cur = el.current;
    if (!script || !cur || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    const stop = (e: Event) => { if (e.isTrusted) { alive = false; cur.hidden = true; } };
    window.addEventListener("pointerdown", stop, true);
    window.addEventListener("keydown", stop, true);
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const at = { x: window.innerWidth - 60, y: window.innerHeight - 90 }; // starts by the tour bar
    const place = () => { cur.style.transform = `translate3d(${at.x}px,${at.y}px,0)`; };
    const c: Cursor = {
      alive: () => alive,
      wait,
      to: async (target) => {
        if (!alive) return;
        const b = target.getBoundingClientRect();
        at.x = b.left + Math.min(b.width / 2, 24);
        at.y = b.top + b.height / 2;
        cur.classList.add("glove");
        place();
        await wait(MOVE_MS);
      },
      press: async (target, hold = 140) => {
        if (!alive) return;
        cur.classList.add("press");
        await wait(hold);
        cur.classList.remove("press");
        if (alive) target.click();
        await wait(120);
      },
    };
    (async () => {
      await wait(OPEN_WAIT);
      const win = document.querySelector<HTMLElement>(`[role="dialog"][aria-label="${CSS.escape(title)}"]`);
      if (!alive || !win) return;
      cur.style.transition = "none";
      place();
      cur.hidden = false;
      void cur.offsetWidth; // start from here, then glide
      cur.style.transition = "";
      await script(win, c);
      await wait(400);
      cur.hidden = true;
    })();
    return () => {
      alive = false;
      cur.hidden = true;
      cur.classList.remove("glove", "press");
      window.removeEventListener("pointerdown", stop, true);
      window.removeEventListener("keydown", stop, true);
    };
  }, [step, title]);
  return <div className="dk-touch dk-demo" ref={el} hidden aria-hidden="true" />;
}
