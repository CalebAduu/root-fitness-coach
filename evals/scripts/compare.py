"""Compares two result folders so you can show how pass rates change as you improve Root.

    .venv\\Scripts\\python.exe scripts\\compare.py results\\<baseline-folder> results\\<new-folder>

A is the baseline (before your change), B is the new run (after).
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from evalkit.compare import compare, format_comparison  # noqa: E402
from evalkit.summary import load_results  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare two eval result folders")
    parser.add_argument("baseline", type=Path)
    parser.add_argument("new", type=Path)
    args = parser.parse_args()
    result = compare(load_results(args.baseline), load_results(args.new))
    print(format_comparison(result, args.baseline.name, args.new.name))


if __name__ == "__main__":
    main()
