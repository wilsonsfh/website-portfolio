import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent, type KeyboardEvent as ReactKeyboardEvent, type CSSProperties, type FocusEvent as ReactFocusEvent } from "react";
import story from "../../data/story.json";
import Tooltip from "./Tooltip";
import { appById } from "./apps";
import "./scrolls.css";

type Item = { id: string; lane: string; date: string | null; caption: string; type: string; src: string | null; poster: string | null; w: number; h: number };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const PHONE = 640;
const GAP = 8; // between lanes
const PAD = 8; // around the lanes
const CHROME = 60; // lane height minus picture height: bands, padding, caption
const MIN_PIC = 80; // smallest picture height before the lanes scroll instead of squeezing
const HEAD = 44; // strip above the lanes: holds "all photos" and the close button, so neither covers a lane
const ITEM_GAP = 16;
const CLICK_PX = 6; // a press that moved less than this is a click, not a drag

// roll out: drawer-style ease (quick start, long settle, like the reference scroll), lanes start in a shuffled order
// with uneven gaps; roll up: together, slower and softer. Once rolled up the whole scroll is hidden (CLOSE_MS in css).
const OPEN_MS = 900;
const OPEN_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const STAGGER_MIN = 60; // gap between one lane starting and the next, random in [MIN, MAX]
const STAGGER_MAX = 190;
const CLOSE_MS = 800;
const CLOSE_EASE = "cubic-bezier(0.33, 0, 0.2, 1)";
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
  const clickable = live && !!item.src; // the first copy is the real one; the rest are loop padding
  const pw = Math.round((ph * item.w) / item.h);
  return (
    <figure className="sc-item" data-id={item.src ? item.id : undefined} style={{ width: Math.max(pw, 96), marginRight: ITEM_GAP }}>
      <div
        className="sc-pic"
        style={{ width: pw, height: ph }}
        {...(clickable ? { tabIndex: 0, role: "button", "aria-label": `open ${item.caption || "photo"}`, "data-open": "" } : {})}
      >
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
  index: number; driftOn: { current: boolean }; woke: boolean; onPhoto: (id: string) => void;
};

function Lane({ id, label, items, ph, h, reduced, index, driftOn, woke, onPhoto }: LaneProps) {
  const view = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [reps, setReps] = useState(3);
  const st = useRef({
    x: 0, v: 0, g: 0, L: 0, resumeAt: 0, down: false, coast: false, focus: false,
    lastX: 0, startX: 0, startY: 0, moved: 0, samples: [] as { t: number; x: number }[],
  });

  // enough copies that the track always covers the viewport: one copy is the loop length
  useLayoutEffect(() => {
    const v = view.current;
    const f = first.current;
    if (!v || !f) return;
    const measure = () => {
      const L = f.getBoundingClientRect().width; // fractional, so the loop seam never jumps
      st.current.L = L;
      setReps(Math.max(2, Math.ceil(v.clientWidth / Math.max(L, 1)) + 1));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(v);
    ro.observe(f);
    return () => ro.disconnect();
  }, [items.length, ph, woke]); // woke: the first copy only exists once the lanes have been unrolled

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
          const go = driftOn.current && !reduced && !document.hidden && !k.focus && now >= k.resumeAt; // hovering does not pause it
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
    k.lastX = k.startX = e.clientX;
    k.startY = e.clientY;
    k.moved = 0;
    k.samples = [{ t: e.timeStamp, x: e.clientX }];
  };
  const move = (e: RPointerEvent) => {
    const k = st.current;
    if (!k.down) return;
    k.x += e.clientX - k.lastX;
    k.lastX = e.clientX;
    k.moved = Math.max(k.moved, Math.abs(e.clientX - k.startX), Math.abs(e.clientY - k.startY));
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
    if (k.moved < CLICK_PX) {
      // pointer capture retargets the click to the lane, so find the picture under the pointer
      const id = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-id]")?.dataset.id;
      if (id) onPhoto(id);
    }
  };
  const cancel = () => {
    const k = st.current;
    k.down = false;
    k.resumeAt = performance.now() + RESUME_MS;
  };
  const key = (e: ReactKeyboardEvent) => {
    const t = e.target as HTMLElement;
    if ((e.key === "Enter" || e.key === " ") && t.matches("[data-open]")) {
      e.preventDefault();
      const id = t.closest<HTMLElement>("[data-id]")?.dataset.id;
      if (id) onPhoto(id);
    }
  };
  // keyboard focus: bring the picture into view (overflow:hidden would scroll the lane) and hold the drift
  const focusIn = (e: ReactFocusEvent<HTMLDivElement>) => {
    const k = st.current;
    const t = e.target as HTMLElement;
    k.focus = true;
    if (!t.matches(":focus-visible")) return;
    e.currentTarget.scrollLeft = 0;
    const v = e.currentTarget.getBoundingClientRect();
    const r = t.getBoundingClientRect();
    if (r.left < v.left) k.x += v.left - r.left;
    else if (r.right > v.right) k.x -= r.right - v.right;
  };

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
          onKeyDown={key}
          onFocus={focusIn}
          onBlur={() => { st.current.focus = false; }}
        >
          <div className="sc-track" ref={track}>
            {woke && Array.from({ length: reps }, (_, c) => (
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

// how far the paper is revealed right now (0 rolled up .. 1 out), read from the running animation's effect
const revealed = (clip: HTMLElement) => {
  const m = /inset\([^ ]+ ([\d.]+)%/.exec(getComputedStyle(clip).clipPath);
  return m ? 1 - Number(m[1]) / 100 : 1;
};

type Props = {
  open: boolean; reduced: boolean; onToggle: () => void; onPhoto: (id: string) => void; onAll: () => void;
  from: "icon" | "photos"; onBack: () => void; // from Photos: a "back" button replaces the close button
};

const el_focus = (root: HTMLElement | null, sel: string) => root?.querySelector<HTMLElement>(sel)?.focus({ preventScroll: true });

export default function Scrolls({ open, reduced, onToggle, onPhoto, onAll, from, onBack }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const anims = useRef<Animation[][]>([]); // per lane: [paper reveal, roller]
  const fade = useRef<Animation | undefined>(undefined);
  const driftOn = useRef(false); // true once the roll-out has finished
  const run = useRef(0); // latest run wins; a stale run's completion does nothing
  const [woke, setWoke] = useState(open); // the photos only render once they have been unrolled
  if (open && !woke) setWoke(true);

  // left edge clears the two icon columns on desktop; lanes fill the rest
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const edge = el.parentElement?.querySelector<HTMLElement>("#dk-icon-messages"); // right-most icon of column 2
      el.style.left = window.innerWidth < PHONE ? "0px" : `${edge ? Math.round(edge.getBoundingClientRect().right) + 16 : 0}px`;
      setBox({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // WAAPI, so the roll stays smooth while the page is busy. Toggling mid-roll continues from where it is.
  // Rolled up is 0: nothing shows (the css then hides the scroll). `instant` snaps to the end state (mount).
  const roll = (instant: boolean) => {
    const el = root.current;
    if (!el) return;
    const id = ++run.current;
    driftOn.current = false;
    // random start order: lane i waits for its place in a shuffle, plus a growing uneven gap
    const rank = [...Array(story.lanes.length).keys()].sort(() => Math.random() - 0.5);
    const wait: number[] = [];
    let t = 0;
    rank.forEach((lane) => { wait[lane] = t; t += STAGGER_MIN + Math.random() * (STAGGER_MAX - STAGGER_MIN); });
    const done: Animation[] = [];
    el.querySelectorAll<HTMLElement>(".sc-lane").forEach((lane, i) => {
      const clip = lane.querySelector<HTMLElement>(".sc-clip");
      const paper = lane.querySelector<HTMLElement>(".sc-paper");
      const roller = lane.querySelector<HTMLElement>(".sc-roll");
      if (!clip || !paper || !roller) return;
      const prev = anims.current[i];
      let next: Animation[];
      if (reduced) {
        const to = open ? 1 : 0;
        const from = prev && !instant ? Number(getComputedStyle(paper).opacity) : to;
        next = [paper.animate([{ opacity: from }, { opacity: to }], { duration: instant ? 0 : FADE_MS, easing: "ease-out", fill: "both" })];
      } else {
        const to = open ? 1 : 0;
        const from = prev && !instant ? revealed(clip) : to;
        const opts: KeyframeAnimationOptions = {
          duration: instant ? 0 : Math.max(1, (open ? OPEN_MS : CLOSE_MS) * Math.abs(to - from)),
          delay: open && !instant && from < 0.001 ? wait[i] : 0,
          easing: open ? OPEN_EASE : CLOSE_EASE,
          fill: "both",
        };
        const reveal = (p: number) => ({ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` });
        const travel = (p: number) => ({ transform: `translateX(${p * 100}%)` });
        next = [
          clip.animate([reveal(from), reveal(to)], opts),
          roller.animate([travel(from), travel(to)], opts),
        ];
      }
      prev?.forEach((a) => a.cancel());
      anims.current[i] = next;
      done.push(...next);
    });
    Promise.all(done.map((a) => a.finished)).then(
      () => { if (id === run.current && open) driftOn.current = true; },
      () => {},
    );
  };

  const first = useRef(true);
  useLayoutEffect(() => {
    roll(first.current);
    // keyboard: unrolling moves focus to the back or close button, rolling up back to what unrolled them (the scroll hides with the button)
    if (!first.current) {
      if (open) el_focus(root.current, ".sc-back, .sc-close");
      else document.getElementById(from === "photos" ? "ph-unroll" : "dk-icon-timeline")?.focus({ preventScroll: true });
    }
    first.current = false;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const n = story.lanes.length;
  const fit = Math.floor((box.h - HEAD - PAD * 2 - GAP * (n - 1)) / n);
  const laneH = Math.max(fit, MIN_PIC + CHROME);
  const ph = laneH - CHROME;

  return (
    <div className={`sc${reduced ? " sc-reduced" : ""}${open ? "" : " sc-rolled"}`} ref={root} style={{ "--sc-close": `${reduced ? FADE_MS : CLOSE_MS}ms` } as CSSProperties}>
      <div className="sc-head">
        {from === "photos" && <button type="button" className="sc-back" onClick={onBack}>← photos</button>}
        <Tooltip text="show all photos">{(t) => (
        <button type="button" className="sc-all" onClick={onAll} aria-label="show all photos" {...t}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
            <path d={appById("photos").glyph} />
          </svg>
        </button>
        )}</Tooltip>
        {from === "icon" && <button type="button" className="sc-close" onClick={onToggle} aria-label="roll up photos">×</button>}
      </div>
      <div className="sc-lanes" inert={!open}>
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
            woke={woke}
            onPhoto={onPhoto}
          />
        ))}
      </div>
    </div>
  );
}
