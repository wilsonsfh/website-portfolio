export type Segment = { text: string; href?: string };

export const PROJECT_LINKS: { name: string; href: string }[] = [
  { name: "2unemployment", href: "https://2unemployment.wilsonsoon.workers.dev/" },
  { name: "Architecture Relive", href: "https://architecture-relive.wilsonsoon.workers.dev/" },
  { name: "Cabo", href: "https://cabo.wilsonsoon.workers.dev" },
  { name: "Glassbox", href: "https://glassbox.wilsonsoon.workers.dev" },
  { name: "Mouthpiece", href: "https://mouthpiece.wilsonsoon.workers.dev" },
  { name: "Patchbay", href: "https://terminal-boss.wilsonsoon.workers.dev/patchbay/" },
  { name: "Terminal Boss", href: "https://terminal-boss.wilsonsoon.workers.dev/terminal-boss/" },
  { name: "TRACE", href: "https://trace.wilsonsoon.workers.dev" },
  { name: "AppleNotestoX", href: "https://applenotestox-demo.wilsonsfh.workers.dev" },
  { name: "X Bookmark Injector", href: "https://x-bookmark-injector-demo.wilsonsfh.workers.dev" },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// longest names first so "terminal boss" wins over any shorter name
const byName = [...PROJECT_LINKS].sort((a, b) => b.name.length - a.name.length);
const nameKey = (s: string) => s.toLowerCase().replace(/[ -]+/g, " ");
const hrefOf = new Map(byName.map((p) => [nameKey(p.name), p.href]));

const names = byName.map((p) => escape(p.name).replace(/ /g, "[ -]")).join("|");
const PATTERN = new RegExp(
  `(https?://[^\\s]+)|(?<![\\p{L}\\p{N}])(${names})(?![\\p{L}\\p{N}])`,
  "giu",
);
const TRAILING = /[.,;:!?)\]'"]+$/;

export function linkSegments(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  const push = (t: string, href?: string) => {
    if (t) out.push(href ? { text: t, href } : { text: t });
  };
  for (const m of text.matchAll(PATTERN)) {
    let hit = m[0];
    let href: string | undefined;
    if (m[1]) {
      hit = m[1].replace(TRAILING, "");
      href = hit;
    } else {
      href = hrefOf.get(nameKey(hit));
    }
    push(text.slice(last, m.index));
    push(hit, href);
    last = m.index + hit.length;
  }
  push(text.slice(last));
  return out;
}
