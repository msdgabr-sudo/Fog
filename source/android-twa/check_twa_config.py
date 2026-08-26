#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
CFG = ROOT / "twa-manifest.json"
KEY_SCRIPT = ROOT / "create_upload_key.ps1"

EXPECTED = {
    "packageId": "com.qiblalabs",
    "host": "app.qiblalabs.com",
    "name": "QiblaAstro ELITE",
    "launcherName": "QiblaAstro",
    "appVersion": "3.1.0",
    "appVersionCode": 3,
    "webManifestUrl": "https://app.qiblalabs.com/manifest.json",
    "startUrl": "/?twa=1",
    "fallbackType": "customtabs",
}

errors: list[str] = []
def fail(msg: str) -> None: errors.append(msg)

if not CFG.is_file():
    fail("missing android-twa/twa-manifest.json"); data = {}
else:
    try: data = json.loads(CFG.read_text(encoding="utf-8"))
    except Exception as exc: fail(f"invalid twa-manifest.json: {exc}"); data = {}

for key, expected in EXPECTED.items():
    if data.get(key) != expected: fail(f"{key} must be {expected!r}; found {data.get(key)!r}")
if data.get("display") != "standalone": fail("display must remain standalone")
if data.get("orientation") != "portrait": fail("orientation must remain portrait")
if data.get("enableNotifications") is not True: fail("enableNotifications must remain true")
if data.get("enableSiteSettingsShortcut") is not True: fail("enableSiteSettingsShortcut must remain true")
features=data.get("features") or {}; loc=features.get("locationDelegation") or {}
if loc.get("enabled") is not True: fail("features.locationDelegation.enabled must remain true")
signing=data.get("signingKey") or {}
if signing.get("path") != "./keystore/qiblaastro-upload.jks": fail("signingKey.path must point to the ignored local keystore path")
if signing.get("alias") != "qiblaastro": fail("signingKey.alias mismatch")
if not KEY_SCRIPT.is_file():
    fail("missing Android upload-key generator")
else:
    key_script = KEY_SCRIPT.read_text(encoding="utf-8")
    if "$Alias = 'qiblaastro'" not in key_script:
        fail("upload-key generator alias must match signingKey.alias")
secret_suffixes=(".jks", ".keystore", ".p12", ".pem")
for path in REPO.rglob("*"):
    if not path.is_file(): continue
    if any(part in {".git","build",".gradle","node_modules"} for part in path.parts): continue
    if path.name.lower().endswith(secret_suffixes): fail(f"signing material must not exist in the release workspace: {path.relative_to(REPO)}")
fps=data.get("fingerprints")
if fps not in ([],None): fail("twa-manifest fingerprints must remain empty until real signing certificates are captured")
if errors:
    for err in errors: print("ERROR:",err,file=sys.stderr)
    print(f"FAILED: {len(errors)} Android TWA issue(s)",file=sys.stderr); raise SystemExit(1)
print("PASS: Android TWA identity, version, native feature configuration, and secret boundaries are consistent")
