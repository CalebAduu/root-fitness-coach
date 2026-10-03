"""Judge validation: compare the AI judge's verdicts with a human's (yours).

An AI judge is only useful if it agrees with a careful human. This module collects the judge's
per-criterion verdicts from result folders, stores your labels, and measures agreement.

Vocabulary:
  judge too lenient = the judge said PASS but you said FAIL  (it lets bad answers through)
  judge too strict  = the judge said FAIL but you said PASS  (it fails good answers)
"""
import json
import random
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

from .config import EVALS_DIR

LABELS_PATH = EVALS_DIR / "labels" / "labels.json"


def item_key(folder: str, case_id: str, run_index: int, criterion: str) -> str:
    return f"{folder}|{case_id}|run{run_index}|{criterion}"


def collect_items(folder: Path, records: list) -> list:
    """One item per (run, criterion) that the judge graded in this results folder."""
    items = []
    for r in records:
        for c in (r.get("judge") or {}).get("criteria", []):
            items.append({
                "key": item_key(Path(folder).name, r["case_id"], r["run_index"], c["criterion"]),
                "case_id": r["case_id"], "run_index": r["run_index"], "criterion": c["criterion"],
                "judge_verdict": c["verdict"], "judge_reason": c["reason"], "record": r,
            })
    return items


def shuffled(items: list, seed: int = 0) -> list:
    """Fixed-seed shuffle so you don't label one test's criteria back to back (anchoring)."""
    out = list(items)
    random.Random(seed).shuffle(out)
    return out


def load_labels(path: Path = LABELS_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def save_labels(labels: dict, path: Path = LABELS_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(labels, indent=2, ensure_ascii=False), encoding="utf-8")


def add_label(labels: dict, item: dict, human_verdict: str) -> None:
    """Stores your label together with the judge's verdict at the time, so agreement can be
    computed from the labels file alone."""
    labels[item["key"]] = {
        "case_id": item["case_id"], "run_index": item["run_index"], "criterion": item["criterion"],
        "judge_verdict": item["judge_verdict"], "human_verdict": human_verdict,
        "labeled_at": datetime.now().isoformat(timespec="seconds"),
    }


def agreement(labels: dict) -> dict:
    """Agreement rate, the two kinds of disagreement, and which criteria disagree most."""
    total = len(labels)
    agree = lenient = strict = 0
    by_criterion = defaultdict(lambda: Counter())
    for lab in labels.values():
        j, h = lab["judge_verdict"], lab["human_verdict"]
        key = f"{lab['case_id']}: {lab['criterion']}"
        by_criterion[key]["total"] += 1
        if j == h:
            agree += 1
        elif j == "PASS" and h == "FAIL":
            lenient += 1
            by_criterion[key]["disagreements"] += 1
        else:
            strict += 1
            by_criterion[key]["disagreements"] += 1

    worst = sorted(
        ({"criterion": k, "disagreements": v["disagreements"], "labeled": v["total"]}
         for k, v in by_criterion.items() if v["disagreements"]),
        key=lambda x: (-x["disagreements"], x["criterion"]))
    return {
        "labeled": total,
        "agree": agree,
        "agreement_rate": None if total == 0 else agree / total,
        "judge_too_lenient": lenient,
        "judge_too_strict": strict,
        "criteria_with_most_disagreement": worst,
    }
