import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Tooltip from "./Tooltip";
import Scrolls from "./Scrolls";
import Assistant from "./Assistant";
import Wallpaper from "./Wallpaper";
import Window, { BAR, MIN_W, MIN_H, clamp } from "./Window";
import { APPS, appById, type AppId, type Ctx } from "./apps";
import { getSoundOn, setSoundOn } from "./sound";

const time = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

function useClock() {
  const [t, setT] = useState(time);
  useEffect(() => {
    const id = setInterval(() => setT(time()), 10000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function useViewport() {
  // w: viewport width (matches the css breakpoint), cw: width without a classic scrollbar (what the section really is)
  const read = () => ({ w: window.innerWidth, cw: document.documentElement.clientWidth, h: window.innerHeight });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const on = () => setVp(read());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return vp;
}

type Win = { id: AppId; x: number; y: number; z: number; focus: boolean; w?: number; h?: number; max?: boolean; min?: boolean }; // w/h: set once the visitor resizes
const PHONE = 640;
const MAX_INSET = 8; // gap around a maximized window

const size = (id: AppId, vw: number, vh: number) => {
  const a = appById(id);
  return { w: Math.min(a.w, vw - 16), h: Math.min(a.hFrac ? Math.round(vh * a.hFrac) : a.h, vh - BAR - 16) };
};

const sizeOf = (win: Win, vw: number, vh: number) => {
  const d = size(win.id, vw, vh);
  return {
    w: win.w === undefined ? d.w : clamp(win.w, Math.min(MIN_W, vw), vw),
    h: win.h === undefined ? d.h : clamp(win.h, Math.min(MIN_H, vh - BAR), vh - BAR),
  };
};

// a new window cascades gently from roughly the centre
const place = (id: AppId, n: number, z: number, focus: boolean): Win => {
  const cw = document.documentElement.clientWidth;
  const { w } = size(id, cw, window.innerHeight);
  return { id, x: Math.max(150, (cw - w) / 2 + ((n % 5) - 2) * 36), y: BAR + 28 + (n % 5) * 30, z, focus };
};

export default function Desktop({ onPowerOff, focusOnMount }: { onPowerOff: () => void; focusOnMount: boolean }) {
  const clock = useClock();
  const root = useRef<HTMLDivElement>(null);
  const vp = useViewport();
  const [sound, setSound] = useState(getSoundOn);
  const phone = vp.w < PHONE;
  const zRef = useRef(11);
  const [wins, setWins] = useState<Win[]>(() => (window.innerWidth >= PHONE ? [place("about", 0, 11, focusOnMount)] : []));

  const reduce = useReducedMotion();
  const [rollsOpen, setRollsOpen] = useState(false); // false = rolled up and hidden; the timeline icon unrolls them
  const [photoReq, setPhotoReq] = useState<Ctx["photoReq"]>(null);
  const reqN = useRef(0);
  const toggleRolls = () => setRollsOpen(!rollsOpen); // the lanes sit above any open windows

  // a photo on the scrolls (or "all photos") opens the Photos app like its own grid does; the window would sit under the lanes, so they roll up
  const showPhoto = (id: string | null) => {
    setPhotoReq({ id, n: ++reqN.current });
    setRollsOpen(false);
    open("photos");
  };

  const open = (id: AppId) => {
    const z = ++zRef.current;
    dockPt(id); // remember where the entry is before it unmounts
    setWins((ws) =>
      ws.some((w) => w.id === id)
        ? ws.map((w) => (w.id === id ? { ...w, z, min: false } : w))
        : [...ws, place(id, ws.length, z, true)],
    );
  };
  const focus = (id: AppId) => {
    const z = ++zRef.current;
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z } : w)));
  };
  const close = (id: AppId) => {
    setWins((ws) => ws.filter((w) => w.id !== id));
    if (id === "photos") setPhotoReq(null); // a reopened window starts on the grid
    document.getElementById(`dk-icon-${id}`)?.focus({ preventScroll: true });
  };
  const move = (id: AppId, x: number, y: number) =>
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, x, y } : w)));

  // centre of a window's dock entry in viewport coords; the last known one once the entry is gone
  const dockPts = useRef<Partial<Record<AppId, { x: number; y: number }>>>({});
  const dockPt = (id: AppId) => {
    const b = document.getElementById(`dk-dock-${id}`)?.getBoundingClientRect();
    if (b) dockPts.current[id] = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    return dockPts.current[id] ?? null;
  };
  const minimize = (id: AppId, refocus = true) => {
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, min: true } : w)));
    if (refocus) requestAnimationFrame(() => document.getElementById(`dk-dock-${id}`)?.focus({ preventScroll: true }));
  };
  const toggleMax = (id: AppId) => {
    const z = ++zRef.current;
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z, max: !w.max } : w)));
  };
  const rect = (id: AppId, x: number, y: number, w: number, h: number) =>
    setWins((ws) => ws.map((win) => (win.id === id ? { ...win, x, y, w, h } : win)));

  // keep keyboard focus in the desktop after the power button unmounts
  useEffect(() => {
    if (focusOnMount && !root.current?.contains(document.activeElement)) root.current?.focus({ preventScroll: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx: Ctx = { open, exit: () => open("plain"), unroll: toggleRolls, photoReq };
  const top = Math.max(0, ...wins.filter((w) => phone || !w.min).map((w) => w.z));
  const docked = phone ? [] : wins.filter((w) => w.min);

  return (
    <div className="dk" ref={root} tabIndex={-1}>
      <Wallpaper />
      <Scrolls open={rollsOpen} reduced={!!reduce} onToggle={toggleRolls} onPhoto={showPhoto} onAll={() => showPhoto(null)} />
      <header className="dk-bar">
        <span className="dk-left">
          <span className="dk-name">wilson soon, 2026</span>
        </span>
        {/* the clock stays centred; the plain-site icon hangs off its right edge */}
        <span className="dk-mid">
          <span className="dk-clock">{clock}</span>
          <Tooltip text="plain site">{(t) => (
          <button type="button" className="dk-plain dk-ibtn" onClick={() => open("plain")} aria-label="plain site" {...t}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 3.5h8l4 4v13H6z" />
              <path d="M9 12h6 M9 15.5h6" />
            </svg>
          </button>
          )}</Tooltip>
        </span>
        <span className="dk-right">
          <Assistant />
          <Tooltip text="switch off">{(t) => (
          <button type="button" className="dk-plain dk-ibtn" onClick={onPowerOff} aria-label="power off" {...t}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M12 3v8" />
              <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
            </svg>
          </button>
          )}</Tooltip>
          <Tooltip text={sound ? "sound on" : "sound off"}>{(t) => (
          <button
            type="button"
            className="dk-plain dk-ibtn"
            aria-label="sound"
            aria-pressed={sound}
            onClick={() => { setSoundOn(!sound); setSound(!sound); }}
            {...t}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
              {sound ? <path d="M15.5 9a4 4 0 0 1 0 6 M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="M16 9.5l5 5 M21 9.5l-5 5" />}
            </svg>
          </button>
          )}</Tooltip>
        </span>
      </header>

      <nav className="dk-icons" aria-label="apps">
        {APPS.map((a) => (
          <Tooltip key={a.id} text={a.id === "timeline" && rollsOpen ? "roll them up" : a.tip}>{(t) => (
          <button
            type="button"
            id={`dk-icon-${a.id}`}
            className="dk-icon"
            onClick={() => (a.id === "timeline" ? toggleRolls() : open(a.id))}
            aria-expanded={a.id === "timeline" ? rollsOpen : undefined}
            {...t}
          >
            <span className="dk-tile" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
                <path d={a.glyph} />
              </svg>
            </span>
            <span>{a.title}</span>
          </button>
          )}</Tooltip>
        ))}
      </nav>

      <div className="dk-dock-row">
        <AnimatePresence>
          {docked.length > 0 && (
            <motion.div
              className="dk-dock"
              role="toolbar"
              aria-label="minimized windows"
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              {docked.map((w) => {
                const a = appById(w.id);
                return (
                  <Tooltip key={w.id} text={`restore ${a.title}`}>{(t) => (
                  <button type="button" id={`dk-dock-${w.id}`} className="dk-dock-item" onClick={() => open(w.id)} {...t}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={a.glyph} />
                    </svg>
                    <span>{a.title}</span>
                  </button>
                  )}</Tooltip>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {wins.map((w) => {
          const a = appById(w.id);
          const s = w.max && !phone
            ? { x: MAX_INSET, y: BAR + MAX_INSET, w: vp.cw - 2 * MAX_INSET, h: vp.h - BAR - 2 * MAX_INSET }
            : { x: w.x, y: w.y, ...sizeOf(w, vp.cw, vp.h) };
          return (
            <Window
              key={w.id}
              title={a.title}
              x={s.x} y={s.y} w={s.w} h={s.h} z={w.z}
              vw={vp.cw} vh={vp.h}
              active={w.z === top}
              max={!!w.max && !phone}
              min={!!w.min && !phone}
              phone={phone}
              autoFocus={w.focus}
              flush={a.flush}
              onFocus={() => focus(w.id)}
              onToggleMax={() => toggleMax(w.id)}
              onMinimize={() => minimize(w.id)}
              dockPt={() => dockPt(w.id)}
              onClose={() => close(w.id)}
              onMove={(x, y) => move(w.id, x, y)}
              onRect={(x, y, nw, nh) => rect(w.id, x, y, nw, nh)}
            >
              {a.render(ctx)}
            </Window>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
