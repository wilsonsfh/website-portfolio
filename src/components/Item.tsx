import { useId, useState, type ReactNode } from "react";

// one item: the title row ends in a more/less toggle; `more` shows only when expanded
// head: the title row's class ("item-title" in the app windows, "item-head" on the plaintext page)
export default function Item({ title, more, children, head = "item-title" }: { title: ReactNode; more: ReactNode; children?: ReactNode; head?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <article className="item">
      <h3 className={head}>
        {title}
        <button type="button" className="dk-link dk-more" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {open ? "less" : "more"}
        </button>
      </h3>
      {children}
      <div className="item-more" id={id} hidden={!open}>{more}</div>
    </article>
  );
}
