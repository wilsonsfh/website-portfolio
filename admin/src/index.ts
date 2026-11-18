import { authorized, type AccessEnv } from "./access.ts";
import { handleAdmin, type Env as AdminEnv } from "./handler.ts";

type Env = AdminEnv & AccessEnv;

// Separate-worker variant: Cloudflare Access is the login. To mount the admin on the public worker instead, call
// handleAdmin(req, env, { base: "/admin", authorize: <token check> }) from its fetch handler.
export default {
  fetch: (req: Request, env: Env) => handleAdmin(req, env, { base: "", authorize: (r) => authorized(r, env) }),
} satisfies ExportedHandler<Env>;
