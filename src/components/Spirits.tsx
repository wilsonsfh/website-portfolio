import { useEffect, useState } from "react";

// the spirit creatures' setting, shared by every copy (desktop and plaintext): hopping, still, or hidden
export type SpiritMode = "hop" | "still" | "hidden";
const KEY = "spirits"; // localStorage; unset = hop
const EVT = "spirits-change";

const read = (): SpiritMode => {
  try { const v = localStorage.getItem(KEY); return v === "still" || v === "hidden" ? v : "hop"; } catch { return "hop"; }
};

export function useSpirits(): [SpiritMode, (m: SpiritMode) => void] {
  const [mode, setMode] = useState(read);
  useEffect(() => {
    const on = () => setMode(read());
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  const set = (m: SpiritMode) => {
    try { if (m === "hop") localStorage.removeItem(KEY); else localStorage.setItem(KEY, m); } catch {}
    setMode(m);
    window.dispatchEvent(new Event(EVT));
  };
  return [mode, set];
}

// quiet controls beside the sprites: stop/hop and hide; once hidden, only "show spirits" is left
export function SpiritCtl({ mode, set }: { mode: SpiritMode; set: (m: SpiritMode) => void }) {
  if (mode === "hidden") return <button type="button" className="spirit-btn" onClick={() => set("hop")}>show spirits</button>;
  return (
    <span className="spirit-ctl">
      <button type="button" className="spirit-btn" aria-pressed={mode === "still"} onClick={() => set(mode === "still" ? "hop" : "still")}>
        {mode === "still" ? "hop" : "stop"}
      </button>
      <button type="button" className="spirit-btn" onClick={() => set("hidden")}>hide</button>
    </span>
  );
}
