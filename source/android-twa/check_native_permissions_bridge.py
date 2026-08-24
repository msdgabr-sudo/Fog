#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
APP = ROOT / "app"
manifest = APP / "src" / "main" / "AndroidManifest.xml"
java_file = APP / "src" / "main" / "java" / "com" / "qiblalabs" / "permissions" / "NotificationPermissionActivity.java"
source_file = ROOT / "native" / "permissions" / "NotificationPermissionActivity.java"

errors: list[str] = []

for path, label in [
    (manifest, "generated AndroidManifest.xml"),
    (java_file, "generated NotificationPermissionActivity.java"),
    (source_file, "source NotificationPermissionActivity.java"),
]:
    if not path.is_file():
        errors.append(f"missing {label}: {path}")

manifest_text = manifest.read_text(encoding="utf-8", errors="replace") if manifest.is_file() else ""
java_text = java_file.read_text(encoding="utf-8", errors="replace") if java_file.is_file() else ""

required_manifest_tokens = [
    "QIBLAASTRO_NATIVE_PERMISSION_BRIDGE",
    "com.qiblalabs.permissions.NotificationPermissionActivity",
    'android:scheme="qiblaastro"',
    'android:host="permissions"',
    'android:path="/notifications"',
]
for token in required_manifest_tokens:
    if token not in manifest_text:
        errors.append(f"native permission manifest token missing: {token}")

required_java_tokens = [
    "Manifest.permission.POST_NOTIFICATIONS",
    "requestPermissions",
    "Build.VERSION.SDK_INT < 33",
]
for token in required_java_tokens:
    if token not in java_text:
        errors.append(f"native permission activity contract missing: {token}")

for forbidden in [
    "SCHEDULE_EXACT_ALARM",
    "USE_EXACT_ALARM",
    "RECORD_AUDIO",
    "CAMERA",
    "ACCESS_FINE_LOCATION",
    "ACCESS_COARSE_LOCATION",
]:
    if forbidden in java_text:
        errors.append(f"permission bridge must not request unrelated permission: {forbidden}")

print("QiblaAstro — Native Notification Permission Bridge Gate")
print("=" * 56)
if errors:
    for error in errors:
        print("ERROR:", error, file=sys.stderr)
    print(f"FAILED: {len(errors)} native permission bridge issue(s)", file=sys.stderr)
    raise SystemExit(1)

print("PASS: notification permission bridge is isolated and structurally complete")
print("PASS: no camera, GNSS, astronomy, Qibla, or exact-alarm permission coupling detected")
