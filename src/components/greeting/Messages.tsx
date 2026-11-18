import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import script from "../../data/chat-script.json";
import photos from "../../data/photos.json";
import { LIMIT_NOTE, askChat, flags, imageAvailable, makeImage, wantsImage, type Turn } from "../../lib/ai";
import Tooltip from "./Tooltip";
import "./messages.css";

type Link = { label: string; href: string };
type Msg = { text?: string; image?: string; photo?: number; photoAlt?: string; links?: Link[]; needsReview?: boolean };
type Topic = { id: string; question: string; keywords: string[]; answers: Msg[] };
type Script = { opening: Msg[]; topics: Topic[] };
type Item = { id: number; from: "wilson" | "visitor"; msg: Msg };

const S = script as Script;
const EASE = [0.23, 1, 0.32, 1] as const;
const FIRST = 400; // beat before the first typing indicator
const GAP = 120; // between a delivered bubble and the next typing indicator
const typingMs = (m: Msg) => Math.min(700, Math.max(350, 250 + 10 * (m.text?.length ?? 0)));

// survives closing the window, so reopening continues where it stopped
const saved = { items: [] as Item[], queue: [...S.opening] as Msg[], asked: [] as string[], id: 0, noted: false };

function Bubble({ item, reduced }: { item: Item; reduced: boolean }) {
  const { from, msg } = item;
  const photo = msg.photo !== undefined ? photos[msg.photo] : undefined;
  return (
    <motion.div
      className={`ms-bub ms-${from}`}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.25, ease: EASE }}
    >
      <span className="ms-sr">{from === "visitor" ? "you: " : "wilson: "}</span>
      {msg.image && <img className="ms-gen" src={msg.image} alt={msg.photoAlt} width={260} height={260} />}
      {photo && <img src={photo.src} alt={msg.photoAlt ?? photo.alt} width={240} height={160} decoding="async" />}
      {msg.text && <span>{msg.text}</span>}
      {msg.links && (
        <span className="ms-links">
          {msg.links.map((l) => (
            <a key={l.href} href={l.href} {...(l.href.startsWith("mailto") ? {} : { target: "_blank", rel: "noopener noreferrer" })}>{l.label}</a>
          ))}
        </span>
      )}
    </motion.div>
  );
}

export default function Messages() {
  const reduced = useReducedMotion() ?? false;
  const [items, setItems] = useState<Item[]>(saved.items);
  const [asked, setAsked] = useState<string[]>(saved.asked);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const log = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | 0>(0);
  const auto = useRef(false); // paused by typing / hidden tab: resumes by itself
  const playing = useRef(false);

  const push = (from: Item["from"], msg: Msg) => {
    saved.items = [...saved.items, { id: saved.id++, from, msg }];
    setItems(saved.items);
  };

  const stop = () => {
    clearTimeout(timer.current);
    playing.current = false;
    setTyping(false);
  };

  const tick = (delay = 0) => {
    clearTimeout(timer.current);
    const msg = saved.queue[0];
    if (!msg) { stop(); return; }
    playing.current = true;
    timer.current = setTimeout(() => {
      setTyping(true);
      timer.current = setTimeout(() => {
        setTyping(false);
        saved.queue.shift();
        push("wilson", msg);
        tick(GAP);
      }, typingMs(msg));
    }, delay);
  };

  const sync = () => {
    if (auto.current) stop();
    else if (!playing.current) tick(0);
  };

  // the scripted opening plays out; everything after it is answered by the worker, with the recent thread as context
  const ask = async (text: string, topic: Topic | null, image = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    push("visitor", { text: image ? `draw: ${text}` : text });
    if (topic) { saved.asked = [...saved.asked, topic.id]; setAsked(saved.asked); }
    saved.queue = [];
    stop();
    let msg: Msg;
    if (image) {
      const r = await makeImage(text);
      msg = r.ok ? { image: r.src, photoAlt: `generated image: ${text}` } : { text: r.message };
    } else {
      const turns: Turn[] = saved.items.filter((i) => i.msg.text).map((i) => ({ role: i.from === "visitor" ? "user" : "assistant", content: i.msg.text! }));
      const r = await askChat(turns);
      msg = { text: r.ok ? r.answer : r.message };
    }
    busyRef.current = false;
    setBusy(false);
    push("wilson", msg);
    if (flags.fallback && !saved.noted) { saved.noted = true; push("wilson", { text: LIMIT_NOTE }); }
  };

  useEffect(() => {
    const onVis = () => { auto.current = document.hidden; sync(); };
    document.addEventListener("visibilitychange", onVis);
    auto.current = document.hidden;
    sync();
    if (!saved.items.length && !document.hidden) { stop(); tick(FIRST); }
    return () => { document.removeEventListener("visibilitychange", onVis); clearTimeout(timer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const el = log.current;
    if (el && stuck.current) el.scrollTop = el.scrollHeight;
  }, [items, typing]);

  const onDraft = (v: string) => {
    setDraft(v);
    auto.current = v.length > 0 || document.hidden;
    sync();
  };

  const [mode, setMode] = useState<"text" | "image">("text"); // what "send" does: answer, or draw
  const canImage = imageAvailable();
  const image = canImage && mode === "image";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    auto.current = document.hidden;
    stuck.current = true;
    const draw = image || (canImage && wantsImage(text)); // an obvious picture request is drawn; the toggle stays where it was
    ask(text, null, draw);
  };

  const remaining = S.topics.filter((t) => !asked.includes(t.id));

  return (
    <div className="ms">
      <div
        className="ms-log" ref={log} role="log" aria-live="polite" aria-label="conversation with wilson"
        onScroll={(e) => { const el = e.currentTarget; stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}
      >
        {items.map((it) => <Bubble key={it.id} item={it} reduced={reduced} />)}
        {(typing || busy) && <div className="ms-bub ms-wilson ms-typing" aria-hidden="true"><i /><i /><i /></div>}
      </div>
      <div className="ms-bar">
        <div className="ms-chips">
          {remaining.map((t) => (
            <button key={t.id} type="button" disabled={busy} onClick={() => { stuck.current = true; ask(t.question, t); }}>{t.question}</button>
          ))}
        </div>
        <form className="ms-form" onSubmit={submit}>
          <label className="ms-sr" htmlFor="ms-input">ask wilson something</label>
          <input id="ms-input" value={draft} maxLength={120} autoComplete="off" placeholder={image ? "describe an image, e.g. wilson as pixel art…" : "ask something…"} onChange={(e) => onDraft(e.target.value)} />
          {/* answer type: icon toggles on the right, named by their tooltip (same as the assistant) */}
          <div role="group" aria-label="answer type" className="ms-seg">
            <Tooltip text="text answer">{(t) => (
              <button type="button" className="ms-ico" aria-label="text" aria-pressed={!image} onClick={() => setMode("text")} {...t}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" aria-hidden="true">
                  <path d="M5 6.5V5h14v1.5 M12 5v14 M9 19h6" />
                </svg>
              </button>
            )}</Tooltip>
            <Tooltip text={canImage ? "draw an image" : "images are off today"}>{(t) => (
              <button type="button" className="ms-ico" aria-label="image" aria-pressed={image} disabled={!canImage} onClick={() => setMode("image")} {...t}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
                  <path d="M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M16 9.5h.01" />
                </svg>
              </button>
            )}</Tooltip>
          </div>
          <button type="submit" className="ms-send" disabled={!draft.trim() || busy}>{image ? "draw" : "send"}</button>
        </form>
        <p className="ms-privacy">questions and answers are saved for 30 days so wilson can improve the answers.</p>
      </div>
    </div>
  );
}
