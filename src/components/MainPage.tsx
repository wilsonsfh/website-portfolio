import { useEffect, useId, useState, type ReactNode } from "react";
import workExperience from "../data/work-experience.json";
import projects from "../data/projects.json";
import activities from "../data/activities.json";
import { skillLine, lede, aboutParagraphs, contacts, ext } from "../copy";

function Row({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = `${useId()}-${label.replace(/\s+/g, "-")}`; // unique: MainPage can render twice (page + desktop window)
  return (
    <section className="row">
      <h2 className="row-heading">
        <button
          type="button"
          className="row-btn"
          id={`btn-${id}`}
          aria-expanded={open}
          aria-controls={`panel-${id}`}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="row-label">{label}</span>
          <svg className="chev" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 5.5l4 4 4-4" />
          </svg>
        </button>
      </h2>
      <div className="panel" id={`panel-${id}`} role="region" aria-labelledby={`btn-${id}`}>
        <div className="panel-clip">
          <div className="panel-body">{children}</div>
        </div>
      </div>
    </section>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  // stay in sync with the other MainPage instance
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return (
    <button
      type="button"
      className="foot-btn"
      aria-label={dark ? "switch to light theme" : "switch to dark theme"}
      onClick={() => {
        const next = !dark;
        try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
        setDark(next);
      }}
    >
      {dark ? "light" : "dark"}
    </button>
  );
}

export default function MainPage({ embedded = false }: { embedded?: boolean }) {
  // embedded (inside a desktop window): no #main id or main landmark, no full-height page, tighter padding
  const Root = embedded ? "div" : "main";
  return (
    <Root id={embedded ? undefined : "main"} className={`page${embedded ? " embedded" : ""}`}>
      <div className="column">
        <header className="intro">
          <h1 className="name">wilson.</h1>
          <p className="lede">{lede}</p>
        </header>

        <div className="rows">
          <Row label="about">
            {aboutParagraphs.map((t) => <p key={t}>{t}</p>)}
            <p className="meta">skills: {skillLine}</p>
          </Row>

          <Row label="work">
            {workExperience.map((job) => (
              <article className="item" key={job.company + job.date}>
                <p className="item-head">
                  <a href={job.website} {...ext(job.website)}>{job.company}</a>
                  <span className="sep">/</span>{job.role}
                  <span className="meta date">{job.date}</span>
                </p>
                {job.description.map((d, i) => <p className="meta" key={i}>{d}</p>)}
              </article>
            ))}
          </Row>

          <Row label="projects">
            {projects.map((p) => (
              <article className="item" key={p.title}>
                <p className="item-head">
                  {p.title}
                  <span className="links">
                    {p.github && <a href={p.github} {...ext(p.github)}>github</a>}
                    {p.live && <a href={p.live} {...ext(p.live)}>live</a>}
                  </span>
                </p>
                <p className="desc">{p.description}</p>
                <p className="meta">{p.tags.join(", ")}</p>
              </article>
            ))}
          </Row>

          <Row label="activities">
            {activities.map((a) => (
              <article className="item" key={a.title}>
                <p className="item-head">
                  {a.title}
                  {a.role && <><span className="sep">/</span>{a.role}</>}
                  {a.date && <span className="meta date">{a.date}</span>}
                </p>
                {a.descriptions.map((d, i) => <p className="meta" key={i}>{d}</p>)}
              </article>
            ))}
          </Row>

          <Row label="get in touch">
            <ul className="contacts">
              {contacts.map((c) => (
                <li key={c.label}><span className="meta">{c.label}</span><a href={c.href} {...ext(c.href)}>{c.text}</a></li>
              ))}
            </ul>
          </Row>
        </div>

        <footer className="foot">
          <span className="meta">wilson soon, 2026</span>
          <ThemeToggle />
        </footer>
      </div>
    </Root>
  );
}
