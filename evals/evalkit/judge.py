"""The AI judge: grades only the qualities code cannot check (see each case's judge_criteria).

Design rules:
  * Runs only after every deterministic check passed (the runner enforces this).
  * Different model family from the app under test (the app is OpenAI; the judge is Claude).
  * Returns structured JSON via the API's JSON-schema output: PASS/FAIL plus a one-line reason
    per criterion, and a one-sentence summary of what the agent did. No numeric scores.
  * Thinking/sampling settings are left at the model's defaults (Sonnet 5.5 rejects
    non-default temperature). A refusal or API error is reported as a judge error, which the
    runner treats as an infrastructure failure rather than a Root failure.

NOTE: written at the end of a session and not yet run against the live API.
"""
import json

import anthropic

from .config import require_env

JUDGE_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "criteria": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "criterion": {"type": "string"},
                    "verdict": {"type": "string", "enum": ["PASS", "FAIL"]},
                    "reason": {"type": "string"},
                },
                "required": ["criterion", "verdict", "reason"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["summary", "criteria"],
    "additionalProperties": False,
}

INSTRUCTIONS = """You are grading one response from an AI fitness and nutrition coach called Root.
Judge ONLY the criteria listed. For each criterion answer PASS or FAIL with a one-line reason that
points at evidence in the response or tool results. Be strict: if the evidence is missing or
ambiguous, FAIL. Do not give scores. Also write a one-sentence summary of what the agent did."""


def build_prompt(case: dict, record: dict) -> str:
    resp = record["response"]
    body = resp.get("body") or {}
    answer = body.get("answer") if case["endpoint"] == "ask-root" else (resp.get("text") or json.dumps(body, ensure_ascii=False))
    tools = [{"tool": t["name"], "args": t["args"], "ok": t["ok"], "result_summary": t["resultSummary"],
              "raw_result_start": t.get("resultPreview", "")[:2000]}
             for t in (record.get("eval") or {}).get("toolCalls", [])]
    criteria = "\n".join(f"{i + 1}. {c}" for i, c in enumerate(case["judge_criteria"]))
    return (f"{INSTRUCTIONS}\n\n## Request sent to Root\n{json.dumps(case['input'], ensure_ascii=False)[:6000]}\n\n"
            f"## Root's response\n{str(answer)[:8000]}\n\n## Tool calls (arguments, a short summary, and the start of the raw tool output)\n"
            f"{json.dumps(tools, ensure_ascii=False) if tools else 'none'}\n\n## Criteria to grade\n{criteria}")


def make_judge(config: dict):
    """Returns judge(case, record) -> dict, the shape the runner expects."""
    client = anthropic.Anthropic(api_key=require_env("ANTHROPIC_API_KEY"))
    model = config["judge"]["model"]

    def judge(case: dict, record: dict) -> dict:
        try:
            response = client.messages.create(
                model=model,
                max_tokens=config["judge"]["max_tokens"],
                messages=[{"role": "user", "content": build_prompt(case, record)}],
                output_config={"format": {"type": "json_schema", "schema": JUDGE_SCHEMA}},
            )
            if response.stop_reason == "refusal":
                return {"error": "judge refused to grade", "model": model}
            text = next(b.text for b in response.content if b.type == "text")
            data = json.loads(text)
            return {
                "model": response.model,
                "summary": data["summary"],
                "criteria": data["criteria"],
                "all_passed": all(c["verdict"] == "PASS" for c in data["criteria"]),
                "usage": {"input": response.usage.input_tokens, "output": response.usage.output_tokens},
            }
        except Exception as e:  # noqa: BLE001  (API errors, bad JSON, missing text block)
            return {"error": f"{type(e).__name__}: {e}", "model": model}

    return judge
