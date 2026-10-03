"""Builds the self-contained HTML report for a results folder.

    .venv\\Scripts\\python.exe scripts\\build_report.py                       # latest results folder
    .venv\\Scripts\\python.exe scripts\\build_report.py results\\2026-10-02_152959_step5-judge
    .venv\\Scripts\\python.exe scripts\\build_report.py <folder> -o my-report.html

Writes <folder>/report.html by default. The file has no external dependencies: open it in a browser.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from evalkit.config import EVALS_DIR  # noqa: E402
from evalkit.report import build_report  # noqa: E402


def latest_results() -> Path:
    folders = sorted(p for p in (EVALS_DIR / "results").glob("*") if (p / "runs").exists())
    if not folders:
        raise SystemExit("No results folders found. Run scripts/run.py first.")
    return folders[-1]


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the HTML report")
    parser.add_argument("folder", nargs="?", type=Path, help="results folder (default: the latest)")
    parser.add_argument("-o", "--output", type=Path, help="output file (default: <folder>/report.html)")
    args = parser.parse_args()

    folder = args.folder or latest_results()
    out = args.output or folder / "report.html"
    out.write_text(build_report(folder), encoding="utf-8")
    print(f"Report written to {out.resolve()}")


if __name__ == "__main__":
    main()
