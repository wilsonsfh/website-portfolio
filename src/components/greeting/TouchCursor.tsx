import { useEffect, useRef } from "react";

const HOLD_MS = 250; // a touch this long shows the cursor; a quick tap never does
const LIFT = 40; // drawn this far above the finger, so the finger does not hide it

const CLICKABLE = 'button:not(:disabled), a[href], summary, label, select, input[type="range"], [role="button"], .ph-tile';

// touch screens: the retro pixel cursor follows a finger that is held down, and turns into the glove over
// anything clickable. Touch events (not pointer events) so it keeps following while the page scrolls.
export default function TouchCursor() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer = 0;
    let at = { x: 0, y: 0 };
    let shown = false;
    const draw = () => {
      const c = el.current;
      if (!c) return;
      const over = document.elementFromPoint(at.x, at.y)?.closest(CLICKABLE);
      c.classList.toggle("glove", !!over);
      c.style.transform = `translate3d(${at.x}px,${at.y - LIFT}px,0)`;
    };
    const hide = () => {
      clearTimeout(timer);
      shown = false;
      if (el.current) el.current.hidden = true;
    };
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) return hide();
      at = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        shown = true;
        draw();
        if (el.current) el.current.hidden = false;
      }, HOLD_MS);
    };
    const move = (e: TouchEvent) => {
      if (e.touches.length !== 1) return hide();
      at = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (shown) draw();
    };
    const opts = { passive: true, capture: true };
    window.addEventListener("touchstart", start, opts);
    window.addEventListener("touchmove", move, opts);
    window.addEventListener("touchend", hide, opts);
    window.addEventListener("touchcancel", hide, opts);
    return () => {
      hide();
      window.removeEventListener("touchstart", start, opts);
      window.removeEventListener("touchmove", move, opts);
      window.removeEventListener("touchend", hide, opts);
      window.removeEventListener("touchcancel", hide, opts);
    };
  }, []);

  return <div className="dk-touch" ref={el} hidden aria-hidden="true" />;
}
