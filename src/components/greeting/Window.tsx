import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import Tooltip from "./Tooltip";

export const BAR = 40;
export const MIN_W = 280;
export const MIN_H = 180;
export const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));
const OUT = [0.23, 1, 0.32, 1] as const; // enter/exit
const FLIP_MS = 240; // maximize / restore / out of the dock
const MIN_MS = 200; // into the dock
const DRAWER = [0.32, 0.72, 0, 1] as const;

type Dir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const DIRS: Dir[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

type Props = {
  title: string;
  x: number; y: number; w: number; h: number; z: number;
  vw: number; vh: number;
  active: boolean; max: boolean; min: boolean; phone: boolean; flush?: boolean; autoFocus: boolean;
  onFocus: () => void; onToggleMax: () => void; onMinimize: () => void; dockPt: () => { x: number; y: number } | null; onClose: () => void; onBack: () => void; onMove: (x: number, y: number) => void; onRect: (x: number, y: number, w: number, h: number) => void;
  children: ReactNode;
};

export default function Window({ title, x, y, w, h, z, vw, vh, active, max, min, phone, flush, autoFocus, onFocus, onToggleMax, onMinimize, dockPt, onClose, onBack, onMove, onRect, children }: Props) {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const rz = useRef<{ dir: Dir; px: number; py: number; x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const r = root.current;
    if (autoFocus && r && !r.contains(document.activeElement)) r.focus({ preventScroll: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // maximize / restore: flip the outer box from its previous rect to the new one (transform only, no width/height transition)
  const last = useRef({ x: x, y: y, w, h, max });
  const flip = useRef<Animation | null>(null);
  const wasMin = useRef(min);

  // always kept inside the viewport, also after a resize
  const cx = clamp(x, 0, vw - w);
  const cy = clamp(y, BAR, vh - h);

  useLayoutEffect(() => {
    const r = root.current, p = last.current;
    if (r && !phone && p.max !== max) {
      let from = { x: p.x, y: p.y, w: p.w, h: p.h };
      if (flip.current) { // interrupted: start from where the box visibly is
        const b = r.getBoundingClientRect(), o = r.offsetParent!.getBoundingClientRect();
        from = { x: b.left - o.left, y: b.top - o.top, w: b.width, h: b.height };
        flip.current.cancel();
      }
      const a = reduce
        ? r.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: 150, easing: "ease-out" })
        : r.animate(
            [
              { transformOrigin: "0 0", transform: `translate3d(${from.x}px,${from.y}px,0) scale(${from.w / w},${from.h / h})` },
              { transformOrigin: "0 0", transform: `translate3d(${cx}px,${cy}px,0) scale(1,1)` },
            ],
            { duration: FLIP_MS, easing: "cubic-bezier(0.23,1,0.32,1)" },
          );
      flip.current = a;
      a.onfinish = a.oncancel = () => { if (flip.current === a) flip.current = null; };
    }
    last.current = { x: cx, y: cy, w, h, max };
  });

  // minimize: shrink and fade towards the dock entry; restore: grow back out of it. Hidden (visibility) once minimized.
  useLayoutEffect(() => {
    const r = root.current;
    if (wasMin.current === min) return;
    wasMin.current = min;
    if (!r) return;
    const cs = getComputedStyle(r);
    const from = flip.current ? { transform: cs.transform, opacity: cs.opacity } : null; // interrupted: continue from where it is
    flip.current?.cancel();
    const rest = { transform: `translate3d(${cx}px,${cy}px,0)`, opacity: 1 };
    const pt = dockPt();
    let dock = rest;
    if (pt && !reduce) {
      const b = r.getBoundingClientRect(); // layout position (animation cancelled), so the centre is the resting one
      dock = { transform: `translate3d(${cx + pt.x - (b.left + b.width / 2)}px,${cy + pt.y - (b.top + b.height / 2)}px,0) scale(0.9)`, opacity: 0 };
    } else dock = { ...rest, opacity: 0 };
    if (min) {
      const a = r.animate([from ?? rest, dock], { duration: reduce ? 150 : MIN_MS, easing: "cubic-bezier(0.23,1,0.32,1)", fill: "forwards" });
      flip.current = a;
      a.onfinish = () => { if (flip.current === a) r.style.visibility = "hidden"; };
    } else {
      r.style.visibility = "";
      const a = r.animate([from ?? dock, rest], { duration: reduce ? 150 : FLIP_MS, easing: "cubic-bezier(0.23,1,0.32,1)" });
      flip.current = a;
      a.onfinish = a.oncancel = () => { if (flip.current === a) flip.current = null; };
      if (!r.contains(document.activeElement)) r.focus({ preventScroll: true });
    }
  }, [min]); // eslint-disable-line react-hooks/exhaustive-deps

  const motionProps = phone
    ? {
        initial: { opacity: reduce ? 0 : 1, y: reduce ? 0 : "100%" },
        animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: DRAWER } },
        exit: { opacity: reduce ? 0 : 1, y: reduce ? 0 : "100%", transition: { duration: 0.2, ease: DRAWER } },
      }
    : {
        initial: { opacity: 0, scale: reduce ? 1 : 0.95 },
        animate: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: OUT } },
        exit: { opacity: 0, scale: reduce ? 1 : 0.97, transition: { duration: 0.12, ease: OUT } },
      };

  return (
    <div
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-label={title}
      inert={min}
      className={`dk-pos${phone ? " is-phone" : ""}`}
      style={phone ? { zIndex: z } : { zIndex: z, width: w, height: h, transform: `translate3d(${cx}px,${cy}px,0)` }}
      onPointerDownCapture={() => { if (!active) onFocus(); }}
    >
      <motion.div className="dk-win" data-active={active} data-max={max} {...motionProps}>
        <div
          className="dk-title"
          onPointerDown={(e) => {
            if (phone || max || e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { dx: e.clientX - cx, dy: e.clientY - cy };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            onMove(clamp(e.clientX - d.dx, 0, vw - w), clamp(e.clientY - d.dy, BAR, vh - h));
          }}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
          onDoubleClick={(e) => { if (!phone && !(e.target as HTMLElement).closest("button")) onToggleMax(); }}
        >
          {phone && <button type="button" className="dk-back" onClick={onBack}>← back</button>}
          <span className="dk-title-text">{title}</span>
          {!phone && (
            <div className="dk-wbtns">
              <Tooltip text="minimize">{(t) => (
                <button type="button" className="dk-wbtn" aria-label={`minimize ${title}`} onClick={onMinimize} {...t}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M2 9h8" />
                  </svg>
                </button>
              )}</Tooltip>
              <Tooltip text={max ? "restore" : "maximize"}>{(t) => (
                <button type="button" className="dk-wbtn" aria-label={`${max ? "restore" : "maximize"} ${title}`} onClick={onToggleMax} {...t}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {max ? <path d="M4.5 2.5h5v5 M2.5 4.5h5v5h-5z" /> : <rect x="2" y="2" width="8" height="8" rx="1" />}
                  </svg>
                </button>
              )}</Tooltip>
              <Tooltip text="close">{(t) => (
                <button type="button" className="dk-wbtn" aria-label={`close ${title}`} onClick={onClose} {...t}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M2 2l8 8M10 2l-8 8" />
                  </svg>
                </button>
              )}</Tooltip>
            </div>
          )}
        </div>
        <div className={`dk-body${flush ? " flush" : ""}`}>{children}</div>
      </motion.div>
      {!phone && !max && DIRS.map((dir) => (
        <div
          key={dir}
          className="dk-rz"
          data-d={dir}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            rz.current = { dir, px: e.clientX, py: e.clientY, x: cx, y: cy, w, h };
          }}
          onPointerMove={(e) => {
            const r = rz.current;
            if (!r) return;
            const dx = e.clientX - r.px, dy = e.clientY - r.py;
            let { x, y, w: nw, h: nh } = r;
            if (r.dir.includes("e")) nw = clamp(r.w + dx, MIN_W, vw - r.x);
            if (r.dir.includes("w")) { x = clamp(r.x + dx, 0, r.x + r.w - MIN_W); nw = r.x + r.w - x; }
            if (r.dir.includes("s")) nh = clamp(r.h + dy, MIN_H, vh - r.y);
            if (r.dir.includes("n")) { y = clamp(r.y + dy, BAR, r.y + r.h - MIN_H); nh = r.y + r.h - y; }
            onRect(x, y, nw, nh);
          }}
          onPointerUp={() => { rz.current = null; }}
          onPointerCancel={() => { rz.current = null; }}
        />
      ))}
    </div>
  );
}
