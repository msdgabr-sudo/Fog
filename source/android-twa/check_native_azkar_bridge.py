#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
APP = ROOT / "app"
MANIFEST = APP / "src" / "main" / "AndroidManifest.xml"
JAVA = APP / "src" / "main" / "java" / "com" / "qiblalabs" / "azkar"
RES = APP / "src" / "main" / "res"
RAW = RES / "raw"
ANDROID = "{http://schemas.android.com/apk/res/android}"
errors: list[str] = []

def fail(message: str) -> None: errors.append(message)

required_java = {"AzkarReminderScheduler.java","AzkarReminderReceiver.java","AzkarReminderActivity.java","AzkarBootReceiver.java"}
required_raw = {"azkar_subhanallah.mp3","azkar_alhamdulillah.mp3","azkar_allahuakbar.mp3","azkar_lailahaillallah.mp3","azkar_astaghfirullah.mp3","azkar_astaghfirullahalazim.mp3","azkar_subhanallahwabihamdih.mp3","azkar_lahawla.mp3","azkar_hasbiyallah.mp3","azkar_salat.mp3"}
required_sets = ("values","values-en","values-fr","values-id","values-ur")
required_strings = {"azkar_channel_name","azkar_channel_description","azkar_notification_title","azkar_permission_required","azkar_started_toast"}

if not MANIFEST.is_file(): fail(f"generated manifest missing: {MANIFEST}")
else:
    try:
        root = ET.parse(MANIFEST).getroot()
        permissions = {n.get(ANDROID+"name") for n in root.findall("uses-permission") if n.get(ANDROID+"name")}
        for required in ("android.permission.RECEIVE_BOOT_COMPLETED","android.permission.POST_NOTIFICATIONS","android.permission.SCHEDULE_EXACT_ALARM"):
            if required not in permissions: fail(f"{required} missing from generated manifest")
        if "android.permission.USE_EXACT_ALARM" in permissions:
            fail("forbidden exact-alarm permission present: android.permission.USE_EXACT_ALARM")
        app = root.find("application")
        if app is None: fail("application node missing")
        else:
            activities={n.get(ANDROID+"name"):n for n in app.findall("activity")}; receivers={n.get(ANDROID+"name"):n for n in app.findall("receiver")}
            a=activities.get("com.qiblalabs.azkar.AzkarReminderActivity")
            if a is None or a.get(ANDROID+"exported")!="true": fail("AzkarReminderActivity bridge contract invalid")
            for name in ("com.qiblalabs.azkar.AzkarReminderReceiver","com.qiblalabs.azkar.AzkarBootReceiver"):
                n=receivers.get(name)
                if n is None or n.get(ANDROID+"exported")!="false": fail(f"{name} must exist and remain non-exported")
    except Exception as exc: fail(f"cannot parse generated manifest: {exc}")

if not JAVA.is_dir(): fail(f"native Java destination missing: {JAVA}")
else:
    present={p.name for p in JAVA.glob("*.java")}
    for name in sorted(required_java-present): fail(f"native source missing: {name}")
if not RAW.is_dir(): fail(f"res/raw missing: {RAW}")
else:
    present={p.name for p in RAW.glob("*.mp3")}
    for name in sorted(required_raw-present): fail(f"native audio missing: {name}")

for set_name in required_sets:
    f=RES/set_name/"qiblaastro_azkar_strings.xml"
    if not f.is_file(): fail(f"localized Android resources missing: {set_name}"); continue
    try:
        names={n.get("name") for n in ET.parse(f).getroot().findall("string")}
        missing=required_strings-names
        if missing: fail(f"{set_name} missing strings: {', '.join(sorted(missing))}")
    except Exception as exc: fail(f"cannot parse {set_name} strings: {exc}")

scheduler=JAVA/"AzkarReminderScheduler.java"
if scheduler.is_file():
    text=scheduler.read_text(encoding="utf-8")
    if "MIN_INTERVAL_MINUTES = 10" not in text: fail("scheduler must use the Android-safe ten-minute minimum")
    if "setExactAndAllowWhileIdle" not in text: fail("scheduler must use exact idle-safe alarms when special access is available")
    if "canScheduleExactAlarms" not in text: fail("scheduler must check user-granted exact alarm access")
    if "setAndAllowWhileIdle" not in text: fail("scheduler must preserve an idle-safe fallback when exact access is unavailable")
    if "catch (SecurityException ignored)" not in text: fail("exact-alarm permission races must fall back without crashing")
    if "PendingIntent.getBroadcast" not in text or "AzkarReminderReceiver.class" not in text: fail("background reminder must target a broadcast receiver independent of the TWA UI")

activity=JAVA/"AzkarReminderActivity.java"
if activity.is_file():
    text=activity.read_text(encoding="utf-8")
    for required in ("POST_NOTIFICATIONS","requestPermissions","requestPermissionThenStart","requestExactAlarmAccessOrStart","ACTION_REQUEST_SCHEDULE_EXACT_ALARM","AzkarReminderScheduler.start","AzkarReminderScheduler.stop","isExpectedBridgeUri",'"qiblaastro".equals(data.getScheme())','"azkar-reminder".equals(data.getHost())',"R.string.azkar_permission_required"):
        if required not in text: fail(f"activity contract missing: {required}")
    if "MIN_INTERVAL_MINUTES = 10" not in text: fail("activity must clamp native reminders to at least ten minutes")
    if "AlertDialog.Builder" in text: fail("obsolete second confirmation dialog must not return; the visible toggle is the user action")
    if 'getQueryParameter("text")' in text: fail("activity must not trust arbitrary incoming display text")

receiver=JAVA/"AzkarReminderReceiver.java"
if receiver.is_file():
    text=receiver.read_text(encoding="utf-8")
    for required in ("NotificationChannel","scheduleNext","R.string.azkar_channel_name","R.string.azkar_notification_title","getLaunchIntentForPackage","POST_NOTIFICATIONS","AzkarReminderScheduler.stop(context)","R.raw.azkar_subhanallah"):
        if required not in text: fail(f"receiver contract missing: {required}")
    if "getIdentifier" in text: fail("Azkar voice resources must use direct R.raw references so release shrinking cannot remove them")
    for hardcoded in ('"تنبيهات الأذكار"','"QiblaAstro — تذكير بالذكر"'):
        if hardcoded in text: fail("native notification UI must use Android resources, not hard-coded Arabic")

boot=JAVA/"AzkarBootReceiver.java"
if boot.is_file() and "scheduleNext" not in boot.read_text(encoding="utf-8"): fail("boot receiver must restore scheduling")

print("QiblaAstro — Native Notifications Localization Gate")
print("="*53)
if errors:
    for error in errors: print("ERROR:",error,file=sys.stderr)
    raise SystemExit(1)
print("PASS: AR/EN/FR/ID/UR resources generated and referenced by native notification UI")
print("PASS: direct authenticated toggle, Android 13+ notification permission, exact-alarm special access, idle-safe fallback, reboot and Azkar background contracts intact")
