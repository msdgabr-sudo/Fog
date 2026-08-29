#!/usr/bin/env python3
"""Fail closed when a production main commit did not arrive through a merged PR.

This is CI governance only. It never edits repository or application files.
GitHub Branch Protection remains the authoritative prevention layer when enabled;
this guard is a second line of defense that blocks deploy/build workflows from a
direct main push.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


event_name = os.environ.get("GITHUB_EVENT_NAME", "")
ref = os.environ.get("GITHUB_REF", "")
repository = os.environ.get("GITHUB_REPOSITORY", "")
sha = os.environ.get("GITHUB_SHA", "")
token = os.environ.get("GITHUB_TOKEN", "")

# Pull requests are candidate checks, not production main commits.
if event_name == "pull_request":
    print("PASS: pull-request candidate; main lineage check applies after merge")
    raise SystemExit(0)

# Keep the script reusable without accidentally constraining non-main workflows.
if ref != "refs/heads/main":
    print(f"PASS: non-main ref {ref!r}; production lineage check not applicable")
    raise SystemExit(0)

if not repository or "/" not in repository:
    fail("GITHUB_REPOSITORY is missing or invalid")
if len(sha) != 40:
    fail("GITHUB_SHA is missing or invalid")
if not token:
    fail("GITHUB_TOKEN is required to verify merged-PR lineage")

url = f"https://api.github.com/repos/{repository}/commits/{sha}/pulls"
request = urllib.request.Request(
    url,
    headers={
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "QiblaAstro-main-lineage-gate",
    },
)

try:
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.load(response)
except urllib.error.HTTPError as exc:
    fail(f"GitHub PR-lineage API returned HTTP {exc.code}")
except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
    fail(f"could not verify main PR lineage: {exc}")

if not isinstance(payload, list):
    fail("GitHub PR-lineage API returned an unexpected response")

merged = []
for pr in payload:
    if not isinstance(pr, dict) or not pr.get("merged_at"):
        continue
    base = pr.get("base") if isinstance(pr.get("base"), dict) else {}
    if base.get("ref") != "main":
        continue
    merged.append(pr)

if not merged:
    fail(
        f"main commit {sha} is not associated with a merged PR targeting main; "
        "production deploy/build is blocked"
    )

numbers = ", ".join(f"#{pr.get('number')}" for pr in merged if pr.get("number") is not None)
print(f"PASS: main commit {sha[:12]} arrived through merged PR {numbers or '(verified)'}")
