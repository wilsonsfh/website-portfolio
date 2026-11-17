import { useEffect, useRef, useState } from "react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import Tooltip from "./Tooltip";
import Scrolls from "./Scrolls";
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

type Win = { id: AppId; x: number; y: number; z: number; focus: boolean; w?: number; h?: number; max?: boolean }; // w/h: set once the visitor resizes
const PHONE = 640;
const MAX_INSET = 8; // gap around a maximized window
const SCROLLS_KEY = "scrolls-b"; // sessionStorage: the scrolls have auto-opened once this session

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

export default function Desktop({ onPlain, onPowerOff, focusOnMount }: { onPlain: () => void; onPowerOff: () => void; focusOnMount: boolean }) {
  const clock = useClock();
  const root = useRef<HTMLDivElement>(null);
  const vp = useViewport();
  const [sound, setSound] = useState(getSoundOn);
  const phone = vp.w < PHONE;
  const zRef = useRef(11);
  const [wins, setWins] = useState<Win[]>(() => (window.innerWidth >= PHONE ? [place("about", 0, 11, focusOnMount)] : []));

  const reduce = useReducedMotion();
  const [rolls, setRolls] = useState({ mounted: false, open: false });
  const showRolls = () => setRolls({ mounted: true, open: true });
  const toggleRolls = () => setRolls((r) => (r.open ? { ...r, open: false } : { mounted: true, open: true }));

  const open = (id: AppId) => {
    if (id === "photos") return showRolls();
    const z = ++zRef.current;
    setWins((ws) =>
      ws.some((w) => w.id === id)
        ? ws.map((w) => (w.id === id ? { ...w, z } : w))
        : [...ws, place(id, ws.length, z, true)],
    );
  };
  const focus = (id: AppId) => {
    const z = ++zRef.current;
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z } : w)));
  };
  const close = (id: AppId) => {
    setWins((ws) => ws.filter((w) => w.id !== id));
    document.getElementById(`dk-icon-${id}`)?.focus({ preventScroll: true });
  };
  const move = (id: AppId, x: number, y: number) =>
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, x, y } : w)));

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

  // the first power-on of a session unrolls the photos once the screen has settled
  useEffect(() => {
    if (!focusOnMount) return;
    try { if (sessionStorage.getItem(SCROLLS_KEY) !== null) return; } catch {}
    const t = window.setTimeout(() => {
      try { sessionStorage.setItem(SCROLLS_KEY, "1"); } catch {}
      showRolls();
    }, 400);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx: Ctx = { open, exit: onPlain };
  const top = Math.max(0, ...wins.map((w) => w.z));

  return (
    <div className="dk" ref={root} tabIndex={-1}>
      <Wallpaper />
      {rolls.mounted && (
        <Scrolls open={rolls.open} reduced={!!reduce} onClosed={() => setRolls({ mounted: false, open: false })} onClose={toggleRolls} />
      )}
      <header className="dk-bar">
        <span className="dk-name">wilson soon, 2026</span>
        <span className="dk-clock">{clock}</span>
        <span className="dk-right">
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
          <Tooltip text="open the plain version">{(t) => (
            <button type="button" className="dk-plain" onClick={() => open("plain")} {...t}>plain site →</button>
          )}</Tooltip>
        </span>
      </header>

      <nav className="dk-icons" aria-label="apps">
        {APPS.map((a) => (
          <Tooltip key={a.id} text={a.id === "photos" && rolls.open ? "roll them up" : a.tip}>{(t) => (
          <button
            type="button"
            id={`dk-icon-${a.id}`}
            className="dk-icon"
            onClick={() => (a.id === "photos" ? toggleRolls() : open(a.id))}
            aria-expanded={a.id === "photos" ? rolls.open : undefined}
            {...t}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={a.glyph} />
            </svg>
            <span>{a.title}</span>
          </button>
          )}</Tooltip>
        ))}
      </nav>

      <button type="button" className="gr-cue dk-cue" onClick={onPlain}>↓ plain site</button>

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
              phone={phone}
              autoFocus={w.focus}
              flush={a.flush}
              onFocus={() => focus(w.id)}
              onToggleMax={() => toggleMax(w.id)}
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
