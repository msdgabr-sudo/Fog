#!/usr/bin/env python3
"""Fail closed if the generated Android project drifts from the approved Play update identity."""
from __future__ import annotations

import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parents[1]
GRADLE = ROOT / "app" / "build.gradle"
RELEASE_CONFIG = REPO_ROOT / "release-config.json"

try:
    release = json.loads(RELEASE_CONFIG.read_text(encoding="utf-8"))
except Exception as exc:
    print(f"ERROR: cannot read release-config.json: {exc}", file=sys.stderr)
    raise SystemExit(1)

android = release.get("android") or {}
EXPECTED = {
    "package": android.get("packageId"),
    "version_name": android.get("versionName"),
    "version_code": str(android.get("versionCode")),
    "compile_sdk": str(android.get("targetSdkVersion")),
    "target_sdk": str(android.get("targetSdkVersion")),
    "min_sdk": str(android.get("minSdkVersion")),
}

for key, value in EXPECTED.items():
    if value in ("None", ""):
        print(f"ERROR: release-config.json missing Android value for {key}", file=sys.stderr)
        raise SystemExit(1)

if not GRADLE.is_file():
    print(f"ERROR: generated Gradle file is missing: {GRADLE}", file=sys.stderr)
    raise SystemExit(1)

text = GRADLE.read_text(encoding="utf-8", errors="replace")
errors: list[str] = []

package_re = re.escape(EXPECTED["package"])
version_name_re = re.escape(EXPECTED["version_name"])
version_code_re = re.escape(EXPECTED["version_code"])
compile_sdk_re = re.escape(EXPECTED["compile_sdk"])
target_sdk_re = re.escape(EXPECTED["target_sdk"])
min_sdk_re = re.escape(EXPECTED["min_sdk"])

checks = [
    (rf"(?m)^\s*applicationId\s+['\"]{package_re}['\"]", f"applicationId {EXPECTED['package']}"),
    (rf"(?m)^\s*namespace\s+['\"]{package_re}['\"]", f"namespace {EXPECTED['package']}"),
    (rf"(?m)^\s*versionCode\s+{version_code_re}\b", f"versionCode {EXPECTED['version_code']}"),
    (rf"(?m)^\s*versionName\s+['\"]{version_name_re}['\"]", f"versionName {EXPECTED['version_name']}"),
    (rf"(?m)^\s*compileSdk(?:Version)?\s*(?:=\s*)?{compile_sdk_re}\b", f"compileSdk {EXPECTED['compile_sdk']}"),
    (rf"(?m)^\s*targetSdk(?:Version)?\s*(?:=\s*)?{target_sdk_re}\b", f"targetSdk {EXPECTED['target_sdk']}"),
    (rf"(?m)^\s*minSdk(?:Version)?\s*(?:=\s*)?{min_sdk_re}\b", f"minSdk {EXPECTED['min_sdk']}"),
]
for pattern, label in checks:
    if not re.search(pattern, text):
        errors.append(f"generated app/build.gradle missing approved {label}")

application_ids = re.findall(r"(?m)^\s*applicationId\s+['\"]([^'\"]+)['\"]", text)
if application_ids and any(value != EXPECTED["package"] for value in application_ids):
    errors.append("generated applicationId drifted from the existing Google Play package")

print("QiblaAstro — Generated Android Release Identity Gate")
print("=" * 55)
print(f"Package: {EXPECTED['package']}")
print(f"Version: {EXPECTED['version_name']} (code {EXPECTED['version_code']})")
print(f"SDK: min {EXPECTED['min_sdk']} / compile {EXPECTED['compile_sdk']} / target {EXPECTED['target_sdk']}")
if errors:
    for error in errors:
        print("ERROR:", error, file=sys.stderr)
    raise SystemExit(1)
print("PASS: generated Android project matches release-config.json and the existing Play app identity")
