"""Offline tests for the HTML report and run comparison, using synthetic result folders."""
import json
import tempfile
import unittest
from pathlib import Path

from evalkit.compare import compare, format_comparison
from evalkit.report import build_report, tool_usage


def record(case_id="t1", endpoint="ask-root", run=1, status="pass", tools=(), checks=None, answer="All good", specs=None, judge=None):
    checks = checks or [{"check": "request_succeeded", "spec": "request_succeeded", "passed": status == "pass", "detail": "HTTP 200"}]
    return {
        "case_id": case_id, "case_name": "Name <b>", "endpoint": endpoint, "run_index": run, "status": status,
        "request": {"message": "hi"}, "check_specs": specs or [],
        "response": {"status": 200, "latency_ms": 2000, "body": {"success": True, "answer": answer, "sources": []}, "text": "", "request_error": None, "estimated_tokens": None},
        "eval": {"agentRounds": 1, "totalDurationMs": 1500, "llmCalls": [{"label": "agent_round_1", "durationMs": 900, "ok": True, "usage": {"promptTokens": 100, "completionTokens": 20, "totalTokens": 120}}],
                 "toolCalls": list(tools), "totals": {"promptTokens": 100, "completionTokens": 20, "totalTokens": 120}, "flags": {}, "errors": []},
        "deterministic": checks, "deterministic_passed": status == "pass", "checks_passed": sum(c["passed"] for c in checks), "checks_total": len(checks),
        "infra": {"hints": ["tool x: timeout"] if status == "infra_failure" else []}, "judge": judge,
    }


def tool(name, ok=True):
    return {"name": name, "args": {"q": "x"}, "ok": ok, "round": 1, "durationMs": 5, "resultSummary": "ok", "resultPreview": ""}


def write_folder(tmp: Path, records: list):
    (tmp / "runs").mkdir(parents=True)
    for i, r in enumerate(records):
        (tmp / "runs" / f"{i}.json").write_text(json.dumps(r), encoding="utf-8")
    (tmp / "run_config.json").write_text(json.dumps({"base_url": "http://x", "runs_per_test": 2, "judge_model": None, "app_version": {}}), encoding="utf-8")


class ToolUsage(unittest.TestCase):
    def test_counts_failed_unwanted_and_missed(self):
        no_tools = [{"check": "no_tools_called"}]
        needs_search = [{"check": "tools_called_include", "value": ["search_exercises"]}]
        records = [
            record("a", tools=[tool("get_equipment", ok=False)], specs=no_tools),
            record("b", tools=[], specs=needs_search),
            record("c", tools=[tool("search_exercises")], specs=needs_search),
        ]
        u = tool_usage(records, {})
        self.assertEqual(u["get_equipment"], {"called": 1, "failed": 1, "unwanted": 1, "missed": 0})
        self.assertEqual(u["search_exercises"], {"called": 1, "failed": 0, "unwanted": 0, "missed": 1})


class Report(unittest.TestCase):
    def test_report_is_self_contained_escaped_and_marks_failures(self):
        records = [record("t1", run=1), record("t1", run=2, status="fail", answer="<script>alert(1)</script>"),
                   record("t2", run=1, status="infra_failure")]
        with tempfile.TemporaryDirectory() as tmp:
            write_folder(Path(tmp), records)
            html = build_report(Path(tmp))
        self.assertIn("Show failures only", html)
        self.assertIn("✗ FAIL", html)
        self.assertIn("⚠ INFRA", html)
        self.assertNotIn("<script>alert(1)</script>", html)       # response text is escaped
        self.assertIn("&lt;script&gt;alert(1)&lt;/script&gt;", html)
        self.assertNotIn("http://", html.replace("http://x", "").replace("http://www.w3.org", ""))  # nothing loaded from outside
        self.assertEqual(html.count("<script>"), 1)                 # only our own filter script


class Compare(unittest.TestCase):
    def test_detects_improvement_regression_and_new_tests(self):
        a = [record("t1", run=1, status="fail"), record("t1", run=2, status="fail"), record("t2", run=1), record("t2", run=2), record("only_a")]
        b = [record("t1", run=1), record("t1", run=2, status="fail"), record("t2", run=1, status="fail"), record("t2", run=2, status="fail"), record("only_b")]
        rows = {r["id"]: r for r in compare(a, b)["rows"]}
        self.assertEqual(rows["t1"]["change"], "improved")
        self.assertEqual(rows["t2"]["change"], "regressed")
        self.assertEqual(rows["only_a"]["change"], "only in A")
        self.assertEqual(rows["only_b"]["change"], "only in B")
        text = format_comparison(compare(a, b), "before", "after")
        self.assertIn("▲ improved", text)
        self.assertIn("▼ regressed", text)


if __name__ == "__main__":
    unittest.main()
