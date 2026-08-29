#!/usr/bin/env python3
"""Validate QiblaAstro release identity from one authoritative configuration file.

This is a read-only gate. It intentionally does not generate or rewrite runtime files.
Runtime and build files may keep the literals they require, but CI must prove that every
active copy matches release-config.json before deployment or Android packaging.
"""
from __future__ import annotations

import json
from pathlib import Path
import re
import sys

SOURCE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SOURCE_ROOT.parent
CONFIG_PATH = REPO_ROOT / "release-config.json"

errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def load_json(path: Path, label: str) -> dict:
    if not path.is_file():
        fail(f"missing {label}: {path.relative_to(REPO_ROOT) if path.is_relative_to(REPO_ROOT) else path}")
        return {}
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"invalid {label}: {exc}")
        return {}
    if not isinstance(value, dict):
        fail(f"{label} must contain a JSON object")
        return {}
    return value


def require(mapping: dict, key: str, label: str):
    if key not in mapping:
        fail(f"release-config.json missing {label}.{key}")
        return None
    return mapping[key]


release = load_json(CONFIG_PATH, "release-config.json")
if release.get("schemaVersion") != 1:
    fail("release-config.json schemaVersion must be 1")
if release.get("releaseChannel") != "production":
    fail("release-config.json releaseChannel must be production")

product = release.get("product") if isinstance(release.get("product"), dict) else {}
android = release.get("android") if isinstance(release.get("android"), dict) else {}
web = release.get("web") if isinstance(release.get("web"), dict) else {}
sw = release.get("serviceWorker") if isinstance(release.get("serviceWorker"), dict) else {}
artifacts = release.get("artifacts") if isinstance(release.get("artifacts"), dict) else {}

product_name = require(product, "name", "product")
launcher_name = require(product, "launcherName", "product")
web_manifest_name = require(product, "webManifestName", "product")
package_id = require(android, "packageId", "android")
version_name = require(android, "versionName", "android")
version_code = require(android, "versionCode", "android")
min_sdk = require(android, "minSdkVersion", "android")
target_sdk = require(android, "targetSdkVersion", "android")
android_host = require(android, "host", "android")
signing_path = require(android, "signingKeyRelativePath", "android")
signing_alias = require(android, "signingAlias", "android")
web_host = require(web, "host", "web")
ga4 = require(web, "ga4MeasurementId", "web")

if not isinstance(version_code, int) or version_code < 1:
    fail("android.versionCode must be a positive integer")
if not isinstance(min_sdk, int) or min_sdk < 1:
    fail("android.minSdkVersion must be a positive integer")
if not isinstance(target_sdk, int) or target_sdk < min_sdk if isinstance(min_sdk, int) else False:
    fail("android.targetSdkVersion must be an integer >= minSdkVersion")
if android_host != web_host:
    fail("android.host and web.host must be identical")

# The artifact names are derived release metadata, not independent hand-maintained values.
if version_name is not None and version_code is not None:
    expected_unsigned = f"QiblaAstro-{version_name}-code{version_code}-unsigned.aab"
    expected_proof = f"QiblaAstro-{version_name}-code{version_code}-unsigned-AAB-proof"
    if artifacts.get("unsignedAab") != expected_unsigned:
        fail(f"artifacts.unsignedAab must be {expected_unsigned!r}")
    if artifacts.get("unsignedAabProofName") != expected_proof:
        fail(f"artifacts.unsignedAabProofName must be {expected_proof!r}")

# Android TWA manifest must mirror the authoritative identity exactly.
twa = load_json(SOURCE_ROOT / "android-twa" / "twa-manifest.json", "android-twa/twa-manifest.json")
expected_twa = {
    "packageId": package_id,
    "host": android_host,
    "name": product_name,
    "launcherName": launcher_name,
    "appVersion": version_name,
    "appVersionCode": version_code,
    "minSdkVersion": min_sdk,
    "webManifestUrl": f"https://{web_host}/manifest.json" if web_host else None,
    "startUrl": "/?twa=1",
    "fallbackType": "customtabs",
}
for key, expected in expected_twa.items():
    if expected is not None and twa.get(key) != expected:
        fail(f"twa-manifest {key} must match release-config.json: expected {expected!r}, found {twa.get(key)!r}")
signing = twa.get("signingKey") if isinstance(twa.get("signingKey"), dict) else {}
if signing_path is not None and signing.get("path") != signing_path:
    fail("twa-manifest signingKey.path drifted from release-config.json")
if signing_alias is not None and signing.get("alias") != signing_alias:
    fail("twa-manifest signingKey.alias drifted from release-config.json")

# Public web identity must point to the same production host.
cname_path = SOURCE_ROOT / "CNAME"
if not cname_path.is_file():
    fail("missing source/CNAME")
elif web_host is not None:
    cname = cname_path.read_text(encoding="utf-8", errors="replace").strip()
    if cname != web_host:
        fail(f"source/CNAME must be exactly {web_host!r}; found {cname!r}")

manifest = load_json(SOURCE_ROOT / "manifest.json", "source/manifest.json")
if web_manifest_name is not None and manifest.get("name") != web_manifest_name:
    fail("manifest.json name drifted from release-config.json")
if launcher_name is not None and manifest.get("short_name") != launcher_name:
    fail("manifest.json short_name drifted from release-config.json")

# Service-worker generation markers are runtime literals, but they are governed here.
sw_path = SOURCE_ROOT / "service-worker.js"
if not sw_path.is_file():
    fail("missing source/service-worker.js")
else:
    sw_text = sw_path.read_text(encoding="utf-8", errors="replace")
    sw_expected = {
        "VERSION": sw.get("version"),
        "BRIDGE_RELEASE": sw.get("bridgeRelease"),
        "GNSS_RELEASE": sw.get("gnssRelease"),
        "PERMISSIONS_RELEASE": sw.get("permissionsRelease"),
        "OFFLINE_RELEASE": sw.get("offlineRelease"),
    }
    for constant, expected in sw_expected.items():
        if not isinstance(expected, str) or not expected:
            fail(f"release-config.json serviceWorker value missing for {constant}")
            continue
        pattern = rf"const\s+{re.escape(constant)}\s*=\s*(['\"]){re.escape(expected)}\1\s*;"
        if not re.search(pattern, sw_text):
            fail(f"service-worker.js {constant} does not match release-config.json value {expected!r}")

# Analytics ID is not sensitive; verify the approved ID cannot silently drift.
if isinstance(ga4, str) and ga4:
    index_text = (SOURCE_ROOT / "index.html").read_text(encoding="utf-8", errors="replace") if (SOURCE_ROOT / "index.html").is_file() else ""
    home_text = (SOURCE_ROOT / "js" / "home-final.js").read_text(encoding="utf-8", errors="replace") if (SOURCE_ROOT / "js" / "home-final.js").is_file() else ""
    if f"gtag/js?id={ga4}" not in index_text:
        fail("index.html GA4 ID drifted from release-config.json")
    if f"GA_ID='{ga4}'" not in home_text and f'GA_ID="{ga4}"' not in home_text:
        fail("home-final.js GA4 ID drifted from release-config.json")

# Human-facing frozen identity documentation must agree with the machine truth.
identity_path = SOURCE_ROOT / "PRE_APK_ANDROID_IDENTITY.md"
if identity_path.is_file():
    identity = identity_path.read_text(encoding="utf-8", errors="replace")
    for value, label in [
        (package_id, "package ID"),
        (version_name, "version name"),
        (str(version_code) if version_code is not None else None, "version code"),
        (str(target_sdk) if target_sdk is not None else None, "target SDK"),
    ]:
        if value and value not in identity:
            fail(f"PRE_APK_ANDROID_IDENTITY.md does not mirror release {label}: {value}")

# Active release gates must read the central config rather than own version constants.
for rel in [
    "tools/pre_apk_check.py",
    "android-twa/check_twa_config.py",
    "android-twa/check_generated_release_identity.py",
    "tests/android-release-version.test.js",
]:
    path = SOURCE_ROOT / rel
    if not path.is_file():
        fail(f"missing active release gate: source/{rel}")
        continue
    text = path.read_text(encoding="utf-8", errors="replace")
    if "release-config.json" not in text:
        fail(f"source/{rel} must read release-config.json")

print("QiblaAstro — Release Configuration Gate")
print("=" * 43)
if package_id and version_name and version_code is not None:
    print(f"Android: {package_id} {version_name} (code {version_code})")
if web_host:
    print(f"Production host: {web_host}")
if sw.get("version"):
    print(f"Service worker: {sw['version']}")
if errors:
    for error in errors:
        print("ERROR:", error, file=sys.stderr)
    print(f"FAILED: {len(errors)} release configuration issue(s)", file=sys.stderr)
    raise SystemExit(1)
print("PASS: one release-config.json governs active release identity and all mirrored runtime/build values match")
