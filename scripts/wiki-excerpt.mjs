// Build the private wiki excerpt for the unanswered-questions assistant. Run locally with node; never in CI.
//   node scripts/wiki-excerpt.mjs --dry-run      show which pages/chunks would upload
//   node scripts/wiki-excerpt.mjs                write admin/wiki-upload.local.sql and print the wrangler command
// Pages come from a GITIGNORED list (default admin/wiki-pages.local.txt), one path per line; blank lines and # comments
// are ignored. Paths are relative to the wiki root (--root <dir> or $WIKI_ROOT) or absolute. Wilson approves the list.
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { chunkPage, toSql } from "./wiki-chunk.mjs";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const dry = args.includes("--dry-run");
const listFile = resolve(flag("--list") ?? "admin/wiki-pages.local.txt");
const root = flag("--root") ?? process.env.WIKI_ROOT;
const out = resolve(flag("--out") ?? "admin/wiki-upload.local.sql");

let list;
try { list = readFileSync(listFile, "utf8"); } catch { console.error(`no page list at ${listFile}. create it (it is gitignored), one wiki page path per line.`); process.exit(1); }
const pages = list.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
if (!pages.length) { console.error("the page list is empty."); process.exit(1); }

const chunks = [];
for (const p of pages) {
  const abs = isAbsolute(p) ? p : resolve(root ?? ".", p);
  let md;
  try { md = readFileSync(abs, "utf8"); } catch { console.error(`cannot read ${abs}`); process.exit(1); }
  const page = (root ? relative(resolve(root), abs) : p).split("\\").join("/"); // wiki-relative path
  const c = chunkPage(page, md);
  console.log(`${page}: ${c.length} chunk(s), ${c.map((x) => x.text.split(/\s+/).length).join("/")} words`);
  if (dry) for (const x of c) console.log(`  - ${x.heading}`);
  chunks.push(...c);
}
console.log(`total: ${pages.length} page(s), ${chunks.length} chunk(s)`);

if (dry) process.exit(0);
writeFileSync(out, toSql(chunks));
console.log(`\nwrote ${out} (gitignored; contains private text, do not commit)\nupload (REPLACES all existing chunks):\n  cd admin && npx wrangler d1 execute portfolio-qa --remote --file ${relative(resolve("admin"), out)}`);
