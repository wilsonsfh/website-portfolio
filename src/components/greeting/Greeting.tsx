import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import Desktop from "./Desktop";
import "./greeting.css";

// sessionStorage value: absent = first visit, "seen-off" = visited, "seen-on" = visited and powered on
const KEY = "greeting-b";
type Phase = "off" | "boot" | "desktop";

const read = () => {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
};
const write = (v: string) => {
  try { sessionStorage.setItem(KEY, v); } catch {}
};
const forced = () => new URLSearchParams(location.search).get("intro") === "1";
const mainEl = () => document.getElementById("main");
const mainTop = () => (mainEl()?.getBoundingClientRect().top ?? 0) + window.scrollY;

const BOOT = [
  "wilson-os 0.1",
  "mounting /home/wilson ... ok",
  "reading about.txt ... ok",
  "starting desktop ... ok",
];

export default function Greeting() {
  const reduce = useReducedMotion();
  const [init] = useState(() => {
    const v = forced() ? null : read();
    return { returning: v !== null, on: v === "seen-on" };
  });
  const [phase, setPhase] = useState<Phase>(init.on ? "desktop" : "off");
  const [veil, setVeil] = useState(!init.on);
  const timers = useRef<number[]>([]);
  const interactive = useRef(false); // true once the visitor has powered on in this page load
  const wantPowerFocus = useRef(!init.returning);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // landing position: first visit at the power-off screen, return visit at the top of #main
  useLayoutEffect(() => {
    history.scrollRestoration = "manual";
    window.scrollTo({ top: init.returning ? mainTop() : 0, behavior: "instant" });
  }, [init.returning]);

  // scrolling past the desktop also counts as having visited
  useEffect(() => {
    const on = () => {
      if (window.scrollY > window.innerHeight / 2) {
        if (read() === null) write("seen-off");
        window.removeEventListener("scroll", on);
      }
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const plain = () => {
    if (read() === null) write("seen-off");
    const m = mainEl();
    if (!m) return;
    m.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    m.setAttribute("tabindex", "-1");
    m.focus({ preventScroll: true });
  };

  const powerOn = () => {
    write("seen-on");
    interactive.current = true;
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

  const powerOff = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    write("seen-off");
    wantPowerFocus.current = true;
    setPhase("off");
    setVeil(true);
  };

  // Escape = plain site, but only while the desktop is still on screen
  const plainRef = useRef(plain);
  plainRef.current = plain;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && window.scrollY < mainTop() - 1) plainRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section id="desktop" className="gr-root" aria-label="desktop greeting">
      {phase === "desktop" && (
        <Desktop onPlain={plain} onPowerOff={powerOff} focusOnMount={interactive.current} />
      )}
      {veil && (
        <div className={`gr-screen${phase === "desktop" ? " leave" : ""}`}>
          <button type="button" className="gr-plain" onClick={plain}>plain site →</button>
          {phase === "off" && (
            <div className="gr-off">
              <button
                type="button"
                className="gr-power"
                onClick={powerOn}
                aria-label="turn on"
                ref={(el) => {
                  if (el && wantPowerFocus.current) {
                    wantPowerFocus.current = false;
                    el.focus({ preventScroll: true });
                  }
                }}
              >
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
          <button type="button" className="gr-cue" onClick={plain}>↓ plain site</button>
        </div>
      )}
    </section>
  );
}
