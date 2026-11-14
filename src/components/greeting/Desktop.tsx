import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import Window, { BAR } from "./Window";
import { APPS, appById, type AppId, type Ctx } from "./apps";

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

type Win = { id: AppId; x: number; y: number; z: number; focus: boolean };
const PHONE = 640;

const size = (id: AppId, vw: number, vh: number) => {
  const a = appById(id);
  return { w: Math.min(a.w, vw - 16), h: Math.min(a.h, vh - BAR - 16) };
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
  const phone = vp.w < PHONE;
  const zRef = useRef(11);
  const [wins, setWins] = useState<Win[]>(() => (window.innerWidth >= PHONE ? [place("about", 0, 11, focusOnMount)] : []));

  const open = (id: AppId) => {
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

  // keep keyboard focus in the desktop after the power button unmounts
  useEffect(() => {
    if (focusOnMount && !root.current?.contains(document.activeElement)) root.current?.focus({ preventScroll: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx: Ctx = { open, exit: onPlain };
  const top = Math.max(0, ...wins.map((w) => w.z));

  return (
    <div className="dk" ref={root} tabIndex={-1}>
      <header className="dk-bar">
        <span>wilson</span>
        <span className="dk-clock">{clock}</span>
        <span className="dk-right">
          <button type="button" className="dk-plain" onClick={onPowerOff}>power off</button>
          <button type="button" className="dk-plain" onClick={onPlain}>plain site →</button>
        </span>
      </header>

      <nav className="dk-icons" aria-label="apps">
        {APPS.map((a) => (
          <button key={a.id} type="button" id={`dk-icon-${a.id}`} className="dk-icon" onClick={() => open(a.id)}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={a.glyph} />
            </svg>
            <span>{a.title}</span>
          </button>
        ))}
      </nav>

      <button type="button" className="gr-cue dk-cue" onClick={onPlain}>↓ plain site</button>

      <AnimatePresence>
        {wins.map((w) => {
          const a = appById(w.id);
          const s = size(w.id, vp.cw, vp.h);
          return (
            <Window
              key={w.id}
              title={a.title}
              x={w.x} y={w.y} w={s.w} h={s.h} z={w.z}
              vw={vp.cw} vh={vp.h}
              active={w.z === top}
              phone={phone}
              autoFocus={w.focus}
              flush={a.flush}
              onFocus={() => focus(w.id)}
              onClose={() => close(w.id)}
              onMove={(x, y) => move(w.id, x, y)}
            >
              {a.render(ctx)}
            </Window>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
