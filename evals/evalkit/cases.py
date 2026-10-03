"""Loads and validates test-case JSON files from evals/cases/.

Validation runs when cases are loaded, so a typo in a case file (a misspelled check name,
a missing field) stops the run immediately instead of failing mysteriously halfway through.
"""
import json
from pathlib import Path

from .checks import CHECKS
from .config import EVALS_DIR

REQUIRED_KEYS = ["id", "name", "description", "endpoint", "input", "deterministic_checks", "judge_criteria"]


class CaseError(Exception):
    pass


def validate_case(case: dict, path: Path, endpoints: dict) -> None:
    missing = [k for k in REQUIRED_KEYS if k not in case]
    if missing:
        raise CaseError(f"{path.name}: missing keys {missing}")
    if case["endpoint"] not in endpoints:
        raise CaseError(f"{path.name}: unknown endpoint '{case['endpoint']}' (known: {list(endpoints)})")
    if not isinstance(case["judge_criteria"], list):
        raise CaseError(f"{path.name}: judge_criteria must be a list")
    for spec in case["deterministic_checks"]:
        name = spec.get("check")
        if name not in CHECKS:
            raise CaseError(f"{path.name}: unknown check '{name}' (known: {sorted(CHECKS)})")


def load_cases(config: dict, only: list | None = None, cases_dir: Path | None = None) -> list:
    """Returns all cases (optionally filtered to the given ids or endpoint names), sorted by id."""
    cases, seen = [], set()
    for path in sorted((cases_dir or EVALS_DIR / "cases").rglob("*.json")):
        case = json.loads(path.read_text(encoding="utf-8"))
        validate_case(case, path, config["endpoints"])
        if case["id"] in seen:
            raise CaseError(f"{path.name}: duplicate id '{case['id']}'")
        seen.add(case["id"])
        cases.append(case)
    if only:
        cases = [c for c in cases if c["id"] in only or c["endpoint"] in only]
        if not cases:
            raise CaseError(f"No cases matched {only}")
    return cases
