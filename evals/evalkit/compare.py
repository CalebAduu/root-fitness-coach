"""Compares two result folders (A = baseline, B = after your change) test by test.

Pass rate = passed / (passed + failed), infrastructure failures excluded - the same definition
the report uses. With only a few runs per test, rates move in big steps (3 runs = 33% per run),
so a one-run swing is within the AI's normal run-to-run variation, not proof of a change.
"""
from .summary import summarize


def _change(a, b) -> str:
    if a is None or b is None:
        return "no data"
    if b > a:
        return "improved"
    if b < a:
        return "regressed"
    return "same"


def compare(records_a: list, records_b: list) -> dict:
    sa, sb = summarize(records_a), summarize(records_b)
    rows = []
    for test_id in sorted(set(sa["tests"]) | set(sb["tests"])):
        a, b = sa["tests"].get(test_id), sb["tests"].get(test_id)
        if a is None or b is None:
            rows.append({"id": test_id, "a": a, "b": b, "change": "only in " + ("B" if a is None else "A"), "delta": None})
            continue
        delta = None if a["pass_rate"] is None or b["pass_rate"] is None else b["pass_rate"] - a["pass_rate"]
        rows.append({"id": test_id, "a": a, "b": b, "change": _change(a["pass_rate"], b["pass_rate"]), "delta": delta})
    return {
        "rows": rows,
        "overall": {"a": sa["overall"], "b": sb["overall"]},
        "endpoints": {e: {"a": sa["endpoints"].get(e), "b": sb["endpoints"].get(e)} for e in sorted(set(sa["endpoints"]) | set(sb["endpoints"]))},
        "tokens": {"a": sa["tokens"]["total"], "b": sb["tokens"]["total"]},
        "latency_seconds": {"a": sa["latency_total_seconds"], "b": sb["latency_total_seconds"]},
    }


def _pct(rate):
    return "  n/a" if rate is None else f"{rate * 100:4.0f}%"


def _cell(entry):
    return "         -" if entry is None else f"{_pct(entry['pass_rate'])} ({entry['passed']}/{entry['passed'] + entry['failed']})"


def format_comparison(result: dict, name_a: str, name_b: str) -> str:
    arrow = {"improved": "▲ improved", "regressed": "▼ regressed", "same": "  same"}
    lines = [f"A (baseline): {name_a}", f"B (new):      {name_b}", "",
             f"{'test':<26}{'A':>13}{'B':>13}   change"]
    for r in result["rows"]:
        lines.append(f"{r['id']:<26}{_cell(r['a']):>13}{_cell(r['b']):>13}   {arrow.get(r['change'], r['change'])}")
    lines.append("")
    for e, v in result["endpoints"].items():
        lines.append(f"endpoint {e:<24}{_cell(v['a']):>13}{_cell(v['b']):>13}")
    o = result["overall"]
    lines.append(f"{'OVERALL':<26}{_cell(o['a']):>13}{_cell(o['b']):>13}   "
                 f"(infra failures: A {o['a']['infra']}, B {o['b']['infra']})")
    t, s = result["tokens"], result["latency_seconds"]
    lines.append(f"app tokens: A {t['a']:,} -> B {t['b']:,}     total request time: A {s['a']:.0f}s -> B {s['b']:.0f}s")
    lines.append("")
    lines.append("Note: with a few runs per test, a one-run change is within normal run-to-run variation. "
                 "Look for consistent movement across several tests, or repeat with more runs.")
    return "\n".join(lines)
