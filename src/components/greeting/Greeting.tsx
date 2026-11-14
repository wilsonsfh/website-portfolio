import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMotionValue } from "motion/react";
import FilmStrip from "./FilmStrip";
import { clamp01, easeOut, easeSlide, seg } from "./ease";
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

// One scroll-derived progress value p (0..1) through the section; every part is a function of p.
const DOORS: [number, number] = [0, 0.25];
const UNROLL: [number, number] = [0.25, 0.55];
const DWELL: [number, number] = [0.55, 0.82];
const ZOOM: [number, number] = [0.82, 1];

const END_P = 0.999; // at (or within a hair of) 1 the stage is hidden and inert
const DOOR_ANGLE = 80; // degrees
const CAM_SCALE = 2.6;
const CAM_ROTATE = -8; // degrees

const DOORS_CLOSED_MS = 1200; // first visit: hold on the closed doors, then autoplay
const AUTOPLAY_MS = 2600; // window scroll from 0 to the start of the dwell range
const NEXT_AFTER_WATCHING_MS = 4000;
const BOUNCE_FIRST_MS = 2500;
const BOUNCE_EVERY_MS = 6000;
const IGNORED_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock"]);

type Zone = 0 | 1 | 2; // before dwell | dwell | zoom/after

export default function Greeting() {
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [first] = useState(shouldPlayIntro); // first visit this session (or ?intro=1)
  const [zone, setZone] = useState<Zone>(reduced ? 1 : 0);
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const doorsRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const unroll = useMotionValue(reduced ? 1 : 0); // eased local progress of the unroll range
  const activeRef = useRef(reduced); // dwell: strip runs
  const downRef = useRef(false);
  const zoneRef = useRef<Zone>(reduced ? 1 : 0);
  const [grabbed, setGrabbed] = useState(false);
  const [watched, setWatched] = useState(false);
  const zoomGeo = useRef<{ ox: number; oy: number; s: number } | null>(null);

  // Everything below is written imperatively from p: transform/opacity/clip-path only.
  const update = useCallback(() => {
    const sec = sectionRef.current;
    const stage = stageRef.current;
    if (!sec || !stage || reduced) return;
    const range = sec.offsetHeight - stage.offsetHeight;
    const p = range > 0 ? clamp01(-sec.getBoundingClientRect().top / range) : 0;

    // Doors
    const d = easeSlide(seg(p, DOORS[0], DOORS[1]));
    const doors = doorsRef.current;
    if (doors) {
      doors.style.visibility = d >= 1 ? "hidden" : "visible";
      const [l, r] = doors.querySelectorAll<HTMLElement>(".gr-leaf");
      l.style.transform = `rotateY(${DOOR_ANGLE * d}deg)`;
      r.style.transform = `rotateY(${-DOOR_ANGLE * d}deg)`;
      doors.querySelectorAll<HTMLElement>(".gr-shade").forEach((el) => {
        el.style.opacity = String(0.55 * d);
      });
      const core = doors.querySelector<HTMLElement>(".gr-core");
      if (core) {
        core.style.transform = `scaleX(${1 + 89 * d})`;
        core.style.opacity = String(1 - seg(d, 0.25, 1));
      }
    }

    // Roll + reveal (FilmStrip subscribes) and camera pull-back, from the same local progress
    const u = easeSlide(seg(p, UNROLL[0], UNROLL[1]));
    unroll.set(u);
    if (cameraRef.current) {
      cameraRef.current.style.transform =
        u >= 1
          ? "none"
          : `scale(${CAM_SCALE + (1 - CAM_SCALE) * u}) rotate(${CAM_ROTATE * (1 - u)}deg)`;
    }

    // Dwell + zone
    activeRef.current = p >= DWELL[0] && p < DWELL[1];
    const z: Zone = p < DWELL[0] ? 0 : p < DWELL[1] ? 1 : 2;
    if (z !== zoneRef.current) {
      zoneRef.current = z;
      setZone(z);
    }

    // Zoom into the centre picture while the whole stage fades out over the whole range, revealing
    // the main page, which sits underneath (pulled up by one viewport in CSS).
    const zoom = zoomRef.current;
    const zt = easeOut(seg(p, ZOOM[0], ZOOM[1]));
    stage.style.opacity = String(1 - seg(p, ZOOM[0], ZOOM[1]));
    stage.style.visibility = p >= END_P ? "hidden" : "visible";
    stage.style.pointerEvents = p >= ZOOM[0] ? "none" : "auto";
    if (zoom) {
      if (zt <= 0) {
        zoomGeo.current = null;
        zoom.style.transform = "none";
      } else {
        if (!zoomGeo.current) {
          // strip holds its offset outside the dwell range, so this is stable until z returns to 0
          zoom.style.transform = "none";
          const cx = stage.clientWidth / 2;
          let best: DOMRect | null = null;
          let bestD = Infinity;
          stage.querySelectorAll(".gr-frame").forEach((f) => {
            const r = f.getBoundingClientRect();
            const dist = Math.abs(r.left + r.width / 2 - cx);
            if (dist < bestD) {
              bestD = dist;
              best = r;
            }
          });
          const r = best as DOMRect | null;
          const top = stage.getBoundingClientRect().top;
          zoomGeo.current = r
            ? {
                ox: r.left + r.width / 2,
                oy: r.top - top + r.height / 2,
                s: Math.max(stage.clientWidth / r.width, stage.clientHeight / r.height) * 1.15,
              }
            : { ox: cx, oy: stage.clientHeight / 2, s: 4 };
        }
        const g = zoomGeo.current;
        zoom.style.transformOrigin = `${g.ox}px ${g.oy}px`;
        zoom.style.transform = `scale(${1 + (g.s - 1) * zt})`;
      }
    }
  }, [reduced, unroll]);

  // Scroll position where p = 1 and the main page is fully in view (the page is pulled up under the stage).
  const mainScroll = useCallback(() => {
    const sec = sectionRef.current;
    const stage = stageRef.current;
    if (!sec || !stage) return 0;
    return sec.offsetTop + sec.offsetHeight - (reduced ? 0 : stage.offsetHeight);
  }, [reduced]);

  // Before first paint: land at the top (first visit) or at #main (return visit), so nothing shifts.
  useLayoutEffect(() => {
    try {
      history.scrollRestoration = "manual";
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: first ? 0 : mainScroll(), behavior: "instant" });
  }, [first, mainScroll]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode: replays, acceptable */
    }
  }, []);

  useLayoutEffect(() => {
    update();
    const onResize = () => {
      zoomGeo.current = null;
      update();
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", onResize);
    };
  }, [update]);

  // First visit: after the doors have been closed for a moment, scroll the window itself to the start
  // of the dwell range. Any input cancels it at once and leaves the visitor at the live position.
  useEffect(() => {
    if (!first || reduced) return;
    let raf = 0;
    let cancelled = false;
    const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    const cancel = (e?: Event) => {
      if (e instanceof KeyboardEvent && IGNORED_KEYS.has(e.key)) return;
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      events.forEach((n) => window.removeEventListener(n, cancel));
    };
    events.forEach((n) => window.addEventListener(n, cancel, { passive: true }));
    const timer = window.setTimeout(() => {
      const sec = sectionRef.current;
      const stage = stageRef.current;
      if (!sec || !stage) return;
      const from = window.scrollY;
      const target = (sec.offsetHeight - stage.offsetHeight) * DWELL[0];
      const t0 = performance.now();
      let last = from;
      const tick = (now: number) => {
        if (cancelled) return;
        // Something else moved the page (scrollbar drag, keyboard focus): back off.
        if (Math.abs(window.scrollY - last) > 2) return cancel();
        const t = clamp01((now - t0) / AUTOPLAY_MS);
        window.scrollTo({ top: from + (target - from) * t, behavior: "instant" });
        last = window.scrollY;
        if (t < 1) raf = requestAnimationFrame(tick);
        else cancel();
      };
      raf = requestAnimationFrame(tick);
    }, DOORS_CLOSED_MS);
    return cancel;
  }, [first, reduced]);

  // next → shows in the dwell range once the visitor grabs the strip, or after 4s of watching.
  const nextReady = reduced || grabbed || watched;
  useEffect(() => {
    if (zone !== 1 || nextReady) return;
    const t = window.setTimeout(() => setWatched(true), NEXT_AFTER_WATCHING_MS);
    return () => clearTimeout(t);
  }, [zone, nextReady]);
  const nextOn = zone === 1 && nextReady;

  // Small arrow nudge: first 2.5s after it appears, then every 6s, paused while the pointer is down.
  useEffect(() => {
    if (!nextOn || reduced) return;
    const nudge = () => {
      if (downRef.current) return;
      arrowRef.current?.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(6px)", offset: 0.4 }, { transform: "translateX(0)" }],
        { duration: 500, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
      );
    };
    let iv = 0;
    const firstT = window.setTimeout(() => {
      nudge();
      iv = window.setInterval(nudge, BOUNCE_EVERY_MS);
    }, BOUNCE_FIRST_MS);
    return () => {
      clearTimeout(firstT);
      clearInterval(iv);
    };
  }, [nextOn, reduced]);

  const toMain = useCallback(
    (behavior: ScrollBehavior) => window.scrollTo({ top: mainScroll(), behavior }),
    [mainScroll],
  );

  return (
    <section
      className={`gr-section${reduced ? " is-reduced" : ""}`}
      ref={sectionRef}
      aria-label="introduction"
    >
      <div className="gr-root" ref={stageRef}>
        <div className="gr-zoom" ref={zoomRef}>
          <div className="gr-camera" ref={cameraRef}>
            <FilmStrip
              activeRef={activeRef}
              reduced={reduced}
              progress={unroll}
              onControl={() => setGrabbed(true)}
              downRef={downRef}
            />
          </div>
          <div className="gr-vignette" />
        </div>

        {!reduced && (
          <div className="gr-doors" ref={doorsRef} aria-hidden="true">
            <div className="gr-core" />
            <Leaf side="l" />
            <Leaf side="r" />
          </div>
        )}

        <div className={`gr-next${nextOn ? " is-on" : ""}`}>
          <button type="button" className="gr-next-btn" onClick={() => toMain("smooth")}>
            <span ref={arrowRef} className="gr-next-label">
              next →
            </span>
          </button>
        </div>

        <button
          type="button"
          className={`gr-skip${zone === 2 ? " is-off" : ""}`}
          onClick={() => toMain("instant")}
        >
          skip
        </button>
      </div>
    </section>
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
