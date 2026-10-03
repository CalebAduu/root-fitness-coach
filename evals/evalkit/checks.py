"""Deterministic checks: yes/no questions about a response that plain code can answer.

Each check is a function `fn(ctx, spec) -> (passed, detail)` registered under a name with
@check("name"). A test case refers to it from JSON, e.g.
    {"check": "tools_called_include", "value": ["search_exercises"]}
`spec` is that whole JSON object, so a check can read `value` plus any extra keys it needs
(like `fields` or `allow`). `detail` is a short human-readable reason shown in the report.

If code can verify something, it belongs here - never in the AI judge.
"""
import json
import re
from dataclasses import dataclass

from .client import RunResponse

CHECKS: dict = {}


def check(name: str):
    def register(fn):
        CHECKS[name] = fn
        return fn
    return register


@dataclass
class Ctx:
    case: dict
    resp: RunResponse


# ---------- helpers ----------

NO_TRACE = "needs the eval trace (is EVAL_MODE on and the server restarted?)"

# The example exercises inside generate-plan's prompt. Used to detect the model copying them.
PROMPT_EXAMPLE_EXERCISES = ["Squats", "Push-ups", "Lunges", "Plank", "Rows", "Overhead Press", "Tricep Dips", "Russian Twists"]

# Replies the app produces when something went wrong but still answers HTTP 200
KNOWN_FALLBACK_ANSWERS = [
    "sorry, i encountered an error",
    "i'm having trouble connecting",
    "unable to access workout knowledge base",
    "couldn't process your question",
    "please try again",
]
CANNED_NUTRITION_CALORIES = "consult with a healthcare professional for personalized calorie recommendations"
SEARCH_PAGE_PATTERN = re.compile(r"(youtube\.com/results|google\.com/search|bing\.com/search|duckduckgo\.com/\?q)", re.I)


def body_of(ctx: Ctx) -> dict:
    return ctx.resp.body or {}


def answer_text(ctx: Ctx) -> str:
    """The text a person would read: ask-root's `answer`, chat's streamed text, or the plan as text."""
    endpoint = ctx.case["endpoint"]
    if endpoint == "ask-root":
        return str(body_of(ctx).get("answer", ""))
    if endpoint == "chat":
        return ctx.resp.text
    return json.dumps(ctx.resp.body or {}, ensure_ascii=False)


def flatten_strings(value) -> list:
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        return [s for v in value.values() for s in flatten_strings(v)]
    if isinstance(value, list):
        return [s for v in value for s in flatten_strings(v)]
    return []


def dig(data, dotted_path: str):
    for part in dotted_path.split("."):
        if not isinstance(data, dict) or part not in data:
            return None
        data = data[part]
    return data


def text_for_fields(ctx: Ctx, fields) -> str:
    """Joins the text found at the given JSON paths; with no fields, uses the whole answer."""
    if not fields:
        return answer_text(ctx)
    pieces = []
    for path in fields:
        pieces.extend(flatten_strings(dig(body_of(ctx), path)))
    return "\n".join(pieces)


def find_words(text: str, words: list, allow=None) -> list:
    """Returns the banned words present in text. Matching is case-insensitive and whole-word
    (so 'egg' does not match 'eggplant', but 'eggs' does). Phrases in `allow` are blanked out first
    (so 'almond milk' doesn't trigger a ban on 'milk')."""
    lowered = text.lower()
    for phrase in allow or []:
        lowered = lowered.replace(phrase.lower(), " ")
    found = []
    for word in words:
        w = re.escape(word.lower())
        start = r"(?<![a-z0-9])" if word[0].isalnum() else ""
        end = r"(?:s|es)?(?![a-z0-9])" if word[-1].isalnum() else ""
        if re.search(start + w + end, lowered):
            found.append(word)
    return found


def tool_calls(ctx: Ctx) -> list:
    """Tool calls as dicts with name/args/ok/round. Prefers the trace; falls back to the
    `toolsUsed` list in the normal response body (which has no ok/round)."""
    if ctx.resp.eval is not None:
        return ctx.resp.eval.get("toolCalls", [])
    return [{"name": t.get("name"), "args": t.get("args", {}), "ok": None, "round": None}
            for t in body_of(ctx).get("toolsUsed", [])]


def plan_days(ctx: Ctx):
    plan = body_of(ctx).get("weeklyPlan")
    return plan if isinstance(plan, dict) else None


def exercise_names(ctx: Ctx) -> list:
    names = []
    for day in (plan_days(ctx) or {}).values():
        for ex in day.get("exercises", []) if isinstance(day, dict) else []:
            if isinstance(ex, dict) and ex.get("name"):
                names.append(str(ex["name"]))
    return names


def normalize_exercise(name: str) -> str:
    letters = re.sub(r"[^a-z]", "", name.lower())
    return letters[:-1] if letters.endswith("s") else letters


# ---------- request-level checks ----------

@check("request_succeeded")
def request_succeeded(ctx, spec):
    r = ctx.resp
    if r.request_error:
        return False, r.request_error
    if r.status != 200:
        return False, f"HTTP {r.status}"
    if ctx.case["endpoint"] != "chat":
        if not isinstance(r.body, dict):
            return False, "response was not a JSON object"
        if "error" in r.body:
            return False, f"response contains an error: {str(r.body['error'])[:100]}"
        if ctx.case["endpoint"] == "ask-root" and r.body.get("success") is not True:
            return False, "success flag is not true"
    return True, "HTTP 200"


@check("status_in")
def status_in(ctx, spec):
    ok = ctx.resp.status in spec["value"]
    return ok, f"HTTP {ctx.resp.status} (allowed: {spec['value']})"


@check("latency_under")
def latency_under(ctx, spec):
    seconds = ctx.resp.latency_ms / 1000
    return seconds <= spec["value"], f"{seconds:.1f}s (limit {spec['value']}s)"


# ---------- tool-use checks (ask-root) ----------

@check("tools_called_include")
def tools_called_include(ctx, spec):
    called = {t["name"] for t in tool_calls(ctx)}
    missing = [t for t in spec["value"] if t not in called]
    return not missing, f"called {sorted(called) or 'no tools'}" + (f"; missing {missing}" if missing else "")


@check("tools_called_include_any")
def tools_called_include_any(ctx, spec):
    called = {t["name"] for t in tool_calls(ctx)}
    hit = sorted(called & set(spec["value"]))
    return bool(hit), f"called {sorted(called) or 'no tools'}; wanted any of {spec['value']}"


@check("tools_not_called")
def tools_not_called(ctx, spec):
    called = {t["name"] for t in tool_calls(ctx)}
    bad = sorted(called & set(spec["value"]))
    return not bad, f"forbidden tools called: {bad}" if bad else "none of the forbidden tools were called"


@check("no_tools_called")
def no_tools_called(ctx, spec):
    called = [t["name"] for t in tool_calls(ctx)]
    return not called, f"called {called}" if called else "no tools called"


@check("tool_arg_contains")
def tool_arg_contains(ctx, spec):
    needle = str(spec["value"]).lower()
    calls = [t for t in tool_calls(ctx) if t["name"] == spec["tool"]]
    if not calls:
        return False, f"{spec['tool']} was never called"
    for call in calls:
        if needle in json.dumps(call.get("args", {})).lower():
            return True, f"{spec['tool']} args {json.dumps(call.get('args'))} contain '{needle}'"
    return False, f"no {spec['tool']} call had '{needle}' in its args: {[c.get('args') for c in calls]}"


@check("max_rounds")
def max_rounds(ctx, spec):
    if ctx.resp.eval is None:
        return False, NO_TRACE
    rounds = ctx.resp.eval.get("agentRounds", 0)
    return rounds <= spec["value"], f"{rounds} agent round(s) (limit {spec['value']})"


@check("min_successful_tool_calls")
def min_successful_tool_calls(ctx, spec):
    if ctx.resp.eval is None:
        return False, NO_TRACE
    calls = tool_calls(ctx)
    ok = [t for t in calls if t.get("ok")]
    return len(ok) >= spec["value"], f"{len(ok)} of {len(calls)} tool calls succeeded (need {spec['value']})"


# ---------- answer / output checks ----------

@check("answer_not_empty")
def answer_not_empty(ctx, spec):
    text = answer_text(ctx).strip()
    return bool(text), f"{len(text)} characters"


@check("not_fallback_answer")
def not_fallback_answer(ctx, spec):
    text = answer_text(ctx).strip().lower()
    if not text:
        return False, "answer is empty"
    hits = [p for p in KNOWN_FALLBACK_ANSWERS if p in text]
    return not hits, f"matches known fallback text: {hits}" if hits else "not a known fallback or error message"


@check("output_includes")
def output_includes(ctx, spec):
    text = text_for_fields(ctx, spec.get("fields")).lower()
    missing = [w for w in spec["value"] if w.lower() not in text]
    return not missing, f"missing: {missing}" if missing else "all required text present"


@check("output_includes_any")
def output_includes_any(ctx, spec):
    text = text_for_fields(ctx, spec.get("fields")).lower()
    hit = [w for w in spec["value"] if w.lower() in text]
    return bool(hit), f"found {hit}" if hit else f"found none of {spec['value']}"


@check("output_excludes")
def output_excludes(ctx, spec):
    found = find_words(text_for_fields(ctx, spec.get("fields")), spec["value"], spec.get("allow"))
    return not found, f"found banned: {found}" if found else "no banned words found"


@check("flag_excludes")
def flag_excludes(ctx, spec):
    if ctx.resp.eval is None:
        return False, NO_TRACE
    flags = ctx.resp.eval.get("flags", {})
    if spec["flag"] not in flags:
        return False, f"flag '{spec['flag']}' was not recorded"
    found = find_words(json.dumps(flags[spec["flag"]], ensure_ascii=False), spec["value"], spec.get("allow"))
    return not found, f"found banned in {spec['flag']}: {found}" if found else f"{spec['flag']} is clean"


@check("min_sources")
def min_sources(ctx, spec):
    n = len(body_of(ctx).get("sources", []))
    return n >= spec["value"], f"{n} source(s) (need {spec['value']})"


@check("sources_not_all_search_links")
def sources_not_all_search_links(ctx, spec):
    urls = [s.get("url", "") for s in body_of(ctx).get("sources", [])]
    if not urls:
        return False, "no sources at all"
    real = [u for u in urls if not SEARCH_PAGE_PATTERN.search(u)]
    return bool(real), f"{len(real)} of {len(urls)} sources are real pages (rest are generic search links)"


# ---------- plan checks (generate-plan / generate-nutrition-plan) ----------

@check("valid_json_fields")
def valid_json_fields(ctx, spec):
    if not isinstance(ctx.resp.body, dict):
        return False, "response was not valid JSON"
    missing = [f for f in spec["value"] if dig(ctx.resp.body, f) is None]
    return not missing, f"missing fields: {missing}" if missing else "all required fields present"


@check("plan_day_count")
def plan_day_count(ctx, spec):
    days = plan_days(ctx)
    if days is None:
        return False, "no weeklyPlan in response"
    return len(days) == spec["value"], f"{len(days)} day(s) (expected {spec['value']})"


@check("exercises_per_day_between")
def exercises_per_day_between(ctx, spec):
    days = plan_days(ctx)
    if days is None:
        return False, "no weeklyPlan in response"
    low, high = spec["value"]
    counts = {day: len(d.get("exercises", [])) for day, d in days.items() if isinstance(d, dict)}
    bad = {day: n for day, n in counts.items() if not low <= n <= high}
    return not bad, f"out of range {low}-{high}: {bad}" if bad else f"exercises per day: {list(counts.values())}"


@check("exercises_exclude_keywords")
def exercises_exclude_keywords(ctx, spec):
    # Substring match on exercise names: 'lunge' should catch 'Walking Lunges'
    offenders = [n for n in exercise_names(ctx) if any(k.lower() in n.lower() for k in spec["value"])]
    return not offenders, f"banned exercises: {offenders}" if offenders else "no banned exercises"


@check("prompt_example_overlap_max")
def prompt_example_overlap_max(ctx, spec):
    example = {normalize_exercise(e): e for e in PROMPT_EXAMPLE_EXERCISES}
    used = sorted({example[normalize_exercise(n)] for n in exercise_names(ctx) if normalize_exercise(n) in example})
    return len(used) <= spec["value"], f"{len(used)} of the prompt's example exercises reused: {used} (limit {spec['value']})"


@check("plan_or_clean_rejection")
def plan_or_clean_rejection(ctx, spec):
    r = ctx.resp
    if r.request_error:
        return False, r.request_error
    if r.status in spec["reject_statuses"]:
        return True, f"cleanly rejected with HTTP {r.status}"
    if r.status == 200:
        days = plan_days(ctx)
        n = len(days) if days is not None else 0
        ok = spec["min_days"] <= n <= spec["max_days"]
        return ok, f"HTTP 200 with {n} day(s) (allowed {spec['min_days']}-{spec['max_days']})"
    return False, f"HTTP {r.status}: neither a clean rejection nor a plan"


@check("not_fallback_plan")
def not_fallback_plan(ctx, spec):
    flags = (ctx.resp.eval or {}).get("flags", {})
    if flags.get("fallback_plan_used"):
        return False, "the route returned its canned fallback plan (model output could not be parsed)"
    calories = str(dig(body_of(ctx), "dailyGuidelines.calories") or "").lower()
    if CANNED_NUTRITION_CALORIES in calories:
        return False, "calories text matches the canned fallback plan"
    return True, "a real generated plan"


# ---------- running them ----------

def describe(spec: dict) -> str:
    extras = {k: v for k, v in spec.items() if k != "check"}
    return spec["check"] + (f" {json.dumps(extras, ensure_ascii=False)}" if extras else "")


def run_checks(case: dict, resp: RunResponse) -> list:
    """Runs every deterministic check in the case. A check that crashes counts as a failure,
    so harness bugs are visible instead of silently passing."""
    ctx = Ctx(case, resp)
    results = []
    for spec in case["deterministic_checks"]:
        try:
            passed, detail = CHECKS[spec["check"]](ctx, spec)
        except Exception as e:  # noqa: BLE001
            passed, detail = False, f"check crashed: {type(e).__name__}: {e}"
        results.append({"check": spec["check"], "spec": describe(spec), "passed": bool(passed), "detail": detail})
    return results
