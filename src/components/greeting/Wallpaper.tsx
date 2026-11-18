import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

const COUNT = 16;
const EVERY = 40000; // ms between photos
const FADE = 1200; // ms crossfade
const src = (i: number) => `/photos/wall/photo-${String(i + 1).padStart(2, "0")}.jpg`;
const pick = (not: number) => {
  let n = Math.floor(Math.random() * COUNT);
  if (n === not) n = (n + 1) % COUNT;
  return n;
};

type Layer = { idx: number; shown: boolean };

// photo wallpaper: two stacked layers crossfade; two blend layers print them as an opaque green duotone (greeting.css)
export default function Wallpaper() {
  const reduce = useReducedMotion();
  const [stack, setStack] = useState<Layer[]>(() => [{ idx: Math.floor(Math.random() * COUNT), shown: true }]);
  const current = useRef(stack[0].idx);

  useEffect(() => {
    let timer = 0;
    let settle = 0;
    let dead = false;

    const next = () => {
      const idx = pick(current.current);
      const img = new Image();
      img.src = src(idx);
      // decode first so the fade never starts on a half-loaded image
      img.decode().catch(() => {}).then(() => {
        if (dead || document.hidden) return;
        current.current = idx;
        setStack((s) => [...s.slice(-1), { idx, shown: false }]);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          setStack((s) => s.map((l) => (l.idx === idx ? { ...l, shown: true } : l)));
        }));
        settle = window.setTimeout(() => setStack((s) => s.slice(-1)), (reduce ? 200 : FADE) + 100);
      });
    };
    const start = () => {
      clearInterval(timer);
      timer = window.setInterval(next, EVERY);
    };
    const onVis = () => (document.hidden ? clearInterval(timer) : start());

    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      dead = true;
      clearInterval(timer);
      clearTimeout(settle);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduce]);

  return (
    <div className="dk-wall" aria-hidden="true">
      {stack.map((l) => (
        <img key={l.idx} src={src(l.idx)} alt="" className={l.shown ? "shown" : undefined} draggable={false} />
      ))}
      <div className="dk-lift" />
      <div className="dk-tint" />
    </div>
  );
}
