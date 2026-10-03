"""Turns a list of run records into pass rates and totals.

Shared by the runner (live progress), the HTML report and the run comparison, so all three
always agree on what "pass rate" means:

    pass rate = passed / (passed + failed)

Infrastructure failures (wger/TheMealDB down, timeouts) are counted separately and left OUT of
the pass rate, because they say nothing about whether the AI behaved correctly.
"""
import json
from collections import Counter
from pathlib import Path


def pass_rate(passed: int, failed: int):
    total = passed + failed
    return None if total == 0 else passed / total


def tokens_of(record: dict):
    """Normalised token counts for a run: the server's exact numbers when available, otherwise
    the runner's tiktoken estimate (marked estimated)."""
    trace = record.get("eval")
    if trace and trace.get("totals", {}).get("totalTokens"):
        t = trace["totals"]
        return {"prompt": t["promptTokens"], "completion": t["completionTokens"], "total": t["totalTokens"], "estimated": False}
    est = record.get("response", {}).get("estimated_tokens")
    if est:
        return {"prompt": est["promptTokens"], "completion": est["completionTokens"], "total": est["totalTokens"], "estimated": True}
    return None


def _bucket():
    return {"runs": 0, "passed": 0, "failed": 0, "infra": 0}


def _add(bucket: dict, status: str) -> None:
    bucket["runs"] += 1
    bucket[{"pass": "passed", "fail": "failed", "infra_failure": "infra"}[status]] += 1


def summarize(records: list) -> dict:
    tests, endpoints, overall = {}, {}, _bucket()
    tokens_total = {"total": 0, "estimated_part": 0}
    latency_total_ms = 0.0

    for r in records:
        test = tests.setdefault(r["case_id"], {
            "id": r["case_id"], "name": r.get("case_name", r["case_id"]), "endpoint": r["endpoint"], **_bucket(),
            "latency_ms": [], "tokens": 0, "tokens_estimated": False, "failing_checks": Counter(),
        })
        _add(test, r["status"])
        _add(endpoints.setdefault(r["endpoint"], _bucket()), r["status"])
        _add(overall, r["status"])

        test["latency_ms"].append(r["response"]["latency_ms"])
        latency_total_ms += r["response"]["latency_ms"]
        tok = tokens_of(r)
        if tok:
            test["tokens"] += tok["total"]
            tokens_total["total"] += tok["total"]
            if tok["estimated"]:
                test["tokens_estimated"] = True
                tokens_total["estimated_part"] += tok["total"]
        for c in r.get("deterministic", []):
            if not c["passed"]:
                test["failing_checks"][c["check"]] += 1
        for c in (r.get("judge") or {}).get("criteria", []):
            if c.get("verdict") == "FAIL":
                test["failing_checks"]["judge: " + c["criterion"][:60]] += 1

    for t in tests.values():
        t["pass_rate"] = pass_rate(t["passed"], t["failed"])
        t["latency_avg_ms"] = sum(t["latency_ms"]) / len(t["latency_ms"])
        t["latency_max_ms"] = max(t["latency_ms"])
        del t["latency_ms"]
        t["failing_checks"] = dict(t["failing_checks"])
    for e in endpoints.values():
        e["pass_rate"] = pass_rate(e["passed"], e["failed"])
    overall["pass_rate"] = pass_rate(overall["passed"], overall["failed"])

    return {
        "overall": overall,
        "endpoints": endpoints,
        "tests": tests,
        "tokens": tokens_total,
        "latency_total_seconds": latency_total_ms / 1000,
    }


def load_results(folder: Path) -> list:
    """Reads every run record saved by the runner in a results folder."""
    return [json.loads(p.read_text(encoding="utf-8")) for p in sorted((Path(folder) / "runs").glob("*.json"))]
