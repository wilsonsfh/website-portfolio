import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useReducedMotion } from "motion/react";
import type { Ctx } from "./apps";
import { ALBUMS, ITEMS, fmtDate, fmtMonth, inAlbum, monthKey, type Item } from "./photosData";
import PhotoViewer from "./PhotoViewer";
import "./photos.css";

const COMPACT = 640; // window width under which the sidebar becomes a segmented control
const SIZES = [72, 112, 168]; // tile size per density, px

type Group = { key: string; start: number; items: Item[] };

export default function PhotosApp({ ctx }: { ctx: Ctx }) {
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [album, setAlbum] = useState("library");
  const [square, setSquare] = useState(true);
  const [density, setDensity] = useState(1);
  const [cur, setCur] = useState(0);
  const [viewing, setViewing] = useState(false);
  const [fromTl, setFromTl] = useState(false); // the viewer was opened from the scrolls, so "back" returns there
  const reduce = !!useReducedMotion();
  const compact = width < COMPACT;

  const items = useMemo(() => ITEMS.filter((i) => inAlbum(i, album)), [album]);
  const groups = useMemo(() => {
    const gs: Group[] = [];
    items.forEach((it, i) => {
      const key = monthKey(it.date);
      const last = gs[gs.length - 1];
      if (last && last.key === key) last.items.push(it);
      else gs.push({ key, start: i, items: [it] });
    });
    return gs;
  }, [items]);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // a new album starts at the top
  const pending = useRef<number | null>(null); // a requested photo waiting for the library album to load
  useEffect(() => {
    setCur(pending.current ?? 0);
    pending.current = null;
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [album]);

  // the scrolls (or the "all photos" button) ask for a photo in the viewer, or for the grid
  useEffect(() => {
    const req = ctx.photoReq;
    if (!req) return;
    const i = req.id ? ITEMS.findIndex((x) => x.id === req.id) : -1;
    if (i < 0) { setViewing(false); return; }
    if (album === "library") setCur(i); else { pending.current = i; setAlbum("library"); }
    setViewing(true);
    setFromTl(true);
  }, [ctx.photoReq]); // eslint-disable-line react-hooks/exhaustive-deps

  const jump = (key: string) => {
    const g = groups.find((x) => x.key === key);
    const head = scroller.current?.querySelector<HTMLElement>(`[data-g="${key}"]`);
    if (!g || !head || !scroller.current) return;
    scroller.current.scrollTop = head.offsetTop;
    setCur(g.start);
  };

  const tileEl = (i: number) => scroller.current?.querySelector<HTMLElement>(`[data-i="${i}"]`) ?? null;

  // roving focus: move the ring, keep the tile in view (instant, so key repeat never animates)
  const focusTile = (i: number) => {
    setCur(i);
    const el = tileEl(i);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", behavior: "auto" });
  };

  // up/down: the tile in the next row (by layout, so it works for squares and original ratios) nearest in x
  const vertical = (from: number, dir: 1 | -1) => {
    const a = tileEl(from)?.getBoundingClientRect();
    if (!a) return from;
    const cx = a.left + a.width / 2;
    let rowTop: number | null = null;
    let best = from;
    let bestD = Infinity;
    for (let i = from + dir; i >= 0 && i < items.length; i += dir) {
      const r = tileEl(i)?.getBoundingClientRect();
      if (!r) break;
      if (rowTop === null) {
        if (Math.abs(r.top - a.top) < 2) continue; // still the same row
        rowTop = r.top;
      } else if (Math.abs(r.top - rowTop) >= 2) break;
      const d = Math.abs(r.left + r.width / 2 - cx);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || !items.length) return;
    const last = items.length - 1;
    const next =
      e.key === "ArrowRight" ? Math.min(cur + 1, last)
      : e.key === "ArrowLeft" ? Math.max(cur - 1, 0)
      : e.key === "ArrowDown" ? vertical(cur, 1)
      : e.key === "ArrowUp" ? vertical(cur, -1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    focusTile(next);
  };

  // closing the viewer puts the ring back on the tile that was last shown
  const wasViewing = useRef(false);
  useEffect(() => {
    if (wasViewing.current && !viewing) {
      const el = tileEl(cur);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
    wasViewing.current = viewing;
  }, [viewing]); // eslint-disable-line react-hooks/exhaustive-deps

  // a freshly opened window puts the ring on the first tile so the arrow keys work straight away
  useEffect(() => { tileEl(0)?.focus({ preventScroll: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const label = ALBUMS.find((a) => a.id === album)!.label;

  return (
    <div className={`ph${compact ? " compact" : ""}`} ref={root} style={{ "--ph-size": `${SIZES[density]}px` } as CSSProperties}>
      <nav className="ph-side" aria-label="albums" inert={viewing}>
        {ALBUMS.map((a) => (
          <button key={a.id} type="button" className="ph-album" aria-pressed={a.id === album} onClick={() => setAlbum(a.id)}>
            {a.label}
          </button>
        ))}
      </nav>
      <div className="ph-main" inert={viewing}>
        <div className="ph-bar">
          <h2 className="ph-title">{label}<span>{items.length} {items.length === 1 ? "item" : "items"}</span></h2>
          <label className="ph-field">
            <span className="sr-only">jump to month</span>
            <select value="" onChange={(e) => jump(e.target.value)}>
              <option value="" disabled>jump to</option>
              {groups.map((g) => <option key={g.key} value={g.key}>{fmtMonth(g.key === "undated" ? null : g.key)}</option>)}
            </select>
          </label>
          <div className="ph-seg" role="group" aria-label="tile shape">
            <button type="button" aria-pressed={square} onClick={() => setSquare(true)}>square</button>
            <button type="button" aria-pressed={!square} onClick={() => setSquare(false)}>original</button>
          </div>
          <label className="ph-field ph-size">
            <span className="sr-only">tile size</span>
            <input type="range" min={0} max={2} step={1} value={density} onChange={(e) => setDensity(Number(e.target.value))} />
          </label>
          <button type="button" className="ph-btn" onClick={ctx.unroll}>unroll</button>
        </div>
        <div className="ph-scroll" ref={scroller} onKeyDown={onKeyDown}>
          {groups.map((g) => (
            <section key={g.key} className="ph-group">
              <h3 className="ph-head" data-g={g.key}>{fmtMonth(g.key === "undated" ? null : g.key)}</h3>
              <div className={`ph-grid${square ? " sq" : " orig"}`}>
                {g.items.map((it, j) => {
                  const i = g.start + j;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className="ph-tile"
                      data-i={i}
                      tabIndex={i === cur ? 0 : -1}
                      aria-label={`${it.caption}, ${fmtDate(it.date)}${it.type === "video" ? ", video" : ""}`}
                      style={{ "--ar": it.w / it.h } as CSSProperties}
                      onClick={() => { setCur(i); setViewing(true); }}
                    >
                      <img src={it.type === "video" ? it.poster ?? "" : it.src ?? ""} alt="" loading="lazy" decoding="async" draggable={false} />
                      {it.type === "video" && <span className="ph-play" aria-hidden="true">▶</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {!items.length && <p className="ph-empty">nothing here yet</p>}
        </div>
      </div>
      {viewing && items[cur] && (
        <PhotoViewer
          items={items} index={cur} onIndex={setCur} reduced={reduce} compact={compact}
          backLabel={fromTl ? "timeline" : "grid"}
          onClose={() => (fromTl ? ctx.toTimeline() : setViewing(false))}
        />
      )}
    </div>
  );
}
