// Pure chunker for wiki pages (no fs), used by scripts/wiki-excerpt.mjs and unit-tested.

const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const NOISE_HEADING = /^(related|see also|links|references|backlinks|sources)\b/i;

/** Drop frontmatter, HTML comments, wikilink/link syntax and bare urls; keep the readable text. */
export function clean(md) {
  return md
    .replace(/^﻿/, "")
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/!\[\[[^\]]*\]\]/g, "")
    .replace(/\[\[([^\]|#]*)(?:#[^\]|]*)?\|([^\]]*)\]\]/g, "$2")
    .replace(/\[\[([^\]#]*)(?:#[^\]]*)?\]\]/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Split into {heading, text} sections on markdown headings (levels 1-3), ignoring fenced code. Noise sections are dropped. */
function sections(text, fallbackHeading) {
  const out = [];
  let cur = { heading: fallbackHeading, lines: [] };
  let fence = false;
  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const h = !fence && line.match(/^(#{1,3})\s+(.*?)\s*#*$/);
    if (h) {
      out.push(cur);
      cur = { heading: h[2] || fallbackHeading, lines: [] };
    } else cur.lines.push(line);
  }
  out.push(cur);
  return out
    .map((s) => ({ heading: s.heading, text: s.lines.join("\n").trim() }))
    .filter((s) => s.text && !NOISE_HEADING.test(s.heading));
}

/** Break an oversized section on paragraph boundaries into pieces of at most max words. */
function splitBig(s, max) {
  if (words(s.text) <= max) return [s];
  const pieces = [];
  let buf = [];
  let n = 0;
  const flush = () => {
    if (buf.length) pieces.push({ heading: s.heading, text: buf.join("\n\n") });
    buf = [];
    n = 0;
  };
  for (const p of s.text.split(/\n{2,}/)) {
    const w = words(p);
    if (n && n + w > max) flush();
    buf.push(p);
    n += w;
  }
  flush();
  return pieces;
}

/**
 * Chunk one page: split by heading, break sections over `max` words, merge small neighbours until they reach `min` words.
 * Returns [{ page, heading, text }]. A merged chunk keeps the first heading and shows later headings inline.
 */
export function chunkPage(page, md, { min = 300, max = 600 } = {}) {
  const fallback = page.replace(/^.*\//, "").replace(/\.md$/i, "");
  const parts = sections(clean(md), fallback).flatMap((s) => splitBig(s, max));
  const chunks = [];
  let cur = null;
  for (const p of parts) {
    if (cur && words(cur.text) < min && words(cur.text) + words(p.text) <= max) {
      cur.text += `\n\n${p.heading}\n${p.text}`;
    } else {
      if (cur) chunks.push(cur);
      cur = { page, heading: p.heading, text: p.text };
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

/** Replace-all SQL: delete old chunks (the FTS triggers follow), then insert the new ones. */
export function toSql(chunks) {
  const lines = ["DELETE FROM wiki_chunks;"];
  for (const c of chunks) lines.push(`INSERT INTO wiki_chunks (page, heading, text) VALUES (${q(c.page)}, ${q(c.heading)}, ${q(c.text)});`);
  return lines.join("\n") + "\n";
}
