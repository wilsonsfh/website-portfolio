import { useEffect, useLayoutEffect, useRef } from "react";
import type { MotionValue } from "motion/react";
import photoData from "../../data/photos.json";

const AUTO_SPEED = 60; // px/s, constant (linear)
const DECAY = 0.998; // per ms, momentum decay toward the auto velocity
const MIN_SET = 8;
const ROLL_START = 0.24; // roll's left edge as a fraction of the view width at the start
const ROLL_SQUASH = 0.35; // the roll thins by this much by the end

type Photo = { src: string; alt: string };

// Adding a photo to photos.json is all it takes; short lists are repeated up to MIN_SET.
function buildSet(): Photo[] {
  const list: Photo[] = photoData.length ? photoData : [{ src: "", alt: "" }];
  const n = Math.ceil(MIN_SET / list.length) * list.length;
  return Array.from({ length: Math.max(n, MIN_SET) }, (_, i) => list[i % list.length]);
}
const SET = buildSet();

type Props = {
  /** True only in the dwell range: the strip auto-scrolls and can be dragged. Otherwise it holds its offset. */
  activeRef: { current: boolean };
  reduced: boolean;
  /** 0 = rolled up, 1 = fully unrolled; drives the roll position and the paper reveal. */
  progress: MotionValue<number>;
  /** Visitor took the strip. */
  onControl: () => void;
  /** True while the pointer is down on the strip. */
  downRef: { current: boolean };
};

export default function FilmStrip({ activeRef, reduced, progress, onControl, downRef }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const hit = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const roll = useRef<HTMLDivElement>(null);
  const s = useRef({
    x: 0, // offset within one set, kept in [-L, 0)
    v: 0, // px/s
    pitch: 300,
    L: 2400,
    dragging: false,
    lastX: 0,
    samples: [] as { t: number; x: number }[],
    startX: 0,
    startY: 0,
    moved: false,
    controlled: false,
  });

  // Measure one cell; centre the first frame in the viewport.
  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const st = s.current;
    const measure = () => {
      const cell = el.querySelector<HTMLElement>(".gr-cell");
      if (!cell) return;
      st.pitch = cell.offsetWidth; // layout width, unaffected by the camera transform
      st.L = st.pitch * SET.length;
    };
    measure();
    st.x = window.innerWidth / 2 - st.pitch / 2;
    el.style.transform = `translate3d(${(((st.x % st.L) + st.L) % st.L) - st.L * 2}px,0,0)`;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reveal (clip-path on the paper) and roll (transform) are both written from the one progress value,
  // so the roll's left edge, where the paper leaves it, is the revealed edge by construction.
  useLayoutEffect(() => {
    const apply = (p: number) => {
      const band = strip.current;
      const r = roll.current;
      if (!band || !r) return;
      const w = band.clientWidth;
      const edge = p >= 1 ? w + 8 : w * ROLL_START + (w + 8 - w * ROLL_START) * p;
      band.style.clipPath = `inset(0 ${Math.max(0, w - edge)}px 0 0)`;
      r.style.transform = `translate3d(${edge}px,0,0) scaleX(${1 - ROLL_SQUASH * p})`;
    };
    apply(progress.get());
    return progress.on("change", apply);
  }, [progress]);

  // One rAF loop writes transform directly; no React state per frame.
  useEffect(() => {
    const st = s.current;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      if (!st.dragging && !activeRef.current) {
        st.v = 0; // outside the dwell range the strip holds its offset
      } else if (!st.dragging) {
        const tv = reduced ? 0 : -AUTO_SPEED; // px/s the strip eases toward when free
        st.v = tv + (st.v - tv) * Math.pow(DECAY, dt);
        if (Math.abs(st.v - tv) < 0.05) st.v = tv;
        st.x += (st.v * dt) / 1000;
      }
      const L = st.L;
      st.x = (((st.x % L) + L) % L) - L; // wrap into [-L, 0): the strip is periodic
      if (track.current) track.current.style.transform = `translate3d(${st.x - L}px,0,0)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [activeRef, reduced]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!activeRef.current) return;
    const st = s.current;
    hit.current?.setPointerCapture(e.pointerId);
    st.dragging = true;
    st.moved = false;
    st.lastX = e.clientX;
    st.startX = e.clientX;
    st.startY = e.clientY;
    st.samples = [{ t: e.timeStamp, x: e.clientX }];
    downRef.current = true;
    if (!st.controlled) {
      st.controlled = true;
      onControl();
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = s.current;
    if (!st.dragging) return;
    st.x += e.clientX - st.lastX; // 1:1 from the live position
    st.lastX = e.clientX;
    if (Math.abs(e.clientX - st.startX) > 6) st.moved = true;
    st.samples.push({ t: e.timeStamp, x: e.clientX });
    while (st.samples.length > 2 && e.timeStamp - st.samples[0].t > 100) st.samples.shift();
  };

  const release = (e: React.PointerEvent) => {
    const st = s.current;
    if (!st.dragging) return;
    st.dragging = false;
    downRef.current = false;
    const a = st.samples[0];
    const dtMs = e.timeStamp - a.t;
    // Stale samples (held still before release) mean no flick.
    const fresh = e.timeStamp - st.samples[st.samples.length - 1].t < 80;
    st.v = fresh && dtMs > 0 ? ((e.clientX - a.x) / dtMs) * 1000 : 0;
  };


  return (
    <>
      <div className="gr-scroll" aria-hidden="true">
        <div className="gr-strip" ref={strip}>
        <div className="gr-track" ref={track}>
          {[0, 1, 2].map((copy) =>
            SET.map((p, i) => (
              <div className="gr-cell" key={`${copy}-${i}`}>
                <div className="gr-frame">
                  <img
                    src={p.src}
                    alt=""
                    draggable={false}
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.style.visibility = "hidden";
                    }}
                  />
                </div>
              </div>
            )),
          )}
        </div>
        </div>
        <div className="gr-roll" ref={roll}>
          <i className="gr-roll-body" />
          <i className="gr-knob gr-knob-t" />
          <i className="gr-knob gr-knob-b" />
          <i className="gr-ember" />
        </div>
      </div>
      <div
        className="gr-hit"
        ref={hit}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
      />
    </>
  );
}
