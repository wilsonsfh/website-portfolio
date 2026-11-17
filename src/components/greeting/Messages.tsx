import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import script from "../../data/chat-script.json";
import photos from "../../data/photos.json";
import "./messages.css";

type Link = { label: string; href: string };
type Msg = { text?: string; photo?: number; photoAlt?: string; links?: Link[]; needsReview?: boolean };
type Topic = { id: string; question: string; keywords: string[]; answers: Msg[] };
type Script = { opening: Msg[]; topics: Topic[]; fallback: Msg };
type Item = { id: number; from: "wilson" | "visitor"; msg: Msg };

const S = script as Script;
const EASE = [0.23, 1, 0.32, 1] as const;
const FIRST = 400; // beat before the first typing indicator
const GAP = 120; // between a delivered bubble and the next typing indicator
const typingMs = (m: Msg) => Math.min(700, Math.max(350, 250 + 10 * (m.text?.length ?? 0)));

// survives closing the window, so reopening continues where it stopped
const saved = { items: [] as Item[], queue: [...S.opening] as Msg[], asked: [] as string[], id: 0 };

function matchTopic(raw: string): Topic | null {
  const t = raw.toLowerCase();
  let best: Topic | null = null;
  let bestScore = 0;
  for (const topic of S.topics) {
    const score = topic.keywords.filter((k) => t.includes(k)).length;
    if (score > bestScore) { best = topic; bestScore = score; }
  }
  return best;
}

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

  const ask = (text: string, topic: Topic | null) => {
    push("visitor", { text });
    if (topic) { saved.asked = [...saved.asked, topic.id]; setAsked(saved.asked); }
    saved.queue = [...(topic ? topic.answers : [S.fallback])];
    stop();
    sync();
    tick(FIRST);
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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    auto.current = document.hidden;
    stuck.current = true;
    ask(text, matchTopic(text));
  };

  const remaining = S.topics.filter((t) => !asked.includes(t.id));

  return (
    <div className="ms">
      <div
        className="ms-log" ref={log} role="log" aria-live="polite" aria-label="conversation with wilson"
        onScroll={(e) => { const el = e.currentTarget; stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}
      >
        {items.map((it) => <Bubble key={it.id} item={it} reduced={reduced} />)}
        {typing && <div className="ms-bub ms-wilson ms-typing" aria-hidden="true"><i /><i /><i /></div>}
      </div>
      <div className="ms-bar">
        <div className="ms-chips">
          {remaining.map((t) => (
            <button key={t.id} type="button" onClick={() => { stuck.current = true; ask(t.question, t); }}>{t.question}</button>
          ))}
        </div>
        <form className="ms-form" onSubmit={submit}>
          <label className="ms-sr" htmlFor="ms-input">ask wilson something</label>
          <input id="ms-input" value={draft} maxLength={120} autoComplete="off" placeholder="ask something…" onChange={(e) => onDraft(e.target.value)} />
          <button type="submit" className="ms-send" disabled={!draft.trim()}>send</button>
        </form>
      </div>
    </div>
  );
}
