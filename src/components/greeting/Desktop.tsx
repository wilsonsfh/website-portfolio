import { useEffect, useState } from "react";

const time = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

function useClock() {
  const [t, setT] = useState(time);
  useEffect(() => {
    const id = setInterval(() => setT(time()), 10000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export default function Desktop({ onPlain }: { onPlain: () => void }) {
  const clock = useClock();
  return (
    <div className="dk">
      <header className="dk-bar">
        <span>wilson</span>
        <span className="dk-clock">{clock}</span>
        <button type="button" className="dk-plain" onClick={onPlain}>plain site →</button>
      </header>
    </div>
  );
}
