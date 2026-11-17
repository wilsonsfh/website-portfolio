import assert from "node:assert/strict";
import { FixedWindow, allowedOrigin, extractText, limitReason, nextUtcMidnight, validateChat, validateImagePrompt } from "../src/logic.ts";

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
console.log("logic tests ok");
