import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type PointerEvent, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

const DELAY = 400; // before the first tooltip shows
const COOL = 300; // pointer off every trigger this long = next one is "first" again
const PER_CHAR = 22; // ms per typed character

// shared across all tooltips: once one has shown, neighbours open instantly until the pointer has left for COOL ms
let warm = false;
let coolTimer = 0;
const heat = () => { clearTimeout(coolTimer); warm = true; };
const cool = () => { clearTimeout(coolTimer); coolTimer = window.setTimeout(() => { warm = false; }, COOL); };

type TriggerProps = {
  ref: (el: HTMLElement | null) => void;
  onPointerEnter: (e: PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
  onFocus: (e: FocusEvent<HTMLElement>) => void;
  onBlur: () => void;
  "aria-describedby": string;
};

// wraps one trigger (render prop) and renders its tooltip beside it, without adding a layout box
export default function Tooltip({ text, children }: { text: string; children: (p: TriggerProps) => ReactNode }) {
  const id = useId();
  const reduce = useReducedMotion();
  const trigger = useRef<HTMLElement | null>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const delay = useRef(0);
  const [open, setOpen] = useState<null | { instant: boolean }>(null);
  const [typed, setTyped] = useState(0);

  const hide = () => { clearTimeout(delay.current); setOpen(null); };
  const show = () => {
    clearTimeout(delay.current);
    const go = () => { heat(); setOpen({ instant: warm }); };
    if (warm) { clearTimeout(coolTimer); setOpen({ instant: true }); return; }
    delay.current = window.setTimeout(go, DELAY);
  };
  const leave = () => { hide(); cool(); };

  // type the text in letter by letter (not when instant, or reduced motion); layout effect so no empty first frame
  useLayoutEffect(() => {
    if (!open) return;
    if (open.instant || reduce) { setTyped(text.length); return; }
    setTyped(0);
    let n = 0;
    const t = window.setInterval(() => {
      n++;
      setTyped(n);
      if (n >= text.length) clearInterval(t);
    }, PER_CHAR);
    return () => clearInterval(t);
  }, [open, text, reduce]);

  // place below the trigger (above if no room), centred, clamped to the viewport
  useLayoutEffect(() => {
    const el = tip.current, t = trigger.current;
    if (!open || !el || !t) return;
    const r = t.getBoundingClientRect();
    const w = el.offsetWidth, h = el.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8);
    const below = r.bottom + 6 + h <= window.innerHeight - 8;
    el.style.left = `${left}px`;
    el.style.top = `${below ? r.bottom + 6 : r.top - 6 - h}px`;
  }, [open, text]);

  // a fixed tooltip would drift from its trigger, so any scroll or resize hides it
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("resize", hide);
    return () => { window.removeEventListener("scroll", hide); window.removeEventListener("resize", hide); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(delay.current), []);

  const props: TriggerProps = {
    ref: (el) => { trigger.current = el; },
    onPointerEnter: (e) => {
      if (e.pointerType === "touch" || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      show();
    },
    onPointerLeave: leave,
    onFocus: (e) => { if (e.currentTarget.matches(":focus-visible")) show(); },
    onBlur: leave,
    "aria-describedby": id,
  };

  return (
    <>
      {children(props)}
      <span id={id} className="sr-only">{text}</span>
      {open && createPortal( // body-level: a fixed tooltip inside a transformed, clipped window would be mispositioned and cut off
        <span ref={tip} className={`tt${open.instant ? " instant" : ""}`} aria-hidden="true">
          <span className="tt-ghost">{text}</span>
          <span className="tt-typed">{text.slice(0, typed)}</span>
        </span>,
        document.body,
      )}
    </>
  );
}
