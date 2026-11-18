import { useId, useState, type ReactNode } from "react";

// one item: an expand/collapse control at the bottom right of the default lines; `more` opens below it, so the
// control never moves (no `more`, no control). text then icon, right-aligned: the icon stays put when the word changes
// head: the title row's class ("item-title" in the app windows, "item-head" on the plaintext page)
export default function Item({ title, more, children, head = "item-title" }: { title: ReactNode; more?: ReactNode; children?: ReactNode; head?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <article className="item">
      <h3 className={head}>{title}</h3>
      {children}
      {more && (
        <>
          <div className="item-foot">
            <button type="button" className="item-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
              {open ? "collapse" : "expand"}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={open ? "M20 10h-6V4M14 10l6-6M4 14h6v6M10 14l-6 6" : "M14 4h6v6M20 4l-6 6M10 20H4v-6M4 20l6-6"} />
              </svg>
            </button>
          </div>
          <div className="item-more" id={id} hidden={!open}>{more}</div>
        </>
      )}
    </article>
  );
}
