import type { ReactNode } from "react";
import workExperience from "../../data/work-experience.json";
import projects from "../../data/projects.json";
import activities from "../../data/activities.json";
import Terminal from "./Terminal";
import Messages from "./Messages";
import PhotosApp from "./PhotosApp";
import MainPage from "../MainPage";
import { skillLine, lede, aboutParagraphs, contacts, ext } from "../../copy";

export type AppId = "about" | "work" | "projects" | "activities" | "photos" | "timeline" | "contact" | "terminal" | "messages" | "plain" | "v1";
export type Ctx = {
  open: (id: AppId) => void;
  close: (id: AppId) => void;
  unroll: (from?: "photos") => void; // unroll the photo scrolls (they cover the windows); from Photos they show "back" instead of ×
  photoReq: { id: string | null; n: number } | null; // a scroll asked the Photos app to show a photo (id) or the grid (null)
  toTimeline: () => void; // "back" from a photo opened on the scrolls: close Photos and unroll them again
};

function About() {
  return (
    <div className="dk-prose">
      <p className="lede">{lede}</p>
      {aboutParagraphs.map((t) => <p key={t}>{t}</p>)}
      <p className="skills"><b>skills</b>{skillLine}</p>
    </div>
  );
}

function Work() {
  return (
    <div className="dk-prose">
      {workExperience.map((job) => (
        <article className="item" key={job.company + job.date}>
          <h3 className="item-title"><a href={job.website} {...ext(job.website)}>{job.company}</a></h3>
          <p className="item-sub"><span className="role">{job.role}</span><span className="date">{job.date}</span></p>
          <ul className="points">{job.description.map((d, i) => <li key={i}>{d}</li>)}</ul>
          {job.tags.length > 0 && <p className="tags">{job.tags.join(" · ")}</p>}
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
          <h3 className="item-title">
            {p.title}
            <span className="links">
              {p.github && <a href={p.github} {...ext(p.github)}>github ↗</a>}
              {p.live && <a href={p.live} {...ext(p.live)}>live ↗</a>}
            </span>
          </h3>
          <p className="desc">{p.description}</p>
          <p className="tags">{p.tags.join(" · ")}</p>
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
          <h3 className="item-title">{a.title}</h3>
          {(a.role || a.date) && <p className="item-sub">{a.role && <span className="role">{a.role}</span>}{a.date && <span className="date">{a.date}</span>}</p>}
          <ul className="points">{a.descriptions.map((d, i) => <li key={i}>{d}</li>)}</ul>
        </article>
      ))}
    </div>
  );
}

// the rest of the desktop, for whoever arrives here at the end of the tour
const MORE: { id: AppId | "timeline"; name: string; what: string }[] = [
  { id: "messages", name: "(1) unread", what: "a short chat with me, tap the replies" },
  { id: "terminal", name: "terminal", what: "the same things as commands: try help, cat work.txt or ask" },
  { id: "photos", name: "photos", what: "my photo library, by month" },
  { id: "timeline", name: "timeline", what: "four film strips of my years: career, people, me and scenery" },
  { id: "v1", name: "v1", what: "my previous website" },
];

function Contact({ ctx }: { ctx: Ctx }) {
  const go = (id: AppId | "timeline") => (id === "timeline" ? ctx.unroll() : ctx.open(id));
  return (
    <div className="dk-prose">
      <ul className="contacts">
        {contacts.map((c) => (
          <li key={c.label}><span className="label">{c.label}</span><a href={c.href} {...ext(c.href)}>{c.text}</a></li>
        ))}
      </ul>
      <section className="more" aria-label="more on this desktop">
        <h3>there's more on this desktop</h3>
        <p className="more-main">
          <button type="button" className="dk-link" onClick={() => ctx.open("plain")}>plaintext-version.html</button>
          <span>everything above on one plain page: the clearest place for the full details.</span>
        </p>
        <ul>
          {MORE.map((m) => (
            <li key={m.id}><button type="button" className="dk-link" onClick={() => go(m.id)}>{m.name}</button> {m.what}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// the old astro site, built with base /v1 into public/v1 (it shares /images, /fonts and /photos with this site)
function V1() {
  return <iframe className="dk-frame" src="/v1/index.html" title="v1, my previous website" loading="lazy" />;
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
  { id: "projects", tip: "things i have built", title: "projects", glyph: "M12 5.5a5 5 0 0 0-3.5 8.5c.6.5 1 1.1 1 2h5c0-.9.4-1.5 1-2A5 5 0 0 0 12 5.5z M9.5 18.5h5 M10.5 21h3 M12 1.5v2 M7 5.5L5.6 4.1 M17 5.5l1.4-1.4", w: 680, h: 640, render: () => <Projects /> },
  { id: "activities", tip: "what i'm involved in", title: "involvements", glyph: "M6 5h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 1-4 0H6v-4a2 2 0 1 0 0-4z", w: 660, h: 620, render: () => <Activities /> },
  { id: "plain", tip: "the boring version, all of it", title: "plaintext-version.html", glyph: "M6 3h8l4 4v14H6z M14 3v4h4 M10.5 12l-2 2 2 2 M13.5 12l2 2-2 2", w: 820, h: 560, hFrac: 0.86, render: () => <MainPage embedded /> },
  { id: "v1", tip: "my previous website", title: "v1", glyph: "M4.5 12a7.5 7.5 0 1 0 2.2-5.3 M4 3.5v3.7h3.7 M12 8v4.2l3 1.8", w: 1000, h: 640, hFrac: 0.86, flush: true, render: () => <V1 /> },
  { id: "contact", tip: "ways to reach me", title: "contact", glyph: "M3 6h18v12H3z M3 7l9 7 9-7", w: 520, h: 560, render: (ctx) => <Contact ctx={ctx} /> },
  { id: "photos", tip: "look through my photos", title: "photos", glyph: "M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M16 9.5h.01", w: 980, h: 700, flush: true, render: (ctx) => <PhotosApp ctx={ctx} /> },
  { id: "timeline", tip: "scroll through my timeline", title: "timeline", glyph: "M3 5h18v14H3z M7 5v14 M17 5v14 M3 9.5h4 M3 14.5h4 M17 9.5h4 M17 14.5h4", w: 0, h: 0, render: () => null }, // not a window: its icon unrolls the scrolls
];

export const appById = (id: AppId) => APPS.find((a) => a.id === id)!;
