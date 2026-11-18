import { useRef } from "react";
import { useReducedMotion } from "motion/react";

// own pixel art, one char per pixel: o ink outline, y/h/d slime body/light/shade, s star, e dark
// cap: c orange, w spot, k shade; stem: b cream, t shade
export const SLIME = [
  "......oo......",
  ".....oyyo.....",
  "....oyyyyo....",
  "...oyhyyyyo...",
  "..oyhyyyyyyo..",
  ".oyeseyyeseyo.",
  ".oysssyysssyo.",
  ".oyeseyyeseyo.",
  ".oyyyyeeyyyyo.",
  "..oddyyyyddo..",
  "...oooooooo...",
];
export const MUSH = [
  "....oooooo....",
  "..ooccccccoo..",
  ".occwwccccwco.",
  "occcwwcccccwco",
  "occccccwccccco",
  "okkkkkkkkkkkko",
  ".oooooooooooo.",
  "..obbbbbbbbo..",
  "..obebbbbebo..",
  "..obbbeebbbo..",
  "..otttttttto..",
  "...oooooooo...",
];
const PAL: Record<string, string> = {
  o: "#0B2A1D", e: "#0B2A1D", y: "#C6DC3E", h: "#E7F08C", d: "#97B02C", s: "#F4C542",
  c: "#E8731F", w: "#F7CE5B", k: "#B5500F", b: "#F1EAD3", t: "#CFC4A0",
};

export function Sprite({ rows }: { rows: string[] }) {
  return (
    <svg viewBox={`0 0 14 ${rows.length}`} width="42" height={rows.length * 3} shapeRendering="crispEdges">
      {rows.flatMap((r, y) =>
        [...r].map((ch, x) => (PAL[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={PAL[ch]} /> : null)),
      )}
    </svg>
  );
}

// hover or tap: one bigger hop that squashes on landing (WAAPI, so it restarts and layers over the css hop loop)
const BIG: Record<string, Keyframe[]> = {
  slime: [
    { transform: "translateY(0) scale(1.18, 0.78)", offset: 0 },
    { transform: "translateY(-30px) scale(0.84, 1.24)", offset: 0.4, easing: "cubic-bezier(0.55, 0, 1, 0.45)" },
    { transform: "translateY(0) scale(1.28, 0.68)", offset: 0.8 },
    { transform: "translateY(0) scale(1, 1)", offset: 1 },
  ],
  mush: [
    { transform: "translateY(0) scale(1.12, 0.84) rotate(0)", offset: 0 },
    { transform: "translateY(-26px) scale(0.92, 1.14) rotate(-14deg)", offset: 0.4, easing: "cubic-bezier(0.55, 0, 1, 0.45)" },
    { transform: "translateY(0) scale(1.2, 0.74) rotate(0)", offset: 0.8 },
    { transform: "translateY(0) scale(1, 1) rotate(0)", offset: 1 },
  ],
};

export function Mob({ kind, rows }: { kind: "slime" | "mush"; rows: string[] }) {
  const hop = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const big = () => {
    if (!reduce) hop.current?.animate(BIG[kind], { duration: 420, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
  };
  return (
    <span className={`gr-mob gr-${kind}`} onPointerEnter={big} onPointerDown={big}>
      <span className="gr-hop" ref={hop}><Sprite rows={rows} /></span>
    </span>
  );
}

// segmented fill; the mushroom trails the slime, which rides the fill's head
export default function BootBar() {
  return (
    <div className="gr-load" aria-hidden="true">
      <div className="gr-lane">
        <div className="gr-hops">
          <Mob kind="mush" rows={MUSH} />
          <Mob kind="slime" rows={SLIME} />
        </div>
        <div className="gr-track"><i className="gr-fill" /></div>
      </div>
    </div>
  );
}
