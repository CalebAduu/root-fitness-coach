"""Runs the eval suite.

    .venv\\Scripts\\python.exe scripts\\run.py                      # all cases, runs_per_test from config
    .venv\\Scripts\\python.exe scripts\\run.py --only ar-casual chat --runs 1
    .venv\\Scripts\\python.exe scripts\\run.py --base-url https://my-preview.vercel.app --label preview

Results are saved to evals/results/<timestamp>/ (gitignored). Build the HTML report from that
folder afterwards.
"""
import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from evalkit.cases import load_cases  # noqa: E402
from evalkit.client import call_endpoint  # noqa: E402
from evalkit.config import load_config  # noqa: E402
from evalkit.judge import make_judge  # noqa: E402
from evalkit.runner import make_results_dir, run_suite  # noqa: E402
from evalkit.summary import summarize  # noqa: E402


def warmup(config: dict) -> None:
    """Sends one throwaway request so the first real test doesn't pay the cold-start cost of
    loading the wger exercise list (about 3s). Not traced and not graded."""
    case = {"endpoint": "ask-root", "input": {"message": "Find me a squat exercise.", "history": [], "userContext": {}}}
    resp = call_endpoint(config, case, tracing=False)
    print(f"Warm-up request: HTTP {resp.status} in {resp.latency_ms / 1000:.1f}s")


def print_summary(summary: dict) -> None:
    def pct(rate):
        return "  n/a" if rate is None else f"{rate * 100:4.0f}%"

    print("\n=== Results ===")
    print(f"{'test':<24}{'endpoint':<26}{'pass':>5}{'fail':>5}{'infra':>6}{'rate':>7}")
    for t in sorted(summary["tests"].values(), key=lambda t: (t["pass_rate"] is None, t["pass_rate"] or 0)):
        print(f"{t['id']:<24}{t['endpoint']:<26}{t['passed']:>5}{t['failed']:>5}{t['infra']:>6}{pct(t['pass_rate']):>7}")
    for name, e in summary["endpoints"].items():
        print(f"  endpoint {name:<26}{e['passed']:>3} passed / {e['failed']} failed / {e['infra']} infra  ({pct(e['pass_rate']).strip()})")
    o = summary["overall"]
    print(f"OVERALL: {o['passed']} passed, {o['failed']} failed, {o['infra']} infrastructure failures "
          f"-> pass rate {pct(o['pass_rate']).strip()}")
    est = " (partly estimated)" if summary["tokens"]["estimated_part"] else ""
    print(f"Tokens: {summary['tokens']['total']:,}{est}   Total request time: {summary['latency_total_seconds']:.0f}s")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Root eval suite")
    parser.add_argument("--runs", type=int, help="runs per test (default: from config.json)")
    parser.add_argument("--only", nargs="+", help="case ids and/or endpoint names to run")
    parser.add_argument("--base-url", help="target server (default: from config.json)")
    parser.add_argument("--label", help="suffix for the results folder name")
    parser.add_argument("--no-judge", action="store_true", help="skip the AI judge (deterministic checks only)")
    parser.add_argument("--warmup", action="store_true", help="send a throwaway request first")
    parser.add_argument("--delay", type=float, default=0.0, help="seconds to wait between runs")
    args = parser.parse_args()

    if args.base_url:
        os.environ["EVAL_BASE_URL"] = args.base_url
    config = load_config()
    cases = load_cases(config, only=args.only)
    runs = args.runs or config["runs_per_test"]
    out_dir = make_results_dir(args.label)

    print(f"Target: {config['base_url']}   cases: {len(cases)}   runs each: {runs}   -> {out_dir}")
    if not os.environ.get("EVAL_TOKEN"):
        print("WARNING: EVAL_TOKEN is not set, so no traces will be returned and trace-based checks will fail.")
    if args.warmup:
        warmup(config)

    judge = None if args.no_judge else make_judge(config)  # needs ANTHROPIC_API_KEY
    print(f"Judge: {config['judge']['model'] if judge else 'off'}")
    records = run_suite(config, cases, runs, out_dir, judge=judge, delay=args.delay)
    print_summary(summarize(records))
    print(f"\nSaved to {out_dir}")


if __name__ == "__main__":
    main()
