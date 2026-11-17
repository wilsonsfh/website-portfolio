import type { ReactNode } from "react";
import workExperience from "../../data/work-experience.json";
import projects from "../../data/projects.json";
import activities from "../../data/activities.json";
import photos from "../../data/photos.json";
import Terminal from "./Terminal";
import Messages from "./Messages";
import { skillLine, lede, aboutParagraphs, contacts, ext } from "../../copy";

export type AppId = "about" | "work" | "projects" | "activities" | "photos" | "contact" | "terminal" | "messages";
export type Ctx = { open: (id: AppId) => void; exit: () => void };

function About() {
  return (
    <div className="dk-prose">
      <p>{lede}</p>
      {aboutParagraphs.map((t) => <p key={t}>{t}</p>)}
      <p className="meta">skills: {skillLine}</p>
    </div>
  );
}

function Work() {
  return (
    <div className="dk-prose">
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
    </div>
  );
}

function Projects() {
  return (
    <div className="dk-prose">
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
    </div>
  );
}

function Activities() {
  return (
    <div className="dk-prose">
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
    </div>
  );
}

function Photos() {
  return (
    <div className="dk-strip" tabIndex={0} role="group" aria-label="photos, scroll sideways">
      {photos.map((p) => (
        <img key={p.src} src={p.src} alt={p.alt} draggable={false} decoding="async" />
      ))}
    </div>
  );
}

function Contact() {
  return (
    <div className="dk-prose">
      <ul className="contacts">
        {contacts.map((c) => (
          <li key={c.label}><span className="meta">{c.label}</span><a href={c.href} {...ext(c.href)}>{c.text}</a></li>
        ))}
      </ul>
    </div>
  );
}

export type App = {
  id: AppId;
  title: string;
  tip: string; // tooltip copy
  glyph: string; // svg path data, 24x24 stroke icon
  w: number;
  h: number;
  flush?: boolean; // no body padding
  render: (ctx: Ctx) => ReactNode;
};

export const APPS: App[] = [
  { id: "about", tip: "read about me", title: "about.txt", glyph: "M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6", w: 400, h: 360, render: () => <About /> },
  { id: "work", tip: "where i have worked", title: "work", glyph: "M4 8h16v11H4z M9 8V5h6v3 M4 13h16", w: 460, h: 440, render: () => <Work /> },
  { id: "projects", tip: "things i have built", title: "projects", glyph: "M3 6h6l2 2h10v11H3z", w: 460, h: 440, render: () => <Projects /> },
  { id: "activities", tip: "what i do outside work", title: "activities", glyph: "M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z", w: 440, h: 420, render: () => <Activities /> },
  { id: "photos", tip: "photos i have taken", title: "photos", glyph: "M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M16 9.5h.01", w: 560, h: 380, flush: true, render: () => <Photos /> },
  { id: "contact", tip: "ways to reach me", title: "contact", glyph: "M3 6h18v12H3z M3 7l9 7 9-7", w: 360, h: 240, render: () => <Contact /> },
  { id: "terminal", tip: "type commands instead", title: "terminal", glyph: "M3 5h18v14H3z M7 10l3 2-3 2 M12 15h5", w: 520, h: 340, flush: true, render: (ctx) => <Terminal ctx={ctx} /> },
  { id: "messages", tip: "someone texted you", title: "(1) unread", glyph: "M4 5h16v11H9l-5 4z M8 9.5h8 M8 12.5h5", w: 380, h: 460, flush: true, render: () => <Messages /> },
];

export const appById = (id: AppId) => APPS.find((a) => a.id === id)!;
