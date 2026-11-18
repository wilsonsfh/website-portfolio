import assert from "node:assert/strict";
import { NOTHING, ftsQuery, sameOrigin, suggestMessages } from "../src/logic.ts";
import { authorized, verifyAccessJwt } from "../src/access.ts";

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

// access: header check
const req = (h: Record<string, string> = {}) => new Request("https://a.workers.dev/", { headers: h });
assert.equal(await authorized(req(), { REQUIRE_ACCESS: "true" }), false);
assert.equal(await authorized(req({ "Cf-Access-Jwt-Assertion": "x" }), { REQUIRE_ACCESS: "true" }), true);
assert.equal(await authorized(req(), { REQUIRE_ACCESS: "false" }), true);
assert.equal(await authorized(req(), {}), true); // unset = local dev

// access: jwt signature, exp, aud, iss
const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const jwk = { ...(await crypto.subtle.exportKey("jwk", kp.publicKey)), kid: "k1" };
const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
async function sign(payload: object, kid = "k1") {
  const h = enc({ alg: "RS256", kid }), p = enc(payload);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", kp.privateKey, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${Buffer.from(sig).toString("base64url")}`;
}
const o = { aud: "AUD", iss: "https://t.cloudflareaccess.com", now: 1_000_000 };
const good = { aud: ["AUD"], iss: o.iss, exp: 2000 };
assert.equal(await verifyAccessJwt(await sign(good), [jwk], o), true);
assert.equal(await verifyAccessJwt(await sign({ ...good, exp: 900 }), [jwk], o), false);
assert.equal(await verifyAccessJwt(await sign({ ...good, aud: ["other"] }), [jwk], o), false);
assert.equal(await verifyAccessJwt(await sign({ ...good, iss: "https://evil" }), [jwk], o), false);
assert.equal(await verifyAccessJwt(await sign(good, "nokey"), [jwk], o), false);
const t = await sign(good);
assert.equal(await verifyAccessJwt(t.slice(0, -4) + "AAAA", [jwk], o), false); // tampered signature
assert.equal(await verifyAccessJwt("a.b", [jwk], o), false);
console.log("admin logic tests ok");
