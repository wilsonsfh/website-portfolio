import assert from "node:assert/strict";
import { chunkPage, clean, toSql } from "./wiki-chunk.mjs";

const w = (n, word = "word") => Array(n).fill(word).join(" ");

// cleaning
const md = "---\ntitle: x\ntags: [a]\n---\n# Title\nsee [[Other Page|that page]] and [[plain]] and [docs](https://x.dev/a) <!-- hide --> https://bare.url/x\n";
const c = clean(md);
assert.ok(!c.includes("title: x") && !c.includes("[[") && !c.includes("https") && !c.includes("hide"));
assert.ok(c.includes("that page") && c.includes("plain") && c.includes("docs"));

// heading split, small sections merge into one chunk (keeps the first heading, later ones inline)
let ch = chunkPage("concepts/a.md", `# A\n${w(100)}\n## B\n${w(100)}\n## C\n${w(100)}`);
assert.equal(ch.length, 1);
assert.equal(ch[0].heading, "A");
assert.ok(ch[0].text.includes("\nB\n") && ch[0].text.includes("\nC\n"));
assert.equal(ch[0].page, "concepts/a.md");

// big sections split on paragraphs, each <= 600 words
ch = chunkPage("p.md", `# Big\n${Array(5).fill(w(250)).join("\n\n")}`);
assert.ok(ch.length >= 3 && ch.every((x) => x.text.split(/\s+/).length <= 600 && x.heading === "Big"));

// two full-size sections stay separate
ch = chunkPage("p.md", `## One\n${w(400)}\n## Two\n${w(400)}`);
assert.deepEqual(ch.map((x) => x.heading), ["One", "Two"]);

// noise sections dropped; headings inside code fences ignored; no headings -> file name
ch = chunkPage("dir/my-page.md", `intro text\n\n\`\`\`\n# not a heading\n\`\`\`\n\n## Related\n[[x]]\n\n## See also\n[[y]]`);
assert.equal(ch.length, 1);
assert.equal(ch[0].heading, "my-page");
assert.ok(ch[0].text.includes("# not a heading") && !ch[0].text.includes("Related") && !ch[0].text.includes("See also"));
assert.deepEqual(chunkPage("e.md", "---\na: b\n---\n"), []);

// sql: replace-all, quotes escaped
const sql = toSql([{ page: "a.md", heading: "it's", text: "o'brien" }]);
assert.ok(sql.startsWith("DELETE FROM wiki_chunks;\n"));
assert.ok(sql.includes("VALUES ('a.md', 'it''s', 'o''brien');"));
console.log("chunker tests ok");
