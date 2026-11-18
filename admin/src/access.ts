// Cloudflare Access defence in depth. Access itself is the login; this only refuses requests that did not come through it.
// Pure apart from WebCrypto, so it is unit-tested with plain node.

export type Jwk = JsonWebKey & { kid?: string };

const b64 = (s: string): Uint8Array => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const part = (s: string) => JSON.parse(new TextDecoder().decode(b64(s)));

/** Verify an Access JWT (RS256): signature against the team's keys, plus exp, aud and iss. */
export async function verifyAccessJwt(token: string, keys: Jwk[], opts: { aud: string; iss: string; now?: number }): Promise<boolean> {
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return false;
    const header = part(h), payload = part(p);
    if (header.alg !== "RS256") return false;
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64(s), new TextEncoder().encode(`${h}.${p}`)))) return false;
    const now = (opts.now ?? Date.now()) / 1000;
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    return typeof payload.exp === "number" && payload.exp > now && aud.includes(opts.aud) && payload.iss === opts.iss;
  } catch {
    return false;
  }
}

let certs: { keys: Jwk[]; at: number } | null = null;
/** The team's signing keys, cached for an hour. */
export async function teamKeys(teamDomain: string): Promise<Jwk[]> {
  if (certs && Date.now() - certs.at < 3_600_000) return certs.keys;
  const r = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error(`access certs ${r.status}`);
  certs = { keys: ((await r.json()) as { keys: Jwk[] }).keys, at: Date.now() };
  return certs.keys;
}

export type AccessEnv = { REQUIRE_ACCESS?: string; ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string };

/** true = let the request through. */
export async function authorized(req: Request, env: AccessEnv): Promise<boolean> {
  if (env.REQUIRE_ACCESS !== "true") return true; // local dev only
  const token = req.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return false;
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return true; // header-only check until the team vars are set
  try {
    return await verifyAccessJwt(token, await teamKeys(env.ACCESS_TEAM_DOMAIN), { aud: env.ACCESS_AUD, iss: `https://${env.ACCESS_TEAM_DOMAIN}` });
  } catch {
    return false;
  }
}
