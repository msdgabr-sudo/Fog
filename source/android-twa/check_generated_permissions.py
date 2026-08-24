#!/usr/bin/env python3
"""Validate permissions from the merged *release* AndroidManifest.

Bubblewrap features can add Android dependencies whose manifests contribute
permissions during Gradle manifest merging. Therefore the source manifest at
app/src/main/AndroidManifest.xml is not authoritative for the final APK/AAB.
"""
from __future__ import annotations

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
ANDROID = "{http://schemas.android.com/apk/res/android}"
errors: list[str] = []
notes: list[str] = []

candidates: list[Path] = []
intermediates = ROOT / "app" / "build" / "intermediates"
if intermediates.is_dir():
    for path in intermediates.rglob("AndroidManifest.xml"):
        lowered = str(path).replace("\\", "/").lower()
        if "/release/" not in lowered:
            continue
        if "merged_manifest" in lowered or "merged_manifests" in lowered:
            candidates.append(path)

if not candidates:
    print("ERROR: no merged release AndroidManifest.xml found. Run :app:processReleaseMainManifest before this gate.", file=sys.stderr)
    raise SystemExit(1)
MANIFEST = max(candidates, key=lambda p: p.stat().st_mtime)
try:
    tree = ET.parse(MANIFEST)
except Exception as exc:
    print(f"ERROR: cannot parse merged release manifest {MANIFEST}: {exc}", file=sys.stderr)
    raise SystemExit(1)

root = tree.getroot()
permissions = {el.get(ANDROID + "name") for el in root.findall("uses-permission") if el.get(ANDROID + "name")}

required = {
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.POST_NOTIFICATIONS",
    # Native Azkar reminders are restored after reboot. No exact-alarm permission is used.
    "android.permission.RECEIVE_BOOT_COMPLETED",
}
for permission in sorted(required):
    if permission not in permissions:
        errors.append(f"required release permission missing from merged manifest: {permission}")

forbidden = {
    "android.permission.RECORD_AUDIO": "microphone is not used; audio is playback-only",
    "com.google.android.gms.permission.AD_ID": "first release is ad-free",
    "android.permission.READ_EXTERNAL_STORAGE": "app does not need broad media/file access",
    "android.permission.WRITE_EXTERNAL_STORAGE": "app does not need broad file write access",
    "android.permission.MANAGE_EXTERNAL_STORAGE": "app does not need all-files access",
    "android.permission.READ_CONTACTS": "contacts are not used",
    "android.permission.WRITE_CONTACTS": "contacts are not used",
    "android.permission.READ_CALENDAR": "calendar data is not read",
    "android.permission.WRITE_CALENDAR": "calendar data is not written",
    "android.permission.SCHEDULE_EXACT_ALARM": "Azkar reminders intentionally use inexact idle-safe alarms",
    "android.permission.USE_EXACT_ALARM": "Azkar reminders intentionally use inexact idle-safe alarms",
}
for permission, reason in forbidden.items():
    if permission in permissions:
        errors.append(f"forbidden permission present: {permission} ({reason})")

notes.append("permission source: Gradle merged RELEASE manifest (dependency manifests included)")
notes.append("camera remains a web/TWA site permission; CAMERA is not forced into wrapper manifest")
notes.append("native Azkar reminders use POST_NOTIFICATIONS + RECEIVE_BOOT_COMPLETED")
notes.append("exact-alarm permissions remain forbidden; scheduler uses setAndAllowWhileIdle")

print("QiblaAstro ELITE — Merged Release Android Permission Gate")
print("=" * 58)
print("Manifest:", MANIFEST)
for note in notes:
    print("NOTE:", note)
print("Declared merged release permissions:")
for permission in sorted(permissions):
    print(" -", permission)
if errors:
    for error in errors:
        print("ERROR:", error, file=sys.stderr)
    print(f"FAILED: {len(errors)} permission policy issue(s)", file=sys.stderr)
    raise SystemExit(1)
print("PASS: merged release permissions match the approved first-release policy")
