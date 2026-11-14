import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Desktop from "./Desktop";
import "./greeting.css";

const KEY = "greeting-b";
type Phase = "off" | "boot" | "desktop";

const read = () => {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
};
const write = (v: string) => {
  try { sessionStorage.setItem(KEY, v); } catch {}
};
const forced = () => new URLSearchParams(location.search).get("intro") === "1";

const BOOT = [
  "wilson-os 0.1",
  "mounting /home/wilson ... ok",
  "reading about.txt ... ok",
  "starting desktop ... ok",
];

export default function Greeting() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(() => forced() || read() !== "plain");
  const [phase, setPhase] = useState<Phase>(() => (!forced() && read() === "desktop" ? "desktop" : "off"));
  const [veil, setVeil] = useState(() => phase !== "desktop");
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const plain = () => {
    write("plain");
    setOpen(false);
    requestAnimationFrame(() => {
      const m = document.getElementById("main");
      m?.setAttribute("tabindex", "-1");
      m?.focus({ preventScroll: true });
    });
  };

  const powerOn = () => {
    write("desktop");
    if (reduce) {
      setPhase("desktop");
      timers.current.push(window.setTimeout(() => setVeil(false), 240));
      return;
    }
    setPhase("boot");
    timers.current.push(
      window.setTimeout(() => setPhase("desktop"), 1100),
      window.setTimeout(() => setVeil(false), 1340),
    );
  };

  // while the overlay is up: page behind is inert and cannot scroll; Escape = plain site
  useEffect(() => {
    if (!open) return;
    const main = document.getElementById("main");
    main?.setAttribute("inert", "");
    const html = document.documentElement;
    const prev = [html.style.overflow, document.body.style.overflow];
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") plain(); };
    window.addEventListener("keydown", onKey);
    return () => {
      main?.removeAttribute("inert");
      html.style.overflow = prev[0];
      document.body.style.overflow = prev[1];
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="gr-root"
          role="region"
          aria-label="desktop greeting"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        >
          {phase === "desktop" && <Desktop onPlain={plain} />}
          {veil && (
            <div className={`gr-screen${phase === "desktop" ? " leave" : ""}`}>
              <button type="button" className="gr-plain" onClick={plain}>plain site →</button>
              {phase === "off" && (
                <div className="gr-off">
                  <button type="button" className="gr-power" onClick={powerOn} aria-label="turn on" autoFocus>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 3v8" />
                      <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
                    </svg>
                  </button>
                  <p className="gr-hint">press ⏻ to turn on</p>
                </div>
              )}
              {phase === "boot" && (
                <>
                  <div className="gr-glow" aria-hidden="true" />
                  <ul className="gr-boot" aria-hidden="true">
                    {BOOT.map((l, i) => (
                      <li key={l} style={{ animationDelay: `${420 + i * 140}ms` }}>{l}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
