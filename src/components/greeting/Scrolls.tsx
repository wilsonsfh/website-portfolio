import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import story from "../../data/story.json";
import "./scrolls.css";

type Item = { id: string; lane: string; date: string | null; caption: string; type: string; src: string | null; poster: string | null; w: number; h: number };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const PHONE = 640;
const GAP = 10; // between lanes
const PAD = 10; // around the lanes
const CHROME = 64; // lane height minus picture height: bands, padding, caption
const MIN_PIC = 120; // smallest picture height before a phone scrolls instead of squeezing
const ITEM_GAP = 16;

// roll out: drawer-style ease, staggered top first; roll up: together, faster, enter/exit ease
const OPEN_MS = 900;
const OPEN_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const STAGGER = 110;
const CLOSE_MS = 320;
const CLOSE_EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const FADE_MS = 200;

// drift: constant speed (linear), neighbours run opposite ways at slightly different speeds
const DRIFT = 22; // px/s, plus 2 per lane
const DECAY = 0.998; // per ms, flick momentum; travel = v/1000 * DECAY/(1-DECAY)
const RESUME_MS = 2000; // after letting go
const RAMP_MS = 500; // drift eases in and out of a pause
const wrap = (x: number, L: number) => (L > 0 ? x - L * Math.ceil(x / L) : x); // into (-L, 0]; at exactly 0 stays 0

// "2024-07-08" or "2024-07" -> "jul 2024"
const fmt = (d: string | null) => {
  if (!d) return "";
  const [y, m] = d.split("-");
  return `${MONTHS[Number(m) - 1] ?? ""} ${y}`.trim();
};

const byDate = (a: Item, b: Item) => (a.date ?? "9999").localeCompare(b.date ?? "9999"); // undated last

function Picture({ item, live, reduced }: { item: Item; live: boolean; reduced: boolean }) {
  if (!item.src) {
    return (
      <div className="sc-card">
        <span>{item.caption}</span>
        <time>{fmt(item.date)}</time>
      </div>
    );
  }
  if (item.type === "video") {
    return (
      <>
        <video
          src={item.src}
          poster={item.poster ?? undefined}
          muted loop playsInline preload="metadata"
          autoPlay={live && !reduced}
          aria-label={live ? item.caption : undefined}
          aria-hidden={live ? undefined : true}
        />
        <span className="sc-play" aria-hidden="true">▶</span>
      </>
    );
  }
  return <img src={item.src} alt={live ? item.caption : ""} loading="lazy" decoding="async" draggable={false} />;
}

function Cell({ item, ph, live, reduced }: { item: Item; ph: number; live: boolean; reduced: boolean }) {
  const pw = Math.round((ph * item.w) / item.h);
  return (
    <figure className="sc-item" style={{ width: Math.max(pw, 96), marginRight: ITEM_GAP }}>
      <div className="sc-pic" style={{ width: pw, height: ph }}>
        <Picture item={item} live={live} reduced={reduced} />
      </div>
      {item.src && (
        <figcaption>
          <span>{item.caption}</span>
          <time>{fmt(item.date)}</time>
        </figcaption>
      )}
    </figure>
  );
}

type LaneProps = {
  id: string; label: string; items: Item[]; ph: number; h: number; reduced: boolean;
  index: number; driftOn: { current: boolean };
};

function Lane({ id, label, items, ph, h, reduced, index, driftOn }: LaneProps) {
  const view = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [reps, setReps] = useState(3);
  const st = useRef({
    x: 0, v: 0, g: 0, L: 0, resumeAt: 0, down: false, coast: false, hover: false,
    lastX: 0, samples: [] as { t: number; x: number }[],
  });

  // enough copies that the track always covers the viewport: one copy is the loop length
  useLayoutEffect(() => {
    const v = view.current;
    const f = first.current;
    if (!v || !f) return;
    const measure = () => {
      st.current.L = f.offsetWidth;
      setReps(Math.max(2, Math.ceil(v.clientWidth / Math.max(f.offsetWidth, 1)) + 1));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(v);
    ro.observe(f);
    return () => ro.disconnect();
  }, [items.length, ph]);

  // one rAF loop per lane writes the transform directly, no React state per frame
  useEffect(() => {
    const k = st.current;
    const dir = index % 2 === 0 ? -1 : 1;
    const speed = DRIFT + index * 2;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      if (!k.down) {
        if (k.coast) {
          k.x += (k.v * dt) / 1000;
          k.v *= Math.pow(DECAY, dt);
          if (Math.abs(k.v) < 8) { k.coast = false; k.resumeAt = now + RESUME_MS; }
        } else {
          const go = driftOn.current && !reduced && !document.hidden && !k.hover && now >= k.resumeAt;
          k.g = Math.min(1, Math.max(0, k.g + (go ? dt : -dt) / RAMP_MS));
          k.x += (dir * speed * k.g * dt) / 1000;
        }
      }
      k.x = wrap(k.x, k.L);
      if (track.current) track.current.style.transform = `translate3d(${k.x}px,0,0)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [index, reduced, driftOn]);

  // pointer down stops the drift; the track follows the pointer 1:1 from where it is
  const down = (e: RPointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const k = st.current;
    e.currentTarget.setPointerCapture(e.pointerId);
    k.down = true;
    k.coast = false;
    k.v = 0;
    k.g = 0;
    k.lastX = e.clientX;
    k.samples = [{ t: e.timeStamp, x: e.clientX }];
  };
  const move = (e: RPointerEvent) => {
    const k = st.current;
    if (!k.down) return;
    k.x += e.clientX - k.lastX;
    k.lastX = e.clientX;
    k.samples.push({ t: e.timeStamp, x: e.clientX });
    while (k.samples.length > 2 && e.timeStamp - k.samples[0].t > 100) k.samples.shift();
  };
  const up = (e: RPointerEvent) => {
    const k = st.current;
    if (!k.down) return;
    k.down = false;
    const a = k.samples[0];
    const dtMs = e.timeStamp - a.t;
    const fresh = e.timeStamp - k.samples[k.samples.length - 1].t < 80; // held still before release = no flick
    k.v = !reduced && fresh && dtMs > 0 ? ((e.clientX - a.x) / dtMs) * 1000 : 0;
    k.coast = Math.abs(k.v) >= 8;
    k.resumeAt = performance.now() + RESUME_MS;
  };
  const cancel = () => {
    const k = st.current;
    k.down = false;
    k.resumeAt = performance.now() + RESUME_MS;
  };
  const hover = (on: boolean) => (e: RPointerEvent) => { if (e.pointerType === "mouse") st.current.hover = on; };

  return (
    <section className="sc-lane" aria-label={`${label} photos`} data-lane={id} style={{ height: h }}>
      <div className="sc-clip">
      <div className="sc-paper">
        <i className="sc-band" />
        <div
          className="sc-view"
          ref={view}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={cancel}
          onPointerEnter={hover(true)}
          onPointerLeave={hover(false)}
        >
          <div className="sc-track" ref={track}>
            {Array.from({ length: reps }, (_, c) => (
              <div className="sc-copy" key={c} ref={c === 0 ? first : undefined} aria-hidden={c > 0 ? true : undefined}>
                {items.map((it) => <Cell key={it.id} item={it} ph={ph} live={c === 0} reduced={reduced} />)}
              </div>
            ))}
          </div>
        </div>
        <i className="sc-band" />
      </div>
      <div className="sc-spool"><span>{label}</span></div>
      </div>
      <i className="sc-roll" />
    </section>
  );
}

// how far a running (or finished) roll animation has got, 0..1
const progress = (a?: Animation) => (a ? Math.min(1, Math.max(0, Number(a.effect?.getComputedTiming().progress ?? 1))) : 0);

type Props = { open: boolean; reduced: boolean; onClosed: () => void; onClose: () => void };

export default function Scrolls({ open, reduced, onClosed, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const anims = useRef<Animation[][]>([]); // per lane: [paper reveal, roller]
  const fade = useRef<Animation | undefined>(undefined);
  const driftOn = useRef(false); // true once the roll-out has finished
  const run = useRef(0); // latest run wins; a stale run's completion does nothing

  // left edge clears the icon column on desktop; lanes fill the rest
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const icons = el.parentElement?.querySelector<HTMLElement>(".dk-icons");
      el.style.left = window.innerWidth < PHONE ? "0px" : `${icons?.offsetWidth ?? 0}px`;
      setBox({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // WAAPI, so the roll stays smooth while the page is busy. Toggling mid-roll continues from where it is.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const id = ++run.current;
    driftOn.current = false;
    const done: Animation[] = [];
    if (reduced) {
      const from = Number(getComputedStyle(el).opacity);
      const a = el.animate([{ opacity: from }, { opacity: open ? 1 : 0 }], { duration: FADE_MS, easing: "ease-out", fill: "both" });
      fade.current?.cancel();
      fade.current = a;
      done.push(a);
    } else {
      el.querySelectorAll<HTMLElement>(".sc-lane").forEach((lane, i) => {
        const clip = lane.querySelector<HTMLElement>(".sc-clip");
        const roll = lane.querySelector<HTMLElement>(".sc-roll");
        if (!clip || !roll) return;
        const prev = anims.current[i];
        const from = prev ? progress(prev[0]) : 0;
        const to = open ? 1 : 0;
        const opts: KeyframeAnimationOptions = {
          duration: Math.max(1, (open ? OPEN_MS : CLOSE_MS) * Math.abs(to - from)),
          delay: open && from === 0 ? i * STAGGER : 0,
          easing: open ? OPEN_EASE : CLOSE_EASE,
          fill: "both",
        };
        const reveal = (p: number) => ({ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` });
        const travel = (p: number) => ({ transform: `translateX(${p * 100}%)` });
        const next = [
          clip.animate([reveal(from), reveal(to)], opts),
          roll.animate([travel(from), travel(to)], opts),
        ];
        prev?.forEach((a) => a.cancel());
        anims.current[i] = next;
        done.push(...next);
      });
    }
    Promise.all(done.map((a) => a.finished)).then(
      () => {
        if (id !== run.current) return;
        if (open) driftOn.current = true;
        else onClosed();
      },
      () => {},
    );
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const n = story.lanes.length;
  const fit = Math.floor((box.h - PAD * 2 - GAP * (n - 1)) / n);
  const laneH = Math.max(fit, MIN_PIC + CHROME);
  const ph = laneH - CHROME;

  return (
    <div className={`sc${reduced ? " sc-reduced" : ""}`} ref={root}>
      <div className="sc-lanes">
        {story.lanes.map((l, i) => (
          <Lane
            key={l.id}
            index={i}
            driftOn={driftOn}
            id={l.id}
            label={l.label}
            items={(story.items as Item[]).filter((i) => i.lane === l.id).sort(byDate)}
            ph={ph}
            h={laneH}
            reduced={reduced}
          />
        ))}
      </div>
    <button type="button" className="sc-close" onClick={onClose} aria-label="roll up photos">×</button>
    </div>
  );
}
