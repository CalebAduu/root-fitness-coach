"""Label the judge's verdicts yourself, then see how often you agree.

    .venv\\Scripts\\python.exe scripts\\label_judge.py                 # label the latest results folder
    .venv\\Scripts\\python.exe scripts\\label_judge.py --results results\\2026-10-02_152959_step5-judge
    .venv\\Scripts\\python.exe scripts\\label_judge.py --blind         # hide the judge's verdict until you answer
    .venv\\Scripts\\python.exe scripts\\label_judge.py --stats         # just print agreement so far

For each judged criterion you see the input, Root's response, its tool calls, the criterion and
the judge's verdict + reason. Type  p = pass, f = fail, s = skip, q = quit.
Your labels are saved to evals/labels/labels.json after every answer, so you can stop any time.
Judge only the CRITERION shown, using the evidence on screen - not whether you like the answer overall.
"""
import argparse
import sys
import textwrap
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from evalkit.config import EVALS_DIR  # noqa: E402
from evalkit.summary import load_results  # noqa: E402
from evalkit.validation import add_label, agreement, collect_items, load_labels, save_labels, shuffled  # noqa: E402


def wrap(text: str, indent: str = "  ") -> str:
    return textwrap.fill(" ".join(str(text).split()), width=100, initial_indent=indent, subsequent_indent=indent)


def show(item: dict, position: str, blind: bool) -> None:
    r = item["record"]
    resp = r["response"]
    answer = (resp.get("body") or {}).get("answer") if r["endpoint"] == "ask-root" else (resp.get("text") or str(resp.get("body")))
    print("\n" + "=" * 100)
    print(f"[{position}]  {r['case_id']}  (run {r['run_index']})")
    print("-" * 100)
    print("INPUT:\n" + wrap(str(r["request"])[:1500]))
    print("\nROOT'S RESPONSE:\n" + wrap(str(answer)[:1800]))
    tools = (r.get("eval") or {}).get("toolCalls", [])
    if tools:
        print("\nTOOL CALLS:")
        for t in tools:
            print(wrap(f"{t['name']} {t['args']}  ->  {t['resultSummary'][:300]}", "  - "))
    print("\nCRITERION TO JUDGE:\n" + wrap(item["criterion"]))
    if not blind:
        print(f"\nJUDGE SAID: {item['judge_verdict']}\n" + wrap(item["judge_reason"]))


def print_stats(labels: dict) -> None:
    a = agreement(labels)
    print("\n=== Judge vs. you ===")
    if not a["labeled"]:
        print("No labels yet.")
        return
    print(f"Labeled: {a['labeled']}   Agreement: {a['agree']}/{a['labeled']} = {a['agreement_rate'] * 100:.0f}%")
    print(f"Judge too lenient (judge PASS, you FAIL): {a['judge_too_lenient']}")
    print(f"Judge too strict  (judge FAIL, you PASS): {a['judge_too_strict']}")
    if a["criteria_with_most_disagreement"]:
        print("Criteria you disagree with the judge on most:")
        for c in a["criteria_with_most_disagreement"][:5]:
            print(f"  {c['disagreements']}/{c['labeled']}  {c['criterion'][:90]}")
    if a["labeled"] < 20:
        print(f"(Only {a['labeled']} labels - treat these numbers as rough until you have 20+.)")


def latest_results() -> Path:
    folders = sorted(p for p in (EVALS_DIR / "results").glob("*") if (p / "runs").exists())
    if not folders:
        raise SystemExit("No results folders found. Run scripts/run.py first.")
    return folders[-1]


def main() -> None:
    parser = argparse.ArgumentParser(description="Label judge verdicts")
    parser.add_argument("--results", type=Path, help="results folder (default: the latest)")
    parser.add_argument("--blind", action="store_true", help="hide the judge's verdict until you have answered")
    parser.add_argument("--stats", action="store_true", help="only print agreement from saved labels")
    args = parser.parse_args()

    labels = load_labels()
    if args.stats:
        print_stats(labels)
        return

    folder = args.results or latest_results()
    items = shuffled(collect_items(folder, load_results(folder)))
    todo = [i for i in items if i["key"] not in labels]
    print(f"{folder.name}: {len(items)} judged criteria, {len(items) - len(todo)} already labeled, {len(todo)} to go.")

    for n, item in enumerate(todo, 1):
        show(item, f"{n}/{len(todo)}", args.blind)
        while True:
            answer = input("\nYour verdict for this criterion  [p]ass / [f]ail / [s]kip / [q]uit: ").strip().lower()
            if answer in ("p", "f", "s", "q"):
                break
        if answer == "q":
            break
        if answer == "s":
            continue
        add_label(labels, item, "PASS" if answer == "p" else "FAIL")
        save_labels(labels)
        if args.blind:
            print(f"  (judge said {item['judge_verdict']}: {item['judge_reason']})")

    print_stats(labels)


if __name__ == "__main__":
    main()
