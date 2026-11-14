import { useEffect, useState, type ReactNode } from "react";
import workExperience from "../data/work-experience.json";
import projects from "../data/projects.json";
import activities from "../data/activities.json";
import skills from "../data/skills.json";

const skillLine = Object.values(skills).flat().join(", ").toLowerCase();

const contacts = [
  { label: "email", href: "mailto:wilionsoon2010@gmail.com", text: "wilionsoon2010@gmail.com" },
  { label: "github", href: "https://github.com/wilsonsfh", text: "wilsonsfh" },
  { label: "x", href: "https://x.com/wilsonsfh_", text: "wilsonsfh_" },
  { label: "linkedin", href: "https://linkedin.com/in/wilsonsfh", text: "wilsonsfh" },
];

const ext = (href: string) =>
  href.startsWith("mailto") ? {} : { target: "_blank", rel: "noopener noreferrer" };

function Row({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = label.replace(/\s+/g, "-");
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

export default function MainPage() {
  return (
    <main id="main" className="page">
      <div className="column">
        <header className="intro">
          <h1 className="name">wilson.</h1>
          <p className="lede">
            based in singapore, studying computer science at the national university of singapore and passionate about building all things tech and aesthetics.
          </p>
        </header>

        <div className="rows">
          <Row label="about">
            <p>i'm currently thinking about how to be a better individual contributor as a software engineer with AI. i'm also interested in product thinking and building something people want, and learning how to ace prioritisations of a hundred things.</p>
            <p>in my free time, i like exploring tea brands, freestyle dancing and doing photography. i am also currently learning the guitar, rock climbing and volleyball. these build my own unique story, which i believe the best software is built by people who bring diverse perspectives to the table.</p>
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
    </main>
  );
}
