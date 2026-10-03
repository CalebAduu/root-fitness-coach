"""Offline tests for the deterministic checks. Run from the evals/ folder:

    .venv\\Scripts\\python.exe -m unittest discover tests -v

They use made-up responses, so they need no server and cost nothing. Each check gets at least
one case that should pass and one that should fail - if a check is wrong, the report is wrong.
"""
import unittest

from evalkit.checks import Ctx, CHECKS, find_words, run_checks
from evalkit.cases import load_cases
from evalkit.client import RunResponse
from evalkit.config import load_config


def ask_case():
    return {"endpoint": "ask-root", "deterministic_checks": []}


def trace(tool_calls=(), rounds=1, flags=None):
    return {"toolCalls": list(tool_calls), "agentRounds": rounds, "flags": flags or {}, "errors": [], "llmCalls": []}


def tool(name, args=None, ok=True, summary=""):
    return {"name": name, "args": args or {}, "ok": ok, "round": 1, "resultSummary": summary}


def ask_resp(answer="Hello", tools=(), rounds=1, sources=(), status=200, flags=None):
    body = {"success": True, "answer": answer, "sources": list(sources), "toolsUsed": [{"name": t["name"], "args": t["args"]} for t in tools]}
    return RunResponse(status=status, latency_ms=2000, body=body, text="", eval=trace(tools, rounds, flags))


def run(spec, resp, case=None):
    passed, detail = CHECKS[spec["check"]](Ctx(case or ask_case(), resp), spec)
    return passed


PLAN_CASE = {"endpoint": "generate-plan", "deterministic_checks": []}


def plan_resp(days):
    plan = {f"Day {i + 1}": {"exercises": [{"name": n} for n in names]} for i, names in enumerate(days)}
    return RunResponse(status=200, latency_ms=1000, body={"weeklyPlan": plan, "userInfo": {}, "recommendations": {}, "safetyNotes": []})


class WordMatching(unittest.TestCase):
    def test_whole_word_not_substring(self):
        self.assertEqual(find_words("grilled eggplant", ["egg"]), [])
        self.assertEqual(find_words("scrambled eggs", ["egg"]), ["egg"])

    def test_allow_list_blanks_phrases(self):
        self.assertEqual(find_words("almond milk smoothie", ["milk"], allow=["almond milk"]), [])
        self.assertEqual(find_words("glass of milk", ["milk"], allow=["almond milk"]), ["milk"])

    def test_symbol_edges(self):
        self.assertEqual(find_words("done[ONBOARDING_COMPLETE]", ["[ONBOARDING_COMPLETE]"]), ["[ONBOARDING_COMPLETE]"])


class ToolChecks(unittest.TestCase):
    def test_include_and_any(self):
        r = ask_resp(tools=[tool("search_exercises", {"query": "quad"})])
        self.assertTrue(run({"check": "tools_called_include", "value": ["search_exercises"]}, r))
        self.assertFalse(run({"check": "tools_called_include", "value": ["search_exercises", "get_equipment"]}, r))
        self.assertTrue(run({"check": "tools_called_include_any", "value": ["get_equipment", "search_exercises"]}, r))
        self.assertFalse(run({"check": "tools_called_include_any", "value": ["get_equipment"]}, r))

    def test_not_called_and_no_tools(self):
        r = ask_resp(tools=[tool("get_equipment")])
        self.assertFalse(run({"check": "no_tools_called"}, r))
        self.assertTrue(run({"check": "no_tools_called"}, ask_resp()))
        self.assertFalse(run({"check": "tools_not_called", "value": ["get_equipment"]}, r))
        self.assertTrue(run({"check": "tools_not_called", "value": ["search_exercises"]}, r))

    def test_arg_contains(self):
        r = ask_resp(tools=[tool("search_exercises", {"query": "Quad exercise", "limit": 5})])
        self.assertTrue(run({"check": "tool_arg_contains", "tool": "search_exercises", "value": "quad"}, r))
        self.assertFalse(run({"check": "tool_arg_contains", "tool": "search_exercises", "value": "glute"}, r))
        self.assertFalse(run({"check": "tool_arg_contains", "tool": "get_equipment", "value": "x"}, r))

    def test_rounds_and_success_counts(self):
        r = ask_resp(tools=[tool("a"), tool("b", ok=False)], rounds=3)
        self.assertTrue(run({"check": "max_rounds", "value": 3}, r))
        self.assertFalse(run({"check": "max_rounds", "value": 2}, r))
        self.assertTrue(run({"check": "min_successful_tool_calls", "value": 1}, r))
        self.assertFalse(run({"check": "min_successful_tool_calls", "value": 2}, r))

    def test_missing_trace_fails_loudly(self):
        r = ask_resp()
        r.eval = None
        self.assertFalse(run({"check": "max_rounds", "value": 5}, r))


class AnswerChecks(unittest.TestCase):
    def test_request_succeeded(self):
        self.assertTrue(run({"check": "request_succeeded"}, ask_resp()))
        self.assertFalse(run({"check": "request_succeeded"}, ask_resp(status=500)))
        bad = ask_resp()
        bad.body["success"] = False
        self.assertFalse(run({"check": "request_succeeded"}, bad))
        timeout = RunResponse(request_error="timed out")
        self.assertFalse(run({"check": "request_succeeded"}, timeout))

    def test_fallback_and_empty_answers(self):
        self.assertTrue(run({"check": "not_fallback_answer"}, ask_resp("Squats are great!")))
        self.assertFalse(run({"check": "not_fallback_answer"}, ask_resp("")))
        self.assertFalse(run({"check": "not_fallback_answer"}, ask_resp("Sorry, I encountered an error while processing")))

    def test_includes_excludes(self):
        r = ask_resp("Please see a doctor about the chest pain.")
        self.assertTrue(run({"check": "output_includes_any", "value": ["doctor", "emergency"]}, r))
        self.assertFalse(run({"check": "output_includes_any", "value": ["yoga"]}, r))
        self.assertFalse(run({"check": "output_excludes", "value": ["doctor"]}, r))
        self.assertTrue(run({"check": "output_excludes", "value": ["jump"]}, r))

    def test_sources(self):
        generic = [{"url": "https://www.youtube.com/results?search_query=deadlift", "title": "YT"}]
        real = generic + [{"url": "https://www.acefitness.org/deadlift", "title": "ACE"}]
        self.assertFalse(run({"check": "sources_not_all_search_links"}, ask_resp(sources=generic)))
        self.assertTrue(run({"check": "sources_not_all_search_links"}, ask_resp(sources=real)))
        self.assertFalse(run({"check": "sources_not_all_search_links"}, ask_resp()))
        self.assertTrue(run({"check": "min_sources", "value": 2}, ask_resp(sources=real)))
        self.assertFalse(run({"check": "min_sources", "value": 3}, ask_resp(sources=real)))

    def test_latency(self):
        self.assertTrue(run({"check": "latency_under", "value": 3}, ask_resp()))
        self.assertFalse(run({"check": "latency_under", "value": 1}, ask_resp()))

    def test_flag_excludes(self):
        r = ask_resp(flags={"injected_meal_context": {"healthy": "Brown Stew Chicken"}})
        self.assertFalse(run({"check": "flag_excludes", "flag": "injected_meal_context", "value": ["chicken"]}, r))
        self.assertTrue(run({"check": "flag_excludes", "flag": "injected_meal_context", "value": ["tofu"]}, r))
        self.assertFalse(run({"check": "flag_excludes", "flag": "missing", "value": ["x"]}, r))


class PlanChecks(unittest.TestCase):
    def test_day_count_and_per_day(self):
        r = plan_resp([["a", "b", "c", "d"], ["a", "b", "c", "d", "e"]])
        self.assertTrue(run({"check": "plan_day_count", "value": 2}, r, PLAN_CASE))
        self.assertFalse(run({"check": "plan_day_count", "value": 3}, r, PLAN_CASE))
        self.assertTrue(run({"check": "exercises_per_day_between", "value": [4, 6]}, r, PLAN_CASE))
        self.assertFalse(run({"check": "exercises_per_day_between", "value": [5, 6]}, r, PLAN_CASE))

    def test_banned_exercises(self):
        r = plan_resp([["Walking Lunges", "Glute Bridge"]])
        self.assertFalse(run({"check": "exercises_exclude_keywords", "value": ["lunge"]}, r, PLAN_CASE))
        self.assertTrue(run({"check": "exercises_exclude_keywords", "value": ["jump"]}, r, PLAN_CASE))

    def test_prompt_example_overlap(self):
        copied = plan_resp([["Squats", "Push-ups", "Lunges", "Plank"], ["Rows", "Squats"]])
        self.assertFalse(run({"check": "prompt_example_overlap_max", "value": 2}, copied, PLAN_CASE))
        self.assertTrue(run({"check": "prompt_example_overlap_max", "value": 5}, copied, PLAN_CASE))
        fresh = plan_resp([["Wall Sit", "Glute Bridge", "Bird Dog", "Dead Bug"]])
        self.assertTrue(run({"check": "prompt_example_overlap_max", "value": 0}, fresh, PLAN_CASE))

    def test_clean_rejection(self):
        spec = {"check": "plan_or_clean_rejection", "reject_statuses": [400, 422], "min_days": 1, "max_days": 7}
        self.assertTrue(run(spec, RunResponse(status=400), PLAN_CASE))
        self.assertTrue(run(spec, plan_resp([["a"], ["b"]]), PLAN_CASE))
        self.assertFalse(run(spec, RunResponse(status=500), PLAN_CASE))
        self.assertFalse(run(spec, plan_resp([]), PLAN_CASE))

    def test_valid_fields_and_fallback_plan(self):
        case = {"endpoint": "generate-nutrition-plan", "deterministic_checks": []}
        good = RunResponse(status=200, body={"userInfo": {}, "dailyGuidelines": {"calories": "1800-2000 kcal"}})
        self.assertTrue(run({"check": "valid_json_fields", "value": ["userInfo", "dailyGuidelines.calories"]}, good, case))
        self.assertFalse(run({"check": "valid_json_fields", "value": ["mealPlan"]}, good, case))
        canned = RunResponse(status=200, body={"dailyGuidelines": {"calories": "Consult with a healthcare professional for personalized calorie recommendations"}})
        self.assertFalse(run({"check": "not_fallback_plan"}, canned, case))
        self.assertTrue(run({"check": "not_fallback_plan"}, good, case))

    def test_field_scoped_excludes(self):
        case = {"endpoint": "generate-nutrition-plan", "deterministic_checks": []}
        body = {"mealPlan": {"lunch": {"description": "Peanut-free grain bowl"}}, "safetyNotes": ["Avoid peanuts"]}
        resp = RunResponse(status=200, body=body)
        spec = {"check": "output_excludes", "value": ["peanut"], "fields": ["mealPlan"], "allow": ["peanut-free"]}
        self.assertTrue(run(spec, resp, case))  # the safety note's 'peanuts' is outside the scoped fields
        body["mealPlan"]["lunch"]["description"] = "Peanut noodles"
        self.assertFalse(run(spec, resp, case))


class RunnerBehaviour(unittest.TestCase):
    def test_crashing_check_counts_as_failure(self):
        case = {"endpoint": "ask-root", "deterministic_checks": [{"check": "plan_day_count", "value": 1}]}
        results = run_checks(case, RunResponse(status=200, body=None))
        self.assertFalse(results[0]["passed"])


class CaseFiles(unittest.TestCase):
    def test_all_case_files_load_and_validate(self):
        cases = load_cases(load_config())
        self.assertGreaterEqual(len(cases), 12)
        self.assertEqual(len({c["id"] for c in cases}), len(cases))


if __name__ == "__main__":
    unittest.main()
