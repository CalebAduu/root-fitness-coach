# Root evaluation suite

An automated test suite for the AI features of Root (the fitness and nutrition coach). It sends
realistic requests to the app's API routes, checks the responses with code, optionally has an AI
judge grade the qualities code can't check, and produces an HTML report.

It talks to the app **only over HTTP**, so it can test a local server or a Vercel preview. It is
run deliberately and is **not** part of `npm run build` or any normal test run.

## What it tests

| Endpoint | What is evaluated |
|---|---|
| `/api/ask-root` | The tool-calling assistant: which tools it calls (and doesn't), tool arguments, agent rounds, answer quality, safety, off-topic handling |
| `/api/generate-plan` | Workout plans: shape, number of days, exercises per day, injury and equipment suitability |
| `/api/generate-nutrition-plan` | Nutrition plans: shape, allergens and dietary restrictions, safety notes |
| `/api/chat` | The onboarding conversation: handling vague or unrealistic answers, completion signal |

Each test is one JSON file in `cases/`. A test has the exact request body, a list of **deterministic
checks** (named yes/no checks verified in code) and **judge criteria** (yes/no questions only an AI
can answer, e.g. "suitable for someone with a bad knee").

## Setup

Requires Python 3.10+.

```bash
cd evals
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt     # Windows
# macOS/Linux: .venv/bin/python -m pip install -r requirements.txt
```

Secrets are read from environment variables (or the repo's `.env.local`); they are never stored in
`config.json`:

| Variable | Where | Purpose |
|---|---|---|
| `EVAL_MODE=true` | the **app's** environment | enables the eval-mode hooks in the routes |
| `EVAL_TOKEN=<random string>` | the app's environment **and** the runner's | a request only gets traces if it sends this token in the `x-eval-token` header |
| `ANTHROPIC_API_KEY` | the runner's environment | the AI judge (Claude). The judge must be a different model family from the app under test |
| `EVAL_BASE_URL` | optional | target server; defaults to `base_url` in `config.json` |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | optional | needed to call a protected Vercel preview deployment |

Start the app, then run from the `evals/` folder. Locally, if your machine needs the system
certificate store for outbound HTTPS, start it with `NODE_OPTIONS=--use-system-ca npm run dev`.

## Eval-mode hooks (inside the app)

`lib/evals/evalTrace.ts` records, per request: every tool call with its arguments and a short
result summary, the number of agent rounds, token usage per model call, and latency per tool and
in total. Call sites in the routes are marked `// EVAL HOOK`. The hooks are inactive unless
`EVAL_MODE=true` **and** the request carries a valid `x-eval-token`; in that case the JSON response
gains an extra `_eval` field. Normal requests are unchanged. The streaming `/api/chat` route has no
hooks: the runner measures its latency and estimates tokens with tiktoken (labelled as estimated).

## Running

```bash
.venv\Scripts\python.exe scripts\run.py                          # all tests, runs_per_test from config.json
.venv\Scripts\python.exe scripts\run.py --only ar-casual chat    # specific test ids and/or endpoints
.venv\Scripts\python.exe scripts\run.py --runs 5 --no-judge      # more runs, code checks only
.venv\Scripts\python.exe scripts\run.py --base-url https://<preview>.vercel.app --label preview
```

Each test runs N times (default 3) because model output varies; you get pass **rates**, not single
pass/fail results. Results are saved to `results/<timestamp>/` (git-ignored): one JSON file per run,
`summary.json`, and `run_config.json` (target, app branch and commit, settings).

A run is graded in this order:
1. Deterministic checks, in code. If any fail, the judge is skipped for that run.
2. The AI judge, only for runs that passed every code check. It returns PASS/FAIL and a one-line
   reason per criterion; no numeric scores.

A run **passes** only if every check and every judge criterion passes. If a run fails and a
dependency visibly broke (wger/TheMealDB errors, timeouts, 502/503/504, rate limits, judge API
errors), it is recorded as an **infrastructure failure**, kept separate from AI failures and left
out of pass rates. Pass rate = passed / (passed + failed).

## The HTML report

```bash
.venv\Scripts\python.exe scripts\build_report.py                 # latest results folder
.venv\Scripts\python.exe scripts\build_report.py results\<folder>
```

This writes `results/<folder>/report.html`, a single self-contained file: open it in any browser.
It shows overall, per-endpoint and per-test pass rates; failures first (with a "show failures only"
filter); tool usage across the ask-root tests; and for every run the input, response, tool calls
with arguments, rounds, which checks passed or failed, the judge's reasons, latency and tokens.

## Checking the judge against a human

An AI judge can be wrong, so measure it. Label some of its verdicts yourself:

```bash
.venv\Scripts\python.exe scripts\label_judge.py --blind          # you see the evidence, not the judge's verdict
.venv\Scripts\python.exe scripts\label_judge.py --stats          # agreement so far
```

For each judged criterion type `p` (pass), `f` (fail), `s` (skip) or `q` (quit). Labels are saved
to `labels/labels.json` after every answer. You get the agreement rate, disagreements split into
"judge too lenient" (judge PASS, you FAIL) and "judge too strict" (judge FAIL, you PASS), and the
criteria you disagree with the judge on most. Aim for 20+ labels before trusting the numbers.

## Comparing two runs

```bash
.venv\Scripts\python.exe scripts\compare.py results\<baseline> results\<new>
```

Shows each test's pass rate in both runs, with improved/regressed markers, plus endpoint and overall
totals and token/latency changes.

## Tests for the suite itself

```bash
.venv\Scripts\python.exe -m unittest discover tests -v
```

These use made-up responses (no server, no API cost) and check the deterministic checks, run
classification, aggregation, judge prompt, label maths, report and comparison.

## Limits and caveats

- **Few runs per test.** With 3 runs, one run is a 33-point swing. Treat small differences as noise;
  look for consistent movement across tests or increase `--runs`.
- **The judge is an AI.** Its verdicts are only as trustworthy as its measured agreement with you.
- **Live external APIs.** Tools call wger, TheMealDB, DuckDuckGo and a web-scraped knowledge base, so
  results can change with those services. The first request after a server start is slower (it loads
  caches), and the first knowledge-base use can take far longer.
- **Chat token counts are estimates**, and exclude the server-side system prompt.
- **Not a security or load test.** It checks behaviour on a small, hand-written set of scenarios;
  passing it does not mean Root handles every input correctly.
- **Costs real money**, though small: each run makes a few model calls, plus one judge call per
  judged run. Check `pricing_usd_per_million_tokens` in `config.json` against current provider pricing.

## Layout

```
evals/
  config.json          base URL, runs per test, judge model, timeouts, pricing
  cases/               one JSON file per test, grouped by endpoint
  evalkit/             config, client, checks, cases, runner, judge, summary, report, compare, validation
  scripts/             run.py, build_report.py, compare.py, label_judge.py, smoke.py
  tests/               offline tests for the suite
  labels/              your judge-validation labels
  results/             run output (git-ignored)
```
