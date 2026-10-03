"""HTTP client: sends one test-case request to Root and returns everything the graders need.

Two kinds of endpoint:
  * JSON endpoints (ask-root, generate-plan, generate-nutrition-plan) return a JSON body.
    In eval mode the body also carries `_eval` (the trace added by lib/evals/evalTrace.ts);
    we pull it out so the body looks exactly like a normal response.
  * The chat endpoint streams plain text. We read the whole stream, noting when the first
    bytes arrive. It has no trace, so tokens are estimated with tiktoken (and labelled so).
"""
import json
import os
import re
import time
from dataclasses import dataclass, field

import requests

try:
    import tiktoken
    _ENCODING = tiktoken.get_encoding("o200k_base")  # tokenizer used by the gpt-4o model family
except Exception:  # tiktoken missing or its data can't be fetched -> fall back to a rough estimate
    _ENCODING = None

STREAMING_ENDPOINTS = {"chat"}

# Error text that points at a broken dependency (network, rate limits, upstream APIs)
# rather than at the AI giving a wrong answer.
INFRA_PATTERNS = re.compile(
    r"network error|timeout|timed out|fetch failed|econnreset|econnrefused|enotfound|socket hang up|"
    r"wger api error|wger exercise lookup failed|themealdb|connection error|rate limit|429|"
    r"overloaded|service unavailable|bad gateway|gateway timeout|insufficient_quota|failed to fetch",
    re.IGNORECASE,
)


@dataclass
class RunResponse:
    status: int | None = None            # None when no HTTP response arrived at all
    latency_ms: float = 0.0              # total time until the response was fully read
    ttfb_ms: float | None = None         # time to first byte (most useful for streaming)
    body: dict | None = None             # parsed JSON body (JSON endpoints)
    text: str = ""                       # raw response text (the whole answer for chat)
    eval: dict | None = None             # the `_eval` trace, if the server sent one
    request_error: str | None = None     # connection error / timeout on OUR side of the call
    estimated_tokens: dict | None = None # chat only: tiktoken estimate, clearly labelled
    infra_hints: list = field(default_factory=list)  # reasons this run may be an infrastructure failure


def count_tokens(text: str) -> int:
    if _ENCODING is not None:
        return len(_ENCODING.encode(text))
    return max(1, len(text) // 4)


def _headers(config: dict, tracing: bool) -> dict:
    headers = {"Content-Type": "application/json"}
    if tracing:
        headers["x-eval-token"] = os.environ.get("EVAL_TOKEN", "")
    bypass = os.environ.get(config.get("vercel_bypass_env_var", ""), "")
    if bypass:  # Vercel preview deployments are behind protection unless this header is sent
        headers["x-vercel-protection-bypass"] = bypass
    return headers


def _estimate_chat_tokens(request_body: dict, answer: str) -> dict:
    prompt = sum(count_tokens(m.get("content", "")) + 4 for m in request_body.get("messages", []))
    completion = count_tokens(answer)
    return {
        "promptTokens": prompt,
        "completionTokens": completion,
        "totalTokens": prompt + completion,
        "estimated": True,
        "note": "tiktoken estimate; excludes the server-side system prompt, which the runner cannot see",
    }


def classify_infra(resp: RunResponse) -> list:
    """Collects signs that something outside the AI's control went wrong.

    The runner decides how to combine these with the check results: a run is only called an
    infrastructure failure if it actually failed AND one of these hints is present.
    """
    hints = []
    if resp.request_error:
        hints.append(f"request error: {resp.request_error}")
    if resp.status in (502, 503, 504):
        hints.append(f"HTTP {resp.status} from the server")
    trace = resp.eval or {}
    for err in trace.get("errors", []):
        if INFRA_PATTERNS.search(err):
            hints.append(f"server error: {err[:160]}")
    for tool in trace.get("toolCalls", []):
        if not tool.get("ok", True) and INFRA_PATTERNS.search(tool.get("resultSummary", "")):
            hints.append(f"tool {tool['name']} failed: {tool['resultSummary'][:160]}")
    for llm in trace.get("llmCalls", []):
        if not llm.get("ok", True) and INFRA_PATTERNS.search(llm.get("error", "")):
            hints.append(f"model call {llm['label']} failed: {llm['error'][:160]}")
    return hints


def call_endpoint(config: dict, case: dict, tracing: bool = True) -> RunResponse:
    endpoint = case["endpoint"]
    url = config["base_url"] + config["endpoints"][endpoint]
    timeout = config["timeouts_seconds"][endpoint]
    resp = RunResponse()
    start = time.perf_counter()

    try:
        r = requests.post(
            url,
            headers=_headers(config, tracing),
            data=json.dumps(case["input"]),
            timeout=(10, timeout),
            stream=endpoint in STREAMING_ENDPOINTS,
        )
        resp.status = r.status_code

        if endpoint in STREAMING_ENDPOINTS:
            chunks = []
            for chunk in r.iter_content(chunk_size=None):
                if chunk:
                    if resp.ttfb_ms is None:
                        resp.ttfb_ms = (time.perf_counter() - start) * 1000
                    chunks.append(chunk)
            resp.text = b"".join(chunks).decode("utf-8", errors="replace")
            if r.status_code == 200:
                resp.estimated_tokens = _estimate_chat_tokens(case["input"], resp.text)
            else:  # errors come back as JSON even on the streaming route
                try:
                    resp.body = json.loads(resp.text)
                except ValueError:
                    pass
        else:
            resp.ttfb_ms = (time.perf_counter() - start) * 1000
            resp.text = r.text
            try:
                parsed = r.json()
            except ValueError:
                parsed = None
            if isinstance(parsed, dict):
                resp.eval = parsed.pop("_eval", None)
                resp.body = parsed
    except requests.exceptions.Timeout as e:
        resp.request_error = f"timed out after {timeout}s ({type(e).__name__})"
    except requests.exceptions.RequestException as e:
        resp.request_error = f"{type(e).__name__}: {e}"

    resp.latency_ms = (time.perf_counter() - start) * 1000
    resp.infra_hints = classify_infra(resp)
    return resp
