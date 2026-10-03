"""Builds one self-contained HTML report (no external files, works offline) from a results folder.

Layout, top to bottom: headline numbers -> failures -> pass rate by endpoint -> per-test table ->
tool usage -> full details for every run. A "show failures only" checkbox hides everything that
passed. Infrastructure failures (wger/TheMealDB down, timeouts) are shown separately from AI
failures and are not counted in pass rates.

Status is never shown by colour alone: every badge carries an icon and a word.
"""
import json
from collections import defaultdict
from html import escape
from pathlib import Path

from .cases import load_cases
from .config import load_config
from .summary import load_results, summarize, tokens_of

BADGE = {"pass": ("✓", "PASS"), "fail": ("✗", "FAIL"), "infra_failure": ("⚠", "INFRA")}

CSS = """
:root{--bg:#f7f8fa;--card:#fff;--ink:#14171c;--muted:#5b6470;--line:#e2e5ea;--bar:#0f766e;--track:#e9ecef;
--passbg:#e3f6ec;--passfg:#116a3c;--failbg:#fde8e8;--failfg:#a4161a;--infrabg:#fff3d6;--infrafg:#8a5a00;--code:#f1f3f6}
@media(prefers-color-scheme:dark){:root{--bg:#10141a;--card:#181d25;--ink:#e8ebf0;--muted:#9aa4b2;--line:#2a313c;
--bar:#2dd4bf;--track:#2a313c;--passbg:#12301f;--passfg:#7ee2a8;--failbg:#3a1618;--failfg:#ff9a9d;--infrabg:#3a2d0c;--infrafg:#ffd37a;--code:#222936}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px 80px}h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 12px}
h5{margin:14px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.muted{color:var(--muted)}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:16px 0}
.big{font-size:28px;font-weight:700}.small{font-size:12px;color:var(--muted)}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{padding:8px 10px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:12px;color:var(--muted);font-weight:600}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}.tablewrap{overflow-x:auto}
.bar{display:inline-block;width:110px;height:8px;background:var(--track);border-radius:4px;vertical-align:middle;margin-right:8px;overflow:hidden}
.bar>span{display:block;height:100%;background:var(--bar)}
.badge{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}
.b-pass{background:var(--passbg);color:var(--passfg)}.b-fail{background:var(--failbg);color:var(--failfg)}.b-infra{background:var(--infrabg);color:var(--infrafg)}
details{background:var(--card);border:1px solid var(--line);border-radius:10px;margin:8px 0}summary{cursor:pointer;padding:10px 14px;font-weight:600}
details .in{padding:2px 16px 14px}details details{margin:6px 0}details details summary{font-weight:500}
pre{background:var(--code);padding:10px;border-radius:8px;white-space:pre-wrap;word-break:break-word;margin:4px 0;font:12px/1.45 ui-monospace,Consolas,monospace;max-height:340px;overflow:auto}
ul{margin:4px 0;padding-left:20px}li.ok::marker{content:"✓ "}li.bad::marker{content:"✗ "}li.bad{color:var(--failfg)}
.failbox{border-left:4px solid var(--failfg)}.infrabox{border-left:4px solid var(--infrafg)}
label.filter{display:inline-flex;gap:8px;align-items:center;font-weight:600;cursor:pointer}
body.failures-only .passonly{display:none}
"""

JS = """document.getElementById('onlyFail').addEventListener('change',function(e){
document.body.classList.toggle('failures-only',e.target.checked);});"""


def pct(rate):
    return "n/a" if rate is None else f"{rate * 100:.0f}%"


def bar(rate):
    width = 0 if rate is None else rate * 100
    return f'<span class="bar"><span style="width:{width:.0f}%"></span></span>{pct(rate)}'


def badge(status):
    icon, word = BADGE[status]
    cls = {"pass": "b-pass", "fail": "b-fail", "infra_failure": "b-infra"}[status]
    return f'<span class="badge {cls}">{icon} {word}</span>'


def ms(value):
    return f"{value / 1000:.1f}s"


# ---------- tool usage ----------

def tool_usage(records: list, cases_by_id: dict) -> dict:
    """Per tool: how often it was called, how often it reported failure, how often it was called
    where the test said it should not be, and how often a test expected it but it was missed."""
    usage = defaultdict(lambda: {"called": 0, "failed": 0, "unwanted": 0, "missed": 0})
    for r in records:
        if r["endpoint"] != "ask-root":
            continue
        specs = r.get("check_specs") or cases_by_id.get(r["case_id"], {}).get("deterministic_checks", [])
        forbidden, no_tools, expected = set(), False, set()
        for s in specs:
            if s["check"] == "tools_not_called":
                forbidden |= set(s["value"])
            elif s["check"] == "no_tools_called":
                no_tools = True
            elif s["check"] == "tools_called_include":
                expected |= set(s["value"])

        calls = (r.get("eval") or {}).get("toolCalls")
        if calls is None:
            calls = [{"name": t["name"], "ok": True} for t in (r["response"].get("body") or {}).get("toolsUsed", [])]
        called = set()
        for c in calls:
            u = usage[c["name"]]
            u["called"] += 1
            called.add(c["name"])
            if not c.get("ok", True):
                u["failed"] += 1
            if no_tools or c["name"] in forbidden:
                u["unwanted"] += 1
        for name in expected - called:
            usage[name]["missed"] += 1
    return dict(usage)


# ---------- HTML pieces ----------

def response_text(r: dict) -> str:
    body = r["response"].get("body")
    if r["endpoint"] == "ask-root" and body:
        return str(body.get("answer", ""))
    if r["endpoint"] == "chat":
        return r["response"].get("text") or json.dumps(body, ensure_ascii=False)
    return json.dumps(body, indent=2, ensure_ascii=False)[:12000] if body else (r["response"].get("request_error") or "(no body)")


def run_details(r: dict) -> str:
    trace = r.get("eval") or {}
    judge = r.get("judge") or {}
    tok = tokens_of(r)
    j_total = len(judge.get("criteria", []))
    j_pass = sum(c["verdict"] == "PASS" for c in judge.get("criteria", []))
    head = (f"{badge(r['status'])} Run {r['run_index']} &middot; {ms(r['response']['latency_ms'])} &middot; "
            f"checks {r['checks_passed']}/{r['checks_total']}"
            + (f" &middot; judge {j_pass}/{j_total}" if j_total else (" &middot; judge skipped" if r["judge"] is None else "")))

    parts = [f"<h5>Input</h5><pre>{escape(json.dumps(r['request'], indent=2, ensure_ascii=False)[:4000])}</pre>",
             f"<h5>Response (HTTP {r['response']['status']})</h5><pre>{escape(response_text(r))}</pre>"]

    if trace:
        meta = [f"agent rounds: {trace.get('agentRounds', 0)}", f"server time: {ms(trace.get('totalDurationMs', 0))}"]
        parts.append("<h5>Trace</h5><p class='small'>" + " &middot; ".join(meta) + "</p>")
        if trace.get("toolCalls"):
            rows = "".join(
                f"<tr><td>{escape(t['name'])}</td><td><code>{escape(json.dumps(t['args'], ensure_ascii=False))}</code></td>"
                f"<td>{t.get('round', '')}</td><td>{'✓' if t.get('ok') else '✗ failed'}</td><td class='num'>{t['durationMs']}ms</td>"
                f"<td>{escape(t['resultSummary'])}</td></tr>" for t in trace["toolCalls"])
            parts.append("<div class='tablewrap'><table><tr><th>Tool</th><th>Arguments</th><th>Round</th><th>Result</th>"
                         f"<th class='num'>Time</th><th>Summary</th></tr>{rows}</table></div>")
        if trace.get("llmCalls"):
            rows = "".join(
                f"<tr><td>{escape(c['label'])}</td><td class='num'>{c['durationMs']}ms</td>"
                f"<td class='num'>{(c.get('usage') or {}).get('promptTokens', '-')}</td>"
                f"<td class='num'>{(c.get('usage') or {}).get('completionTokens', '-')}</td></tr>" for c in trace["llmCalls"])
            parts.append("<div class='tablewrap'><table><tr><th>Model call</th><th class='num'>Time</th>"
                         f"<th class='num'>Prompt tokens</th><th class='num'>Completion tokens</th></tr>{rows}</table></div>")
        if trace.get("flags"):
            parts.append(f"<h5>Flags</h5><pre>{escape(json.dumps(trace['flags'], indent=2, ensure_ascii=False)[:2500])}</pre>")
    if tok:
        parts.append(f"<p class='small'>Tokens: {tok['total']:,}" + (" (estimated with tiktoken, excludes the server system prompt)" if tok["estimated"] else " (reported by OpenAI)") + "</p>")

    checks = "".join(f"<li class='{'ok' if c['passed'] else 'bad'}'><strong>{escape(c['check'])}</strong> &ndash; {escape(c['detail'])}</li>"
                     for c in r["deterministic"])
    parts.append(f"<h5>Deterministic checks</h5><ul>{checks}</ul>")

    if judge.get("error"):
        parts.append(f"<h5>Judge</h5><p class='badge b-infra'>⚠ judge error: {escape(judge['error'])}</p>")
    elif judge.get("criteria"):
        items = "".join(f"<li class='{'ok' if c['verdict'] == 'PASS' else 'bad'}'><strong>{escape(c['criterion'])}</strong><br>"
                        f"{escape(c['verdict'])}: {escape(c['reason'])}</li>" for c in judge["criteria"])
        parts.append(f"<h5>Judge ({escape(judge.get('model', ''))})</h5><p>{escape(judge.get('summary', ''))}</p><ul>{items}</ul>")
    elif r["judge"] is None and not r["deterministic_passed"]:
        parts.append("<h5>Judge</h5><p class='small'>Skipped because a deterministic check failed.</p>")
    if r["infra"]["hints"]:
        parts.append("<h5>Infrastructure hints</h5><ul>" + "".join(f"<li>{escape(h)}</li>" for h in r["infra"]["hints"]) + "</ul>")

    css = "" if r["status"] != "pass" else " passonly"
    return f"<details class='run{css}'><summary>{head}</summary><div class='in'>{''.join(parts)}</div></details>"


def failure_reasons(r: dict) -> list:
    reasons = [f"{c['check']}: {c['detail']}" for c in r["deterministic"] if not c["passed"]]
    reasons += [f"judge – {c['criterion'][:70]}: {c['reason']}" for c in (r.get("judge") or {}).get("criteria", []) if c["verdict"] == "FAIL"]
    if (r.get("judge") or {}).get("error"):
        reasons.append("judge error: " + r["judge"]["error"])
    reasons += r["infra"]["hints"] if r["status"] == "infra_failure" else []
    return reasons


def build_report(folder: Path) -> str:
    folder = Path(folder)
    records = load_results(folder)
    if not records:
        raise SystemExit(f"No run records found in {folder / 'runs'}")
    summary = summarize(records)
    meta = json.loads((folder / "run_config.json").read_text(encoding="utf-8")) if (folder / "run_config.json").exists() else {}
    try:
        cases_by_id = {c["id"]: c for c in load_cases(load_config())}
    except Exception:  # noqa: BLE001  (cases may have changed since the run)
        cases_by_id = {}

    o = summary["overall"]
    est = " (partly estimated)" if summary["tokens"]["estimated_part"] else ""
    version = meta.get("app_version", {})
    judge_runs = [r for r in records if r.get("judge") and not r["judge"].get("error")]
    judge_tokens = sum((r["judge"].get("usage") or {}).get("input", 0) + (r["judge"].get("usage") or {}).get("output", 0) for r in judge_runs)

    out = [f"<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
           f"<title>Root eval report – {escape(folder.name)}</title><style>{CSS}</style></head><body><main>",
           "<h1>Root evaluation report</h1>",
           f"<p class='muted'>{escape(folder.name)} &middot; target {escape(str(meta.get('base_url', '?')))} &middot; "
           f"{meta.get('runs_per_test', '?')} run(s) per test &middot; judge {escape(str(meta.get('judge_model') or 'off'))} &middot; "
           f"app branch {escape(str(version.get('branch', '?')))} @ {escape(str(version.get('commit', '?')))} "
           f"({version.get('uncommitted_files', '?')} uncommitted files)</p>",
           "<div class='card' style='margin:12px 0'><strong>How to read this.</strong> A run passes only if every code check and every judge "
           "criterion passed. Pass rate = passed / (passed + failed); infrastructure failures (⚠) are counted separately because they say "
           "nothing about the AI. The judge is an AI grader and can be wrong; see the judge-validation step for how often it agrees with a human. "
           f"With only {meta.get('runs_per_test', 'a few')} run(s) per test, small rate differences are noise.</div>",
           "<div class='cards'>",
           f"<div class='card'><div class='big'>{pct(o['pass_rate'])}</div><div class='small'>overall pass rate</div></div>",
           f"<div class='card'><div class='big'>{o['passed']} / {o['failed']} / {o['infra']}</div><div class='small'>passed / failed / infrastructure</div></div>",
           f"<div class='card'><div class='big'>{summary['tokens']['total']:,}</div><div class='small'>app tokens{est}; judge {judge_tokens:,}</div></div>",
           f"<div class='card'><div class='big'>{summary['latency_total_seconds']:.0f}s</div><div class='small'>total request time</div></div></div>",
           "<label class='filter'><input type='checkbox' id='onlyFail'> Show failures only</label>"]

    # failures first
    bad = [r for r in records if r["status"] != "pass"]
    out.append(f"<h2>Failures ({len(bad)})</h2>")
    if not bad:
        out.append("<p class='muted'>No failures in this run.</p>")
    for r in sorted(bad, key=lambda r: (r["status"] == "infra_failure", r["case_id"], r["run_index"])):
        box = "infrabox" if r["status"] == "infra_failure" else "failbox"
        items = "".join(f"<li>{escape(x)}</li>" for x in failure_reasons(r))
        out.append(f"<div class='card {box}' style='margin:8px 0'>{badge(r['status'])} <strong>{escape(r['case_id'])}</strong> run {r['run_index']} "
                   f"<span class='muted'>({escape(r['case_name'])})</span><ul>{items}</ul></div>")

    out.append("<h2>Pass rate by endpoint</h2><div class='tablewrap'><table><tr><th>Endpoint</th><th>Pass rate</th>"
               "<th class='num'>Passed</th><th class='num'>Failed</th><th class='num'>Infra</th></tr>")
    for name, e in summary["endpoints"].items():
        out.append(f"<tr><td>{escape(name)}</td><td>{bar(e['pass_rate'])}</td><td class='num'>{e['passed']}</td>"
                   f"<td class='num'>{e['failed']}</td><td class='num'>{e['infra']}</td></tr>")
    out.append("</table></div>")

    out.append("<h2>Tests</h2><div class='tablewrap'><table><tr><th>Test</th><th>Endpoint</th><th>Pass rate</th><th class='num'>P/F/Infra</th>"
               "<th class='num'>Avg latency</th><th class='num'>Max</th><th class='num'>Tokens</th><th>Failing checks</th></tr>")
    for t in sorted(summary["tests"].values(), key=lambda t: (t["pass_rate"] is None, t["pass_rate"] or 0, t["id"])):
        allpass = " class='passonly'" if t["failed"] == 0 and t["infra"] == 0 else ""
        fails = "<br>".join(f"{escape(k)} ×{v}" for k, v in t["failing_checks"].items()) or "&ndash;"
        tok = f"{t['tokens']:,}" + ("*" if t["tokens_estimated"] else "")
        out.append(f"<tr{allpass}><td><strong>{escape(t['id'])}</strong><br><span class='small'>{escape(t['name'])}</span></td><td>{escape(t['endpoint'])}</td>"
                   f"<td>{bar(t['pass_rate'])}</td><td class='num'>{t['passed']}/{t['failed']}/{t['infra']}</td><td class='num'>{ms(t['latency_avg_ms'])}</td>"
                   f"<td class='num'>{ms(t['latency_max_ms'])}</td><td class='num'>{tok}</td><td class='small'>{fails}</td></tr>")
    out.append("</table></div><p class='small'>* tokens estimated with tiktoken (chat route has no usage data; excludes the server's system prompt).</p>")

    usage = tool_usage(records, cases_by_id)
    out.append("<h2>Tool usage (ask-root)</h2>")
    if usage:
        out.append("<div class='tablewrap'><table><tr><th>Tool</th><th class='num'>Called</th><th class='num'>Reported failure</th>"
                   "<th class='num'>Called when it shouldn't be</th><th class='num'>Expected but not called</th></tr>")
        for name, u in sorted(usage.items(), key=lambda kv: -kv[1]["called"]):
            out.append(f"<tr><td>{escape(name)}</td><td class='num'>{u['called']}</td><td class='num'>{u['failed']}</td>"
                       f"<td class='num'>{u['unwanted']}</td><td class='num'>{u['missed']}</td></tr>")
        out.append("</table></div><p class='small'>&ldquo;Called when it shouldn't be&rdquo; counts tool calls in tests that forbid tools "
                   "(no_tools_called / tools_not_called). &ldquo;Expected but not called&rdquo; counts tools a test required (tools_called_include) that the model skipped.</p>")
    else:
        out.append("<p class='muted'>No ask-root runs in this folder.</p>")

    out.append("<h2>Every run</h2>")
    by_test = defaultdict(list)
    for r in records:
        by_test[r["case_id"]].append(r)
    for cid, runs in sorted(by_test.items()):
        t = summary["tests"][cid]
        cls = " passonly" if t["failed"] == 0 and t["infra"] == 0 else ""
        out.append(f"<details class='{cls.strip()}'><summary>{escape(cid)} &ndash; {escape(runs[0]['case_name'])} "
                   f"<span class='muted'>({t['passed']}/{t['runs']} passed, {pct(t['pass_rate'])})</span></summary><div class='in'>"
                   + "".join(run_details(r) for r in sorted(runs, key=lambda r: r["run_index"])) + "</div></details>")

    out.append(f"</main><script>{JS}</script></body></html>")
    return "".join(out)
