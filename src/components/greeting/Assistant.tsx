import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Tooltip from "./Tooltip";
import { IMAGE_OFF, LIMIT_NOTE, askChat, flags, imageAvailable, makeImage, wantsImage, type Turn } from "../../lib/ai";
import "./assistant.css";

type Out = { kind: "text"; text: string } | { kind: "image"; q: string; src: string } | { kind: "error"; message: string };
const EASE = [0.23, 1, 0.32, 1] as const;

// the answer types itself in (about a second at most); reduced motion shows it whole
function Reveal({ text, reduced }: { text: string; reduced: boolean }) {
  const [n, setN] = useState(reduced ? text.length : 0);
  useEffect(() => {
    if (reduced) { setN(text.length); return; }
    setN(0);
    const step = Math.max(2, Math.ceil(text.length / 40));
    const id = setInterval(() => setN((v) => { if (v + step >= text.length) clearInterval(id); return Math.min(text.length, v + step); }), 25);
    return () => clearInterval(id);
  }, [text, reduced]);
  return <p className="as-text"><span className="as-sr">{text}</span><span aria-hidden="true">{text.slice(0, n)}</span><i className="as-cur" aria-hidden="true" /></p>;
}

export default function Assistant() {
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"text" | "image">("text");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Out | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const thread = useRef<Turn[]>([]);
  const abort = useRef<AbortController | null>(null);

  const canImage = imageAvailable();
  const m = canImage ? mode : "text";

  const close = () => {
    abort.current?.abort();
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };

  // ctrl/cmd + k toggles it from anywhere on the desktop
  useEffect(() => {
    const on = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) close(); else setOpen(true);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }); // re-bound each render so it sees `open`

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    const els = [...(panel.current?.querySelectorAll<HTMLElement>("input, button:not(:disabled)") ?? [])];
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (!q || busy) return;
    const ac = new AbortController();
    abort.current = ac;
    setDraft("");
    setOut(null);
    setBusy(true);
    const draw = m === "image" || (canImage && wantsImage(q)); // an obvious picture request is drawn; the toggle stays where it was
    try {
      if (draw) {
        const r = await makeImage(q, ac.signal);
        setOut(r.ok ? { kind: "image", q, src: r.src } : { kind: "error", message: r.message });
      } else {
        thread.current = [...thread.current, { role: "user", content: q }];
        const r = await askChat(thread.current, ac.signal);
        if (r.ok) { thread.current = [...thread.current, { role: "assistant", content: r.answer }]; setOut({ kind: "text", text: r.answer }); }
        else { thread.current = thread.current.slice(0, -1); setOut({ kind: "error", message: r.message }); }
      }
    } catch { /* closed while waiting */ }
    finally { if (abort.current === ac) setBusy(false); }
  };

  const notes = [flags.fallback && LIMIT_NOTE, flags.imageOff && `${IMAGE_OFF}.`].filter(Boolean) as string[];
  const enter = reduced ? { opacity: 0 } : { opacity: 0, y: -10, clipPath: "inset(0% 18% 0% 18% round 6px)" };
  const shown = reduced ? { opacity: 1 } : { opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 6px)" };

  return (
    <>
      <Tooltip text="ask about wilson">{(t) => (
        <button
          type="button" className="dk-plain dk-ibtn" aria-label="ask about wilson" aria-haspopup="dialog" aria-expanded={open}
          aria-keyshortcuts="Control+K Meta+K" onClick={() => setOpen(true)}
          {...t} ref={(el) => { trigger.current = el; t.ref(el); }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 5h16v11h-8l-4 3.5V16H4z" />
            <path d="M12 7.5v5 M9.5 10h5" strokeLinecap="square" />
          </svg>
        </button>
      )}</Tooltip>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="as" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: reduced ? 0.15 : 0.35, ease: EASE } }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
              onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}
            >
              <div className="as-glow" aria-hidden="true" />
              <motion.div
                ref={panel} className="as-panel" role="dialog" aria-modal="true" aria-label="ask about wilson" onKeyDown={onKey}
                initial={enter} animate={{ ...shown, transition: { duration: reduced ? 0.15 : 0.3, ease: EASE } }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <form className="as-form" onSubmit={send}>
                  <span className="as-prompt" aria-hidden="true">&gt;</span>
                  <input
                    autoFocus value={draft} maxLength={300} autoComplete="off" enterKeyHint="send"
                    aria-label={m === "image" ? "describe an image" : "ask about wilson"} placeholder={m === "image" ? "describe an image, e.g. wilson as pixel art…" : "ask about wilson…"}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <button type="submit" className="as-go" disabled={!draft.trim() || busy}>{m === "image" ? "draw" : "ask"}</button>
                </form>
                <div className="as-tools">
                  <span className="as-hint">esc closes</span>
                  {/* answer type: icon buttons on the right, named by their tooltip */}
                  <div role="group" aria-label="answer type" className="as-seg">
                    <Tooltip text="text answer">{(t) => (
                      <button type="button" className="as-ico" aria-label="text" aria-pressed={m === "text"} onClick={() => setMode("text")} {...t}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" aria-hidden="true">
                          <path d="M5 6.5V5h14v1.5 M12 5v14 M9 19h6" />
                        </svg>
                      </button>
                    )}</Tooltip>
                    <Tooltip text={canImage ? "draw an image" : "images are off today"}>{(t) => (
                      <button type="button" className="as-ico" aria-label="image" aria-pressed={m === "image"} disabled={!canImage} onClick={() => setMode("image")} {...t}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
                          <path d="M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M16 9.5h.01" />
                        </svg>
                      </button>
                    )}</Tooltip>
                  </div>
                </div>
                {(notes.length > 0 || busy || out) && (
                  <div className="as-body" aria-live="polite">
                    {notes.map((n) => <p key={n} className="as-note" role="status">{n}</p>)}
                    {busy && <p className="as-wait" role="status"><i /><i /><i /><span className="as-sr">{m === "image" ? "drawing" : "thinking"}</span><i className="as-cur" aria-hidden="true" /></p>}
                    {!busy && out?.kind === "text" && <Reveal text={out.text} reduced={reduced} />}
                    {!busy && out?.kind === "image" && <img className="as-img" src={out.src} alt={`generated image: ${out.q}`} />}
                    {!busy && out?.kind === "error" && !notes.includes(out.message) && <p className="as-err">{out.message}</p>}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
