import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export const BAR = 40;
export const MIN_W = 280;
export const MIN_H = 180;
export const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));
const OUT = [0.23, 1, 0.32, 1] as const; // enter/exit
const FLIP_MS = 240; // maximize / restore
const DRAWER = [0.32, 0.72, 0, 1] as const;

type Dir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const DIRS: Dir[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

type Props = {
  title: string;
  x: number; y: number; w: number; h: number; z: number;
  vw: number; vh: number;
  active: boolean; max: boolean; phone: boolean; flush?: boolean; autoFocus: boolean;
  onFocus: () => void; onToggleMax: () => void; onClose: () => void; onMove: (x: number, y: number) => void; onRect: (x: number, y: number, w: number, h: number) => void;
  children: ReactNode;
};

export default function Window({ title, x, y, w, h, z, vw, vh, active, max, phone, flush, autoFocus, onFocus, onToggleMax, onClose, onMove, onRect, children }: Props) {
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
          {phone && <button type="button" className="dk-back" onClick={onClose}>← back</button>}
          <span className="dk-title-text">{title}</span>
          {!phone && (
            <button type="button" className="dk-close" aria-label={`close ${title}`} onClick={onClose}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
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
