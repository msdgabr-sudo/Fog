#!/usr/bin/env python3
"""Hermetic contract test for the post-Bubblewrap native injector."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location(
    "qiblaastro_native_integrations", ROOT / "apply_native_integrations.py"
)
assert SPEC and SPEC.loader
injector = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(injector)

ANDROID = "{http://schemas.android.com/apk/res/android}"


def write_generated_manifest(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        """<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.qiblalabs">
    <uses-permission android:name="android.permission.INTERNET" />
    <application android:theme="@style/AppTheme">
        <activity android:name="com.google.androidbrowserhelper.trusted.LauncherActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
""",
        encoding="utf-8",
    )


def component_map(application: ET.Element, tag: str) -> dict[str, ET.Element]:
    return {node.get(ANDROID + "name", ""): node for node in application.findall(tag)}


with tempfile.TemporaryDirectory(prefix="qiblaastro-native-injector-") as temporary:
    app = Path(temporary) / "app"
    manifest_path = app / "src" / "main" / "AndroidManifest.xml"
    write_generated_manifest(manifest_path)

    injector.APP = app
    injector.MANIFEST = manifest_path
    injector.JAVA_ROOT = app / "src" / "main" / "java" / "com" / "qiblalabs"
    injector.RES = app / "src" / "main" / "res"

    injector.apply_shared_bridge_files()
    injector.apply_azkar_files()
    injector.apply_prayer_widget_files()
    injector.write_manifest(True, True)
    # A second pass must be safe because local release scripts can be re-run.
    injector.write_manifest(True, True)

    root = ET.parse(manifest_path).getroot()
    assert root.get("package") == "com.qiblalabs"
    permissions = [node.get(ANDROID + "name") for node in root.findall("uses-permission")]
    for required in (
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "android.permission.WAKE_LOCK",
    ):
        assert permissions.count(required) == 1, required
    for forbidden in (
        "android.permission.USE_EXACT_ALARM",
        "android.permission.USE_FULL_SCREEN_INTENT",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
    ):
        assert forbidden not in permissions, forbidden

    application = root.find("application")
    assert application is not None
    activities = component_map(application, "activity")
    receivers = component_map(application, "receiver")
    services = component_map(application, "service")
    assert "com.qiblalabs.nativebridge.QiblaLauncherActivity" in activities
    assert "com.qiblalabs.azkar.AzkarReminderActivity" in activities
    assert "com.qiblalabs.nativebridge.PrayerWidgetSyncActivity" in activities
    assert "com.qiblalabs.azkar.AzkarReminderReceiver" in receivers
    assert "com.qiblalabs.nativebridge.PrayerNotificationReceiver" in receivers
    assert "com.qiblalabs.nativebridge.PrayerWidgetRefreshReceiver" in receivers
    assert "com.qiblalabs.widget.QiblaWidgetProvider" in receivers
    service = services["com.qiblalabs.nativebridge.AdhanPlaybackService"]
    assert service.get(ANDROID + "exported") == "false"
    assert service.get(ANDROID + "foregroundServiceType") == "mediaPlayback"

    raw = injector.RES / "raw"
    assert len(list(raw.glob("azkar_*.mp3"))) == 10
    assert len(list(raw.glob("adhan_*.mp3"))) == 4
    assert (injector.JAVA_ROOT / "nativebridge" / "AdhanPlaybackService.java").is_file()
    assert (injector.JAVA_ROOT / "widget" / "QiblaWidgetProvider.java").is_file()

print("PASS: native injector is idempotent and produces the reviewed com.qiblalabs manifest/resources")
