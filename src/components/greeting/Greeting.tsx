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

const DOOR_ANGLE = 80; // degrees
const CAM_SCALE = 2.6;
const CAM_ROTATE = -8; // degrees

type Zone = 0 | 1 | 2; // before dwell | dwell | zoom/after

export default function Greeting() {
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
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

    // Zoom into the centre picture while the veil whitens to --bg
    const zoom = zoomRef.current;
    const veil = stage.querySelector<HTMLElement>(".gr-veil");
    const zt = easeOut(seg(p, ZOOM[0], ZOOM[1]));
    if (zoom && veil) {
      if (zt <= 0) {
        zoomGeo.current = null;
        zoom.style.transform = "none";
        veil.style.opacity = "0";
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
        veil.style.opacity = String(1 - (1 - seg(zt, 0.29, 1)) ** 2);
      }
    }
  }, [reduced, unroll]);

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

  const toMain = useCallback((behavior: ScrollBehavior) => {
    const sec = sectionRef.current;
    if (!sec) return;
    window.scrollTo({ top: sec.offsetTop + sec.offsetHeight, behavior });
  }, []);

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
              onControl={() => {}}
              downRef={downRef}
            />
          </div>
          <div className="gr-vignette" />
          <div className="gr-veil" />
        </div>

        {!reduced && (
          <div className="gr-doors" ref={doorsRef} aria-hidden="true">
            <div className="gr-core" />
            <Leaf side="l" />
            <Leaf side="r" />
          </div>
        )}

        <div className={`gr-next${zone === 1 ? " is-on" : ""}`}>
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
