import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { stripComments, toText, parseResume, merge, format, stripNotes, sync } from "./resume-sync.mjs";

const tex = String.raw`\begin{document}
\section{Experience}
\resumeSubheading{Intern}{May 2026 -- Aug 2026}{Acme}{Team}
\resumeItemListStart
% \resumeItem{commented out}
\resumeItem{Grew \textbf{2x} DAU, saved 20\% via \href{https://a.dev}{labs} (§§quoted'') \& more} % trailing
\begin{comment}
\resumeItem{old bullet}
\end{comment}
\resumeItemListEnd
\section{Projects}
\resumeLine{\href{https://github.com/x/AppleNotestoX}{\textbf{AppleNotes to X}}\pipe Swift, Node.js}{}
\resumeItem{Built it}
\section{Involvements}
\resumeItem{\textbf{Microsoft Singapore Student Ambassador} (2026): Reached 300+ students}
\resumeItem{\textbf{Startup Founding Partnerships} (2026): Co-founded \href{https://s.dev}{§Sup} and raised \$5,000}
\resumeItem{\textbf{NUS Club VP External} (2024-2025): Raised \$41,500}
\section{Technical Skills}
\resumeSkill{Databases \& Cloud}{PostgreSQL, Cloudflare (Workers, D1), AWS}
\end{document}`.replaceAll("§", "`");

test("stripComments drops % comments and comment blocks but keeps \\%", () => {
  const out = stripComments("a \\% b % gone\n\\begin{comment}\nx\n\\end{comment}\nc");
  assert.ok(out.includes("a \\% b") && !out.includes("gone") && !out.includes("x\n") && out.includes("c"));
});

test("toText converts escapes, quotes, dashes and collects links", () => {
  const { text, links } = toText("\\textbf{a} 5\\% \\$1 C\\# ``q'' 1--2 \\href{u}{lab}");
  assert.equal(text, 'a 5% $1 C# "q" 1–2 lab');
  assert.deepEqual(links, [["lab", "u"]]);
});

test("parseResume reads work, projects, activities and skills", () => {
  const r = parseResume(tex);
  assert.equal(r.work.length, 1);
  assert.deepEqual(r.work[0].description, ['Grew 2x DAU, saved 20% via labs ("quoted") & more']);
  assert.deepEqual(r.work[0].links, [["labs", "https://a.dev"]]);
  assert.equal(r.work[0].date, "May 2026 – Aug 2026");
  assert.equal(r.projects[0].github, "https://github.com/x/AppleNotestoX");
  assert.deepEqual(r.projects[0].tags, ["Swift", "Node.js"]);
  assert.deepEqual(r.activities.map((a) => [a.title, a.role, a.date]), [
    ["Microsoft Singapore", "Student Ambassador", "2026"],
    ["'Sup", "Co-founder, Startup Founding Partnerships", "2026"],
    ["NUS Club", "VP External", "2024 – 2025"],
  ]);
  assert.deepEqual(r.activities[1].links, [["'Sup", "https://s.dev"]]);
  assert.deepEqual(r.skills, { "Databases & Cloud": ["PostgreSQL", "Cloudflare (Workers, D1)", "AWS"] });
});

test("merge keeps hand-written fields, matches loosely, appends new entries", () => {
  const data = {
    work: [{ company: "Acme", logo: "/a.png", role: "Old", date: "x", summary: "s", description: ["old"], tags: ["t"] }],
    projects: [{ title: "AppleNotestoX", logo: "/p.svg", highlights: ["old"], github: "g", live: "l" }],
    activities: [{ title: "'Sup", logos: [{ name: "'Sup", src: "/s.png" }], role: "r", date: "d", descriptions: ["old"] }],
    skills: { Old: ["x"] },
  };
  const m = merge(parseResume(tex), data);
  assert.deepEqual(Object.keys(m.work[0]), ["company", "logo", "role", "date", "summary", "description", "links", "tags"]);
  assert.equal(m.work[0].logo, "/a.png");
  assert.equal(m.work[0].role, "Intern");
  assert.deepEqual(m.projects[0].highlights, ["Built it"]);
  assert.equal(m.projects[0].live, "l");
  assert.equal(m.activities.length, 3);
  assert.equal(m.activities[0].logos[0].src, "/s.png");
  assert.deepEqual(m.activities[2], { title: "NUS Club", logos: [], role: "VP External", date: "2024 – 2025", descriptions: ["Raised $41,500"] });
  assert.deepEqual(m.skills, { "Databases & Cloud": ["PostgreSQL", "Cloudflare (Workers, D1)", "AWS"] });
});

test("format matches the data files' layout", () => {
  assert.equal(format({ a: { tags: ["x", "y"], links: [["l", "u"]] } }, (k) => k === "tags"),
    '{\n  "a": {\n    "tags": ["x", "y"],\n    "links": [\n      ["l", "u"]\n    ]\n  }\n}\n');
});

test("sync is idempotent and --check reports changes without writing", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "resume-sync-"));
  const texPath = path.join(dir, "r.tex");
  fs.writeFileSync(texPath, tex);
  const files = { "work-experience.json": [], "projects.json": [], "activities.json": [], "skills.json": {} };
  for (const [f, v] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), JSON.stringify(v, null, 2) + "\n");
  assert.equal(sync({ texPath, dataDir: dir, check: true }).length, 4);
  assert.equal(fs.readFileSync(path.join(dir, "projects.json"), "utf8"), "[]\n");
  assert.equal(sync({ texPath, dataDir: dir }).length, 4);
  assert.deepEqual(sync({ texPath, dataDir: dir }), []);
});

test("stripNotes removes only the comment block before '% Set page margins'", () => {
  const src = "\\usepackage{x}\n\\begin{comment}\nnotes\n\\end{comment}\n\n% Set page margins\n\\begin{comment}\nkeep\n\\end{comment}\n";
  const out = stripNotes(src);
  assert.ok(!out.includes("notes") && out.includes("keep") && out.includes("% Set page margins"));
});
