import { AgentAddress, Client } from "langsmith";
import { RunTree } from "langsmith/run_trees";

export interface TracingEnv {
  LANGSMITH_TRACING?: string;
  LANGSMITH_API_KEY?: string;
  LANGSMITH_AGENT_ID?: string;
  LANGSMITH_AGENT_ENVIRONMENT?: string;
  LANGSMITH_ENDPOINT?: string;
  LANGSMITH_WORKSPACE_ID?: string;
}

type Metadata = Record<string, string | number | boolean | undefined>;

// Only counts and routing metadata enter these spans. Never pass request/response bodies.
export class RequestTrace {
  private client?: Client;
  private root?: RunTree;
  private pending: Promise<void>[] = [];

  constructor(env: TracingEnv, name: string, client?: Client) {
    if (env.LANGSMITH_TRACING !== "true" || !env.LANGSMITH_API_KEY) return;
    try {
      this.client = client ?? new Client({
        apiKey: env.LANGSMITH_API_KEY,
        apiUrl: env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com",
        workspaceId: env.LANGSMITH_WORKSPACE_ID,
        manualFlushMode: true, timeout_ms: 2000, callerOptions: { maxRetries: 0 },
        omitTracedRuntimeInfo: true,
      });
      this.root = new RunTree({ name, run_type: "chain", client: this.client,
        address: new AgentAddress(env.LANGSMITH_AGENT_ID || "portfolio-assistant", env.LANGSMITH_AGENT_ENVIRONMENT || "production"),
        inputs: {}, tags: ["portfolio", "metadata-only"] });
    } catch { this.client = undefined; }
  }

  metadata(values: Metadata) {
    if (this.root) this.root.metadata = { ...this.root.metadata, ...values };
  }

  async model<T>(name: string, metadata: Metadata, call: () => Promise<T>): Promise<T> {
    let span: RunTree | undefined;
    try { span = this.root?.createChild({ name, run_type: "llm", inputs: {}, metadata }); } catch { /* best effort */ }
    try {
      const result = await call();
      this.end(span, {}, undefined, usageOf(result));
      return result;
    } catch (error) {
      this.end(span, {}, "MODEL_FAILED"); // Raw provider errors can contain credentials or user text.
      throw error;
    }
  }

  finish(status: number) {
    this.end(this.root, { status_code: status }, status >= 400 ? "REQUEST_FAILED" : undefined);
  }

  private end(span: RunTree | undefined, metadata: Metadata, error?: string, usage?: Record<string, number>) {
    if (!span) return;
    this.pending.push((async () => {
      try {
        await span.end(usage ? { usage_metadata: usage } : {}, error, Date.now(), metadata);
        await span.postRun();
      } catch { /* Tracing failures must not break the assistant. */ }
    })());
  }

  async flush() {
    try { await Promise.all(this.pending); await this.client?.flush(); } catch { /* best effort */ }
  }
}

function usageOf(result: unknown): Record<string, number> | undefined {
  const usage = (result as { usage?: Record<string, unknown> } | null)?.usage;
  if (!usage) return;
  const counts: Record<string, number> = {};
  for (const [source, target] of [["prompt_tokens", "input_tokens"], ["completion_tokens", "output_tokens"], ["total_tokens", "total_tokens"]]) {
    const value = usage[source];
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) counts[target] = value;
  }
  return Object.keys(counts).length ? counts : undefined;
}

export async function traceRequest(env: TracingEnv, ctx: Pick<ExecutionContext, "waitUntil"> | undefined,
  name: string, call: (trace: RequestTrace) => Promise<Response>): Promise<Response> {
  const trace = new RequestTrace(env, name);
  try {
    const response = await call(trace);
    trace.finish(response.status);
    return response;
  } catch (error) {
    trace.finish(500);
    throw error;
  } finally {
    // Keep the request's client alive until its batch is sent, after responding to the visitor.
    if (ctx) ctx.waitUntil(trace.flush());
    else await trace.flush();
  }
}
