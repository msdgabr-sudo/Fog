#!/usr/bin/env python3
"""Validate the generated native prayer, Adhan, and App Widget layer."""
from __future__ import annotations

from pathlib import Path
import sys
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parent
APP = ROOT / "app"
MANIFEST = APP / "src" / "main" / "AndroidManifest.xml"
JAVA = APP / "src" / "main" / "java" / "com" / "qiblalabs"
BRIDGE = JAVA / "nativebridge"
WIDGET = JAVA / "widget"
RES = APP / "src" / "main" / "res"
ANDROID = "{http://schemas.android.com/apk/res/android}"
errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def read(path: Path, label: str) -> str:
    if not path.is_file():
        fail(f"missing {label}: {path}")
        return ""
    return path.read_text(encoding="utf-8", errors="replace")


manifest_text = read(MANIFEST, "generated manifest")
provider_text = read(WIDGET / "QiblaWidgetProvider.java", "widget provider")
scheduler_text = read(BRIDGE / "PrayerNativeScheduler.java", "prayer scheduler")
receiver_text = read(BRIDGE / "PrayerNotificationReceiver.java", "prayer receiver")
service_text = read(BRIDGE / "AdhanPlaybackService.java", "Adhan playback service")
refresh_text = read(BRIDGE / "PrayerWidgetRefreshReceiver.java", "event-driven widget refresh receiver")
sync_text = read(BRIDGE / "PrayerWidgetSyncActivity.java", "authenticated prayer/widget bridge")
token_text = read(BRIDGE / "NativeBridgeToken.java", "per-install bridge token")
layout_text = read(RES / "layout" / "qibla_widget.xml", "widget layout")
info_text = read(RES / "xml" / "qibla_widget_info.xml", "widget metadata")

if (WIDGET / "WidgetDataActivity.java").exists():
    fail("legacy unauthenticated WidgetDataActivity must remain absent")

if manifest_text:
    try:
        manifest = ET.parse(MANIFEST).getroot()
        permissions = {
            node.get(ANDROID + "name")
            for node in manifest.findall("uses-permission")
            if node.get(ANDROID + "name")
        }
        required_permissions = {
            "android.permission.POST_NOTIFICATIONS",
            "android.permission.RECEIVE_BOOT_COMPLETED",
            "android.permission.SCHEDULE_EXACT_ALARM",
            "android.permission.FOREGROUND_SERVICE",
            "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
            "android.permission.WAKE_LOCK",
        }
        for permission in sorted(required_permissions - permissions):
            fail(f"generated manifest missing permission: {permission}")
        for permission in (
            "android.permission.USE_EXACT_ALARM",
            "android.permission.USE_FULL_SCREEN_INTENT",
            "android.permission.RECORD_AUDIO",
            "android.permission.ACCESS_BACKGROUND_LOCATION",
        ):
            if permission in permissions:
                fail(f"forbidden generated permission present: {permission}")
        application = manifest.find("application")
        if application is None:
            fail("generated manifest application node missing")
        else:
            activities = {node.get(ANDROID + "name"): node for node in application.findall("activity")}
            receivers = {node.get(ANDROID + "name"): node for node in application.findall("receiver")}
            services = {node.get(ANDROID + "name"): node for node in application.findall("service")}
            sync = activities.get("com.qiblalabs.nativebridge.PrayerWidgetSyncActivity")
            if sync is None or sync.get(ANDROID + "exported") != "true":
                fail("authenticated PrayerWidgetSyncActivity bridge is missing")
            for name in (
                "com.qiblalabs.nativebridge.PrayerNotificationReceiver",
                "com.qiblalabs.nativebridge.PrayerWidgetRefreshReceiver",
                "com.qiblalabs.nativebridge.PrayerBootReceiver",
            ):
                node = receivers.get(name)
                if node is None or node.get(ANDROID + "exported") != "false":
                    fail(f"{name} must exist and remain non-exported")
            widget = receivers.get("com.qiblalabs.widget.QiblaWidgetProvider")
            if widget is None or widget.get(ANDROID + "exported") != "true":
                fail("Android App Widget provider contract is missing")
            service = services.get("com.qiblalabs.nativebridge.AdhanPlaybackService")
            if service is None:
                fail("AdhanPlaybackService missing from generated manifest")
            elif service.get(ANDROID + "exported") != "false" or service.get(ANDROID + "foregroundServiceType") != "mediaPlayback":
                fail("AdhanPlaybackService must be non-exported mediaPlayback foreground service")
    except Exception as exc:
        fail(f"cannot parse generated manifest: {exc}")

for required in (
    "canScheduleExactAlarms",
    "setExactAndAllowWhileIdle",
    "setAndAllowWhileIdle",
    "AlarmManager.RTC_WAKEUP",
    "nextPlannedOccurrence",
    "NextPrayer",
    "catch (SecurityException ignored)",
    "PRAYER_NATIVE_BACKUP_",
):
    if required not in scheduler_text:
        fail(f"prayer scheduler contract missing: {required}")
if "USE_EXACT_ALARM" in scheduler_text:
    fail("scheduler must use user-granted SCHEDULE_EXACT_ALARM, never USE_EXACT_ALARM")

for required in (
    "extends Service",
    "startForeground",
    "MediaPlayer",
    "AudioFocusRequest",
    "USAGE_ALARM",
    "setWakeMode",
    "START_NOT_STICKY",
    "ACTION_STOP",
    "adhan_fajr",
    "adhan_mecca",
):
    if required not in service_text:
        fail(f"foreground Adhan service contract missing: {required}")
for forbidden in ("MediaRecorder", "RECORD_AUDIO", "http://", "https://"):
    if forbidden in service_text:
        fail(f"Adhan service must remain playback-only and bundled: {forbidden}")

for required in (
    "AdhanPlaybackService.ACTION_PLAY",
    "startForegroundService",
    "PrayerNativeScheduler.reschedule",
    "POST_NOTIFICATIONS",
    "last_delivery_",
):
    if required not in receiver_text:
        fail(f"prayer delivery receiver contract missing: {required}")

for required in (
    "NativeBridgeToken.valid",
    "MODE_PRIVATE",
    "ACTION_REQUEST_SCHEDULE_EXACT_ALARM",
    "PrayerNativeScheduler.canScheduleExact",
    "POST_NOTIFICATIONS",
    "safePlan",
):
    if required not in sync_text:
        fail(f"authenticated prayer bridge contract missing: {required}")
for required in ("SecureRandom", "MODE_PRIVATE"):
    if required not in token_text:
        fail(f"per-install token contract missing: {required}")

for required in (
    "PrayerNativeScheduler.PREFS",
    "PrayerNativeScheduler.nextPrayer",
    "RemoteViews",
    "DateFormat.getTimeFormat",
    "PrayerWidgetRefreshReceiver.schedule",
    "getLaunchIntentForPackage",
):
    if required not in provider_text:
        fail(f"widget provider contract missing: {required}")
for required in ("setAndAllowWhileIdle", "PrayerNativeScheduler.nextPrayer", "ids.length == 0"):
    if required not in refresh_text:
        fail(f"event-driven widget refresh contract missing: {required}")

isolated_text = provider_text + scheduler_text + refresh_text + sync_text
for forbidden in (
    "LocationManager",
    "SensorManager",
    "getUserMedia",
    "QiblaAstronomicalSolver",
    "AstronomicalVerification",
    "ACCESS_FINE_LOCATION",
    "ACCESS_COARSE_LOCATION",
    "fetch(",
    "HttpURLConnection",
):
    if forbidden in isolated_text:
        fail(f"native prayer/widget layer must not couple to sensors, network, or scientific engine: {forbidden}")

for widget_id in (
    "@+id/widget_city",
    "@+id/widget_next_prayer",
    "@+id/widget_prayer_time",
    "@+id/widget_hijri",
    "@+id/widget_qibla",
):
    if widget_id not in layout_text:
        fail(f"widget layout missing: {widget_id}")
if 'android:updatePeriodMillis="0"' not in info_text:
    fail("widget must keep updatePeriodMillis=0; refreshes are prayer-event driven")

required_raw = {
    "adhan_mecca.mp3",
    "adhan_ahmed_al_nufais.mp3",
    "adhan_islam_sobhi.mp3",
    "adhan_fajr.mp3",
}
present_raw = {path.name for path in (RES / "raw").glob("*.mp3")} if (RES / "raw").is_dir() else set()
for missing in sorted(required_raw - present_raw):
    fail(f"bundled native Adhan audio missing: {missing}")

required_strings = {
    "prayer_channel_adhan",
    "prayer_channel_notice",
    "prayer_channel_description",
    "prayer_notification_title",
    "prayer_notification_now",
    "prayer_notification_advance",
    "prayer_playback_stop",
    "prayer_notification_permission_required",
    "prayer_exact_alarm_hint",
}
for resource_set in ("values", "values-en", "values-fr", "values-id", "values-ur"):
    path = RES / resource_set / "qiblaastro_prayer_native_strings.xml"
    if not path.is_file():
        fail(f"localized prayer resources missing: {resource_set}")
        continue
    try:
        names = {node.get("name") for node in ET.parse(path).getroot().findall("string")}
        for missing in sorted(required_strings - names):
            fail(f"{resource_set} prayer resources missing: {missing}")
    except Exception as exc:
        fail(f"cannot parse {resource_set} prayer resources: {exc}")

print("QiblaAstro — Native Prayer / Adhan / Widget Gate")
print("=" * 51)
if errors:
    for error in errors:
        print("ERROR:", error, file=sys.stderr)
    print(f"FAILED: {len(errors)} issue(s)", file=sys.stderr)
    raise SystemExit(1)
print("PASS: user-granted exact prayer alarms and inexact advance reminders")
print("PASS: bundled Adhan media-playback foreground service with audio focus and stop action")
print("PASS: authenticated private widget store and event-driven, zero-polling refresh")
