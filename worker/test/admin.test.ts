import assert from "node:assert/strict";
import { FailLimiter, NOTHING, ftsQuery, sameOrigin, suggestMessages, tokenEquals } from "../src/admin/logic.ts";

// fts query
assert.equal(ftsQuery("What are his hobbies?"), '"hobbies"');
assert.equal(ftsQuery("does wilson like rock climbing, and climbing?"), '"like" OR "rock" OR "climbing"');
assert.equal(ftsQuery("what is it?"), "");
assert.ok(!ftsQuery('drop "table" -- x*').includes("*")); // no raw operators reach MATCH

// suggest prompt
const msgs = suggestMessages("hobbies?", [{ page: "p", heading: "h1", text: "he climbs" }, { page: "p", heading: "h2", text: "x".repeat(50) }], 40);
assert.equal(msgs[1].content, "hobbies?");
assert.ok(msgs[0].content.includes("[h1]\nhe climbs") && !msgs[0].content.includes("[h2]")); // char cap drops later chunks
assert.ok(msgs[0].content.includes(NOTHING));

// origin
assert.ok(sameOrigin(null, "https://a.workers.dev/api"));
assert.ok(sameOrigin("https://a.workers.dev", "https://a.workers.dev/api"));
assert.ok(!sameOrigin("https://evil.com", "https://a.workers.dev/api"));

// token compare + failed-login limiter
assert.ok(tokenEquals("s3cret", "s3cret"));
assert.ok(!tokenEquals("s3cret", "s3creT") && !tokenEquals("", "s3cret") && !tokenEquals("s3cret", "s3cret2"));
const fl = new FailLimiter(3, 1000);
fl.fail("ip", 0); fl.fail("ip", 1);
assert.ok(!fl.blocked("ip", 2));
fl.fail("ip", 2);
assert.ok(fl.blocked("ip", 3) && !fl.blocked("other", 3));
assert.ok(!fl.blocked("ip", 1001)); // window over
console.log("admin logic tests ok");
