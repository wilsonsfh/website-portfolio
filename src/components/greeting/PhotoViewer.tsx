import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent } from "react";
import { fmtDate, type Item } from "./photosData";

const SLIDE_MS = 280;
const SLIDE_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const FADE_MS = 150;
const DECAY = 0.998; // per ms; momentum travel = v/1000 * DECAY/(1-DECAY)
const COMMIT_FRAC = 0.25; // of the stage width
const COMMIT_V = 0.11; // px/ms
const DISMISS_PX = 120;
const RUBBER = 0.35;
const ZMAX = 4;
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

// cubic-bezier(0.23, 1, 0.32, 1) as a function, for the filmstrip tween (rAF, so the strip stays readable and interruptible)
const bez = (x1: number, y1: number, x2: number, y2: number) => (t: number) => {
  let lo = 0, hi = 1, s = t;
  for (let i = 0; i < 24; i++) {
    const x = 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s;
    if (Math.abs(x - t) < 1e-4) break;
    if (x < t) lo = s; else hi = s;
    s = (lo + hi) / 2;
  }
  return 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s;
};
const stripEase = bez(0.23, 1, 0.32, 1);

type View = { z: number; x: number; y: number };
const FLAT: View = { z: 1, x: 0, y: 0 };

type Props = {
  items: Item[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  backLabel: string; // "grid", or "timeline" when the photo was opened from the scrolls
  onLibrary?: () => void; // opened from the scrolls: also a way into the library grid, keeping the way back
  reduced: boolean;
  compact: boolean;
};

// ---------- filmstrip ----------

function Strip({ items, idx, shown, compact, reduced, tween, onGo }: {
  items: Item[]; idx: number; shown: boolean; compact: boolean; reduced: boolean;
  tween: { current: boolean }; // next idx change came from a click or swipe: recentre with the 240ms tween
  onGo: (i: number) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const reel = useRef<HTMLDivElement>(null);
  const off = useRef(0);
  const centres = useRef<number[]>([]);
  const sw = useRef(0);
  const raf = useRef(0);
  const active = useRef(false); // dragging, wheeling or coasting: the strip owns the position
  const lastLive = useRef(-1);
  const wheelT = useRef(0);
  const drag = useRef<{ x0: number; off0: number; moved: boolean; samples: { t: number; x: number }[] } | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const idxRef = useRef(idx);
  idxRef.current = idx;

  const measure = () => {
    const r = reel.current;
    if (!r || !strip.current) return;
    sw.current = strip.current.clientWidth;
    centres.current = Array.from(r.children, (c) => (c as HTMLElement).offsetLeft + (c as HTMLElement).offsetWidth / 2);
  };
  const offFor = (i: number) => sw.current / 2 - (centres.current[i] ?? 0);
  const lo = () => offFor(items.length - 1);
  const hi = () => offFor(0);
  const write = (o: number) => {
    off.current = o;
    if (reel.current) reel.current.style.transform = `translate3d(${o}px,0,0)`;
  };
  const nearest = (o: number) => {
    const c = sw.current / 2 - o;
    let best = 0, d = Infinity;
    centres.current.forEach((x, i) => { const k = Math.abs(x - c); if (k < d) { d = k; best = i; } });
    return best;
  };
  const live = () => {
    const i = nearest(off.current);
    if (i !== lastLive.current) { lastLive.current = i; onGo(i); }
  };
  const run = (to: number, ms: number, follow: boolean) => {
    cancelAnimationFrame(raf.current);
    const from = off.current, t0 = performance.now();
    if (reduced || ms === 0) { write(to); if (follow) live(); if (follow) finish(); return; }
    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      write(from + (to - from) * stripEase(p));
      if (follow) live();
      if (p < 1) raf.current = requestAnimationFrame(frame);
      else if (follow) finish();
    };
    raf.current = requestAnimationFrame(frame);
  };
  const finish = () => { active.current = false; setScrubbing(false); };
  const snap = (ms: number) => run(offFor(nearest(off.current)), ms, true);

  // the current thumb sits in the centre: instantly for keys, a 240ms tween after a click or swipe
  useLayoutEffect(() => {
    if (!shown) return;
    measure();
    if (active.current) return;
    const to = offFor(idx);
    if (tween.current && !reduced) run(to, 240, false);
    else { cancelAnimationFrame(raf.current); write(to); }
    tween.current = false;
    lastLive.current = idx;
  }, [idx, shown, compact, scrubbing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { measure(); if (!active.current) write(offFor(idxRef.current)); });
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(raf.current); clearTimeout(wheelT.current); };
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  // trackpad / wheel scrolls the strip; the thumb under the centre becomes current, then it snaps
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const on = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimationFrame(raf.current);
      active.current = true;
      setScrubbing(true);
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      write(clamp(off.current - d, lo(), hi()));
      live();
      clearTimeout(wheelT.current);
      wheelT.current = window.setTimeout(() => snap(240), 140);
    };
    el.addEventListener("wheel", on, { passive: false });
    return () => el.removeEventListener("wheel", on);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const down = (e: RPointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    cancelAnimationFrame(raf.current);
    clearTimeout(wheelT.current);
    drag.current = { x0: e.clientX, off0: off.current, moved: false, samples: [{ t: e.timeStamp, x: e.clientX }] };
  };
  const move = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    if (!d.moved) {
      if (Math.abs(dx) < 4) return;
      d.moved = true;
      active.current = true;
      setScrubbing(true);
    }
    write(clamp(d.off0 + dx, lo(), hi()));
    live();
    d.samples.push({ t: e.timeStamp, x: e.clientX });
    while (d.samples.length > 2 && e.timeStamp - d.samples[0].t > 100) d.samples.shift();
  };
  const up = (e: RPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-t]");
      if (hit) { tween.current = true; onGo(Number(hit.dataset.t)); }
      return;
    }
    const a = d.samples[0];
    const dt = e.timeStamp - a.t;
    const fresh = e.timeStamp - d.samples[d.samples.length - 1].t < 80;
    const v = fresh && dt > 0 ? ((e.clientX - a.x) / dt) * 1000 : 0; // px/s
    const proj = clamp(off.current + (v / 1000) * (DECAY / (1 - DECAY)), lo(), hi());
    run(offFor(nearest(proj)), 360, true);
  };
  const cancel = () => {
    if (!drag.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    if (moved) snap(240);
  };

  return (
    <div
      className={`pv-strip pv-chrome${scrubbing ? " scrubbing" : ""}`}
      ref={strip}
      aria-hidden="true"
      hidden={!shown}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
    >
      <div className="pv-reel" ref={reel}>
        {items.map((it, i) => (
          <div key={it.id} data-t={i} className={`pv-thumb${i === idx ? " cur" : ""}`} style={{ width: `calc(var(--pv-th) * ${it.w / it.h})` }}>
            <img src={it.type === "video" ? it.poster ?? "" : it.src ?? ""} alt="" loading="lazy" decoding="async" draggable={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- viewer ----------

export default function PhotoViewer({ items, index, onIndex, onClose, backLabel, onLibrary, reduced, compact }: Props) {
  const pv = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const lift = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);
  const trackX = useRef(0);
  const stripTween = useRef(false);
  const fade = useRef(false);
  const chromeT = useRef(0);
  const smoothT = useRef(0);
  const lastType = useRef("mouse");
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gest = useRef({
    mode: null as null | "x" | "y" | "pan" | "pinch" | "none",
    x0: 0, y0: 0, base: 0, moved: false, view0: FLAT, d0: 1, mid0: { x: 0, y: 0 },
    samples: [] as { t: number; x: number; y: number }[],
    tap: { t: 0, x: 0, y: 0 },
  });
  const viewRef = useRef<View>(FLAT);
  const [view, setView] = useState<View>(FLAT);
  const [smooth, setSmooth] = useState(false);
  const [info, setInfo] = useState(false);
  const [tapHidden, setTapHidden] = useState(false); // phone: a tap hides the chrome
  const [bare, setBare] = useState(false); // fullscreen fallback: chrome hidden
  const [fs, setFs] = useState(false);
  const [strip, setStrip] = useState(true);
  const coarse = compact || (typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches);

  const idx = index;
  const last = items.length - 1;
  const item = items[idx];
  const isVideo = item.type === "video";
  const chromeOff = bare || tapHidden;

  // ----- zoom -----
  const applyView = (v: View) => {
    const el = stage.current;
    const z = clamp(v.z, 1, ZMAX);
    if (!el || z <= 1.001) { viewRef.current = FLAT; setView(FLAT); return; }
    const lx = (el.clientWidth * (z - 1)) / 2, ly = (el.clientHeight * (z - 1)) / 2;
    const n = { z, x: clamp(v.x, -lx, lx), y: clamp(v.y, -ly, ly) };
    viewRef.current = n;
    setView(n);
  };
  // zoom about a point given relative to the stage centre
  const zoomAt = (z2: number, cx = 0, cy = 0) => {
    if (isVideo) return;
    const v = viewRef.current;
    const z = clamp(z2, 1, ZMAX);
    const k = z / v.z;
    applyView({ z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
  };
  const smoothly = () => {
    if (reduced) return;
    setSmooth(true);
    clearTimeout(smoothT.current);
    smoothT.current = window.setTimeout(() => setSmooth(false), 220);
  };
  const rel = (e: { clientX: number; clientY: number }) => {
    const r = stage.current!.getBoundingClientRect();
    return { x: e.clientX - (r.left + r.width / 2), y: e.clientY - (r.top + r.height / 2) };
  };
  const toggleZoom = (p: { x: number; y: number }) => { smoothly(); zoomAt(viewRef.current.z > 1 ? 1 : 2, p.x, p.y); };

  // ----- navigation -----
  const resetTrack = () => {
    anim.current?.cancel();
    anim.current = null;
    trackX.current = 0;
    if (track.current) track.current.style.transform = "";
  };
  const idxRef = useRef(idx);
  idxRef.current = idx;
  const go = (i: number, tween = false) => {
    const n = clamp(i, 0, last);
    if (n === idxRef.current) return;
    resetTrack();
    stripTween.current = tween;
    onIndex(n);
  };

  // a new picture starts flat, with a clean track; reduced motion fades it in
  useLayoutEffect(() => {
    resetTrack();
    applyView(FLAT);
    if (reduced && fade.current) track.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: "ease-out" });
    fade.current = false;
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  // neighbours are rendered as panes already; decode two either side as well
  useEffect(() => {
    for (const k of [-2, -1, 1, 2]) {
      const it = items[idx + k];
      if (it) { const im = new Image(); im.src = it.type === "video" ? it.poster ?? "" : it.src ?? ""; }
    }
  }, [idx, items]);

  const commit = (dir: -1 | 1) => {
    if (reduced) { fade.current = true; stripTween.current = true; onIndex(idx + dir); return; }
    const W = stage.current!.clientWidth;
    const from = trackX.current, to = -dir * W;
    const a = track.current!.animate(
      [{ transform: `translate3d(${from}px,0,0)` }, { transform: `translate3d(${to}px,0,0)` }],
      { duration: SLIDE_MS, easing: SLIDE_EASE, fill: "forwards" },
    );
    anim.current = a;
    trackX.current = to;
    stripTween.current = true;
    a.finished.then(() => { if (anim.current === a) onIndex(idx + dir); }, () => {});
  };
  const springBack = () => {
    if (reduced || !track.current) return;
    const a = track.current.animate(
      [{ transform: `translate3d(${trackX.current}px,0,0)` }, { transform: "translate3d(0,0,0)" }],
      { duration: SLIDE_MS, easing: SLIDE_EASE, fill: "forwards" },
    );
    anim.current = a;
    trackX.current = 0;
    a.finished.then(() => { if (anim.current === a) resetTrack(); }, () => {});
  };

  // ----- fullscreen -----
  useEffect(() => {
    const on = () => setFs(document.fullscreenElement === pv.current);
    document.addEventListener("fullscreenchange", on);
    return () => { document.removeEventListener("fullscreenchange", on); if (document.fullscreenElement === pv.current) document.exitFullscreen?.(); };
  }, []);
  const toggleFs = () => {
    const el = pv.current;
    if (!el) return;
    if (document.fullscreenElement) { void document.exitFullscreen(); return; }
    if (typeof el.requestFullscreen === "function") el.requestFullscreen().catch(() => setBare((b) => !b));
    else setBare((b) => !b);
  };

  useEffect(() => { pv.current?.focus({ preventScroll: true }); }, []);

  // ctrl/cmd + wheel and trackpad pinch (a ctrl wheel) zoom at the pointer; a plain wheel pans when zoomed
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const on = (e: WheelEvent) => {
      if (isVideo) return;
      const v = viewRef.current;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const p = rel(e);
        zoomAt(v.z * Math.exp(-e.deltaY * 0.01), p.x, p.y);
      } else if (v.z > 1) {
        e.preventDefault();
        applyView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
      }
    };
    el.addEventListener("wheel", on, { passive: false });
    return () => el.removeEventListener("wheel", on);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- pointer gestures on the stage -----
  const interrupted = () => {
    // grabbing mid-slide: take the track from where it visibly is
    if (!anim.current || !track.current) return 0;
    const x = new DOMMatrix(getComputedStyle(track.current).transform).m41;
    resetTrack();
    track.current.style.transform = `translate3d(${x}px,0,0)`;
    trackX.current = x;
    return x;
  };
  const setChromeFade = (p: number) => {
    pv.current?.querySelectorAll<HTMLElement>(".pv-chrome").forEach((c) => { c.style.opacity = p ? String(1 - p) : ""; });
    if (bg.current) bg.current.style.opacity = p ? String(1 - p) : "";
  };

  const down = (e: RPointerEvent) => {
    const t = e.target as HTMLElement;
    lastType.current = e.pointerType;
    if (t.closest(".pv-arrow") || t.closest("video") || (e.pointerType === "mouse" && e.button !== 0)) return;
    stage.current!.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gest.current;
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      g.mode = "pinch";
      g.view0 = viewRef.current;
      g.d0 = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      g.mid0 = rel({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      resetTrack();
      return;
    }
    g.base = interrupted();
    g.x0 = e.clientX; g.y0 = e.clientY;
    g.moved = false;
    g.view0 = viewRef.current;
    g.mode = viewRef.current.z > 1 ? "pan" : null;
    g.samples = [{ t: e.timeStamp, x: e.clientX, y: e.clientY }];
  };

  const move = (e: RPointerEvent) => {
    const g = gest.current;
    if (!ptrs.current.has(e.pointerId)) {
      if (e.pointerType === "mouse" && stage.current) {
        const r = stage.current.getBoundingClientRect();
        stage.current.dataset.side = e.clientX - r.left < r.width / 2 ? "l" : "r";
      }
      return;
    }
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.mode === "pinch") {
      const [a, b] = [...ptrs.current.values()];
      const z = clamp(g.view0.z * (Math.hypot(a.x - b.x, a.y - b.y) / g.d0), 1, ZMAX);
      const m = rel({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      const k = z / g.view0.z;
      applyView({ z, x: m.x - (g.mid0.x - g.view0.x) * k, y: m.y - (g.mid0.y - g.view0.y) * k });
      return;
    }
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    g.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    while (g.samples.length > 2 && e.timeStamp - g.samples[0].t > 100) g.samples.shift();
    if (g.mode === null) {
      if (Math.hypot(dx, dy) < 8) return;
      g.moved = true;
      g.mode = Math.abs(dx) >= Math.abs(dy) ? "x" : dy > 0 && coarse ? "y" : "none";
    }
    if (g.mode === "pan") {
      if (Math.hypot(dx, dy) > 4) g.moved = true;
      applyView({ ...g.view0, x: g.view0.x + dx, y: g.view0.y + dy });
    } else if (g.mode === "x" && !reduced) {
      let x = g.base + dx;
      if ((idx === 0 && x > 0) || (idx === last && x < 0)) x *= RUBBER; // rubber-band at the ends
      trackX.current = x;
      track.current!.style.transform = `translate3d(${x}px,0,0)`;
    } else if (g.mode === "y" && !reduced) {
      const d = Math.max(0, dy);
      const p = Math.min(d / 300, 1);
      lift.current!.style.transform = `translate3d(0,${d}px,0) scale(${1 - 0.15 * p})`;
      setChromeFade(p);
    }
  };

  const end = (e: RPointerEvent) => {
    const g = gest.current;
    if (!ptrs.current.delete(e.pointerId)) return;
    const cancelled = e.type === "pointercancel";
    if (g.mode === "pinch") {
      if (ptrs.current.size === 1) {
        const [p] = [...ptrs.current.values()];
        g.mode = "pan"; g.x0 = p.x; g.y0 = p.y; g.view0 = viewRef.current; g.moved = true;
        g.samples = [{ t: e.timeStamp, x: p.x, y: p.y }];
      }
      return;
    }
    const W = stage.current!.clientWidth;
    const a = g.samples[0];
    const dt = e.timeStamp - a.t;
    const fresh = e.timeStamp - g.samples[g.samples.length - 1].t < 80;
    const vx = fresh && dt > 0 ? (e.clientX - a.x) / dt : 0;
    const vy = fresh && dt > 0 ? (e.clientY - a.y) / dt : 0;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if (g.mode === "x") {
      const dir = cancelled ? 0 : Math.abs(dx) > W * COMMIT_FRAC ? -Math.sign(dx) : Math.abs(vx) > COMMIT_V ? -Math.sign(vx) : 0;
      const to = idx + dir;
      if (dir && to >= 0 && to <= last) commit(dir as -1 | 1);
      else springBack();
    } else if (g.mode === "y") {
      if (!cancelled && (dy > DISMISS_PX || vy > COMMIT_V)) {
        const a2 = pv.current!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: "ease-out", fill: "forwards" });
        a2.finished.then(onClose, onClose);
      } else if (!reduced) {
        const r = lift.current!.animate([{ transform: lift.current!.style.transform }, { transform: "none" }], { duration: SLIDE_MS, easing: SLIDE_EASE });
        lift.current!.style.transform = "";
        r.finished.then(() => setChromeFade(0), () => setChromeFade(0));
        pv.current?.querySelectorAll<HTMLElement>(".pv-chrome").forEach((c) => c.animate([{ opacity: c.style.opacity }, { opacity: 1 }], { duration: SLIDE_MS, easing: SLIDE_EASE }));
        bg.current?.animate([{ opacity: bg.current.style.opacity }, { opacity: 1 }], { duration: SLIDE_MS, easing: SLIDE_EASE });
      }
    } else if ((g.mode === null || (g.mode === "pan" && !g.moved)) && e.pointerType !== "mouse" && !cancelled) {
      // a tap: two in quick succession zoom, one toggles the chrome
      const tp = g.tap;
      if (e.timeStamp - tp.t < 300 && Math.hypot(e.clientX - tp.x, e.clientY - tp.y) < 30) {
        clearTimeout(chromeT.current);
        tp.t = 0;
        toggleZoom(rel(e));
      } else {
        g.tap = { t: e.timeStamp, x: e.clientX, y: e.clientY };
        clearTimeout(chromeT.current);
        chromeT.current = window.setTimeout(() => setTapHidden((h) => !h), 260);
      }
    }
    g.mode = null;
    if (viewRef.current.z <= 1.001) applyView(FLAT);
  };

  useEffect(() => () => { clearTimeout(chromeT.current); clearTimeout(smoothT.current); }, []);

  const onKeyDown = (e: RKeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.target as HTMLElement).tagName === "INPUT" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
    const k = e.key;
    if (k === "ArrowRight") go(idx + 1);
    else if (k === "ArrowLeft") go(idx - 1);
    else if (k === "Home") go(0);
    else if (k === "End") go(last);
    else if (k === "=" || k === "+") zoomAt(viewRef.current.z + 0.5);
    else if (k === "-" || k === "_") zoomAt(viewRef.current.z - 0.5);
    else if (k === "0") zoomAt(1);
    else if (k === "f" || k === "F") toggleFs();
    else if (k === "i" || k === "I") setInfo((v) => !v);
    else if (k === "Escape") { if (bare) setBare(false); else onClose(); }
    else return;
    e.preventDefault();
    e.stopPropagation(); // handled keys must not reach other listeners
  };

  const panes = [-1, 0, 1].map((k) => ({ k, it: items[idx + k] })).filter((p) => p.it);
  const cur = panes.find((p) => p.k === 0)!;
  const mediaStyle = { transform: `translate3d(${view.x}px,${view.y}px,0) scale(${view.z})` };

  return (
    <div className={`pv${chromeOff ? " off" : ""}${compact ? " compact" : ""}`} ref={pv} tabIndex={-1} role="group" aria-label="photo viewer" onKeyDown={onKeyDown}>
      <div className="pv-bg" ref={bg} />
      <header className="pv-head pv-chrome">
        <div className="pv-left">
          <button type="button" className="pv-btn" onClick={onClose}>← {backLabel}</button>
          {onLibrary && <button type="button" className="pv-btn" onClick={onLibrary}>library</button>}
          <button type="button" className="pv-btn pv-ico" aria-label="full screen" aria-pressed={fs || bare} onClick={toggleFs}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {fs || bare ? <path d="M9 4v5H4 M15 4v5h5 M9 20v-5H4 M15 20v-5h5" /> : <path d="M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5" />}
            </svg>
          </button>
          <div className="pv-zoom" role="group" aria-label="zoom">
            <button type="button" className="pv-btn pv-ico" aria-label="zoom out" disabled={isVideo || view.z <= 1} onClick={() => zoomAt(view.z - 0.5)}>−</button>
            <input type="range" min={1} max={ZMAX} step={0.05} value={view.z} disabled={isVideo} aria-label="zoom level" onChange={(e) => zoomAt(Number(e.target.value))} />
            <button type="button" className="pv-btn pv-ico" aria-label="zoom in" disabled={isVideo || view.z >= ZMAX} onClick={() => zoomAt(view.z + 0.5)}>+</button>
          </div>
        </div>
        <div className="pv-titles">
          <p className="pv-t1">{item.caption}</p>
          <p className="pv-t2">{fmtDate(item.date)} · {idx + 1} of {items.length}</p>
        </div>
        <div className="pv-right">
          <button type="button" className="pv-btn" aria-pressed={info} onClick={() => setInfo((v) => !v)}>info</button>
          <button type="button" className="pv-btn pv-stripbtn" aria-pressed={strip} onClick={() => setStrip((v) => !v)}>strip</button>
        </div>
      </header>

      <div
        className="pv-stage"
        ref={stage}
        data-zoomed={view.z > 1 ? "" : undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onDoubleClick={(e) => { if (lastType.current === "mouse" && !isVideo && !(e.target as HTMLElement).closest(".pv-arrow")) toggleZoom(rel(e)); }}
      >
        <div className="pv-lift" ref={lift}>
          <div className="pv-track" ref={track}>
            {panes.map(({ k, it }) => (
              <div key={it.id} className="pv-pane" style={{ left: `${k * 100}%` }} aria-hidden={k !== 0 || undefined}>
                {k === 0 && it.type === "video" ? (
                  <video className="pv-media" src={it.src ?? undefined} poster={it.poster ?? undefined} controls playsInline preload="metadata" aria-label={it.caption} />
                ) : (
                  <div className={`pv-media${k === 0 && smooth ? " smooth" : ""}`} style={k === 0 ? mediaStyle : undefined}>
                    <img src={it.type === "video" ? it.poster ?? "" : it.src ?? ""} alt={k === 0 ? it.caption : ""} decoding="async" draggable={false} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {idx > 0 && <button type="button" className="pv-arrow pv-l" aria-label="previous photo" onClick={() => go(idx - 1, true)}>‹</button>}
        {idx < last && <button type="button" className="pv-arrow pv-r" aria-label="next photo" onClick={() => go(idx + 1, true)}>›</button>}
        {info && (
          <dl className="pv-info">
            <dt>album</dt><dd>{cur.it.lane}</dd>
            <dt>date</dt><dd>{fmtDate(cur.it.date)}</dd>
            <dt>caption</dt><dd>{cur.it.caption}</dd>
          </dl>
        )}
      </div>

      <Strip items={items} idx={idx} shown={strip || compact} compact={compact} reduced={reduced} tween={stripTween} onGo={(i) => go(i, stripTween.current)} />
    </div>
  );
}
