// Sync resume/resume.tex (single source of truth) into src/data/*.json without losing hand-written fields.
// Usage: node scripts/resume-sync.mjs [resume.tex] [--check]   |   node scripts/resume-sync.mjs --import <file.tex>

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// ---------- LaTeX -> text ----------

/** Drop \begin{comment} blocks and unescaped % comments. */
export function stripComments(tex) {
  return tex
    .replace(/\\begin\{comment\}[\s\S]*?\\end\{comment\}/g, "")
    .split("\n")
    .map((l) => l.replace(/(^|[^\\])%.*$/, "$1"))
    .join("\n");
}

/** Plain text of a LaTeX fragment, plus the [label, url] pairs of its \href commands. */
export function toText(s) {
  const links = [];
  const text = s
    .replace(/``(.*?)''/g, '"$1"')
    .replace(/`/g, "'")
    .replace(/\\textbf\{([^{}]*)\}/g, "$1")
    .replace(/\\href\{([^{}]*)\}\{([^{}]*)\}/g, (_, url, label) => (links.push([label, url]), label))
    .replace(/\\([%$&#])/g, "$1")
    .replace(/--/g, "–")
    .replace(/\s+/g, " ")
    .trim();
  return { text, links };
}

/** Read the balanced {...} group that starts at or after index i; returns [content, indexAfter]. */
function group(s, i) {
  i = s.indexOf("{", i);
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "\\") j++;
    else if (s[j] === "{") depth++;
    else if (s[j] === "}" && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  throw new Error("unbalanced braces in resume.tex");
}

const COMMANDS = { resumeSubheading: 4, resumeLine: 2, resumeItem: 1, resumeSkill: 2 };

/** Per section: ordered list of { cmd, args } for the resume macros. */
function sections(tex) {
  const body = stripComments(tex).split("\\begin{document}")[1] ?? "";
  const out = {};
  for (const part of body.split(/\\section\{/).slice(1)) {
    const [name, rest] = [part.slice(0, part.indexOf("}")), part.slice(part.indexOf("}") + 1)];
    const events = [];
    const re = /\\(resumeSubheading|resumeLine|resumeItem|resumeSkill)(?![A-Za-z])/g;
    let m;
    while ((m = re.exec(rest))) {
      const args = [];
      let at = re.lastIndex;
      for (let k = 0; k < COMMANDS[m[1]]; k++) {
        const [g, end] = group(rest, at);
        args.push(g);
        at = end;
      }
      re.lastIndex = at;
      events.push({ cmd: m[1], args });
    }
    out[name] = events;
  }
  return out;
}

/** Group events into entries: each head event (subheading / line) owns the resumeItems after it. */
function entries(events) {
  const list = [];
  for (const e of events) {
    if (e.cmd === "resumeItem") list.at(-1).items.push(toText(e.args[0]));
    else list.push({ head: e.args, items: [] });
  }
  return list;
}

const dash = (s) => s.replace(/\s*–\s*/, " – ").replace(/^(\d{4})-(\d{4})$/, "$1 – $2");
const ROLE = /\s+(Student Ambassador|Campus Partner|VP External)$/;
const ACTIVITY_ALIAS = {
  "Startup Founding Partnerships": { title: "'Sup", role: "Co-founder, Startup Founding Partnerships" },
};

export function parseResume(tex) {
  const sec = sections(tex);
  const work = entries(sec.Experience ?? []).map(({ head: [role, date, company, team], items }) => ({
    company: toText(company).text,
    role: toText(role).text,
    date: dash(toText(date).text),
    team: toText(team).text,
    description: items.map((i) => i.text),
    links: items.flatMap((i) => i.links),
  }));

  const projects = entries(sec.Projects ?? []).map(({ head: [line], items }) => {
    const [title, tags] = line.split("\\pipe");
    const t = toText(title);
    return {
      title: t.text,
      github: t.links[0]?.[1],
      tags: toText(tags ?? "").text.split(",").map((x) => x.trim()).filter(Boolean),
      highlights: items.map((i) => i.text),
    };
  });

  const activities = (sec.Involvements ?? []).map((e) => {
    const raw = e.args[0];
    const bold = /\\textbf\{([^{}]*)\}\s*\(([^)]*)\):\s*([\s\S]*)$/.exec(raw);
    const { text, links } = toText(bold[3]);
    const [, name, paren] = bold;
    const role = ROLE.exec(name)?.[1] ?? "";
    const isDate = /^\d{4}(-\d{4})?$/.test(paren);
    return {
      ...(ACTIVITY_ALIAS[name] ?? { title: name.replace(ROLE, ""), role }),
      date: isDate ? dash(paren) : "",
      description: isDate ? text : `${paren}: ${text}`,
      links,
    };
  });

  const skills = {};
  for (const e of sec["Technical Skills"] ?? []) {
    skills[toText(e.args[0]).text] = toText(e.args[1]).text.split(/,(?![^(]*\))/).map((x) => x.trim());
  }
  return { work, projects, activities, skills };
}

// ---------- merge into existing JSON ----------

/** Set obj[key]; a new key is inserted right after afterKey (or at the end), an existing one keeps its place. */
function put(obj, key, value, afterKey) {
  if (key in obj) {
    obj[key] = value;
    return obj;
  }
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v;
    if (k === afterKey) out[key] = value;
  }
  if (!(key in out)) out[key] = value;
  return out;
}

function setLinks(obj, links, afterKey) {
  if (links.length) return put(obj, "links", links, afterKey);
  delete obj.links;
  return obj;
}

/** Update the entry matching key(entry) from the parsed list, append unmatched ones. */
function mergeList(existing, parsed, keyOf, parsedKey, update, create) {
  const out = existing.map((e) => ({ ...e }));
  for (const p of parsed) {
    const i = out.findIndex((e) => norm(keyOf(e)) === norm(parsedKey(p)));
    if (i >= 0) out[i] = update(out[i], p);
    else out.push(update(create(p), p));
  }
  return out;
}

export function merge(parsed, data) {
  const work = mergeList(
    data.work, parsed.work, (e) => e.company, (p) => p.company,
    (e, p) => setLinks(put(put(put(e, "role", p.role), "date", p.date), "description", p.description, "summary"), p.links, "description"),
    (p) => ({ company: p.company, location: p.team }),
  );
  const projects = mergeList(
    data.projects, parsed.projects, (e) => e.title, (p) => p.title,
    (e, p) => {
      e = put(e, "highlights", p.highlights, "description");
      return p.github ? put(e, "github", p.github, "tags") : e;
    },
    (p) => ({ title: p.title, tags: p.tags }),
  );
  const activities = mergeList(
    data.activities, parsed.activities, (e) => e.title, (p) => p.title,
    (e, p) => {
      if (p.role) e = put(e, "role", p.role);
      if (p.date) e = put(e, "date", p.date);
      return setLinks(put(e, "descriptions", [p.description]), p.links, "descriptions");
    },
    (p) => ({ title: p.title, logos: [], role: p.role, date: p.date }),
  );
  return { work, projects, activities, skills: Object.keys(parsed.skills).length ? parsed.skills : data.skills };
}

// ---------- files ----------

/** JSON.stringify layout of the existing files: 2 spaces, links pairs on one line, optional one-line string arrays. */
export function format(value, inline = () => false) {
  const ser = (v, ind, key) => {
    if (Array.isArray(v) && v.length) {
      if (v.every((x) => typeof x === "string") && inline(key)) return `[${v.map((x) => JSON.stringify(x)).join(", ")}]`;
      const pad = "  ".repeat(ind + 1);
      const rows = v.map((x) => pad + (key === "links" ? JSON.stringify(x).replace(/","/g, '", "') : ser(x, ind + 1, key)));
      return `[\n${rows.join(",\n")}\n${"  ".repeat(ind)}]`;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const pad = "  ".repeat(ind + 1);
      const rows = Object.entries(v).map(([k, x]) => `${pad}${JSON.stringify(k)}: ${ser(x, ind + 1, k)}`);
      return `{\n${rows.join(",\n")}\n${"  ".repeat(ind)}}`;
    }
    return JSON.stringify(v);
  };
  return ser(value, 0) + "\n";
}

const FILES = [
  ["work", "work-experience.json", (k) => k === "tags"],
  ["projects", "projects.json", () => false],
  ["activities", "activities.json", () => false],
  ["skills", "skills.json", () => true],
];

export function sync({ texPath, dataDir, check }) {
  const tex = fs.readFileSync(texPath, "utf8");
  const read = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
  const data = Object.fromEntries(FILES.map(([k, f]) => [k, read(f)]));
  const merged = merge(parseResume(tex), data);
  const changed = [];
  for (const [k, f, inline] of FILES) {
    const file = path.join(dataDir, f);
    const next = format(merged[k], inline);
    if (next === fs.readFileSync(file, "utf8")) continue;
    changed.push(f);
    if (!check) fs.writeFileSync(file, next);
  }
  return changed;
}

// ---------- import ----------

const PHONE = /\+\d{1,3}[\s-]?\d[\d\s-]{6,}\d|\b[89]\d{3}[\s-]\d{4}\b/;

/** Remove the first \begin{comment} block that sits before "% Set page margins" (personal notes). */
export function stripNotes(tex) {
  const limit = tex.indexOf("% Set page margins");
  const a = tex.indexOf("\\begin{comment}");
  if (a < 0 || (limit >= 0 && a > limit)) return tex;
  const end = "\\end{comment}";
  const b = tex.indexOf(end, a);
  return b < 0 ? tex : tex.slice(0, a) + tex.slice(b + end.length).replace(/^\n/, "");
}

// ---------- CLI ----------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const args = process.argv.slice(2);
  if (args[0] === "--import") {
    if (!args[1]) throw new Error("usage: resume-sync.mjs --import <file.tex>");
    const tex = stripNotes(fs.readFileSync(args[1], "utf8"));
    if (PHONE.test(tex)) console.warn("warning: a phone number is still in the .tex; resume/ is a public repo");
    fs.writeFileSync(path.join(root, "resume/resume.tex"), tex);
    console.log("wrote resume/resume.tex (run npm run resume:sync next)");
  } else {
    const check = args.includes("--check");
    const texPath = args.find((a) => !a.startsWith("--")) ?? path.join(root, "resume/resume.tex");
    const changed = sync({ texPath, dataDir: path.join(root, "src/data"), check });
    console.log(changed.length ? `${check ? "out of date" : "updated"}: ${changed.join(", ")}` : "src/data already matches the resume");
    if (check && changed.length) process.exit(1);
  }
}
