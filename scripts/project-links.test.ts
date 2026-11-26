// run: node --experimental-strip-types scripts/project-links.test.ts
import assert from "node:assert/strict";
import { PROJECT_LINKS, linkSegments } from "../src/lib/projectLinks.ts";

const CABO = "https://cabo.wilsonsoon.workers.dev";
const TB = "https://terminal-boss.wilsonsoon.workers.dev/terminal-boss/";

// a project name becomes a link; the text around it is untouched
assert.deepEqual(linkSegments("he built cabo, a card game."), [{ text: "he built " }, { text: "cabo", href: CABO }, { text: ", a card game." }]);
// any case and spelling of spaces or hyphens, original casing kept
assert.deepEqual(linkSegments("Terminal-Boss is an mcp server"), [{ text: "Terminal-Boss", href: TB }, { text: " is an mcp server" }]);
assert.deepEqual(linkSegments("TERMINAL BOSS"), [{ text: "TERMINAL BOSS", href: TB }]);
// several projects in one reply, in order, each to its own page
const two = linkSegments("patchbay and terminal boss share a site");
assert.deepEqual(two.filter((s) => s.href).map((s) => [s.text, s.href]), [["patchbay", "https://terminal-boss.wilsonsoon.workers.dev/patchbay/"], ["terminal boss", TB]]);
// whole words only
assert.deepEqual(linkSegments("a cabover truck, tracery and glassboxes"), [{ text: "a cabover truck, tracery and glassboxes" }]);
// the site's own apps are not linked
assert.deepEqual(linkSegments("open the terminal or the assistant or unread"), [{ text: "open the terminal or the assistant or unread" }]);
// a raw url the model still prints is linked, without trailing punctuation
assert.deepEqual(linkSegments("see https://cabo.wilsonsoon.workers.dev."), [{ text: "see " }, { text: CABO, href: CABO }, { text: "." }]);
// nothing to link, and empty text
assert.deepEqual(linkSegments("i don't know that one yet."), [{ text: "i don't know that one yet." }]);
assert.deepEqual(linkSegments(""), []);
// every link in the list is an https url
for (const p of PROJECT_LINKS) assert.ok(/^https:\/\/[^\s]+$/.test(p.href), p.name);
// segments always add back up to the original text
const s = "built 2unemployment, architecture relive, x bookmark injector, applenotestox and trace.";
assert.equal(linkSegments(s).map((x) => x.text).join(""), s);
assert.equal(linkSegments(s).filter((x) => x.href).length, 5);
console.log("project link tests ok");
