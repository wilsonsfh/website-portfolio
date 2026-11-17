import { useLayoutEffect, useRef, useState } from "react";
import story from "../../data/story.json";
import "./scrolls.css";

type Item = { id: string; lane: string; date: string; caption: string; type: string; src: string | null; poster: string | null; w: number; h: number };

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

// "2024-07-08" or "2024-07" -> "jul 2024"
const fmt = (d: string) => {
  const [y, m] = d.split("-");
  return `${MONTHS[Number(m) - 1] ?? ""} ${y}`.trim();
};

const byDate = (a: Item, b: Item) => a.date.localeCompare(b.date);

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

type LaneProps = { id: string; label: string; items: Item[]; ph: number; h: number; reduced: boolean };

function Lane({ id, label, items, ph, h, reduced }: LaneProps) {
  const view = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLDivElement>(null);
  const [reps, setReps] = useState(3);

  // enough copies that the track always covers the viewport: one copy is the loop length
  useLayoutEffect(() => {
    const v = view.current;
    const f = first.current;
    if (!v || !f) return;
    const measure = () => setReps(Math.max(2, Math.ceil(v.clientWidth / Math.max(f.offsetWidth, 1)) + 1));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(v);
    ro.observe(f);
    return () => ro.disconnect();
  }, [items.length, ph]);

  return (
    <section className="sc-lane" aria-label={`${label} photos`} data-lane={id} style={{ height: h }}>
      <div className="sc-clip">
      <div className="sc-paper">
        <i className="sc-band" />
        <div className="sc-view" ref={view}>
          <div className="sc-track">
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

type Props = { open: boolean; reduced: boolean; onClosed: () => void };

export default function Scrolls({ open, reduced, onClosed }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const anims = useRef<Animation[][]>([]); // per lane: [paper reveal, roller]
  const fade = useRef<Animation | undefined>(undefined);
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
      () => { if (id === run.current && !open) onClosed(); },
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
        {story.lanes.map((l) => (
          <Lane
            key={l.id}
            id={l.id}
            label={l.label}
            items={(story.items as Item[]).filter((i) => i.lane === l.id).sort(byDate)}
            ph={ph}
            h={laneH}
            reduced={reduced}
          />
        ))}
      </div>
    </div>
  );
}
