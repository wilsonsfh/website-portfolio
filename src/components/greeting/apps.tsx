import { useId, useState, type ReactNode } from "react";
import workExperience from "../../data/work-experience.json";
import projects from "../../data/projects.json";
import activities from "../../data/activities.json";
import Terminal from "./Terminal";
import Messages from "./Messages";
import PhotosApp from "./PhotosApp";
import Item from "../Item";
import Typewriter from "../Typewriter";
import Logo, { Logos } from "../Logo";
import { AboutCards, SkillGroups } from "../AboutCards";
import featured from "../../data/featured.json";
import { ledeFlag, contacts, ext } from "../../copy";

export type AppId = "about" | "resume" | "photos" | "timeline" | "terminal" | "messages" | "v1" | "assistant" | "cabo";

// speech bubble with a question mark: the assistant (top bar and desktop icon)
export const ASK_GLYPH = "M4 5h16v11h-8l-4 3.5V16H4z M9.8 8.7a2.2 2.2 0 1 1 3.2 2c-.6.3-1 .8-1 1.4v.3 M12 14.4v.2";
export type Ctx = {
  open: (id: AppId) => void;
  close: (id: AppId) => void;
  unroll: (from?: "photos") => void; // unroll the photo scrolls (they cover the windows); from Photos they show "back" instead of ×
  photoReq: { id: string | null; n: number } | null; // a scroll asked the Photos app to show a photo (id) or the grid (null)
  toTimeline: () => void; // "back" from a photo opened on the scrolls: close Photos and unroll them again
  ask: () => void; // open the portfolio assistant panel
  tourAt: string | null; // the tour's current stop, if one is running
};

function resumeLinks(text: string, links: string[][]) {
  const parts: ReactNode[] = [];
  let remaining = text;
  for (const [label, href] of links) {
    const index = remaining.indexOf(label);
    if (index < 0) continue;
    parts.push(remaining.slice(0, index), <a key={href} href={href} {...ext(href)}>{label}</a>);
    remaining = remaining.slice(index + label.length);
  }
  return [...parts, remaining];
}

// tour: on phones the handwritten note sits in the flow under the word (no room beside it); desktop floats it (TourDemo)
function About({ tour, ctx }: { tour: boolean; ctx: Ctx }) {
  return (
    <div className="dk-prose">
      <p className="lede">hi! i'm wilson. i'm also a <Typewriter /></p>
      {tour && <p className="dk-note-inline" aria-hidden="true">↑ this keeps changing!</p>}
      <p className="ab-where">{ledeFlag}</p>
      <AboutCards />
      <ul className="contacts ct-logos" aria-label="contact">
        {contacts.map((c) => (
          <li key={c.label}><Logo src={c.logo} name={c.label} /><span className="label">{c.label}</span><a href={c.href} {...ext(c.href)}>{c.text}</a></li>
        ))}
        <li>
          <span className="logo logo-mono" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11 M7 10l5 5 5-5 M5 20h14" /></svg></span>
          <span className="label">resume</span>
          <a href="/resume.html">download pdf</a>
        </li>
      </ul>
      <More ctx={ctx} />
    </div>
  );
}

function Work() {
  return (
    <section className="rs-sec" aria-label="work">
      <h2 className="rs-h">work</h2>
      {workExperience.map((job) => (
        <Item
          key={job.company + job.date}
          logo={<Logo src={job.logo} name={job.company} />}
          title={<a href={job.website} {...ext(job.website)}>{job.company}</a>}
          more={<>
            <p className="date">{job.location}</p>
            <ul className="points">{job.description.map((d, i) => <li key={i}>{resumeLinks(d, job.links ?? [])}</li>)}</ul>
          </>}
        >
          <p className="item-sub"><span className="role">{job.role}</span><span className="date">{job.date}</span></p>
          <p className="desc">{job.summary}</p>
          {job.tags.length > 0 && <p className="tags">{job.tags.join(" · ")}</p>}
        </Item>
      ))}
    </section>
  );
}

function Projects() {
  return (
    <section className="rs-sec" aria-label="projects">
      <h2 className="rs-h">projects</h2>
      {projects.map((p) => (
        <Item
          key={p.title}
          logo={<Logo src={p.logo} name={p.title} />}
          title={<>
            <a href={p.github} {...ext(p.github)}>{p.title}</a>
            <span className="links">
              {p.github && <a href={p.github} {...ext(p.github)}>github ↗</a>}
              {p.live && <a href={p.live} {...ext(p.live)}>live ↗</a>}
            </span>
          </>}
          more={<ul className="points">{p.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>}
        >
          <p className="desc">{p.description}</p>
          <p className="tags">{p.tags.join(" · ")}</p>
        </Item>
      ))}
    </section>
  );
}

function Skills() {
  return (
    <section className="rs-sec" aria-label="skills">
      <h2 className="rs-h">skills</h2>
      <SkillGroups />
    </section>
  );
}

function Activities() {
  return (
    <section className="rs-sec" aria-label="involvements">
      <h2 className="rs-h">involvements</h2>
      {activities.map((a) => (
        <Item
          key={a.title}
          logo={<Logos items={a.logos.length ? a.logos : [{ name: a.title }]} />}
          title={a.title}
        >
          {(a.role || a.date) && <p className="item-sub">{a.role && <span className="role">{a.role}</span>}{a.date && <span className="date">{a.date}</span>}</p>}
          {a.descriptions.map((d, i) => <p className="desc" key={i}>{resumeLinks(d, a.links ?? [])}</p>)}
        </Item>
      ))}
    </section>
  );
}

// screenshots of the pages my resume links to, each opening its page; links that could not be captured are listed under them
function Featured() {
  return (
    <section className="rs-sec" aria-label="featured">
      <h2 className="rs-h">featured</h2>
      <p className="ft-intro">pages online that mention or show my work. each one opens the real page.</p>
      <ul className="ft-grid">
        {featured.shots.map((s) => (
          <li key={s.href}>
            <a className="ft-card" href={s.href} {...ext(s.href)}>
              <img src={s.image} alt={`screenshot of ${s.title} on ${s.source}`} loading="lazy" />
              <span className="ft-src">{s.source} ↗</span>
              <span className="ft-title">{s.title}</span>
              <span className="ft-note">{s.note}</span>
            </a>
          </li>
        ))}
      </ul>
      <section className="more" aria-label="more links">
        <h3>also linked from my resume</h3>
        <ul>{featured.links.map((l) => <li key={l.href}><a href={l.href} {...ext(l.href)}>{l.label} ↗</a></li>)}</ul>
      </section>
    </section>
  );
}

// one window for the resume: work, projects, skills and involvements in resume order, with the featured pages beside them
// (under involvements on narrow windows and phones)
function ResumeDownload() {
  return (
    <a className="dk-act" href="/resume.html">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11 M7 10l5 5 5-5 M5 20h14" /></svg>
      download resume
    </a>
  );
}

function Resume() {
  return (
    <div className="dk-prose rs-wrap">
      <div className="rs-grid">
        <div className="rs-main">
          <Work />
          <Projects />
          <Skills />
          <Activities />
        </div>
        <div className="rs-side">
          <Featured />
        </div>
      </div>
    </div>
  );
}

// the rest of the desktop, for whoever arrives here at the end of the tour
const MORE: { id: AppId | "timeline"; name: string; what: string }[] = [
  { id: "messages", name: "(1) unread", what: 'a short chat with "me", tap the replies' },
  { id: "assistant", name: "portfolio assistant", what: "ask about me, or anything else" },
  { id: "terminal", name: "terminal", what: "the same things as commands: try help, cat work.txt or ask" },
  { id: "photos", name: "photos", what: "my photo library, by month" },
  { id: "timeline", name: "timeline", what: "four film strips of my years: career, people, me and scenery" },
  { id: "v1", name: "v1", what: "my previous website" },
  { id: "cabo", name: "cabo", what: "play a round of cards, solo or with friends" },
];

// the app's own desktop-icon glyph, so a link reads as the icon it opens
function AppGlyph({ id }: { id: AppId }) {
  return (
    <svg className="mi" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={appById(id).glyph} />
    </svg>
  );
}

// shown in about.txt, then the credits
function More({ ctx }: { ctx: Ctx }) {
  const go = (id: AppId | "timeline") => (id === "timeline" ? ctx.unroll() : id === "assistant" ? ctx.ask() : ctx.open(id));
  return (
    <>
    <section className="more" aria-label="more on this desktop">
      <h3>there's more on this desktop</h3>
      <ul>
        {MORE.map((m) => (
          <li key={m.id}><button type="button" className="dk-link" onClick={() => go(m.id)}><AppGlyph id={m.id} />{m.name}</button> {m.what}</li>
        ))}
      </ul>
    </section>
    <Credits />
    </>
  );
}

// who made what: the pixel art is original, the studios it nods to are not involved, and there's a way to ask for removal
function Credits() {
  const email = contacts.find((c) => c.label === "email")!;
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="more credits" aria-label="credits and disclaimer">
      <div className="item-heading">
        <h3>credits &amp; disclaimer</h3>
        <button type="button" className="item-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {open ? "collapse" : "expand"}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={open ? "M20 10h-6V4M14 10l6-6M4 14h6v6M10 14l-6 6" : "M14 4h6v6M20 4l-6 6M10 20H4v-6M4 20l6-6"} />
          </svg>
        </button>
      </div>
      <ul id={id} hidden={!open}>
        <li>print palette &amp; grain: <a href="https://www.inspora.design/posts/footer-section" {...ext("https://www.inspora.design/posts/footer-section")}>sequel footer, via pranav on inspora</a>.</li>
        <li>animation, stagger &amp; tooltips: <a href="https://emilkowal.ski/ui/you-dont-need-animations" {...ext("https://emilkowal.ski/ui/you-dont-need-animations")}>emil kowalski</a>.</li>
        <li>paper-scroll timeline: <a href="https://www.youtube.com/watch?v=QwvWdnd2Ktg" {...ext("https://www.youtube.com/watch?v=QwvWdnd2Ktg")}>demon slayer reel, aniplex usa / ufotable</a>.</li>
        <li>scripted messages: <a href="https://zara.small.world/jensenchat/" {...ext("https://zara.small.world/jensenchat/")}>zara zhang’s interactive text story</a>.</li>
        <li>scene transitions: <a href="https://terminal-industries.com/" {...ext("https://terminal-industries.com/")}>terminal industries</a>.</li>
        <li>boot-bar idea: pixel star wars loading clip; creator unverified.</li>
        <li>creature inspiration: <a href="https://www.maplestory.com/" {...ext("https://www.maplestory.com/")}>maplestory / nexon</a>; site sprites redrawn by me.</li>
        <li>fonts: <a href="https://rsms.me/inter/" {...ext("https://rsms.me/inter/")}>inter</a> &amp; <a href="https://github.com/googlefonts/caveat" {...ext("https://github.com/googlefonts/caveat")}>caveat</a> (sil open font license).</li>
        <li>independent portfolio; no affiliation or endorsement by these creators.</li>
        <li>credit correction or removal: <a href={email.href}>email me</a>.</li>
      </ul>
    </section>
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
  action?: ReactNode; // sits in the window title bar, left of the window buttons
};

export const APPS: App[] = [ // reading order: the phone grid wraps in this order; desktop places each icon in greeting.css
  { id: "about", tip: "read about me and get in touch", title: "about.txt", glyph: "M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6", w: 620, h: 660, render: (ctx) => <About tour={ctx.tourAt === "about"} ctx={ctx} /> },
  { id: "messages", tip: "someone texted you", title: "(1) unread", glyph: "M4 5h16v11H9l-5 4z M8 9.5h8 M8 12.5h5", w: 460, h: 620, flush: true, render: () => <Messages /> },
  { id: "resume", tip: "my resume: work, projects, skills, involvements and featured pages", title: "resume-web", glyph: "M4 8h16v11H4z M9 8V5h6v3 M4 13h16", w: 1060, h: 680, render: () => <Resume />, action: <ResumeDownload /> },
  { id: "terminal", tip: "type commands instead", title: "terminal", glyph: "M3 5h18v14H3z M7 10l3 2-3 2 M12 15h5", w: 680, h: 460, flush: true, render: (ctx) => <Terminal ctx={ctx} /> },
  { id: "v1", tip: "my previous website", title: "v1", glyph: "M4.5 12a7.5 7.5 0 1 0 2.2-5.3 M4 3.5v3.7h3.7 M12 8v4.2l3 1.8", w: 1000, h: 640, hFrac: 0.86, flush: true, render: () => <V1 /> },
  { id: "cabo", tip: "play cards solo or with friends", title: "cabo", glyph: "M7 7V3h14v16h-4 M3 7h14v14H3z M10 10l4 4-4 4-4-4z", w: 1100, h: 720, hFrac: 0.86, flush: true, render: () => <iframe className="dk-frame" src="https://cabo.wilsonsoon.workers.dev" title="Cabo card game" loading="lazy" />, action: <a className="dk-act" href="https://cabo.wilsonsoon.workers.dev" {...ext("https://cabo.wilsonsoon.workers.dev")}>open in tab ↗</a> },
  { id: "assistant", tip: "ask me anything", title: "portfolio assistant", glyph: ASK_GLYPH, w: 0, h: 0, render: () => null }, // not a window: opens the assistant panel
  { id: "photos", tip: "look through my photos", title: "photos", glyph: "M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M16 9.5h.01", w: 980, h: 700, flush: true, render: (ctx) => <PhotosApp ctx={ctx} /> },
  { id: "timeline", tip: "scroll through my timeline", title: "timeline", glyph: "M3 5h18v14H3z M7 5v14 M17 5v14 M3 9.5h4 M3 14.5h4 M17 9.5h4 M17 14.5h4", w: 0, h: 0, render: () => null }, // not a window: its icon unrolls the scrolls
];

export const appById = (id: AppId) => APPS.find((a) => a.id === id)!;
