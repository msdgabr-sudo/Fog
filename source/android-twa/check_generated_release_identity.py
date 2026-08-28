#!/usr/bin/env python3
"""Fail closed if the generated Android project drifts from the approved Play update identity."""
from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
GRADLE = ROOT / "app" / "build.gradle"

EXPECTED = {
    "package": "com.qiblalabs",
    "version_name": "4.1.7",
    "version_code": "5",
    "compile_sdk": "36",
    "target_sdk": "36",
    "min_sdk": "23",
}

if not GRADLE.is_file():
    print(f"ERROR: generated Gradle file is missing: {GRADLE}", file=sys.stderr)
    raise SystemExit(1)

text = GRADLE.read_text(encoding="utf-8", errors="replace")
errors: list[str] = []

checks = [
    (r"(?m)^\s*applicationId\s+['\"]com\.qiblalabs['\"]", "applicationId com.qiblalabs"),
    (r"(?m)^\s*namespace\s+['\"]com\.qiblalabs['\"]", "namespace com.qiblalabs"),
    (r"(?m)^\s*versionCode\s+5\b", "versionCode 5"),
    (r"(?m)^\s*versionName\s+['\"]4\.1\.7['\"]", "versionName 4.1.7"),
    (r"(?m)^\s*compileSdk(?:Version)?\s*(?:=\s*)?36\b", "compileSdk 36"),
    (r"(?m)^\s*targetSdk(?:Version)?\s*(?:=\s*)?36\b", "targetSdk 36"),
    (r"(?m)^\s*minSdk(?:Version)?\s*(?:=\s*)?23\b", "minSdk 23"),
]
for pattern, label in checks:
    if not re.search(pattern, text):
        errors.append(f"generated app/build.gradle missing approved {label}")

if re.search(r"(?m)^\s*applicationId\s+['\"](?!com\.qiblalabs['\"])[^'\"]+['\"]", text):
    errors.append("generated applicationId drifted from the existing Google Play package")

print("QiblaAstro — Generated Android Release Identity Gate")
print("=" * 55)
print("Package: com.qiblalabs")
print("Version: 4.1.7 (code 5)")
print("SDK: min 23 / compile 36 / target 36")
if errors:
    for error in errors:
        print("ERROR:", error, file=sys.stderr)
    raise SystemExit(1)
print("PASS: generated Android project matches the existing Play app identity and API 36 release contract")
