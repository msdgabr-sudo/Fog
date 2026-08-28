#!/usr/bin/env python3
"""Inspect the built Android App Bundle before it is accepted as a Play release artifact.

This gate intentionally fails if any native shared library (.so) enters the bundle.
QiblaAstro does not require native code in the wrapper; keeping the AAB Java/resources-only
also removes the 16 KB native-page-alignment risk. If a future dependency introduces native
code, the release must stop for an explicit Android 16 KB compatibility review.
"""
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
import re
import sys
import zipfile

REQUIRED = {
    "BundleConfig.pb",
    "base/manifest/AndroidManifest.xml",
    "base/dex/classes.dex",
    "base/res/raw/adhan_mecca.mp3",
    "base/res/raw/adhan_ahmed_al_nufais.mp3",
    "base/res/raw/adhan_islam_sobhi.mp3",
    "base/res/raw/adhan_fajr.mp3",
}
SECRET_SUFFIXES = (".jks", ".keystore", ".p12", ".pfx")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--require-signature", action="store_true")
    args = parser.parse_args()
    bundle = args.bundle.resolve()
    errors: list[str] = []

    if not bundle.is_file() or bundle.stat().st_size < 1024 * 1024:
        print(f"ERROR: AAB is missing or implausibly small: {bundle}", file=sys.stderr)
        return 1

    try:
        with zipfile.ZipFile(bundle) as archive:
            bad = archive.testzip()
            if bad:
                errors.append(f"corrupt ZIP entry: {bad}")
            names = set(archive.namelist())
    except Exception as exc:
        print(f"ERROR: cannot read AAB {bundle}: {exc}", file=sys.stderr)
        return 1

    for name in sorted(REQUIRED - names):
        errors.append(f"required AAB entry missing: {name}")

    native = sorted(name for name in names if name.lower().endswith(".so"))
    if native:
        errors.append("native .so libraries entered the AAB; stop and perform explicit 16 KB page-size review: " + ", ".join(native[:20]))

    leaked = sorted(
        name for name in names
        if name.lower().endswith(SECRET_SUFFIXES)
        or "service-account" in name.lower()
    )
    if leaked:
        errors.append("secret-like material must never be packaged: " + ", ".join(leaked[:20]))

    adhan = sorted(name for name in names if re.fullmatch(r"base/res/raw/adhan_[^/]+\.mp3", name))
    if len(adhan) != 4:
        errors.append(f"expected exactly four bundled Adhan resources, found {len(adhan)}")

    if args.require_signature:
        sf = [name for name in names if re.fullmatch(r"META-INF/[^/]+\.SF", name, re.I)]
        blocks = [name for name in names if re.fullmatch(r"META-INF/[^/]+\.(?:RSA|DSA|EC)", name, re.I)]
        if not sf or not blocks:
            errors.append("signed AAB is missing jarsigner META-INF signature records")

    print("QiblaAstro — Final AAB Structural Gate")
    print("=" * 44)
    print("File:", bundle)
    print("Size:", bundle.stat().st_size, "bytes")
    print("SHA-256:", sha256(bundle))
    print("Bundled Adhan files:", len(adhan))
    print("Native .so libraries:", len(native))
    print("Signature records required:", "yes" if args.require_signature else "no")
    if errors:
        for error in errors:
            print("ERROR:", error, file=sys.stderr)
        print(f"FAILED: {len(errors)} AAB release issue(s)", file=sys.stderr)
        return 1
    print("PASS: AAB is structurally complete, contains local Adhan audio, contains no native .so libraries, and exposes no secret material")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
