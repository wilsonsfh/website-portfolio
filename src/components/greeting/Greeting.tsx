import { useCallback, useEffect, useRef, useState } from "react";
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
const IGNORED_KEYS = new Set(["Tab", "Shift", "Control", "Alt", "Meta", "CapsLock"]);

type Exit = null | "fade";

export default function Greeting({ onDone }: { onDone: () => void }) {
  const [reduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [open, setOpen] = useState(false); // doors swing
  const [doorsGone, setDoorsGone] = useState(reduced);
  const [ready, setReady] = useState(!reduced); // reduced motion: cross-fade in
  const [exit, setExit] = useState<Exit>(null);
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
    return () => {
      html.style.overflow = prev;
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
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduced]);

  useEffect(() => () => clearTimeout(doneTimer.current), []);

  const advance = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    setExit("fade");
    doneTimer.current = window.setTimeout(onDone, 280);
  }, [onDone]);

  // Never a gate: wheel or any key moves on.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (IGNORED_KEYS.has(e.key)) return;
      advance();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", advance, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", advance);
    };
  }, [advance]);

  const cls = ["gr-root", ready ? "is-ready" : "", exit ? `is-exit-${exit}` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} role="presentation">
      <div className="gr-zoom">
        <div className="gr-camera">
          <div className="gr-placeholder" />
        </div>
      </div>

      {!doorsGone && (
        <div className={`gr-doors${open ? " is-open" : ""}`} aria-hidden="true">
          <div className="gr-core" />
          <Leaf side="l" />
          <Leaf side="r" />
        </div>
      )}

      <button type="button" className="gr-skip" onClick={advance}>
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
