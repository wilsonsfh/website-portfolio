import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectKnowledge, FixedWindow, UNKNOWN_REPLY, buildAnswersSection, isUnknown, visitorId, normalizeQuestion, allowedOrigin, extractText, limitReason, nextUtcMidnight, validateChat, validateImagePrompt, refersToWilson, unsafeForWilson, wilsonPrompt, imageMime, chatPersona, unknownReply, systemPrompt } from "../src/logic.ts";

// fallback decision
assert.equal(limitReason(new Error("3036: You have used up your daily free allocation of 10,000 neurons")), "daily_limit");
assert.equal(limitReason(new Error("AiError: 3040: Capacity temporarily exceeded")), "capacity");
assert.equal(limitReason({ status: 429 }), "daily_limit");
assert.equal(limitReason(new Error("5007: No such model")), null);
assert.equal(limitReason(new Error("3006: Request is too large")), null);

// fixed window
const w = new FixedWindow();
assert.ok(w.hit("a", 2, 1000, 0) && w.hit("a", 2, 1000, 1));
assert.ok(!w.hit("a", 2, 1000, 2));
assert.ok(w.hit("b", 2, 1000, 2)); // other key unaffected
assert.ok(w.hit("a", 2, 1000, 1001)); // window rolled

// validation
assert.ok(validateChat({ messages: [{ role: "user", content: "hi" }] }).ok);
assert.ok(!validateChat({ messages: [] }).ok);
assert.ok(!validateChat({ messages: [{ role: "system", content: "x" }] }).ok);
assert.ok(!validateChat({ messages: [{ role: "assistant", content: "x" }] }).ok);
assert.ok(!validateChat({ messages: [{ role: "user", content: "x".repeat(501) }] }).ok);
assert.ok(!validateImagePrompt({ prompt: "  " }).ok);
assert.ok(!validateImagePrompt({ prompt: "x".repeat(301) }).ok);

// cors, extract, reset
assert.equal(allowedOrigin("https://a.com", "https://a.com, https://b.com"), "https://a.com");
assert.equal(allowedOrigin("https://evil.com", "https://a.com"), null);
assert.equal(extractText({ response: " hi " }), "hi");
assert.equal(extractText({ choices: [{ message: { content: "yo" } }] }), "yo");
assert.equal(nextUtcMidnight(Date.UTC(2026, 10, 17, 13)), Date.UTC(2026, 10, 18));
// sentinel
assert.ok(isUnknown("UNKNOWN"));
assert.ok(isUnknown("  unknown \n"));
assert.ok(isUnknown("Unknown."));
assert.ok(isUnknown("UNKNOWN - not in the knowledge"));
assert.ok(isUnknown('"UNKNOWN"'));
assert.ok(!isUnknown("i don't know"));
assert.ok(!isUnknown("wilson studies at nus. unknown to many, he builds"));
assert.ok(!isUnknown("unknowns are fun"));
assert.ok(!isUnknown(""));
assert.ok(UNKNOWN_REPLY === UNKNOWN_REPLY.toLowerCase());

// normalization / dedupe
assert.equal(normalizeQuestion("  What are his HOBBIES?? "), "what are his hobbies");
assert.equal(normalizeQuestion("what's   his\thobby..."), "what s his hobby");
assert.equal(normalizeQuestion("What are his hobbies?"), normalizeQuestion("what are his hobbies"));
assert.equal(normalizeQuestion("???"), "");

// answers section
assert.equal(buildAnswersSection([]), "");
const sec = buildAnswersSection([{ question: "hobbies?", answer: "climbing\nand  chess" }]);
assert.ok(sec.includes("- q: hobbies?\n  a: climbing and chess"));
const many = Array.from({ length: 100 }, (_, i) => ({ question: `q${i}`, answer: "a" }));
assert.equal(buildAnswersSection(many).split("- q:").length - 1, 40); // newest 40
const big = [{ question: "q1", answer: "x".repeat(60) }, { question: "q2", answer: "y".repeat(60) }, { question: "q3", answer: "z" }];
const capped = buildAnswersSection(big, 40, 100);
assert.ok(capped.includes("q1") && !capped.includes("q2") && !capped.includes("q3")); // stops at the char cap, keeps order
// image of wilson: reference photos only when the prompt is about him; always a stylised illustration
assert.ok(refersToWilson("wilson climbing a mountain"));
assert.ok(refersToWilson("draw yourself as a knight"));
assert.ok(refersToWilson("Draw YOU surfing"));
assert.ok(!refersToWilson("a cat on a skateboard"));
assert.ok(!refersToWilson("draw me a dragon")); // "me" is the visitor
assert.ok(unsafeForWilson("wilson naked"));
assert.ok(unsafeForWilson("you holding a gun"));
assert.ok(!unsafeForWilson("you playing guitar"));
const wp = wilsonPrompt("a realistic photo of wilson playing volleyball");
assert.ok(!/realistic|photo\b/i.test(wp.split("SCENE:")[1])); // photoreal words are dropped from the scene
assert.ok(wp.includes("image 0") && /illustration/i.test(wp));
assert.ok(wilsonPrompt("wilson as pixel art").includes("pixel art"));
assert.equal(imageMime("/9j/4AAQ"), "image/jpeg");
assert.equal(imageMime("iVBORw0K"), "image/png");
assert.equal(imageMime("UklGRiQ"), "image/webp");
console.log("logic tests ok");

// chat log visitor id: a browser uuid passes; anything else is grouped as "anon"
assert.equal(visitorId({ visitor: "3f2a9c1e-7b4d-4e2a-9f1c-0a1b2c3d4e5f" }), "3f2a9c1e-7b4d-4e2a-9f1c-0a1b2c3d4e5f");
assert.equal(visitorId({}), "anon");
assert.equal(visitorId({ visitor: 42 }), "anon");
assert.equal(visitorId({ visitor: "short" }), "anon");
assert.equal(visitorId({ visitor: "x'; DROP TABLE chat_log; --" }), "anon");
assert.equal(visitorId(null), "anon");

// persona: "(1) unread" sends as:"wilson" and is answered by wilson in the first person; anything else is the site assistant
assert.equal(chatPersona({ as: "wilson" }), "wilson");
assert.equal(chatPersona({}), "assistant");
assert.equal(chatPersona({ as: "admin" }), "assistant");
assert.equal(chatPersona(null), "assistant");
assert.equal(unknownReply("assistant"), UNKNOWN_REPLY);
assert.ok(!/\bwilson\b/.test(unknownReply("wilson"))); // wilson doesn't refer to himself in the third person
assert.ok(unknownReply("wilson") === unknownReply("wilson").toLowerCase());
const pa = systemPrompt("assistant", "K-BODY"), pw = systemPrompt("wilson", "K-BODY");
assert.ok(pa.endsWith("KNOWLEDGE:\nK-BODY") && pw.endsWith("KNOWLEDGE:\nK-BODY"));
assert.ok(pa.includes("you are the assistant on wilson soon's portfolio site"));
assert.ok(pw.includes("you are wilson soon") && /first person/.test(pw) && !pw.includes("you are the assistant"));
assert.ok(/honest/.test(pw)); // asked "are you a bot?", it says it is an ai stand-in, not the real wilson
// small talk and follow-ups are not "facts about wilson", so they must not fall to UNKNOWN (both personas)
for (const p of [pa, pw]) assert.ok(/how's wilson/.test(p) && /what do you mean/.test(p));
console.log("persona tests ok");

// ---- selectKnowledge: send only the project entries a question is about, plus a one-line list of all projects ----
const FULL = "# About\n\n## Who he is\nbased in sg\n\n## Projects\n\n### Alpha App\nalpha details\n- Tags: React, Three.js.\n\n### Beta Tool (Mar 2026)\nbeta details\n- Tags: Python, Flask.\n\n### Gamma Kit\ngamma details\n- Tags: React, Python.\n\n## Activities\nhackathons\n";
const SHORT = "# short\n\n## Who he is\nx\n\n## Projects\n- Alpha App: one-liner a\n- Beta Tool: one-liner b\n- Gamma Kit: one-liner c\n\n## Activities\ny\n";
const ask = (c: string) => [{ role: "user" as const, content: c }];
const has = (s: string, ...parts: string[]) => parts.every((p) => s.includes(p));
const lacks = (s: string, ...parts: string[]) => parts.every((p) => !s.includes(p));

// a name in the question picks that entry; everything outside Projects stays; every project keeps a one-liner
let sel = selectKnowledge(FULL, SHORT, ask("tell me about beta tool"));
assert.ok(has(sel, "beta details", "one-liner a", "one-liner b", "one-liner c", "based in sg", "hackathons"));
assert.ok(lacks(sel, "alpha details", "gamma details"));
// case, hyphen and spacing do not matter
assert.ok(has(selectKnowledge(FULL, SHORT, ask("ALPHA-APP?")), "alpha details"));
assert.ok(lacks(selectKnowledge(FULL, SHORT, ask("alphabet soup")), "alpha details")); // whole words only
// a general question gets only the one-liners
sel = selectKnowledge(FULL, SHORT, ask("what has he built?"));
assert.ok(has(sel, "one-liner a", "one-liner b", "one-liner c") && lacks(sel, "alpha details", "beta details", "gamma details"));
// a follow-up with no name keeps the project from the recent turns
sel = selectKnowledge(FULL, SHORT, [{ role: "user", content: "tell me about alpha app" }, { role: "assistant", content: "it is a thing." }, { role: "user", content: "how many tests does it have?" }]);
assert.ok(has(sel, "alpha details") && lacks(sel, "beta details"));
// a tag in the latest question picks entries that carry it; a name match is not needed
sel = selectKnowledge(FULL, SHORT, ask("which project uses three.js?"));
assert.ok(has(sel, "alpha details") && lacks(sel, "beta details", "gamma details"));
sel = selectKnowledge(FULL, SHORT, ask("anything with python?"));
assert.ok(has(sel, "beta details", "gamma details") && lacks(sel, "alpha details"));
// no Projects section in either file: leave the knowledge untouched
assert.equal(selectKnowledge("## Who he is\nx\n", SHORT, ask("alpha app")), "## Who he is\nx\n");
assert.equal(selectKnowledge(FULL, "## Who he is\nx\n", ask("alpha app")), FULL);
// the project named in the latest message wins the cap over ones only named in older turns (a list reply, then "tell me more about X")
const FULL4 = FULL.replace("## Activities", "### Delta Dash\ndelta details\n- Tags: Rust.\n\n## Activities");
const SHORT4 = SHORT.replace("- Gamma Kit: one-liner c", "- Gamma Kit: one-liner c\n- Delta Dash: one-liner d");
sel = selectKnowledge(FULL4, SHORT4, [{ role: "user", content: "what has he built?" }, { role: "assistant", content: "alpha app, beta tool, gamma kit and delta dash." }, { role: "user", content: "tell me more about delta dash" }]);
assert.ok(has(sel, "delta details") && lacks(sel, "gamma details")); // delta asked about; the oldest-listed one is dropped, not delta
// a short name that sits inside a longer matched name does not take a slot ("terminal" inside "terminal boss")
const FULLT = FULL.replace("## Activities", "### Gamma (the site's own)\nsite gamma details\n- Tags: Vite.\n\n## Activities");
sel = selectKnowledge(FULLT, SHORT, ask("tell me about gamma kit"));
assert.ok(has(sel, "gamma details") && lacks(sel, "site gamma details"));
sel = selectKnowledge(FULLT, SHORT, ask("what is gamma?"));
assert.ok(has(sel, "site gamma details")); // the short name alone still matches its own entry
// real files: a named project is kept, the others are cut, the prompt gets much smaller, at most 3 entries
const realFull = readFileSync(new URL("../knowledge.md", import.meta.url), "utf8");
const realShort = readFileSync(new URL("../knowledge-short.md", import.meta.url), "utf8");
sel = selectKnowledge(realFull, realShort, ask("what is 2unemployment?"));
assert.ok(has(sel, "### 2unemployment", "Greenhouse") && lacks(sel, "### Cabo", "### Glassbox"));
assert.ok(has(sel, "Solutions Engineering Intern, Cloudflare", "## Activities", "- Cabo:")); // work, activities and all one-liners stay
assert.ok(sel.length < realFull.length * 0.6, `expected a much smaller prompt, got ${sel.length} of ${realFull.length}`);
const entries = (s: string) => (s.match(/^### /gm) ?? []).length - (realFull.slice(0, realFull.indexOf("## Projects")).match(/^### /gm) ?? []).length - (realFull.slice(realFull.indexOf("## Activities")).match(/^### /gm) ?? []).length;
assert.ok(entries(selectKnowledge(realFull, realShort, ask("what uses javascript?"))) <= 3);
// the always-on rules stay compact
assert.ok(pa.length < 2000 && pw.length < 2400, `prompt rules grew: ${pa.length} / ${pw.length}`);
console.log("knowledge selection tests ok");
