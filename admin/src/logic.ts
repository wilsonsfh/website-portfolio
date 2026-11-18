// Pure logic for the admin worker (unit-tested with plain node).

const STOP = new Set(
  "a an and are as at be been but by can could did do does for from had has have he her him his how i in is it its me my of on or our she so than that the their them they this to was we were what when where which who why will with would you your wilson soon tell about any".split(" "),
);

/** FTS5 MATCH expression for a visitor question: stop words dropped, each term quoted, OR-joined. "" if nothing is left. */
export function ftsQuery(question: string): string {
  const terms = new Set<string>();
  for (const w of question.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (w.length >= 3 && !STOP.has(w)) terms.add(w);
    if (terms.size >= 12) break;
  }
  return [...terms].map((t) => `"${t}"`).join(" OR ");
}

export type Chunk = { page: string; heading: string; text: string };

export const NOTHING = "nothing in the wiki about this";

/** Messages for drafting an answer ONLY from wiki excerpts. */
export function suggestMessages(question: string, chunks: Chunk[], maxChars = 9000) {
  let size = 0;
  const parts: string[] = [];
  for (const c of chunks) {
    const piece = `[${c.heading}]\n${c.text}`;
    if (size + piece.length > maxChars) break;
    parts.push(piece);
    size += piece.length;
  }
  const system = `you draft answers for the portfolio site of wilson soon. a visitor asked a question the site's assistant could not answer.
write a short draft answer (1 to 3 sentences) using ONLY the EXCERPT below.
rules:
- lowercase, friendly and casual, like the site. no first person ("i"): write about wilson in the third person or state the fact directly.
- start with the answer itself. no preamble, no lists.
- never invent or guess. do not add facts that are not in the excerpt.
- the draft will be published to the public after wilson reviews it, so leave out anything private: health, family, relationships, money, grades, job search, salary, other people's names.
- if the excerpt does not contain the answer, reply with exactly: ${NOTHING}
EXCERPT:
${parts.join("\n\n---\n\n")}`;
  return [{ role: "system" as const, content: system }, { role: "user" as const, content: question }];
}

/** A non-GET request must come from the admin page itself (blocks cross-site form posts riding the Access cookie). */
export function sameOrigin(origin: string | null, url: string): boolean {
  return !origin || origin === new URL(url).origin;
}
