import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import script from "../data/chat-script.json";
import photos from "../data/photos.json";

type Link = { label: string; href: string; card?: boolean };
type Msg = { text?: string; photo?: number; photoAlt?: string; links?: Link[]; needsReview?: boolean };
type Topic = { id: string; question: string; keywords: string[]; answers: Msg[] };
type Script = { opening: Msg[]; topics: Topic[]; fallback: Msg };
type Item = { id: number; from: "wilson" | "visitor"; msg: Msg };

const S = script as Script;
const EASE = [0.23, 1, 0.32, 1] as const;
const GAP = 220; // pause between a delivered bubble and the next typing indicator
const AUTO_RESUME = 6000;

const typingMs = (m: Msg) =>
  m.text ? Math.min(1400, Math.max(500, 350 + 22 * m.text.length)) : 700;

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

function goMain(e: { preventDefault(): void }) {
  e.preventDefault();
  const main = document.getElementById("main");
  if (!main) return;
  main.tabIndex = -1;
  main.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  main.focus({ preventScroll: true });
}

function Bubble({ item, reduced }: { item: Item; reduced: boolean }) {
  const { from, msg } = item;
  const photo = msg.photo !== undefined ? photos[msg.photo] : undefined;
  return (
    <motion.div
      className={`bub bub-${from}`}
      style={{ transformOrigin: from === "wilson" ? "0% 100%" : "100% 100%" }}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.25, ease: EASE }}
    >
      {from === "visitor" && <span className="sr">you: </span>}
      {photo && <img className="bub-photo" src={photo.src} alt={msg.photoAlt ?? photo.alt} width={300} height={200} decoding="async" />}
      {msg.text && <span className="bub-text">{msg.text}</span>}
      {msg.links && (
        <span className="bub-links">
          {msg.links.map((l) =>
            l.card ? (
              <a key={l.href} className="bub-card" href={l.href} onClick={goMain}>{l.label}</a>
            ) : (
              <a key={l.href} className="bub-link" href={l.href} {...(l.href.startsWith("mailto") ? {} : { target: "_blank", rel: "noopener noreferrer" })}>{l.label}</a>
            ),
          )}
        </span>
      )}
    </motion.div>
  );
}

export default function Greeting() {
  const reduced = useReducedMotion() ?? false;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const [items, setItems] = useState<Item[]>([]);
  const [typing, setTyping] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const [idle, setIdle] = useState(false);
  const [openDone, setOpenDone] = useState(false);
  const [unseen, setUnseen] = useState(false);
  const [draft, setDraft] = useState("");

  const sectionRef = useRef<HTMLElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stuck = useRef(true);
  const e = useRef({
    openIdx: 0,
    queue: [] as Msg[],
    mode: "opening" as "opening" | "answer",
    running: false,
    timer: 0 as ReturnType<typeof setTimeout> | 0,
    auto: 0 as ReturnType<typeof setTimeout> | 0,
    pending: null as null | (() => void),
    id: 0,
  });

  const push = (from: Item["from"], msgs: Msg[]) =>
    setItems((prev) => [...prev, ...msgs.map((msg) => ({ id: e.current.id++, from, msg }))]);

  const clearTimers = () => {
    const s = e.current;
    clearTimeout(s.timer);
    clearTimeout(s.auto);
    s.pending = null;
  };

  const finish = () => {
    const s = e.current;
    s.running = false;
    setTyping(false);
    setIdle(true);
    const done = s.openIdx >= S.opening.length;
    setOpenDone(done);
    if (!done) {
      // nothing asked: carry on with the opening after a beat, unless the visitor is mid-question
      s.auto = setTimeout(() => {
        const el = inputRef.current;
        if (el && (document.activeElement === el || el.value)) return;
        resume(false);
      }, AUTO_RESUME);
    }
  };

  const step = () => {
    const s = e.current;
    let msg: Msg | undefined;
    let fromOpening = false;
    if (s.queue.length) msg = s.queue[0];
    else if (s.mode === "opening" && s.openIdx < S.opening.length) { msg = S.opening[s.openIdx]; fromOpening = true; }
    if (!msg) { finish(); return; }
    s.running = true;
    setIdle(false);
    setTyping(true);
    const deliver = () => {
      clearTimeout(s.timer);
      s.pending = null;
      setTyping(false);
      if (fromOpening) s.openIdx++; else s.queue.shift();
      push("wilson", [msg!]);
      s.timer = setTimeout(step, GAP);
    };
    s.pending = deliver;
    s.timer = setTimeout(deliver, typingMs(msg));
  };

  const start = () => {
    const s = e.current;
    clearTimers();
    Object.assign(s, { openIdx: 0, queue: [], mode: "opening", running: false });
    setItems([]); setAsked([]); setTyping(false); setOpenDone(false); setIdle(false); setUnseen(false);
    stuck.current = true;
    if (reducedRef.current) {
      s.openIdx = S.opening.length;
      push("wilson", S.opening);
      finish();
    } else {
      s.timer = setTimeout(step, 400);
    }
  };

  const resume = (echo: boolean) => {
    const s = e.current;
    if (s.openIdx >= S.opening.length) return;
    clearTimers();
    s.mode = "opening";
    if (echo) { stuck.current = true; push("visitor", [{ text: "keep going" }]); }
    if (reducedRef.current) {
      const rest = S.opening.slice(s.openIdx);
      s.openIdx = S.opening.length;
      push("wilson", rest);
      finish();
    } else {
      s.timer = setTimeout(step, echo ? 350 : 100);
    }
  };

  const ask = (text: string, topic: Topic | null) => {
    const s = e.current;
    const answers = topic ? topic.answers : [S.fallback];
    stuck.current = true;
    push("visitor", [{ text }]);
    if (topic) setAsked((a) => (a.includes(topic.id) ? a : [...a, topic.id]));
    if (reducedRef.current) {
      clearTimers();
      s.mode = "answer"; s.queue = [];
      push("wilson", answers);
      finish();
    } else if (s.mode === "answer" && s.running) {
      s.queue.push(...answers); // earlier answers still playing: queue behind them
    } else {
      clearTimers();
      setTyping(false);
      s.mode = "answer";
      s.queue = [...answers];
      s.running = true;
      setIdle(false);
      s.timer = setTimeout(step, 350);
    }
  };

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    ask(text, matchTopic(text));
  };

  // mount: play the opening (re-runs cleanly under StrictMode)
  useEffect(() => {
    start();
    S.opening.forEach((m) => { if (m.photo !== undefined) new Image().src = photos[m.photo].src; });
    S.topics.forEach((t) => t.answers.forEach((m) => { if (m.photo !== undefined) new Image().src = photos[m.photo].src; }));
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Space skips the typing wait while the thread is on screen
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.code !== "Space" || !e.current.pending) return;
      const t = ev.target as HTMLElement;
      if (t.closest("input, textarea, button, a, [contenteditable]")) return;
      const r = sectionRef.current?.getBoundingClientRect();
      if (!r || r.bottom < 120) return;
      ev.preventDefault();
      e.current.pending?.();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  // keep the newest message in view only while the visitor hasn't scrolled up
  const count = items.length;
  const lastCount = useRef(0);
  useLayoutEffect(() => {
    const el = logRef.current;
    if (!el) return;
    if (stuck.current) el.scrollTop = el.scrollHeight;
    else if (count > lastCount.current) setUnseen(true);
    lastCount.current = count;
  }, [count, typing]);

  const onScroll = () => {
    const el = logRef.current!;
    const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    stuck.current = atEnd;
    if (atEnd) setUnseen(false);
  };

  const jumpToEnd = () => {
    const el = logRef.current!;
    stuck.current = true;
    setUnseen(false);
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  };

  const remaining = S.topics.filter((t) => !asked.includes(t.id));
  const canResume = idle && !openDone;

  return (
    <section ref={sectionRef} className="chat" aria-label="chat with wilson">
      <header className="chat-head">
        <span className="chat-name">wilson</span>
        <a className="chat-skip" href="#main" onClick={goMain}>skip to the page ↓</a>
      </header>

      <div className="chat-body">
        <div
          ref={logRef}
          className="chat-log"
          role="log"
          aria-live="polite"
          aria-label="messages from wilson"
          tabIndex={0}
          onScroll={onScroll}
          onClick={() => e.current.pending?.()}
        >
          <div className="chat-col chat-thread">
            {items.map((item) => <Bubble key={item.id} item={item} reduced={reduced} />)}
            {typing && (
              <motion.div className="bub bub-wilson bub-typing" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12, ease: EASE }} style={{ transformOrigin: "0% 100%" }}>
                <i /><i /><i />
              </motion.div>
            )}
          </div>
        </div>
        {unseen && <button type="button" className="chat-new" onClick={jumpToEnd}>new messages ↓</button>}
      </div>

      <div className="chat-col chat-composer">
        <div className="chips">
          {canResume && <button type="button" className="chip chip-go" onClick={() => resume(true)}>keep going</button>}
          {remaining.map((t) => (
            <button key={t.id} type="button" className="chip" onClick={() => ask(t.question, t)}>{t.question}</button>
          ))}
          {openDone && idle && <button type="button" className="chip chip-quiet" onClick={start}>replay ↺</button>}
        </div>
        <form className="chat-form" onSubmit={onSubmit}>
          <label className="sr" htmlFor="chat-input">ask wilson something</label>
          <input
            id="chat-input"
            ref={inputRef}
            className="chat-input"
            type="text"
            autoComplete="off"
            enterKeyHint="send"
            placeholder="ask something…"
            value={draft}
            onChange={(ev) => { setDraft(ev.target.value); clearTimeout(e.current.auto); }}
          />
          <button type="submit" className="chip chat-send" disabled={!draft.trim()}>send</button>
        </form>
      </div>
    </section>
  );
}
