import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Tooltip from "./Tooltip";
import Scrolls from "./Scrolls";
import Assistant from "./Assistant";
import Wallpaper, { EVERY } from "./Wallpaper";
import TouchCursor from "./TouchCursor";
import TourDemo from "./TourDemo";
import { Sprite, Mob, SLIME, MUSH } from "./BootBar";
import Window, { BAR, MIN_W, MIN_H, clamp } from "./Window";
import { APPS, appById, type AppId, type Ctx } from "./apps";
import { getSoundOn, setSoundOn } from "./sound";
import { useSpirits, SpiritCtl } from "../Spirits";

const time = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

function useClock() {
  const [t, setT] = useState(time);
  useEffect(() => {
    const id = setInterval(() => setT(time()), 10000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function useViewport() {
  // w: viewport width (matches the css breakpoint), cw: width without a classic scrollbar (what the section really is)
  const read = () => ({ w: window.innerWidth, cw: document.documentElement.clientWidth, h: window.innerHeight });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const on = () => setVp(read());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return vp;
}

type Win = { id: AppId; x: number; y: number; z: number; focus: boolean; w?: number; h?: number; max?: boolean; min?: boolean }; // w/h: set once the visitor resizes
const PHONE = 640;

// onboarding: "next" walks these in order, one maximised window at a time. a step is a window, or one of the
// non-window stops: the bare desktop, the unrolled timeline, the assistant panel
type Step = AppId | "desktop";
const NOWIN: Step[] = ["desktop", "timeline", "assistant"];
// me first (content), then the desktop itself (features)
const TOUR: Step[] = ["about", "work", "projects", "activities", "contact", "desktop", "timeline", "photos", "terminal", "messages", "assistant"];
// every stop says what you're looking at, one or two short sentences
const CAPTION: Partial<Record<Step, string>> = {
  about: "who i am, in a few lines. the word after \"i'm also a\" keeps changing.",
  work: "where i've worked, one line each. expand for what i did and where.",
  projects: "things i've built, with links to the code or the live site. expand for the details.",
  activities: "what i'm involved in outside work. expand for what i did there.",
  contact: "ways to reach me: email, github, x or linkedin. next, a look around the desktop.",
  desktop: "a desktop, not a page. icons open windows you can drag and resize. poke the slime or the mushroom and they hop.",
  timeline: "four paper lanes of my years: career, people, me and scenery. drag to throw them; click a photo to open it.",
  photos: "my photo library: by month, albums, and a viewer with swipe and zoom.",
  terminal: "the same things as commands: try help, cat work.txt or ask <question>.",
  messages: 'a short chat with "me" that plays itself. tap the replies.',
  assistant: "ask anything about me. it answers from notes i wrote, and can draw pictures from the image button.",
};
const stepTitle = (s: Step) => (s === "desktop" ? "desktop" : appById(s).title);
const TOUR_KEY = "tour-done"; // sessionStorage: finished or skipped in this tab
type Tour = { cur: Step; trail: Step[] }; // cur: a TOUR step, or "plain" after "skip"; trail: where the visitor came from, for "back"
const LAST_KEY = "tour-last"; // sessionStorage: the last TOUR step reached, while the tour is unfinished
const lastStep = (): Step | null => { try { const v = sessionStorage.getItem(LAST_KEY) as Step | null; return v && TOUR.includes(v) ? v : null; } catch { return null; } };
const tourDone = () => { try { return sessionStorage.getItem(TOUR_KEY) === "1"; } catch { return false; } };
const MAX_INSET = 8; // gap around a maximized window
const SEAL_MS = 2200; // the finish window: 300ms wait for contact to shrink, 400ms in, held 1.5s, then out

const size = (id: AppId, vw: number, vh: number) => {
  const a = appById(id);
  return { w: Math.min(a.w, vw - 16), h: Math.min(a.hFrac ? Math.round(vh * a.hFrac) : a.h, vh - BAR - 16) };
};

const sizeOf = (win: Win, vw: number, vh: number) => {
  const d = size(win.id, vw, vh);
  return {
    w: win.w === undefined ? d.w : clamp(win.w, Math.min(MIN_W, vw), vw),
    h: win.h === undefined ? d.h : clamp(win.h, Math.min(MIN_H, vh - BAR), vh - BAR),
  };
};

// a new window cascades gently from roughly the centre
const place = (id: AppId, n: number, z: number, focus: boolean): Win => {
  const cw = document.documentElement.clientWidth;
  const { w } = size(id, cw, window.innerHeight);
  return { id, x: Math.max(150, (cw - w) / 2 + ((n % 5) - 2) * 36), y: BAR + 28 + (n % 5) * 30, z, focus };
};

export default function Desktop({ onPowerOff, focusOnMount }: { onPowerOff: () => void; focusOnMount: boolean }) {
  const clock = useClock();
  const root = useRef<HTMLDivElement>(null);
  const vp = useViewport();
  const [sound, setSound] = useState(getSoundOn);
  // theme: the `dark` class on <html> (also set by the plaintext page's toggle and the terminal's `theme`), kept in sync
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  };
  const phone = vp.w < PHONE;
  const zRef = useRef(11);
  // first visit: a small window asks "tour?" before anything opens; yes starts the tour, no opens contact
  const [asking, setAsking] = useState(() => !tourDone());
  const [tour, setTour] = useState<Tour | null>(null);
  const [last, setLastState] = useState(lastStep); // where an unfinished tour was left, for "resume tour"
  const setLast = (id: Step | null) => {
    setLastState(id);
    try { if (id) sessionStorage.setItem(LAST_KEY, id); else sessionStorage.removeItem(LAST_KEY); } catch {}
  };
  const [wins, setWins] = useState<Win[]>([]); // every visit starts on the bare desktop
  const [spirits, setSpirits] = useSpirits();
  // left hopping, the desktop spirits take turns: hop for one wallpaper photo, rest for the next
  const [resting, setResting] = useState(false);
  useEffect(() => {
    const t = window.setInterval(() => setResting((r) => !r), EVERY);
    return () => clearInterval(t);
  }, []);
  const [touchReq, setTouchReq] = useState(0); // bumped by finish on plaintext: its "get in touch" row opens
  const reduce = useReducedMotion();
  const [askOpen, setAskOpen] = useState(false); // the assistant panel (top bar icon, desktop icon, ctrl/cmd + k)
  const [rollsOpen, setRollsOpen] = useState(false); // false = rolled up and hidden; the timeline icon unrolls them
  const [photoReq, setPhotoReq] = useState<Ctx["photoReq"]>(null);
  const reqN = useRef(0);
  const [rollsFrom, setRollsFrom] = useState<"icon" | "photos">("icon"); // photos: unrolled from the Photos app, so "back" returns there (no ×)
  const toggleRolls = () => { if (!rollsOpen) setRollsFrom("icon"); setRollsOpen(!rollsOpen); }; // the lanes sit above any open windows

  // a photo on the scrolls (or "all photos") opens the Photos app like its own grid does; the window would sit under the lanes, so they roll up
  const fromTl = useRef(false); // the Photos window was opened from the scrolls: its back buttons unroll them again
  const showPhoto = (id: string | null) => {
    if (rollsFrom === "icon") fromTl.current = true; // unrolled from Photos: that window was already open, it is not the scrolls' child
    setPhotoReq({ id, n: ++reqN.current });
    setRollsOpen(false);
    open("photos");
  };

  const open = (id: AppId) => {
    const z = ++zRef.current;
    dockPt(id); // remember where the entry is before it unmounts
    setWins((ws) =>
      ws.some((w) => w.id === id)
        ? ws.map((w) => (w.id === id ? { ...w, z, min: false } : w))
        : [...ws, place(id, ws.length, z, true)],
    );
  };
  const focus = (id: AppId) => {
    const z = ++zRef.current;
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z } : w)));
    // pressing an earlier tour window goes to that stage; "back" then returns to the one it came from
    if (tour && id !== tour.cur && TOUR.includes(id)) setTour({ cur: id, trail: [...tour.trail, tour.cur] });
  };
  // back = true: a "back" button (phone title bar, photo viewer) rather than the close button
  const close = (id: AppId, back = false) => {
    setWins((ws) => ws.filter((w) => w.id !== id));
    if (tour && id === tour.cur && id === "plain") endTour(); // skipped to plaintext: closing it ends the tour
    else if (tour && id === tour.cur) {
      // the tour steps back to the last window it came from that is still open, or ends
      const trail = tour.trail.filter((t) => t !== id && wins.some((w) => w.id === t));
      const prev = trail.pop();
      if (prev) { setTour({ cur: prev, trail }); focusWin(prev as AppId); return; } else endTour(); // prev is an open window
    }
    if (id === "photos") {
      setPhotoReq(null); // a reopened window starts on the grid
      if (back && fromTl.current) { setRollsOpen(true); fromTl.current = false; return; }
      fromTl.current = false;
    }
    document.getElementById(`dk-icon-${id}`)?.focus({ preventScroll: true });
  };
  const move = (id: AppId, x: number, y: number) =>
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, x, y } : w)));

  // centre of a window's dock entry in viewport coords; the last known one once the entry is gone
  const dockPts = useRef<Partial<Record<AppId, { x: number; y: number }>>>({});
  const dockPt = (id: AppId) => {
    const b = document.getElementById(`dk-dock-${id}`)?.getBoundingClientRect();
    if (b) dockPts.current[id] = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    return dockPts.current[id] ?? null;
  };
  const minimize = (id: AppId, refocus = true) => {
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, min: true } : w)));
    if (refocus) requestAnimationFrame(() => document.getElementById(`dk-dock-${id}`)?.focus({ preventScroll: true }));
  };
  const toggleMax = (id: AppId) => {
    const z = ++zRef.current;
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z, max: !w.max } : w)));
  };
  const rect = (id: AppId, x: number, y: number, w: number, h: number) =>
    setWins((ws) => ws.map((win) => (win.id === id ? { ...win, x, y, w, h } : win)));

  // keep keyboard focus in the desktop after the power button unmounts
  useEffect(() => {
    if (focusOnMount && !root.current?.contains(document.activeElement)) root.current?.focus({ preventScroll: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const endTour = () => {
    setTour(null);
    try { sessionStorage.setItem(TOUR_KEY, "1"); } catch {}
  };
  const focusWin = (id: AppId) => {
    const z = ++zRef.current;
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z, min: false } : w)));
  };
  // one window at a time, maximised: the current stage's window closes as the next one opens
  const tourShow = (cur: Step, id: Step) => {
    const z = ++zRef.current;
    // the non-window stops: the timeline unrolls, the assistant panel opens; leaving them puts them away
    if (cur === "timeline" || id === "timeline") { setRollsFrom("icon"); setRollsOpen(id === "timeline"); }
    if (cur === "assistant" || id === "assistant") setAskOpen(id === "assistant");
    const keep = (ws: Win[]) => ws.filter((w) => w.id !== cur && w.id !== id);
    if (NOWIN.includes(id)) setWins(keep);
    else setWins((ws) => [...keep(ws), { ...place(id as AppId, 0, z, true), max: true }]);
  };
  // the tour starts (or restarts, or resumes) at a step: one maximised window, like answering yes
  const startTour = (at: Step) => {
    const z = ++zRef.current;
    setTour({ cur: at, trail: [] });
    setWins(NOWIN.includes(at) ? [] : [{ ...place(at as AppId, 0, z, true), max: true }]);
    setRollsFrom("icon");
    setRollsOpen(at === "timeline");
    setAskOpen(at === "assistant");
  };
  const answer = (yes: boolean) => {
    setAsking(false);
    const z = ++zRef.current;
    if (yes) startTour(TOUR[0]);
    else { endTour(); setWins([place("contact", 0, z, true)]); }
  };
  // remember the furthest-left step: the last TOUR step shown (plaintext keeps the step it was skipped from)
  useEffect(() => { if (tour && TOUR.includes(tour.cur)) setLast(tour.cur); }, [tour?.cur]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!asking) return;
    const on = (e: KeyboardEvent) => { if (e.key === "Escape") answer(false); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }); // re-bound each render so answer sees the current state
  const tourTo = (id: Step) => {
    if (!tour) return;
    tourShow(tour.cur, id);
    setTour({ cur: id, trail: [...tour.trail, tour.cur] });
  };
  const tourNext = () => {
    if (!tour) return;
    const i = TOUR.indexOf(tour.cur);
    if (i < 0 || i === TOUR.length - 1) tourFinish();
    else tourTo(TOUR[i + 1]);
  };
  // finish (after contact): everything but contact closes, contact shrinks from maximised back to a window, the scrolls
  // roll up, then a small window with the slime and mushroom fades in and out
  const [sealed, setSealed] = useState(false);
  const tourFinish = () => {
    const z = ++zRef.current;
    setWins((ws) => ws.filter((w) => w.id === "contact").map((w) => ({ ...w, z, min: false, max: false })));
    setRollsOpen(false);
    setAskOpen(false);
    setPhotoReq(null);
    fromTl.current = false;
    endTour();
    setLast(null);
    setSealed(true);
  };
  useEffect(() => {
    if (!sealed) return;
    const t = window.setTimeout(() => setSealed(false), SEAL_MS);
    return () => clearTimeout(t);
  }, [sealed]);
  // finish after skipping to plaintext: plaintext stays open but shrinks back to a window, then the same done window
  const plainFinish = () => {
    setWins((ws) => ws.map((w) => (w.id === "plain" ? { ...w, max: false } : w)));
    setTouchReq((n) => n + 1);
    endTour();
    setLast(null);
    setSealed(true);
  };
  const tourBack = () => {
    if (!tour) return;
    const trail = [...tour.trail];
    const prev = trail.pop();
    if (!prev) return;
    tourShow(tour.cur, prev);
    setTour({ cur: prev, trail });
  };
  // skip: plaintext opens and the tour stays in the corner (back to the tour, or finish) until finished or plaintext is closed
  const tourSkip = () => tourTo("plain");
  const tourBar = () => {
    if (!tour) return null;
    const plain = tour.cur === "plain";
    const i = TOUR.indexOf(tour.cur);
    const next = plain ? undefined : TOUR[i + 1];
    return (
      <div className="dk-tour" role="group" aria-label="tour">
        <span className="dk-tstep">{plain ? "plaintext" : `${i + 1} / ${TOUR.length}`}</span>
        {/* phones: shorter labels so the bar stays one row */}
        {!plain && <button type="button" className="dk-tbtn skip" onClick={tourSkip}>{phone ? "skip → plaintext" : "skip → view plaintext"}</button>}
        {tour.trail.length > 0 && (
          <button type="button" className="dk-tbtn" onClick={tourBack} aria-label={plain ? "back to the tour" : "back"}>
            {plain ? (phone ? "← tour" : "← back to the tour") : phone ? "←" : "← back"}
          </button>
        )}
        <button type="button" className="dk-tbtn primary" onClick={plain ? plainFinish : tourNext} aria-label={next ? `next: ${stepTitle(next)}` : undefined}>
          {next ? (phone ? `${stepTitle(next)} →` : `next: ${stepTitle(next)} →`) : "finish"}
        </button>
      </div>
    );
  };

  // an icon opens its window; pressed again, an open window closes and a minimised one restores
  const toggle = (id: AppId) => (wins.some((w) => w.id === id && (phone || !w.min)) ? close(id) : open(id));

  const ctx: Ctx = {
    open, close, photoReq, ask: () => setAskOpen(true), touchReq,
    unroll: (from) => { setRollsFrom(from ?? "icon"); setRollsOpen(true); },
    // back from a photo opened on the scrolls: unrolled from Photos, that window stays (it is under the scrolls); otherwise it closes
    toTimeline: () => (rollsFrom === "photos" ? setRollsOpen(true) : close("photos", true)),
  };
  const top = Math.max(0, ...wins.filter((w) => phone || !w.min).map((w) => w.z));
  const docked = phone ? [] : wins.filter((w) => w.min);

  return (
    <div className="dk" ref={root} tabIndex={-1}>
      <Wallpaper />
      <TouchCursor />
      <TourDemo step={tour?.cur ?? null} title={tour ? stepTitle(tour.cur) : ""} />
      <Scrolls open={rollsOpen} reduced={!!reduce} onToggle={toggleRolls} onPhoto={showPhoto} onAll={() => showPhoto(null)} from={rollsFrom} onBack={() => setRollsOpen(false)} />
      <header className="dk-bar">
        <span className="dk-left">
          <span className="dk-name">wilson<span className="dk-name-rest"> soon, 2026</span></span>
        </span>
        {/* the clock stays centred; the plain-site icon hangs off its right edge */}
        <span className="dk-mid">
          <span className="dk-clock">{clock}</span>
          <Tooltip text="plain site">{(t) => (
          <button type="button" className="dk-plain dk-ibtn" onClick={() => toggle("plain")} aria-label="plain site" {...t}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 3.5h8l4 4v13H6z" />
              <path d="M9 12h6 M9 15.5h6" />
            </svg>
          </button>
          )}</Tooltip>
        </span>
        <span className="dk-right">
          <Tooltip text={dark ? "dark theme" : "light theme"}>{(t) => (
          <button type="button" className="dk-plain dk-ibtn" aria-label="dark theme" aria-pressed={dark} onClick={toggleTheme} {...t}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {dark
                ? <path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z" />
                : <path d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z M12 3v2 M12 19v2 M5.6 5.6l1.4 1.4 M17 17l1.4 1.4 M3 12h2 M19 12h2 M5.6 18.4L7 17 M17 7l1.4-1.4" />}
            </svg>
          </button>
          )}</Tooltip>
          <Assistant open={askOpen} onOpenChange={setAskOpen} />
          <Tooltip text="switch off">{(t) => (
          <button type="button" className="dk-plain dk-ibtn" onClick={onPowerOff} aria-label="power off" {...t}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M12 3v8" />
              <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
            </svg>
          </button>
          )}</Tooltip>
          <Tooltip text={sound ? "sound on" : "sound off"}>{(t) => (
          <button
            type="button"
            className="dk-plain dk-ibtn"
            aria-label="sound"
            aria-pressed={sound}
            onClick={() => { setSoundOn(!sound); setSound(!sound); }}
            {...t}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
              {sound ? <path d="M15.5 9a4 4 0 0 1 0 6 M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="M16 9.5l5 5 M21 9.5l-5 5" />}
            </svg>
          </button>
          )}</Tooltip>
        </span>
      </header>

      <nav className="dk-icons" aria-label="apps">
        {APPS.map((a) => (
          <Tooltip key={a.id} text={a.id === "timeline" && rollsOpen ? "roll them up" : a.tip}>{(t) => (
          <button
            type="button"
            id={`dk-icon-${a.id}`}
            className="dk-icon"
            onClick={() => (a.id === "timeline" ? toggleRolls() : a.id === "assistant" ? setAskOpen(true) : toggle(a.id))}
            aria-expanded={a.id === "timeline" ? rollsOpen : a.id === "assistant" ? askOpen : undefined}
            {...t}
          >
            <span className="dk-tile" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
                <path d={a.glyph} />
              </svg>
            </span>
            <span>{a.title}</span>
          </button>
          )}</Tooltip>
        ))}
        {/* decorative: the spirits live on the desktop, last row; hover or tap hops */}
        <div className={`dk-mobs${spirits === "still" || resting ? " spirits-still" : ""}`}>
          {spirits !== "hidden" && (
            <span className="dk-mobs-art" aria-hidden="true">
              <Mob kind="mush" rows={MUSH} />
              <Mob kind="slime" rows={SLIME} />
            </span>
          )}
          <SpiritCtl mode={spirits} set={setSpirits} />
        </div>
      </nav>

      {tour && (() => {
        const corner = (
          <div className={`dk-tour-corner${tour.cur === "assistant" ? " over" : ""}`}>
            {CAPTION[tour.cur] && <p className="dk-tcap">{CAPTION[tour.cur]}</p>}
            {tourBar()}
          </div>
        );
        // the assistant panel is portalled to <body>: on its stop the tour follows it there, above it, so "next" stays reachable
        return tour.cur === "assistant" ? createPortal(corner, document.body) : corner;
      })()}
      {/* no tour running: a way back in (resume where they left, or from the start) */}
      {!tour && !asking && !sealed && (
        <div className="dk-tour-corner idle">
          <div className="dk-tour" role="group" aria-label="tour">
            {last && <button type="button" className="dk-tbtn primary" onClick={() => startTour(last)}>resume tour</button>}
            <button type="button" className="dk-tbtn" onClick={() => startTour(TOUR[0])}>tour again</button>
          </div>
        </div>
      )}
      <AnimatePresence>
        {asking && (
          // blocks the desktop until answered; Escape = no
          <motion.div className="dk-ask-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            <motion.div
              className="dk-win dk-seal" role="dialog" aria-modal="true" aria-labelledby="dk-ask-q"
              initial={{ opacity: 0, transform: reduce ? "none" : "scale(0.95)" }}
              animate={{ opacity: 1, transform: "scale(1)", transition: { duration: 0.25, delay: 0.15, ease: [0.23, 1, 0.32, 1] } }}
              exit={{ opacity: 0, transform: reduce ? "none" : "scale(0.97)", transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
            >
              <div className="dk-title"><span className="dk-title-text">welcome</span></div>
              <div className="dk-seal-body">
                <p id="dk-ask-q">tour?</p>
                <div className="dk-ask-btns">
                  <button type="button" className="dk-tbtn" onClick={() => answer(false)}>no</button>
                  <button type="button" className="dk-tbtn primary" autoFocus onClick={() => answer(true)}>yes</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="dk-seal-wrap" role="status">
        <AnimatePresence>
          {sealed && (
            <motion.div
              className="dk-win dk-seal"
              initial={{ opacity: 0, transform: reduce ? "none" : "scale(0.95)" }}
              animate={{ opacity: 1, transform: "scale(1)", transition: { duration: 0.4, delay: 0.3, ease: [0.23, 1, 0.32, 1] } }}
              exit={{ opacity: 0, transform: reduce ? "none" : "scale(0.97)", transition: { duration: 0.24, ease: [0.23, 1, 0.32, 1] } }}
            >
              <div className="dk-title"><span className="dk-title-text">done</span></div>
              <div className="dk-seal-body">
                <span className="dk-seal-mobs" aria-hidden="true">
                  <span className="gr-hop"><Sprite rows={MUSH} /></span>
                  <span className="gr-hop"><Sprite rows={SLIME} /></span>
                </span>
                <p>immortalising my being in (retro) pixels</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="dk-dock-row">
        <AnimatePresence>
          {docked.length > 0 && (
            <motion.div
              className="dk-dock"
              role="toolbar"
              aria-label="minimized windows"
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              {docked.map((w) => {
                const a = appById(w.id);
                return (
                  <Tooltip key={w.id} text={`restore ${a.title}`}>{(t) => (
                  <button type="button" id={`dk-dock-${w.id}`} className="dk-dock-item" onClick={() => open(w.id)} {...t}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={a.glyph} />
                    </svg>
                    <span>{a.title}</span>
                  </button>
                  )}</Tooltip>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {wins.map((w) => {
          const a = appById(w.id);
          const s = w.max && !phone
            ? { x: MAX_INSET, y: BAR + MAX_INSET, w: vp.cw - 2 * MAX_INSET, h: vp.h - BAR - 2 * MAX_INSET }
            : { x: w.x, y: w.y, ...sizeOf(w, vp.cw, vp.h) };
          return (
            <Window
              key={w.id}
              title={a.title}
              x={s.x} y={s.y} w={s.w} h={s.h} z={w.z}
              vw={vp.cw} vh={vp.h}
              active={w.z === top}
              max={!!w.max && !phone}
              min={!!w.min && !phone}
              phone={phone}
              autoFocus={w.focus}
              flush={a.flush}
              onFocus={() => focus(w.id)}
              onToggleMax={() => toggleMax(w.id)}
              onMinimize={() => minimize(w.id)}
              dockPt={() => dockPt(w.id)}
              onClose={() => close(w.id)}
              onBack={() => close(w.id, true)}
              onMove={(x, y) => move(w.id, x, y)}
              onRect={(x, y, nw, nh) => rect(w.id, x, y, nw, nh)}
            >
              {a.render(ctx)}
            </Window>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
