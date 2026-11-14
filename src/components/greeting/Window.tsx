import { useEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export const BAR = 40;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));
const OUT = [0.23, 1, 0.32, 1] as const; // enter/exit
const DRAWER = [0.32, 0.72, 0, 1] as const;

type Props = {
  title: string;
  x: number; y: number; w: number; h: number; z: number;
  vw: number; vh: number;
  active: boolean; phone: boolean; flush?: boolean;
  onFocus: () => void; onClose: () => void; onMove: (x: number, y: number) => void;
  children: ReactNode;
};

export default function Window({ title, x, y, w, h, z, vw, vh, active, phone, flush, onFocus, onClose, onMove, children }: Props) {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => { root.current?.focus({ preventScroll: true }); }, []);

  // always kept inside the viewport, also after a resize
  const cx = clamp(x, 0, vw - w);
  const cy = clamp(y, BAR, vh - h);

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
      <motion.div className="dk-win" data-active={active} {...motionProps}>
        <div
          className="dk-title"
          onPointerDown={(e) => {
            if (phone || e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
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
    </div>
  );
}
