"""Offline tests for the judge prompt. The live API call itself is checked by running the suite."""
import unittest

from evalkit.judge import JUDGE_SCHEMA, build_prompt

CASE = {"endpoint": "ask-root", "input": {"message": "easy quad exercise"}, "judge_criteria": ["Suits a bad knee.", "Uses tool results."]}
RECORD = {
    "response": {"body": {"answer": "Try wall sits."}, "text": ""},
    "eval": {"toolCalls": [{"name": "search_exercises", "args": {"query": "quad"}, "ok": True, "resultSummary": "exercises[5]: Wall Sit"}]},
}


class JudgePrompt(unittest.TestCase):
    def test_prompt_contains_everything_the_judge_needs(self):
        prompt = build_prompt(CASE, RECORD)
        for needle in ["easy quad exercise", "Try wall sits.", "search_exercises", "Wall Sit", "1. Suits a bad knee.", "2. Uses tool results."]:
            self.assertIn(needle, prompt)

    def test_prompt_without_tools_says_none(self):
        self.assertIn("none", build_prompt(CASE, {"response": {"body": {"answer": "hi"}}, "eval": None}))

    def test_schema_forces_pass_fail_only(self):
        verdict = JUDGE_SCHEMA["properties"]["criteria"]["items"]["properties"]["verdict"]
        self.assertEqual(verdict["enum"], ["PASS", "FAIL"])


if __name__ == "__main__":
    unittest.main()
