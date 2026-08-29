#!/usr/bin/env python3
"""Fail-closed syntax validation for tracked QiblaAstro repository sources.

Read-only by design: the gate parses tracked files and never rewrites application
content. Generated/build directories are naturally excluded because discovery uses
`git ls-files` rather than walking the working tree.
"""
from __future__ import annotations

import ast
import json
from pathlib import Path
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET

SOURCE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SOURCE_ROOT.parent


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def tracked_files() -> list[Path]:
    try:
        result = subprocess.run(
            ["git", "ls-files", "-z"],
            cwd=REPO_ROOT,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        fail(f"cannot enumerate tracked files with git: {exc}")
    files: list[Path] = []
    for raw in result.stdout.split(b"\0"):
        if not raw:
            continue
        rel = raw.decode("utf-8", errors="strict")
        path = REPO_ROOT / rel
        if path.is_file():
            files.append(path)
    return files


def rel(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError as exc:
        fail(f"{rel(path)} is not valid UTF-8 text: {exc}")
    except OSError as exc:
        fail(f"cannot read {rel(path)}: {exc}")
    return ""


def run_checked(command: list[str], label: str) -> None:
    try:
        result = subprocess.run(
            command,
            cwd=REPO_ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except OSError as exc:
        fail(f"cannot run {label}: {exc}")
    if result.returncode != 0:
        details = (result.stderr or result.stdout or "unknown parser failure").strip()
        fail(f"{label} failed: {details}")


def main() -> int:
    files = tracked_files()
    if not files:
        fail("git returned no tracked files")

    groups = {
        "javascript": [p for p in files if p.suffix.lower() in {".js", ".mjs", ".cjs"}],
        "json": [p for p in files if p.suffix.lower() == ".json"],
        "python": [p for p in files if p.suffix.lower() == ".py"],
        "xml": [p for p in files if p.suffix.lower() == ".xml"],
        "shell": [p for p in files if p.suffix.lower() == ".sh"],
        "yaml": [p for p in files if p.suffix.lower() in {".yml", ".yaml"}],
    }

    node = shutil.which("node")
    if groups["javascript"] and not node:
        fail("Node.js is required for JavaScript syntax validation")
    for path in groups["javascript"]:
        run_checked([node, "--check", rel(path)], f"JavaScript syntax {rel(path)}")

    for path in groups["json"]:
        try:
            json.loads(read_text(path))
        except json.JSONDecodeError as exc:
            fail(f"JSON syntax {rel(path)}: line {exc.lineno}, column {exc.colno}: {exc.msg}")

    for path in groups["python"]:
        try:
            ast.parse(read_text(path), filename=rel(path))
        except SyntaxError as exc:
            fail(f"Python syntax {rel(path)}:{exc.lineno}:{exc.offset}: {exc.msg}")

    for path in groups["xml"]:
        try:
            ET.fromstring(read_text(path))
        except ET.ParseError as exc:
            fail(f"XML syntax {rel(path)}: {exc}")

    bash = shutil.which("bash")
    if groups["shell"] and not bash:
        fail("bash is required for shell-script syntax validation")
    for path in groups["shell"]:
        run_checked([bash, "-n", rel(path)], f"Shell syntax {rel(path)}")

    # Ruby/Psych is available on GitHub-hosted Ubuntu runners and gives us a real
    # YAML parser without adding a package/dependency to the application.
    ruby = shutil.which("ruby")
    if groups["yaml"] and not ruby:
        fail("Ruby is required for dependency-free YAML syntax validation")
    if groups["yaml"]:
        ruby_program = (
            "require 'yaml'; "
            "ARGV.each { |f| begin; YAML.parse_file(f); rescue Exception => e; "
            "warn(\"#{f}: #{e.message}\"); exit 1; end }"
        )
        run_checked(
            [ruby, "-e", ruby_program, *[rel(path) for path in groups["yaml"]]],
            "YAML/workflow syntax",
        )

    total = sum(len(value) for value in groups.values())
    print("QiblaAstro — Repository Syntax Gate")
    print("=" * 38)
    for name in ("javascript", "json", "python", "xml", "shell", "yaml"):
        print(f"{name}: {len(groups[name])}")
    print(f"PASS: {total} tracked source/config files parsed successfully; no files modified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
