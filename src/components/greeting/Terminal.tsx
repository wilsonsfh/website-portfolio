import { useEffect, useRef, useState } from "react";
import { lede, aboutParagraphs } from "../../copy";
import type { AppId, Ctx } from "./apps";

const OPENABLE = ["work", "projects", "activities", "photos", "contact"] as const;
type Line = { kind: "in" | "out"; text: string };

const HELP = [
  "help                 this list",
  "whoami               who is this",
  "ls                   list files",
  "cat about.txt        read about.txt",
  "open <name>          open work, projects, involvements, photos or contact",
  "unroll               unroll or roll up the photo scrolls",
  "exit                 go to the plain site",
];

function run(cmd: string, ctx: Ctx): string[] {
  const [name, arg] = cmd.trim().split(/\s+/);
  switch (name) {
    case "help": return HELP;
    case "whoami": return [lede];
    case "ls": return ["about.txt  work/  projects/  involvements/  photos/  contact/"];
    case "cat":
      if (arg === "about.txt") return [lede, ...aboutParagraphs];
      return [arg ? `cat: ${arg}: no such file` : "usage: cat about.txt"];
    case "open":
      const id = arg === "involvements" ? "activities" : arg; // the app keeps its old id; "activities" still works
      if ((OPENABLE as readonly string[]).includes(id)) {
        ctx.open(id as AppId);
        return [`opening ${arg}`];
      }
      return ["usage: open <work|projects|involvements|photos|contact>"];
    case "unroll":
      ctx.unroll();
      return ["unrolling the photo scrolls"];
    case "exit":
      ctx.exit();
      return [];
    default:
      return [`${name}: command not found. try help`];
  }
}

export default function Terminal({ ctx }: { ctx: Ctx }) {
  const [lines, setLines] = useState<Line[]>([{ kind: "out", text: "wilson-os 0.1. type help" }]);
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [lines]);

  return (
    <div className="dk-term" onClick={() => { if (!window.getSelection()?.toString()) input.current?.focus(); }}>
      {lines.map((l, i) => (
        <p key={i} className={l.kind === "in" ? "in" : undefined}>{l.kind === "in" ? `$ ${l.text}` : l.text}</p>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const cmd = value.trim();
          setValue("");
          if (!cmd) return;
          setLines((ls) => [...ls, { kind: "in", text: cmd }, ...run(cmd, ctx).map((text) => ({ kind: "out" as const, text }))]);
        }}
      >
        <label>
          <span aria-hidden="true">$ </span>
          <input
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="terminal command"
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
          />
        </label>
      </form>
      <div ref={end} />
    </div>
  );
}
