"""Runs ONE test case ONCE against the live app and prints each deterministic check.

    .venv\\Scripts\\python.exe scripts\\smoke.py ar-knee-quad

Use it to sanity-check the connection, the eval token and a single case before a full run.
(The full runner comes later; this deliberately skips the judge and repeated runs.)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from evalkit.cases import load_cases  # noqa: E402
from evalkit.checks import run_checks  # noqa: E402
from evalkit.client import call_endpoint  # noqa: E402
from evalkit.config import load_config  # noqa: E402


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: smoke.py <case-id>")
    config = load_config()
    case = load_cases(config, only=[sys.argv[1]])[0]
    resp = call_endpoint(config, case)

    print(f"{case['id']}  ->  HTTP {resp.status}  {resp.latency_ms / 1000:.1f}s  trace={'yes' if resp.eval else 'no'}")
    if resp.estimated_tokens:
        print(f"tokens (estimated): {resp.estimated_tokens['totalTokens']}")
    if resp.eval:
        print(f"agent rounds: {resp.eval['agentRounds']}  tokens: {resp.eval['totals']['totalTokens']}  tools: "
              f"{[t['name'] for t in resp.eval['toolCalls']]}")
    if resp.infra_hints:
        print("infra hints:", resp.infra_hints)
    for r in run_checks(case, resp):
        print(f"  [{'PASS' if r['passed'] else 'FAIL'}] {r['check']:<28} {r['detail']}")


if __name__ == "__main__":
    main()
