import type { ReactNode } from "react";
import workExperience from "../../data/work-experience.json";
import projects from "../../data/projects.json";
import activities from "../../data/activities.json";
import Terminal from "./Terminal";
import Messages from "./Messages";
import PhotosApp from "./PhotosApp";
import MainPage from "../MainPage";
import { skillLine, lede, aboutParagraphs, contacts, ext } from "../../copy";

export type AppId = "about" | "work" | "projects" | "activities" | "photos" | "timeline" | "contact" | "terminal" | "messages" | "plain";
export type Ctx = { open: (id: AppId) => void; exit: () => void; unroll: () => void; photoReq: { id: string | null; n: number } | null }; // photoReq: a scroll asked the Photos app to show a photo (id) or the grid (null)

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
  hFrac?: number; // height as a fraction of the viewport (overrides h, still clamped)
  flush?: boolean; // no body padding
  render: (ctx: Ctx) => ReactNode;
};

export const APPS: App[] = [ // reading order: the phone grid wraps in this order; desktop places each icon in greeting.css
  { id: "about", tip: "read about me", title: "about.txt", glyph: "M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6", w: 580, h: 560, render: () => <About /> },
  { id: "messages", tip: "someone texted you", title: "(1) unread", glyph: "M4 5h16v11H9l-5 4z M8 9.5h8 M8 12.5h5", w: 460, h: 620, flush: true, render: () => <Messages /> },
  { id: "work", tip: "where i have worked", title: "work", glyph: "M4 8h16v11H4z M9 8V5h6v3 M4 13h16", w: 680, h: 640, render: () => <Work /> },
  { id: "terminal", tip: "type commands instead", title: "terminal", glyph: "M3 5h18v14H3z M7 10l3 2-3 2 M12 15h5", w: 680, h: 460, flush: true, render: (ctx) => <Terminal ctx={ctx} /> },
  { id: "projects", tip: "things i have built", title: "projects", glyph: "M9 17h6 M10 20.5h4 M12 2.5a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.2 1.1 2.2h5c0-1 .4-1.7 1.1-2.2A6 6 0 0 0 12 2.5z", w: 680, h: 640, render: () => <Projects /> },
  { id: "activities", tip: "what i'm involved in", title: "involvements", glyph: "M6 5h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 1-4 0H6v-4a2 2 0 1 0 0-4z", w: 660, h: 620, render: () => <Activities /> },
  { id: "plain", tip: "the boring version, all of it", title: "plaintext-version.html", glyph: "M6 3h8l4 4v14H6z M14 3v4h4 M10.5 12l-2 2 2 2 M13.5 12l2 2-2 2", w: 820, h: 560, hFrac: 0.86, render: () => <MainPage embedded /> },
  { id: "contact", tip: "ways to reach me", title: "contact", glyph: "M3 6h18v12H3z M3 7l9 7 9-7", w: 480, h: 320, render: () => <Contact /> },
  { id: "photos", tip: "look through my photos", title: "photos", glyph: "M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M16 9.5h.01", w: 980, h: 700, flush: true, render: (ctx) => <PhotosApp ctx={ctx} /> },
  { id: "timeline", tip: "scroll through my timeline", title: "timeline", glyph: "M3 5h18v14H3z M7 5v14 M17 5v14 M3 9.5h4 M3 14.5h4 M17 9.5h4 M17 14.5h4", w: 0, h: 0, render: () => null }, // not a window: its icon unrolls the scrolls
];

export const appById = (id: AppId) => APPS.find((a) => a.id === id)!;
