"""Offline tests for judge-vs-human agreement maths and label storage."""
import tempfile
import unittest
from pathlib import Path

from evalkit.validation import add_label, agreement, collect_items, item_key, load_labels, save_labels, shuffled


def record(case_id="t1", run=1, verdicts=(("crit A", "PASS"), ("crit B", "FAIL"))):
    return {"case_id": case_id, "run_index": run,
            "judge": {"criteria": [{"criterion": c, "verdict": v, "reason": "because"} for c, v in verdicts]}}


def item(judge, criterion="crit A", case_id="t1", run=1):
    return {"key": item_key("f", case_id, run, criterion), "case_id": case_id, "run_index": run,
            "criterion": criterion, "judge_verdict": judge, "judge_reason": "r"}


class Collection(unittest.TestCase):
    def test_one_item_per_judged_criterion(self):
        items = collect_items(Path("results/f"), [record(), {"case_id": "t2", "run_index": 1, "judge": None}])
        self.assertEqual([i["criterion"] for i in items], ["crit A", "crit B"])
        self.assertEqual(items[0]["key"], "f|t1|run1|crit A")

    def test_shuffle_is_repeatable(self):
        items = list(range(20))
        self.assertEqual(shuffled(items, 0), shuffled(items, 0))
        self.assertNotEqual(shuffled(items, 0), items)


class Agreement(unittest.TestCase):
    def test_counts_and_direction_of_disagreement(self):
        labels = {}
        add_label(labels, item("PASS", "A", run=1), "PASS")   # agree
        add_label(labels, item("FAIL", "B", run=1), "FAIL")   # agree
        add_label(labels, item("PASS", "C", run=1), "FAIL")   # judge too lenient
        add_label(labels, item("FAIL", "D", run=1), "PASS")   # judge too strict
        add_label(labels, item("FAIL", "D", run=2), "PASS")   # judge too strict (same criterion again)
        a = agreement(labels)
        self.assertEqual((a["labeled"], a["agree"]), (5, 2))
        self.assertAlmostEqual(a["agreement_rate"], 0.4)
        self.assertEqual((a["judge_too_lenient"], a["judge_too_strict"]), (1, 2))
        self.assertEqual(a["criteria_with_most_disagreement"][0]["criterion"], "t1: D")
        self.assertEqual(a["criteria_with_most_disagreement"][0]["disagreements"], 2)

    def test_empty(self):
        self.assertIsNone(agreement({})["agreement_rate"])


class Storage(unittest.TestCase):
    def test_round_trip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "labels" / "labels.json"
            labels = {}
            add_label(labels, item("PASS"), "FAIL")
            save_labels(labels, path)
            loaded = load_labels(path)
            self.assertEqual(loaded["f|t1|run1|crit A"]["human_verdict"], "FAIL")
            self.assertEqual(load_labels(Path(tmp) / "missing.json"), {})


if __name__ == "__main__":
    unittest.main()
