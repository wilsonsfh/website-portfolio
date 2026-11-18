import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import workExperience from "../../data/work-experience.json";
import projects from "../../data/projects.json";
import activities from "../../data/activities.json";
import { lede, aboutParagraphs, skillLine, contacts } from "../../copy";
import { askChat } from "../../lib/ai";
import type { AppId, Ctx } from "./apps";

type Line = { kind: "in" | "out" | "head" | "err"; text: string }; // head: a bold, accent-coloured line
type Out = Line[] | Promise<Line[]>;

const out = (...t: string[]): Line[] => t.map((text) => ({ kind: "out", text }));
const head = (text: string): Line => ({ kind: "head", text });
const err = (text: string): Line[] => [{ kind: "err", text }];

// apps by the names a visitor might type
const APP_NAMES: Record<string, AppId> = {
  about: "about", "about.txt": "about", work: "work", projects: "projects", involvements: "activities", activities: "activities",
  photos: "photos", contact: "contact", messages: "messages", terminal: "terminal", plain: "plain", plaintext: "plain",
  "plaintext-version.html": "plain", v1: "v1",
};

const FILES: Record<string, () => Line[]> = {
  "about.txt": () => [head("about"), ...out(lede, ...aboutParagraphs, `skills: ${skillLine}`)],
  "work.txt": () => workExperience.flatMap((j) => [head(`${j.company.toLowerCase()} / ${j.role.toLowerCase()}`), ...out(j.date.toLowerCase(), ...j.description.map((d) => `· ${d}`), "")]),
  "projects.txt": () => projects.flatMap((p) => [head(p.title.toLowerCase()), ...out(p.description, `built with: ${p.tags.join(", ").toLowerCase()}`, "")]),
  "involvements.txt": () => activities.flatMap((a) => [head(`${a.title.toLowerCase()}${a.role ? ` / ${a.role.toLowerCase()}` : ""}`), ...out(...a.descriptions.map((d) => `· ${d}`), "")]),
  "contact.txt": () => contacts.map((c) => ({ kind: "out" as const, text: `${c.label.padEnd(9)}${c.text}` })),
};

const HELP: [string, string][] = [
  ["help", "this list"],
  ["ls", "list files"],
  ["cat <file>", "read a file, e.g. cat work.txt"],
  ["open <app>", "open an app: work, projects, photos, timeline, v1, …"],
  ["close <app>", "close an app"],
  ["ask <question>", "ask the assistant about wilson"],
  ["whoami", "who is this"],
  ["neofetch", "system info"],
  ["theme [dark|light]", "switch the colours"],
  ["github / linkedin / email", "open a contact link"],
  ["history", "what you typed"],
  ["clear", "clear the screen"],
  ["exit", "close the terminal"],
];
const COMMANDS = ["help", "ls", "cat", "open", "close", "ask", "whoami", "neofetch", "theme", "github", "linkedin", "x", "email", "history", "clear", "date", "echo", "exit"];

const started = Date.now();
const uptime = () => {
  const s = Math.round((Date.now() - started) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

const link = (label: string): Line[] => {
  const c = contacts.find((x) => x.label === label);
  if (!c) return err(`${label}: not found`);
  window.open(c.href, c.href.startsWith("mailto") ? "_self" : "_blank", "noopener,noreferrer");
  return out(`opening ${c.text}`);
};

function run(cmd: string, ctx: Ctx, history: string[]): Out {
  const [name, ...rest] = cmd.trim().split(/\s+/);
  const arg = rest.join(" ");
  const lower = arg.toLowerCase();
  switch (name.toLowerCase()) {
    case "help": return [head("commands"), ...HELP.map(([c, d]) => ({ kind: "out" as const, text: `${c.padEnd(26)}${d}` })), ...out("", "tab completes, ↑ and ↓ walk through what you typed.")];
    case "ls": return out(Object.keys(FILES).join("  "));
    case "cat": {
      const f = FILES[lower] ?? FILES[`${lower}.txt`];
      if (f) return f();
      return err(arg ? `cat: ${arg}: no such file. try ls` : "usage: cat <file>, e.g. cat work.txt");
    }
    case "open": {
      if (lower === "timeline") { ctx.unroll(); return out("unrolling the timeline"); }
      const id = APP_NAMES[lower];
      if (!id) return err(arg ? `open: ${arg}: no such app. try: work, projects, photos, timeline, v1` : "usage: open <app>");
      ctx.open(id);
      return out(`opening ${lower}`);
    }
    case "close": {
      const id = APP_NAMES[lower];
      if (!id) return err(arg ? `close: ${arg}: no such app` : "usage: close <app>");
      ctx.close(id);
      return id === "terminal" ? [] : out(`closed ${lower}`);
    }
    case "ask": {
      if (!arg) return err("usage: ask <question>, e.g. ask what did wilson build at cloudflare?");
      return askChat([{ role: "user", content: arg }]).then((r) => (r.ok ? out(r.answer) : err(r.message)));
    }
    case "whoami": return out("you're a visitor. this desktop belongs to wilson soon.", lede);
    case "neofetch": {
      const job = workExperience[0];
      return [
        head("wilson@wilson-os"),
        ...out(
          "----------------",
          "os        wilson-os 0.1 (green print)",
          `now       ${job.role.toLowerCase()} @ ${job.company.toLowerCase()}`,
          "studying  computer science, nus",
          "based     singapore",
          `apps      ${Object.keys(FILES).length + 6} on the desktop`,
          `uptime    ${uptime()}`,
          "shell     terminal.tsx",
        ),
      ];
    }
    case "theme": {
      const dark = lower === "dark" ? true : lower === "light" ? false : !document.documentElement.classList.contains("dark");
      document.documentElement.classList.toggle("dark", dark);
      try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch {}
      return out(`theme: ${dark ? "dark" : "light"}`);
    }
    case "github": case "linkedin": case "x": case "email": return link(name.toLowerCase());
    case "history": return history.length ? out(...history.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`)) : out("nothing yet");
    case "date": return out(new Date().toString().toLowerCase());
    case "echo": return out(arg);
    case "exit": case "quit":
      ctx.close("terminal");
      return [];
    case "sudo": return err("nice try. you are not in the sudoers file. this incident will be reported (to nobody).");
    case "cd": return out("there's only one folder here. try ls");
    case "rm": return err("rm: nothing here is yours to delete :)");
    case "vim": case "nvim": return out("you'd never get out. try cat instead");
    case "hi": case "hello": case "hey": return out("hello! try help, or ask a question with ask");
    default: return err(`${name}: command not found. try help`);
  }
}

// tab completion: a command name, or the argument of cat / open / close
function complete(value: string): string {
  const parts = value.split(" ");
  const pick = (opts: string[], word: string) => {
    const hits = opts.filter((o) => o.startsWith(word.toLowerCase()));
    if (hits.length === 1) return hits[0];
    if (!hits.length) return word;
    let p = hits[0];
    for (const h of hits) while (!h.startsWith(p)) p = p.slice(0, -1); // longest shared start
    return p.length > word.length ? p : word;
  };
  if (parts.length === 1) {
    const c = pick(COMMANDS, parts[0]);
    return c === parts[0] || !COMMANDS.includes(c) ? c : `${c} `;
  }
  const [cmd, ...rest] = parts;
  const opts = cmd === "cat" ? Object.keys(FILES) : cmd === "open" || cmd === "close" ? [...Object.keys(APP_NAMES).filter((k) => !k.includes(".")), "timeline"] : [];
  return `${cmd} ${pick(opts, rest.join(" "))}`;
}

const keyboardUp = () => !!window.visualViewport && window.visualViewport.height < window.innerHeight - 120;

export default function Terminal({ ctx }: { ctx: Ctx }) {
  const [lines, setLines] = useState<Line[]>([{ kind: "out", text: "wilson-os 0.1. type help, or try: cat work.txt, open photos, ask what did wilson build at cloudflare?" }]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const history = useRef<string[]>([]);
  const hpos = useRef(0); // position while walking the history with up/down
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const touch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [lines, busy]);

  const submit = () => {
    const cmd = value.trim();
    setValue("");
    if (!cmd) { setLines((ls) => [...ls, { kind: "in", text: "" }]); return; }
    if (history.current[history.current.length - 1] !== cmd) history.current.push(cmd);
    hpos.current = history.current.length;
    if (cmd === "clear") { setLines([]); return; }
    const res = run(cmd, ctx, history.current);
    const echo: Line = { kind: "in", text: cmd };
    if (Array.isArray(res)) { setLines((ls) => [...ls, echo, ...res]); return; }
    setLines((ls) => [...ls, echo]);
    setBusy(true);
    res.then((r) => setLines((ls) => [...ls, ...r])).finally(() => setBusy(false));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const h = history.current;
    if (e.key === "Enter") { e.preventDefault(); if (!busy) submit(); }
    else if (e.key === "Tab") { e.preventDefault(); setValue((v) => complete(v)); }
    else if (e.key === "ArrowUp" && h.length) { e.preventDefault(); hpos.current = Math.max(0, hpos.current - 1); setValue(h[hpos.current]); }
    else if (e.key === "ArrowDown" && h.length) { e.preventDefault(); hpos.current = Math.min(h.length, hpos.current + 1); setValue(h[hpos.current] ?? ""); }
    else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); setLines([]); }
  };

  // phones: one tap anywhere brings the keyboard up. A field that is focused without its keyboard (focus that did
  // not come from a tap) shows only the bar above the keyboard, so blur it first and focus again inside the tap.
  const focusInput = () => {
    if (window.getSelection()?.toString()) return;
    const el = input.current;
    if (!el) return;
    if (document.activeElement === el) {
      if (!touch || keyboardUp()) return;
      el.blur();
    }
    el.focus({ preventScroll: true });
  };

  return (
    <div className="dk-term" onClick={focusInput}>
      {lines.map((l, i) => (
        <p key={i} className={l.kind === "out" ? undefined : l.kind}>{l.kind === "in" ? <><span className="dk-prompt">wilson@os ~ $</span> {l.text}</> : l.text}</p>
      ))}
      {busy && <p className="dk-wait">thinking…</p>}
      <label className="dk-line">
        <span className="dk-prompt" aria-hidden="true">wilson@os ~ $&nbsp;</span>
        <input
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          aria-label="terminal command"
          autoFocus={!touch} // a phone opens its keyboard only from a tap, so no focus on open
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
        />
      </label>
      <div ref={end} />
    </div>
  );
}
