// Regenerates worker/knowledge.md from the allowlist in docs/ai-chat-decisions.md.
// Reads ONLY: the two wiki project pages, src/data/{work-experience,projects,activities}.json,
// and the hand-written excerpts below. Nothing else from the wiki is ever opened.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const WIKI = process.env.WIKI_DIR ?? "/Users/WilsonSoon/Projects/Personal_LLM_Wiki/wiki";
const DATA = join(here, "..", "src", "data");

const WIKI_PAGES = ["projects/apple-notestox.md", "projects/x-bookmark-injector.md"];

// Blocks (paragraph or single bullet) matching these are dropped: they name private notes
// or job-application material that the decisions doc does not allow.
const REDACT = [/makeable/i, /raw\/personal-journal/, /raw\/\{journal/];

// Explicit rewrites so no sentence is left dangling once wikilinks are removed.
const REWRITE = [
  [/Local repository:\s*`~\/Projects\/x-bookmark-injector`;\s*public GitHub:/, "Public GitHub:"],
  [/Load `~\/Projects\/x-bookmark-injector\/dist`/, "Load the extension's `dist` folder"],
  [/Sources: \[\[[^\]]*\]\] and\s+\[\[[^\]]*\]\]\.\s*/g, ""],
  [/All status rows reflect \[\[[^\]]*\]\]\.[ ]*/g, ""],
  [/ ?One of the instances behind \[\[[^\]]*\]\]\./g, ""],
  [/\s*Detail:\s*\[\[[^\]]*\]\](,\s*\[\[[^\]]*\]\])*\.?/g, ""],
  [/\n*Source: \[\[[^\]]*\]\]\.?/g, ""],
  [/Source: \[\[[^\]]*\]\]\./g, ""],
  [/ \(\[\[[^\]]*\]\], agent-observed\)/g, ""],
  [/Agent-observed session, ([^(]*?)\s*\(\[\[[^\]]*\]\]\):/, "Session, $1:"],
  [/\[\[digital-minimalism-and-dopamine\]\] can/, "Digital minimalism can"],
  [/placement from\s+\[\[adtech-and-real-time-bidding\]\]/, "placement from ad tech"],
  [/instance of \[\[local-first-knowledge-pipelines\]\]:/, "instance of a local-first knowledge pipeline:"],
  [/This is a personal instance of \[\[agent-operating-model\|the controlled run as product\]\]:/, "This is a personal instance of the controlled run as a product:"],
];

function cleanPage(md) {
  md = md.replace(/^---\n[\s\S]*?\n---\n/, ""); // frontmatter
  md = md.replace(/\n## Related[\s\S]*$/, "\n"); // "related" section (last in both pages)
  const blocks = [];
  let cur = [];
  const flush = () => { if (cur.length) blocks.push(cur.join("\n")); cur = []; };
  for (const line of md.split("\n")) {
    if (line.trim() === "") { flush(); blocks.push(""); }
    else { if (/^(- |\d+\. )/.test(line)) flush(); cur.push(line); }
  }
  flush();
  md = blocks.filter((b) => !REDACT.some((r) => r.test(b))).join("\n");
  for (const [re, to] of REWRITE) md = md.replace(re, to);
  md = md.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1"); // [[a|b]] -> b
  md = md.replace(/\s*\[\[[^\]]*\]\]/g, ""); // bare wikilinks -> removed
  md = md.replace(/^> \[!\w+\]\s*/gm, "> "); // callout markers
  md = md.replace(/\n{3,}/g, "\n\n").replace(/^#/gm, "##").trim(); // demote headings
  return md;
}

const out = [];
const missing = [];
out.push("# Knowledge about Wilson Soon (built from an allowlist; see docs/ai-chat-decisions.md)\n");

// 1. wiki project pages
for (const rel of WIKI_PAGES) {
  const p = join(WIKI, rel);
  if (!existsSync(p)) { missing.push(p); continue; }
  out.push(`## Project page: ${rel.replace("projects/", "").replace(".md", "")}\n`);
  out.push(cleanPage(readFileSync(p, "utf8")).replace(/^## /, "### ") + "\n");
}

// 2. public site data
const J = (f) => JSON.parse(readFileSync(join(DATA, f), "utf8"));
const bullets = (a) => (a ?? []).map((x) => `- ${x}`).join("\n");
out.push("## Work experience (public site data)\n");
for (const w of J("work-experience.json"))
  out.push(`### ${w.role}, ${w.company} (${w.date}, ${w.location})\n${bullets(w.description)}\nTags: ${(w.tags ?? []).join(", ")}\n`);
const render = (o) => {
  const head = [o.title, o.role, o.date].filter(Boolean).join(" | ");
  const lines = [`### ${head}`];
  if (o.description) lines.push(String(o.description));
  for (const k of ["highlights", "descriptions"]) if (Array.isArray(o[k])) lines.push(bullets(o[k]));
  if (Array.isArray(o.tags) && o.tags.length) lines.push(`Tags: ${o.tags.join(", ")}`);
  for (const k of Object.keys(o)) if (!["title","role","date","description","highlights","descriptions","tags"].includes(k) && o[k] && typeof o[k] !== "object") lines.push(`${k}: ${o[k]}`);
  return lines.join("\n") + "\n";
};
out.push("## Projects (public site data)\n");
for (const p of J("projects.json")) out.push(render(p));
out.push("## Activities (public site data)\n");
for (const a of J("activities.json")) out.push(render(a));

// 3. hand-written excerpts (Wilson's decisions doc, public wording)
out.push(`## Cloudflare APJC Tech Summit
Wilson attended the Cloudflare APJC Tech Summit in Kuala Lumpur, 3 to 6 August 2026.
`);
out.push(`## Preparation-time app
At Cloudflare, Wilson built an app that integrates and automates criteria matching for clients, so customer engineers prepare better and spend less time on technical preparation before meeting a client. It primes them with what they need from the client's data before the conversation, so they don't have to gather it all themselves. 100+ customer engineers use it. After his internship people kept using it and building on it, because its source is open to the rest of the Cloudflare team.
`);
out.push(`## AI workflow
Wilson uses MCP servers and agent skills in his AI and agentic workflow, for example a Canvas MCP, a Socratic tutor skill and a 4-step Karpathy-guidelines skill.
`);

if (missing.length) {
  console.error("MISSING source files (not invented):\n" + missing.join("\n"));
  out.push(`<!-- missing sources: ${missing.join(", ")} -->`);
}
writeFileSync(join(here, "knowledge.md"), out.join("\n").replace(/\n{3,}/g, "\n\n"));
console.log("wrote knowledge.md");
