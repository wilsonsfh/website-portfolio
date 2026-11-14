export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Local progress of p inside [a, b], 0..1. */
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

/** CSS-style cubic-bezier(x1,y1,x2,y2) as a function of 0..1 progress. */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t: number) => ((ax * t + bx) * t + cx) * t;
  const Y = (t: number) => ((ay * t + by) * t + cy) * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) {
      const v = X(t);
      if (Math.abs(v - x) < 1e-5) break;
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return Y(t);
  };
}

export const easeSlide = bezier(0.77, 0, 0.175, 1); // on-screen movement
export const easeOut = bezier(0.23, 1, 0.32, 1); // system response
