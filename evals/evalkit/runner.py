"""The runner: executes each test case N times, grades it, and saves every run to disk.

Flow for one run of one case:
    1. call_endpoint(...)        -> send the request, get response + trace (client.py)
    2. run_checks(...)           -> deterministic checks, pure code (checks.py)
    3. judge(...)                -> only if step 2 passed and a judge was supplied (judge.py, later step)
    4. classify_run(...)         -> "pass", "fail" or "infra_failure"
    5. write runs/<case>__runN.json immediately (so a crash or Ctrl+C keeps partial results)

Runs are sequential on purpose: it keeps latency numbers honest and avoids rate limits.
"""
import json
import subprocess
import time
from datetime import datetime
from pathlib import Path

from .checks import run_checks
from .client import call_endpoint
from .config import EVALS_DIR, REPO_ROOT
from .summary import summarize, tokens_of


def classify_run(record: dict) -> str:
    """pass: every deterministic check (and judge criterion, if judged) passed.
    infra_failure: something failed AND a dependency was visibly broken (see client.classify_infra).
    fail: something failed and nothing points at infrastructure - the AI got it wrong."""
    judge = record.get("judge")
    judge_error = bool(judge and judge.get("error"))
    deterministic_ok = record["deterministic_passed"]
    judge_ok = judge is None or judge.get("all_passed", False)

    if deterministic_ok and judge_ok and not judge_error:
        return "pass"
    if judge_error:  # the judge itself couldn't run, which says nothing about Root
        return "infra_failure"
    if not deterministic_ok and record["infra"]["hints"]:
        return "infra_failure"
    return "fail"


def build_record(case: dict, run_index: int, resp, checks: list, judge_result) -> dict:
    record = {
        "case_id": case["id"],
        "case_name": case["name"],
        "endpoint": case["endpoint"],
        "run_index": run_index,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "request": case["input"],
        "check_specs": case["deterministic_checks"],  # kept so the report can judge "tool called wrongly" later
        "response": {
            "status": resp.status,
            "latency_ms": round(resp.latency_ms, 1),
            "ttfb_ms": None if resp.ttfb_ms is None else round(resp.ttfb_ms, 1),
            "body": resp.body,
            "text": resp.text if case["endpoint"] == "chat" else "",
            "request_error": resp.request_error,
            "estimated_tokens": resp.estimated_tokens,
        },
        "eval": resp.eval,
        "deterministic": checks,
        "deterministic_passed": all(c["passed"] for c in checks),
        "checks_passed": sum(c["passed"] for c in checks),
        "checks_total": len(checks),
        "infra": {"hints": resp.infra_hints},
        "judge": judge_result,
    }
    record["tokens"] = tokens_of(record)
    record["status"] = classify_run(record)
    return record


def git_info() -> dict:
    """Which version of the app was tested. Uncommitted changes are common on a working branch,
    so the dirty count is recorded rather than hidden."""
    def git(*args):
        return subprocess.run(["git", *args], cwd=REPO_ROOT, capture_output=True, text=True).stdout.strip()
    try:
        return {"branch": git("branch", "--show-current"), "commit": git("rev-parse", "--short", "HEAD"),
                "uncommitted_files": len(git("status", "--porcelain").splitlines())}
    except Exception:  # noqa: BLE001
        return {}


def make_results_dir(label: str | None = None) -> Path:
    name = datetime.now().strftime("%Y-%m-%d_%H%M%S") + (f"_{label}" if label else "")
    path = EVALS_DIR / "results" / name
    (path / "runs").mkdir(parents=True, exist_ok=True)
    return path


def run_suite(config: dict, cases: list, runs: int, out_dir: Path, call=call_endpoint, judge=None,
              progress=print, delay: float = 0.0) -> list:
    """Runs every case `runs` times. `call` and `judge` are injectable so the runner can be
    tested without a server. `judge(case, record)` returns a judge-result dict (or None)."""
    meta = {
        "started": datetime.now().isoformat(timespec="seconds"),
        "base_url": config["base_url"],
        "runs_per_test": runs,
        "judge_model": config["judge"]["model"] if judge else None,
        "cases": [c["id"] for c in cases],
        "app_version": git_info(),
    }
    (out_dir / "run_config.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    records, total = [], len(cases) * runs
    try:
        for case in cases:
            for i in range(1, runs + 1):
                resp = call(config, case)
                checks = run_checks(case, resp)

                judge_result = None
                if judge and all(c["passed"] for c in checks) and case["judge_criteria"]:
                    # Judge only runs on runs that already passed every code check
                    partial = build_record(case, i, resp, checks, None)
                    judge_result = judge(case, partial)

                record = build_record(case, i, resp, checks, judge_result)
                (out_dir / "runs" / f"{case['id']}__run{i}.json").write_text(
                    json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
                records.append(record)

                failed = [c["check"] for c in checks if not c["passed"]]
                if judge_result:
                    if judge_result.get("error"):
                        failed.append("judge error: " + judge_result["error"][:80])
                    failed += ["judge: " + c["criterion"][:50] for c in judge_result.get("criteria", []) if c["verdict"] == "FAIL"]
                progress(f"[{len(records)}/{total}] {case['id']} run {i}: {record['status'].upper():<13} "
                         f"{resp.latency_ms / 1000:5.1f}s  checks {record['checks_passed']}/{record['checks_total']}"
                         + (f"  failed: {', '.join(failed)}" if failed else ""))
                if delay:
                    time.sleep(delay)
    except KeyboardInterrupt:
        progress("Interrupted - saving what has run so far.")

    meta["finished"] = datetime.now().isoformat(timespec="seconds")
    meta["completed_runs"] = len(records)
    (out_dir / "run_config.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    (out_dir / "summary.json").write_text(json.dumps(summarize(records), indent=2), encoding="utf-8")
    return records
