import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, useMotionValue, type AnimationPlaybackControls } from "motion/react";
import FilmStrip from "./FilmStrip";
import "./greeting.css";

const SEEN_KEY = "intro-seen";

export function shouldPlayIntro(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get("intro") === "1") return true;
    return sessionStorage.getItem(SEEN_KEY) !== "1";
  } catch {
    return true;
  }
}

const DOORS_CLOSED_MS = 1200;
const DOORS_GONE_MS = 2500;
const UNROLL_START_MS = 2000;
const UNROLL_S = 1.5;
const CAM_SCALE = 2.6;
const CAM_ROTATE = -8; // degrees
const IGNORED_KEYS = new Set(["Tab", "Shift", "Control", "Alt", "Meta", "CapsLock"]);

const NEXT_AFTER_WATCHING_MS = 4000;
const BOUNCE_FIRST_MS = 2500;
const BOUNCE_EVERY_MS = 6000;

type Exit = null | "fade" | "zoom";

export default function Greeting({ onDone }: { onDone: () => void }) {
  const [reduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [open, setOpen] = useState(false); // doors swing
  const [doorsGone, setDoorsGone] = useState(reduced);
  const [ready, setReady] = useState(!reduced); // reduced motion: cross-fade in
  const [running, setRunning] = useState(reduced); // unroll finished: auto-scroll starts
  const downRef = useRef(false);
  const [exit, setExit] = useState<Exit>(null);
  const [zoom, setZoom] = useState<{ ox: number; oy: number; s: number } | null>(null);
  const [nextOn, setNextOn] = useState(reduced);
  const rootRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const unrollTimer = useRef<number>(0);
  const unrollAnim = useRef<AnimationPlaybackControls | null>(null);
  // One progress value (0 = rolled, 1 = unrolled) drives the roll, the reveal and the camera.
  const progress = useMotionValue(reduced ? 1 : 0);
  const exiting = useRef(false);
  const doneTimer = useRef<number>(0);

  // Mark as seen, lock page scroll while mounted.
  useEffect(() => {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode: replays, acceptable */
    }
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const main = document.getElementById("main");
    main?.setAttribute("inert", "");
    return () => {
      html.style.overflow = prev;
      main?.removeAttribute("inert");
    };
  }, []);

  // Door timeline (or the reduced-motion cross-fade).
  useEffect(() => {
    if (reduced) {
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
      return () => cancelAnimationFrame(raf);
    }
    const t1 = window.setTimeout(() => setOpen(true), DOORS_CLOSED_MS);
    const t2 = window.setTimeout(() => setDoorsGone(true), DOORS_GONE_MS);
    unrollTimer.current = window.setTimeout(() => {
      unrollAnim.current = animate(progress, 1, {
        duration: UNROLL_S,
        ease: [0.77, 0, 0.175, 1],
        onComplete: () => setRunning(true),
      });
    }, UNROLL_START_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(unrollTimer.current);
      unrollAnim.current?.stop();
    };
  }, [reduced, progress]);

  // Camera pull-back and levelling follow the same progress as the roll.
  useLayoutEffect(() => {
    const apply = (p: number) => {
      const el = cameraRef.current;
      if (!el) return;
      el.style.transform =
        p >= 1
          ? "none"
          : `scale(${CAM_SCALE + (1 - CAM_SCALE) * p}) rotate(${CAM_ROTATE * (1 - p)}deg)`;
    };
    apply(progress.get());
    return progress.on("change", apply);
  }, [progress]);

  // Pressing the strip mid-unroll finishes the reveal at once; the visitor drags from the live position.
  const finishUnroll = useCallback(() => {
    if (progress.get() >= 1) return;
    clearTimeout(unrollTimer.current);
    unrollAnim.current?.stop();
    progress.set(1);
    setRunning(true);
  }, [progress]);

  useEffect(() => () => clearTimeout(doneTimer.current), []);

  // Scale the scene into the frame nearest the centre while the veil whitens to --bg.
  const advance = useCallback(
    (kind?: "fade") => {
      if (exiting.current) return;
      exiting.current = true;
      if (kind === "fade" || reduced || progress.get() < 1) {
        setExit("fade");
        doneTimer.current = window.setTimeout(onDone, 280);
        return;
      }
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      let best: DOMRect | null = null;
      let bestD = Infinity;
      rootRef.current?.querySelectorAll(".gr-frame").forEach((f) => {
        const r = f.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - cx);
        if (d < bestD) {
          bestD = d;
          best = r;
        }
      });
      const r = best as DOMRect | null;
      if (r) {
        setZoom({
          ox: r.left + r.width / 2,
          oy: r.top + r.height / 2,
          s: Math.max(window.innerWidth / r.width, window.innerHeight / r.height) * 1.15,
        });
      }
      setExit("zoom");
      doneTimer.current = window.setTimeout(onDone, 720);
    },
    [onDone, reduced, progress],
  );

  // Never a gate: wheel or any key moves on.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (IGNORED_KEYS.has(e.key)) return;
      advance();
    };
    window.addEventListener("keydown", onKey);
    const onWheel = () => advance();
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, [advance]);

  // Next appears after 4s of watching if the visitor never takes control.
  useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(() => setNextOn(true), UNROLL_START_MS + NEXT_AFTER_WATCHING_MS);
    return () => clearTimeout(t);
  }, [reduced]);

  // Small arrow nudge: first after 2.5s on screen, then every 6s, paused while the pointer is down.
  useEffect(() => {
    if (!nextOn || reduced) return;
    const nudge = () => {
      if (downRef.current || exiting.current) return;
      arrowRef.current?.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(6px)", offset: 0.4 }, { transform: "translateX(0)" }],
        { duration: 500, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
      );
    };
    let iv = 0;
    const first = window.setTimeout(() => {
      nudge();
      iv = window.setInterval(nudge, BOUNCE_EVERY_MS);
    }, BOUNCE_FIRST_MS);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [nextOn, reduced]);

  const cls = ["gr-root", ready ? "is-ready" : "", exit ? `is-exit-${exit}` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} role="presentation" ref={rootRef}>
      <div
        className="gr-zoom"
        style={
          zoom
            ? { transformOrigin: `${zoom.ox}px ${zoom.oy}px`, transform: `scale(${zoom.s})` }
            : undefined
        }
      >
        <div className="gr-camera" ref={cameraRef}>
          <FilmStrip
            running={running}
            reduced={reduced}
            progress={progress}
            onPress={finishUnroll}
            onControl={() => setNextOn(true)}
            onSwipeAway={advance}
            downRef={downRef}
          />
        </div>
        <div className="gr-vignette" />
        <div className="gr-veil" />
      </div>

      {!doorsGone && (
        <div className={`gr-doors${open ? " is-open" : ""}`} aria-hidden="true">
          <div className="gr-core" />
          <Leaf side="l" />
          <Leaf side="r" />
        </div>
      )}

      <div className={`gr-next${nextOn ? " is-on" : ""}`}>
        <button type="button" className="gr-next-btn" onClick={() => advance()}>
          <span ref={arrowRef} className="gr-next-label">
            next →
          </span>
        </button>
      </div>

      <button type="button" className="gr-skip" onClick={() => advance("fade")}>
        skip
      </button>
    </div>
  );
}

function Leaf({ side }: { side: "l" | "r" }) {
  return (
    <div className={`gr-leaf gr-leaf-${side}`}>
      <i className="gr-panel gr-panel-top" />
      <i className="gr-panel gr-panel-bot" />
      <i className="gr-handle" />
      <i className="gr-shade" />
    </div>
  );
}
