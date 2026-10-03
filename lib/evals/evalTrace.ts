// Eval-mode instrumentation for Root's AI routes.
//
// Everything here is inert in normal operation. A request is only traced when BOTH:
//   1. the server runs with EVAL_MODE=true, and
//   2. the request carries an `x-eval-token` header equal to EVAL_TOKEN.
// Requiring both means a stray EVAL_MODE on a deployed server cannot expose internals to
// ordinary visitors. When tracing is off, `EvalTracer.fromRequest` returns null and every
// helper below passes straight through to the real work, so behaviour is unchanged.
//
// The collected trace is returned to the eval runner in an extra `_eval` field on the JSON
// response (see `withEval`). It is never added to normal responses.

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LlmCallTrace {
  label: string;
  durationMs: number;
  ok: boolean;
  error?: string;
  usage?: TokenUsage;
}

export interface ToolCallTrace {
  name: string;
  args: Record<string, unknown>;
  // Which agent round the call happened in (0 = called by route code rather than by the model)
  round: number;
  durationMs: number;
  // false when the tool threw or reported `success: false` - the model may still answer "fine"
  ok: boolean;
  resultSummary: string;
  // Start of the raw tool output, so the judge can check claims the one-line summary can't show
  resultPreview: string;
}

export interface EvalTrace {
  totalDurationMs: number;
  // Number of model calls made while the agent was deciding what to do (ask-root only)
  agentRounds: number;
  llmCalls: LlmCallTrace[];
  toolCalls: ToolCallTrace[];
  totals: TokenUsage;
  // Free-form facts the route wants to report (e.g. "fallback_plan_used": true)
  flags: Record<string, unknown>;
  errors: string[];
}

export class EvalTracer {
  private startedAt = Date.now();
  private llmCalls: LlmCallTrace[] = [];
  private toolCalls: ToolCallTrace[] = [];
  private flags: Record<string, unknown> = {};
  private errors: string[] = [];

  // Returns a tracer only for authorised eval requests; null otherwise.
  static fromRequest(request: Request): EvalTracer | null {
    const token = process.env.EVAL_TOKEN;
    if (process.env.EVAL_MODE !== 'true' || !token) return null;
    return request.headers.get('x-eval-token') === token ? new EvalTracer() : null;
  }

  recordLlm(call: LlmCallTrace) {
    this.llmCalls.push(call);
  }

  recordTool(call: ToolCallTrace) {
    this.toolCalls.push(call);
  }

  note(key: string, value: unknown) {
    this.flags[key] = value;
  }

  recordError(error: unknown) {
    this.errors.push(error instanceof Error ? error.message : String(error));
  }

  finish(): EvalTrace {
    const totals = this.llmCalls.reduce(
      (sum, c) => ({
        promptTokens: sum.promptTokens + (c.usage?.promptTokens ?? 0),
        completionTokens: sum.completionTokens + (c.usage?.completionTokens ?? 0),
        totalTokens: sum.totalTokens + (c.usage?.totalTokens ?? 0),
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    );
    return {
      totalDurationMs: Date.now() - this.startedAt,
      agentRounds: this.llmCalls.filter((c) => c.label.startsWith('agent_round')).length,
      llmCalls: this.llmCalls,
      toolCalls: this.toolCalls,
      totals,
      flags: this.flags,
      errors: this.errors,
    };
  }
}

// Wraps a model call: times it and records its token usage. Re-throws errors unchanged.
export async function traceLlm<T>(
  tracer: EvalTracer | null,
  label: string,
  call: () => Promise<T>,
  getUsage: (result: T) => TokenUsage | undefined
): Promise<T> {
  if (!tracer) return call();
  const start = Date.now();
  try {
    const result = await call();
    tracer.recordLlm({ label, durationMs: Date.now() - start, ok: true, usage: getUsage(result) });
    return result;
  } catch (error) {
    tracer.recordLlm({
      label,
      durationMs: Date.now() - start,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Wraps a tool call: times it and records a short summary of what it returned.
export async function traceTool<T>(
  tracer: EvalTracer | null,
  info: { name: string; args: Record<string, unknown>; round: number },
  call: () => Promise<T>
): Promise<T> {
  if (!tracer) return call();
  const start = Date.now();
  try {
    const result = await call();
    const { ok, summary } = summarizeResult(result);
    tracer.recordTool({ ...info, durationMs: Date.now() - start, ok, resultSummary: summary, resultPreview: previewOf(result) });
    return result;
  } catch (error) {
    tracer.recordTool({
      ...info,
      durationMs: Date.now() - start,
      ok: false,
      resultSummary: `threw: ${error instanceof Error ? error.message : String(error)}`,
      resultPreview: '',
    });
    throw error;
  }
}

// Adds the trace to a response body, only when tracing is active.
export function withEval<T extends object>(tracer: EvalTracer | null, body: T): T | (T & { _eval: EvalTrace }) {
  return tracer ? { ...body, _eval: tracer.finish() } : body;
}

// Token-usage readers for the two client libraries Root uses.
export function usageFromOpenAI(result: any): TokenUsage | undefined {
  const u = result?.usage;
  if (!u) return undefined;
  return { promptTokens: u.prompt_tokens ?? 0, completionTokens: u.completion_tokens ?? 0, totalTokens: u.total_tokens ?? 0 };
}

export function usageFromLangChain(result: any): TokenUsage | undefined {
  const u = result?.usage_metadata;
  if (!u) return undefined;
  return { promptTokens: u.input_tokens ?? 0, completionTokens: u.output_tokens ?? 0, totalTokens: u.total_tokens ?? 0 };
}

function previewOf(value: unknown, maxLen = 2000): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return (text ?? '').slice(0, maxLen);
}

const itemLabel = (item: any): string =>
  typeof item === 'string' ? item : item?.name ?? item?.title ?? item?.strMeal ?? '';

// Turns a tool result into one short line listing up to 10 item names (e.g. "exercises[5]: Glute Drive, Glute Bridge, ...");
// the judge relies on this to see everything a tool returned
// and decides whether the tool actually succeeded. Tools report failure as `success: false`
// inside normal-looking JSON, so "no exception" is not the same as "worked".
export function summarizeResult(value: unknown, maxLen = 600): { ok: boolean; summary: string } {
  let data: any = value;
  if (typeof value === 'string') {
    try {
      data = JSON.parse(value);
    } catch {
      return { ok: true, summary: value.slice(0, maxLen) };
    }
  }
  if (!data || typeof data !== 'object') return { ok: true, summary: String(value).slice(0, maxLen) };

  const parts: string[] = [];
  if (data.error) parts.push(`error: ${String(data.error).slice(0, 120)}`);
  if (typeof data.answer === 'string') parts.push(`answer: ${data.answer.slice(0, 150)}`);

  // Some helpers nest their payload one level down in `data`
  for (const holder of [data, data.data && typeof data.data === 'object' ? data.data : null]) {
    if (!holder) continue;
    for (const [key, val] of Object.entries(holder)) {
      if (Array.isArray(val)) {
        const names = val.slice(0, 10).map(itemLabel).filter(Boolean).join(', ');
        parts.push(`${key}[${val.length}]${names ? ': ' + names : ''}`);
      } else if (val && typeof val === 'object' && itemLabel(val)) {
        parts.push(`${key}: ${itemLabel(val)}`);
      }
    }
  }

  return {
    ok: data.success !== false,
    summary: (parts.join(' | ') || JSON.stringify(data)).slice(0, maxLen),
  };
}
