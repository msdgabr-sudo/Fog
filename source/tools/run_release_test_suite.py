#!/usr/bin/env python3
"""Run the fail-closed QiblaAstro production release test suite.

The web profile is the minimum gate required before GitHub Pages deployment.
The android profile includes the web/core gate plus Android-specific source gates.
No application files are modified.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import subprocess
import sys

SOURCE_ROOT = Path(__file__).resolve().parents[1]

CORE_TESTS = [
    "tests/android-release-version.test.js",
    "tests/wmm2025-official-gate.js",
    "tests/wmm2025-global-coverage.test.js",
    "tests/wmm2025-runtime-integration.test.js",
    "tests/prayer-global-methods.test.js",
    "tests/prayer-global-runtime-integration.test.js",
    "tests/local-timezone-adapter.test.js",
    "tests/timezone-production-wiring.test.js",
    "tests/trusted-location-runtime-sync.test.js",
    "tests/prayer-midnight-refresh.test.js",
    "tests/adhan-runtime-resilience.test.js",
    "tests/code5-background-adhan-web-gate.test.js",
    "tests/code5-native-adhan-owner.test.js",
    "tests/code5-widget-rich-summary.test.js",
    "tests/azkar-web-reminder-runtime.test.js",
    "tests/azkar-native-top-bridge.test.js",
    "tests/azkar-selection-persistence.test.js",
    "tests/native-token-fragment-compatibility.test.js",
    "tests/offline-complete-shell.test.js",
    "tests/offline-network-fallback.test.js",
    "tests/i18n-roundtrip-safety.test.js",
    "tests/a2-phone-ui-regressions.test.js",
    "tests/permissions-gnss-adhan-cycle.test.js",
    "tests/prayer-widget-safe-autosync.test.js",
    "tests/code3-web-cutover-compatibility.test.js",
    "tests/astronomical-verification-store-persistence.test.js",
    "tests/astronomical-app-wiring.test.js",
    "tests/astronomical-solver.integration.test.js",
    "tests/navigation-single-owner.test.js",
    "tests/pwa-single-owner.test.js",
    "tests/compass-cards-canonical.test.js",
    "tests/qibla-card-runtime.test.js",
]

ANDROID_SOURCE_TESTS = [
    "tests/native-android-localization-security.test.js",
    "tests/pre-native-release-readiness.test.js",
]


def run(command: list[str]) -> None:
    print("+", " ".join(command), flush=True)
    subprocess.run(command, cwd=SOURCE_ROOT, check=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=("web", "android"), default="web")
    args = parser.parse_args()

    config_gate = SOURCE_ROOT / "tools" / "verify_release_config.py"
    if not config_gate.is_file():
        print("ERROR: missing tools/verify_release_config.py", file=sys.stderr)
        return 1

    run([sys.executable, "tools/verify_release_config.py"])
    tests = list(CORE_TESTS)
    if args.profile == "android":
        tests.extend(ANDROID_SOURCE_TESTS)

    seen: set[str] = set()
    for test in tests:
        if test in seen:
            print(f"ERROR: duplicate release test entry: {test}", file=sys.stderr)
            return 1
        seen.add(test)
        if not (SOURCE_ROOT / test).is_file():
            print(f"ERROR: release test is missing: {test}", file=sys.stderr)
            return 1
        run(["node", test])

    print(f"PASS: QiblaAstro {args.profile} release suite completed ({len(tests)} Node gates + release configuration gate)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        print(f"FAILED: release gate command exited with status {exc.returncode}", file=sys.stderr)
        raise SystemExit(exc.returncode)
