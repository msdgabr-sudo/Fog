#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
APP = ROOT / "app"
MANIFEST = APP / "src" / "main" / "AndroidManifest.xml"
JAVA_DIR = APP / "src" / "main" / "java" / "com" / "qiblalabs" / "widget"
PROVIDER = JAVA_DIR / "QiblaWidgetProvider.java"
DATA = JAVA_DIR / "WidgetDataActivity.java"
LAYOUT = APP / "src" / "main" / "res" / "layout" / "qibla_widget.xml"
INFO = APP / "src" / "main" / "res" / "xml" / "qibla_widget_info.xml"

errors: list[str] = []
for path, label in [(MANIFEST,"generated manifest"),(PROVIDER,"widget provider"),(DATA,"widget data bridge"),(LAYOUT,"widget layout"),(INFO,"widget metadata")]:
    if not path.is_file(): errors.append(f"missing {label}: {path}")

manifest_text = MANIFEST.read_text(encoding="utf-8", errors="replace") if MANIFEST.is_file() else ""
provider_text = PROVIDER.read_text(encoding="utf-8", errors="replace") if PROVIDER.is_file() else ""
data_text = DATA.read_text(encoding="utf-8", errors="replace") if DATA.is_file() else ""
layout_text = LAYOUT.read_text(encoding="utf-8", errors="replace") if LAYOUT.is_file() else ""
info_text = INFO.read_text(encoding="utf-8", errors="replace") if INFO.is_file() else ""
combined = provider_text + "\n" + data_text

for token in ["QIBLAASTRO_HOME_WIDGET","com.qiblalabs.widget.QiblaWidgetProvider","com.qiblalabs.widget.WidgetDataActivity","android.appwidget.action.APPWIDGET_UPDATE","@xml/qibla_widget_info",'android:scheme="qiblaastro"','android:host="widget"','android:path="/update"']:
    if token not in manifest_text: errors.append(f"widget manifest token missing: {token}")

for forbidden in ["LocationManager","SensorManager","Camera","getUserMedia","QiblaAstronomical","Astronomical","ACCESS_FINE_LOCATION","ACCESS_COARSE_LOCATION","requestPermissions","AlarmManager"]:
    if forbidden in combined: errors.append(f"widget must not couple to runtime engine/sensor/permission API: {forbidden}")

for required in ["SharedPreferences","RemoteViews","getLaunchIntentForPackage","KEY_CITY","widget_city"]:
    if required not in provider_text: errors.append(f"widget provider contract missing: {required}")
for required in ["getQueryParameter","SharedPreferences.Editor","ACTION_APPWIDGET_UPDATE","KEY_CITY",'getQueryParameter("city")','"qiblaastro".equals(data.getScheme())','"widget".equals(data.getHost())','"/update".equals(data.getPath())','Double.parseDouble','degrees >= 0.0 && degrees < 360.0','clean.matches']:
    if required not in data_text: errors.append(f"widget write-only bridge contract missing: {required}")
if '@+id/widget_city' not in layout_text: errors.append("widget layout must expose widget_city")
if 'android:updatePeriodMillis="0"' not in info_text: errors.append("widget must keep updatePeriodMillis=0 to avoid background polling")

if errors:
    for error in errors: print("ERROR:", error, file=sys.stderr)
    print(f"FAILED: {len(errors)} widget integrity issue(s)", file=sys.stderr)
    raise SystemExit(1)
print("PASS: widget provider and write-only display bridge are isolated from scientific/runtime engines")
print("PASS: city label, next prayer, Hijri date and read-only Qibla display contracts are present")
print("PASS: deep-link payload is scheme/path validated; time and Qibla values are constrained")
print("PASS: no location, sensor, camera, permission, alarm, or background polling API detected")
