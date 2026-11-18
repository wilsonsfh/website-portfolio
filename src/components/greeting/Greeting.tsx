import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import Desktop from "./Desktop";
import BootBar from "./BootBar";
import { playOn, playOff } from "./sound";
import "./greeting.css";

// sessionStorage value: absent = first visit, "seen-off" = visited, "seen-on" = visited and powered on
const KEY = "greeting-b";
type Phase = "off" | "boot" | "desktop" | "closing"; // closing = crt collapse after power off

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
  const [init] = useState(() => {
    const v = forced() ? null : read();
    return { returning: v !== null, on: v === "seen-on" };
  });
  const [phase, setPhase] = useState<Phase>(init.on ? "desktop" : "off");
  const [veil, setVeil] = useState(!init.on);
  const [offFade, setOffFade] = useState(false); // reduced motion: the dark screen fades in after power off
  const timers = useRef<number[]>([]);
  const interactive = useRef(false); // true once the visitor has powered on in this page load
  const wantPowerFocus = useRef(!init.returning);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // landing position: always the top (desktop or power-off screen)
  useLayoutEffect(() => {
    history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const powerOn = () => {
    playOn();
    write("seen-on");
    interactive.current = true;
    setOffFade(false);
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
    playOff();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    write("seen-off");
    wantPowerFocus.current = true;
    setVeil(true);
    if (reduce) {
      setOffFade(true);
      setPhase("off");
      return;
    }
    setPhase("closing");
    timers.current.push(window.setTimeout(() => setPhase("off"), 420));
  };

  return (
    <section id="desktop" className="gr-root" aria-label="desktop greeting">
      {(phase === "desktop" || phase === "closing") && (
        <div className={`gr-crt${phase === "closing" ? " closing" : ""}`} inert={phase === "closing"}>
          <Desktop onPowerOff={powerOff} focusOnMount={interactive.current} />
        </div>
      )}
      {phase === "closing" && <div className="gr-glow-off" aria-hidden="true" />}
      {veil && (
        <div className={`gr-screen${phase === "desktop" ? " leave" : ""}${phase === "closing" ? " under" : ""}${offFade ? " fade-in" : ""}`}>
          {(phase === "off" || phase === "boot") && (
            <div className={`gr-off${phase === "boot" ? " gone" : ""}`} inert={phase === "boot"}>
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
                <span className="gr-ring" aria-hidden="true" />
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
              <BootBar />
              <ul className="gr-boot" aria-hidden="true">
                {BOOT.map((l, i) => (
                  <li key={l} style={{ animationDelay: `${420 + i * 140}ms` }}>{l}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
