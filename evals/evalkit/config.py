"""Loads evals/config.json and the secrets the suite needs from environment variables.

Secrets (EVAL_TOKEN, ANTHROPIC_API_KEY) are never stored in config.json. They come from the
environment, falling back to the app's own .env.local so you don't have to export them by hand.
"""
import json
import os
from pathlib import Path

EVALS_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = EVALS_DIR.parent


def load_env_file(path: Path) -> None:
    """Reads KEY=VALUE lines into os.environ without overriding variables already set."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def load_config(path: Path | None = None) -> dict:
    load_env_file(REPO_ROOT / ".env.local")
    load_env_file(EVALS_DIR / ".env")
    config = json.loads((path or EVALS_DIR / "config.json").read_text(encoding="utf-8"))
    # Allow overriding the target without editing the file, e.g. EVAL_BASE_URL=https://my-preview.vercel.app
    config["base_url"] = os.environ.get("EVAL_BASE_URL", config["base_url"]).rstrip("/")
    return config


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing environment variable {name}. Add it to .env.local or export it.")
    return value
