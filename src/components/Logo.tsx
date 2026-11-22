import { useState } from "react";

// a small tile beside a title. A missing or broken file falls back to the name's initials, so a logo can be added later by
// dropping the file at its path. `name` is also the accessible label (the title next to it already says it, so alt is empty).
export default function Logo({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img className="logo" src={src} alt="" loading="lazy" onError={() => setFailed(true)} />;
  const initials = name.split(/[\s/]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return <span className="logo logo-mono" aria-hidden="true">{initials}</span>;
}

// involvements can list several (the ambassador programmes)
export function Logos({ items }: { items: { src?: string; name: string }[] }) {
  return <span className="logos">{items.map((l) => <Logo key={l.name} {...l} />)}</span>;
}
