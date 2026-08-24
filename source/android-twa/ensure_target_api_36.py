#!/usr/bin/env python3
"""Guarded post-Bubblewrap API-level enforcement.

Edits only android-twa/app/build.gradle after verifying the expected Bubblewrap patterns.
Fails closed if the generated file shape is unexpected.
"""
from pathlib import Path
import re
import sys

path = Path(__file__).resolve().parent / "app" / "build.gradle"
if not path.is_file():
    print(f"ERROR: generated Gradle file not found: {path}", file=sys.stderr)
    raise SystemExit(1)

text = path.read_text(encoding="utf-8")
original = text

compile_matches = re.findall(r"compileSdkVersion\s+(\d+)", text)
target_matches = re.findall(r"targetSdkVersion\s+(\d+)", text)

if len(compile_matches) != 1 or len(target_matches) != 1:
    print("ERROR: expected exactly one compileSdkVersion and one targetSdkVersion", file=sys.stderr)
    raise SystemExit(1)

compile_sdk = int(compile_matches[0])
target_sdk = int(target_matches[0])

if compile_sdk < 36:
    print(f"ERROR: compileSdkVersion is {compile_sdk}; API 36+ is required", file=sys.stderr)
    raise SystemExit(1)

if target_sdk == 36:
    print("PASS: targetSdkVersion already 36")
    raise SystemExit(0)

if target_sdk != 35:
    print(f"ERROR: refusing unexpected targetSdkVersion {target_sdk}; expected Bubblewrap 35 or already-fixed 36", file=sys.stderr)
    raise SystemExit(1)

text, count = re.subn(r"targetSdkVersion\s+35\b", "targetSdkVersion 36", text, count=1)
if count != 1:
    print("ERROR: guarded targetSdkVersion replacement failed", file=sys.stderr)
    raise SystemExit(1)

path.write_text(text, encoding="utf-8")
print("PASS: targetSdkVersion changed 35 -> 36; compileSdkVersion remains", compile_sdk)
