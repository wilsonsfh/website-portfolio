import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Ctx } from "./apps";
import { ALBUMS, ITEMS, fmtDate, fmtMonth, inAlbum, monthKey, type Item } from "./photosData";
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
  useEffect(() => {
    setCur(0);
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [album]);

  const jump = (key: string) => {
    const g = groups.find((x) => x.key === key);
    const head = scroller.current?.querySelector<HTMLElement>(`[data-g="${key}"]`);
    if (!g || !head || !scroller.current) return;
    scroller.current.scrollTop = head.offsetTop;
    setCur(g.start);
  };

  const label = ALBUMS.find((a) => a.id === album)!.label;

  return (
    <div className={`ph${compact ? " compact" : ""}`} ref={root} style={{ "--ph-size": `${SIZES[density]}px` } as CSSProperties}>
      <nav className="ph-side" aria-label="albums">
        {ALBUMS.map((a) => (
          <button key={a.id} type="button" className="ph-album" aria-pressed={a.id === album} onClick={() => setAlbum(a.id)}>
            {a.label}
          </button>
        ))}
      </nav>
      <div className="ph-main">
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
        <div className="ph-scroll" ref={scroller}>
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
                      onClick={() => setCur(i)}
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
    </div>
  );
}
