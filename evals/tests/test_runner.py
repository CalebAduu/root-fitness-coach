"""Offline tests for run classification, aggregation and the runner loop (fake server)."""
import json
import tempfile
import unittest
from pathlib import Path

from evalkit.client import RunResponse, classify_infra
from evalkit.runner import classify_run, run_suite
from evalkit.summary import load_results, summarize

CONFIG = {"base_url": "http://x", "judge": {"model": "m"}, "endpoints": {}, "timeouts_seconds": {}}


def case(case_id="t1", endpoint="ask-root", checks=None):
    return {"id": case_id, "name": case_id, "endpoint": endpoint, "input": {},
            "deterministic_checks": checks if checks is not None else [{"check": "latency_under", "value": 5}],
            "judge_criteria": []}


def fake_response(latency_ms=1000, hints=None, **kw):
    r = RunResponse(status=200, latency_ms=latency_ms, body={"success": True, "answer": "ok"}, **kw)
    r.infra_hints = hints or []
    return r


class Classification(unittest.TestCase):
    def rec(self, det_ok, hints=(), judge=None):
        return {"deterministic_passed": det_ok, "infra": {"hints": list(hints)}, "judge": judge}

    def test_pass_fail_infra(self):
        self.assertEqual(classify_run(self.rec(True)), "pass")
        self.assertEqual(classify_run(self.rec(False)), "fail")
        self.assertEqual(classify_run(self.rec(False, ["tool x failed: network error"])), "infra_failure")

    def test_passing_run_with_infra_hint_still_passes(self):
        self.assertEqual(classify_run(self.rec(True, ["tool x failed: timeout"])), "pass")

    def test_judge_results(self):
        self.assertEqual(classify_run(self.rec(True, judge={"all_passed": True})), "pass")
        self.assertEqual(classify_run(self.rec(True, judge={"all_passed": False})), "fail")
        self.assertEqual(classify_run(self.rec(True, judge={"error": "api down"})), "infra_failure")

    def test_infra_hint_detection(self):
        r = RunResponse(status=200, eval={"errors": [], "llmCalls": [], "toolCalls": [
            {"name": "search_exercises", "ok": False, "resultSummary": "error: Network error: fetch failed"}]})
        self.assertTrue(classify_infra(r))
        self.assertEqual(classify_infra(RunResponse(status=200, eval={"errors": [], "llmCalls": [], "toolCalls": [
            {"name": "x", "ok": False, "resultSummary": "error: No muscles found"}]})), [])
        self.assertTrue(classify_infra(RunResponse(request_error="timed out after 90s")))


class RunnerLoop(unittest.TestCase):
    def test_runs_n_times_saves_files_and_summarises(self):
        calls = {"n": 0}

        def fake_call(config, c):
            calls["n"] += 1
            return fake_response(latency_ms=9000 if calls["n"] == 2 else 1000)  # 2nd run breaches the 5s limit

        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            (out / "runs").mkdir()
            records = run_suite(CONFIG, [case()], runs=3, out_dir=out, call=fake_call, progress=lambda *_: None)
            self.assertEqual([r["status"] for r in records], ["pass", "fail", "pass"])
            self.assertEqual(len(list((out / "runs").glob("*.json"))), 3)
            self.assertEqual(len(load_results(out)), 3)
            summary = json.loads((out / "summary.json").read_text())
            self.assertAlmostEqual(summary["tests"]["t1"]["pass_rate"], 2 / 3)
            self.assertEqual(summary["tests"]["t1"]["failing_checks"], {"latency_under": 1})

    def test_infra_failures_excluded_from_pass_rate(self):
        responses = iter([fake_response(), fake_response(latency_ms=9000, hints=["tool a: timeout"])])
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            (out / "runs").mkdir()
            records = run_suite(CONFIG, [case()], runs=2, out_dir=out, call=lambda c, k: next(responses), progress=lambda *_: None)
            s = summarize(records)
            self.assertEqual(s["overall"], {"runs": 2, "passed": 1, "failed": 0, "infra": 1, "pass_rate": 1.0})

    def test_judge_runs_only_after_code_checks_pass(self):
        judged = []

        def judge(c, rec):
            judged.append(rec["case_id"])
            return {"all_passed": True, "criteria": []}

        c = case()
        c["judge_criteria"] = ["something subjective"]
        responses = iter([fake_response(), fake_response(latency_ms=9000)])
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            (out / "runs").mkdir()
            run_suite(CONFIG, [c], runs=2, out_dir=out, call=lambda a, b: next(responses), judge=judge, progress=lambda *_: None)
        self.assertEqual(judged, ["t1"])  # only the run whose deterministic checks passed


if __name__ == "__main__":
    unittest.main()
