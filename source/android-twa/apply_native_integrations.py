#!/usr/bin/env python3
"""Cross-platform injector for QiblaAstro's reviewed native Android features.

Bubblewrap regenerates ``android-twa/app``. This script applies the small native
Azkar, prayer/Adhan, and widget layer after generation without touching any web
astronomy, Qibla, GNSS, camera, or prayer-calculation source.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
APP = ROOT / "app"
MANIFEST = APP / "src" / "main" / "AndroidManifest.xml"
JAVA_ROOT = APP / "src" / "main" / "java" / "com" / "qiblalabs"
RES = APP / "src" / "main" / "res"
ANDROID_URI = "http://schemas.android.com/apk/res/android"
A = f"{{{ANDROID_URI}}}"

RESOURCE_SETS = ("values", "values-en", "values-fr", "values-id", "values-ur")
AZKAR_AUDIO = {
    "سبحان الله (377).mp3": "azkar_subhanallah.mp3",
    "الْحَمْدُ للهِ.mp3": "azkar_alhamdulillah.mp3",
    "اللهُ أَكْبَرُ.mp3": "azkar_allahuakbar.mp3",
    "لَا إِلٰهَ إِلَّا ال.mp3": "azkar_lailahaillallah.mp3",
    "أَسْتَغْفِرُ اللهَ.mp3": "azkar_astaghfirullah.mp3",
    "أَسْتَغْفِرُ اللهَ ا.mp3": "azkar_astaghfirullahalazim.mp3",
    "سبحان الله وبحمده (377).mp3": "azkar_subhanallahwabihamdih.mp3",
    "لَا حَوْلَ وَلَا قُو.mp3": "azkar_lahawla.mp3",
    "حَسْبِيَ اللهُ.mp3": "azkar_hasbiyallah.mp3",
    "اللَّهُمَّ صَلِّ وَس.mp3": "azkar_salat.mp3",
}
ADHAN_AUDIO = {
    "audio/adhan/mecca.mp3": "adhan_mecca.mp3",
    "audio/adhan/ahmed-al-nufais.mp3": "adhan_ahmed_al_nufais.mp3",
    "audio/adhan/islam-sobhi.mp3": "adhan_islam_sobhi.mp3",
    "audio/adhan/fajr-alafasy.mp3": "adhan_fajr.mp3",
}


def require(path: Path, label: str) -> Path:
    if not path.exists():
        raise SystemExit(f"ERROR: missing {label}: {path}")
    return path


def copy_file(source: Path, destination: Path) -> None:
    require(source, "native source")
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def copy_java(source_dir: Path, destination_dir: Path) -> None:
    sources = sorted(source_dir.glob("*.java"))
    if not sources:
        raise SystemExit(f"ERROR: no Java sources in {source_dir}")
    destination_dir.mkdir(parents=True, exist_ok=True)
    for source in sources:
        shutil.copy2(source, destination_dir / source.name)


def apply_shared_bridge_files() -> None:
    """Install the private token and token-seeding launcher used by both bridges."""
    prayer = ROOT / "native" / "prayer-widget"
    destination = JAVA_ROOT / "nativebridge"
    for name in ("NativeBridgeToken.java", "QiblaLauncherActivity.java"):
        copy_file(prayer / name, destination / name)


def apply_azkar_files() -> None:
    native = ROOT / "native" / "azkar-reminders"
    copy_java(native, JAVA_ROOT / "azkar")
    for resource_set in RESOURCE_SETS:
        copy_file(
            native / "res" / resource_set / "strings.xml",
            RES / resource_set / "qiblaastro_azkar_strings.xml",
        )
    for source_name, destination_name in AZKAR_AUDIO.items():
        copy_file(
            REPO / "assets" / "audio" / "azkar-alerts" / source_name,
            RES / "raw" / destination_name,
        )


def apply_prayer_widget_files() -> None:
    prayer = ROOT / "native" / "prayer-widget"
    widget = ROOT / "native" / "widget"
    copy_java(prayer, JAVA_ROOT / "nativebridge")
    copy_file(widget / "QiblaWidgetProvider.java", JAVA_ROOT / "widget" / "QiblaWidgetProvider.java")
    copy_file(widget / "qibla_widget.xml", RES / "layout" / "qibla_widget.xml")
    copy_file(widget / "qibla_widget_info.xml", RES / "xml" / "qibla_widget_info.xml")
    for resource_set in RESOURCE_SETS:
        copy_file(
            prayer / "res" / resource_set / "strings.xml",
            RES / resource_set / "qiblaastro_prayer_native_strings.xml",
        )
        copy_file(
            widget / "res" / resource_set / "strings.xml",
            RES / resource_set / "qiblaastro_widget_strings.xml",
        )
    for source_name, destination_name in ADHAN_AUDIO.items():
        copy_file(REPO / source_name, RES / "raw" / destination_name)
    legacy = JAVA_ROOT / "widget" / "WidgetDataActivity.java"
    if legacy.exists():
        legacy.unlink()


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def register_existing_namespaces(path: Path) -> None:
    seen: set[tuple[str, str]] = set()
    for _, item in ET.iterparse(path, events=("start-ns",)):
        prefix, uri = item
        if (prefix, uri) in seen:
            continue
        seen.add((prefix, uri))
        ET.register_namespace(prefix or "", uri)
    ET.register_namespace("android", ANDROID_URI)


def find_component(application: ET.Element, tag: str, name: str) -> ET.Element | None:
    for node in application:
        if local_name(node.tag) == tag and node.get(A + "name") == name:
            return node
    return None


def ensure_component(application: ET.Element, tag: str, name: str, **attributes: str) -> ET.Element:
    node = find_component(application, tag, name)
    if node is None:
        node = ET.SubElement(application, tag)
        node.set(A + "name", name)
    for key, value in attributes.items():
        node.set(A + key, value)
    return node


def ensure_intent_filter(
    component: ET.Element,
    actions: tuple[str, ...],
    categories: tuple[str, ...] = (),
    data: dict[str, str] | None = None,
) -> None:
    for intent_filter in component.findall("intent-filter"):
        present = {node.get(A + "name") for node in intent_filter.findall("action")}
        if set(actions).issubset(present):
            return
    intent_filter = ET.SubElement(component, "intent-filter")
    for action in actions:
        ET.SubElement(intent_filter, "action", {A + "name": action})
    for category in categories:
        ET.SubElement(intent_filter, "category", {A + "name": category})
    if data:
        ET.SubElement(intent_filter, "data", {A + key: value for key, value in data.items()})


def ensure_permission(manifest: ET.Element, permission: str) -> None:
    for node in manifest.findall("uses-permission"):
        if node.get(A + "name") == permission:
            return
    application = manifest.find("application")
    index = list(manifest).index(application) if application is not None else len(manifest)
    manifest.insert(index, ET.Element("uses-permission", {A + "name": permission}))


def replace_launcher(application: ET.Element) -> None:
    replacement = "com.qiblalabs.nativebridge.QiblaLauncherActivity"
    for component in application:
        if local_name(component.tag) not in {"activity", "activity-alias"}:
            continue
        for intent_filter in component.findall("intent-filter"):
            actions = {node.get(A + "name") for node in intent_filter.findall("action")}
            categories = {node.get(A + "name") for node in intent_filter.findall("category")}
            if "android.intent.action.MAIN" not in actions or "android.intent.category.LAUNCHER" not in categories:
                continue
            if local_name(component.tag) == "activity":
                component.set(A + "name", replacement)
                return
            target = component.get(A + "targetActivity")
            target_node = next(
                (
                    node
                    for node in application
                    if local_name(node.tag) == "activity" and node.get(A + "name") == target
                ),
                None,
            )
            if target_node is None:
                raise SystemExit("ERROR: MAIN/LAUNCHER activity-alias target was not found")
            target_node.set(A + "name", replacement)
            component.set(A + "targetActivity", replacement)
            return
    raise SystemExit("ERROR: generated MAIN/LAUNCHER activity was not found")


def apply_azkar_manifest(manifest: ET.Element, application: ET.Element) -> None:
    for permission in (
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.POST_NOTIFICATIONS",
    ):
        ensure_permission(manifest, permission)
    activity = ensure_component(
        application,
        "activity",
        "com.qiblalabs.azkar.AzkarReminderActivity",
        exported="true",
        excludeFromRecents="true",
        theme="@android:style/Theme.Material.Dialog.Alert",
    )
    ensure_intent_filter(
        activity,
        ("android.intent.action.VIEW",),
        ("android.intent.category.DEFAULT", "android.intent.category.BROWSABLE"),
        {"scheme": "qiblaastro", "host": "azkar-reminder"},
    )
    ensure_component(
        application,
        "receiver",
        "com.qiblalabs.azkar.AzkarReminderReceiver",
        exported="false",
    )
    boot = ensure_component(
        application,
        "receiver",
        "com.qiblalabs.azkar.AzkarBootReceiver",
        exported="false",
    )
    ensure_intent_filter(
        boot,
        ("android.intent.action.BOOT_COMPLETED", "android.intent.action.MY_PACKAGE_REPLACED"),
    )


def apply_prayer_widget_manifest(manifest: ET.Element, application: ET.Element) -> None:
    for permission in (
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "android.permission.WAKE_LOCK",
    ):
        ensure_permission(manifest, permission)
    sync = ensure_component(
        application,
        "activity",
        "com.qiblalabs.nativebridge.PrayerWidgetSyncActivity",
        exported="true",
        excludeFromRecents="true",
        theme="@android:style/Theme.Translucent.NoTitleBar",
    )
    ensure_intent_filter(
        sync,
        ("android.intent.action.VIEW",),
        ("android.intent.category.DEFAULT", "android.intent.category.BROWSABLE"),
        {"scheme": "qiblaastro", "host": "prayer-sync"},
    )
    ensure_component(
        application,
        "receiver",
        "com.qiblalabs.nativebridge.PrayerNotificationReceiver",
        exported="false",
    )
    ensure_component(
        application,
        "receiver",
        "com.qiblalabs.nativebridge.PrayerWidgetRefreshReceiver",
        exported="false",
    )
    ensure_component(
        application,
        "service",
        "com.qiblalabs.nativebridge.AdhanPlaybackService",
        exported="false",
        foregroundServiceType="mediaPlayback",
        stopWithTask="false",
    )
    boot = ensure_component(
        application,
        "receiver",
        "com.qiblalabs.nativebridge.PrayerBootReceiver",
        exported="false",
    )
    ensure_intent_filter(
        boot,
        (
            "android.intent.action.BOOT_COMPLETED",
            "android.intent.action.MY_PACKAGE_REPLACED",
            "android.intent.action.TIMEZONE_CHANGED",
            "android.intent.action.TIME_SET",
            "android.intent.action.LOCALE_CHANGED",
            "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED",
        ),
    )
    widget = ensure_component(
        application,
        "receiver",
        "com.qiblalabs.widget.QiblaWidgetProvider",
        exported="true",
    )
    ensure_intent_filter(widget, ("android.appwidget.action.APPWIDGET_UPDATE",))
    if not any(node.get(A + "name") == "android.appwidget.provider" for node in widget.findall("meta-data")):
        ET.SubElement(
            widget,
            "meta-data",
            {A + "name": "android.appwidget.provider", A + "resource": "@xml/qibla_widget_info"},
        )
def write_manifest(azkar: bool, prayer_widget: bool) -> None:
    require(MANIFEST, "generated AndroidManifest.xml")
    register_existing_namespaces(MANIFEST)
    tree = ET.parse(MANIFEST)
    manifest = tree.getroot()
    application = manifest.find("application")
    if application is None:
        raise SystemExit("ERROR: generated manifest has no application node")
    if azkar:
        apply_azkar_manifest(manifest, application)
    if prayer_widget:
        apply_prayer_widget_manifest(manifest, application)
    replace_launcher(application)
    ET.indent(tree, space="    ")
    tree.write(MANIFEST, encoding="utf-8", xml_declaration=True)


def run_gate(script: str) -> None:
    result = subprocess.run([sys.executable, str(ROOT / script)], check=False)
    if result.returncode:
        raise SystemExit(result.returncode)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--azkar", action="store_true", help="apply native Azkar reminders")
    parser.add_argument("--prayer-widget", action="store_true", help="apply prayer, Adhan, and widget")
    parser.add_argument("--all", action="store_true", help="apply every native integration")
    args = parser.parse_args()
    azkar = args.azkar or args.all
    prayer_widget = args.prayer_widget or args.all
    if not azkar and not prayer_widget:
        parser.error("select --azkar, --prayer-widget, or --all")
    require(MANIFEST, "generated Android project; run bubblewrap update first")
    apply_shared_bridge_files()
    if azkar:
        apply_azkar_files()
    if prayer_widget:
        apply_prayer_widget_files()
    write_manifest(azkar, prayer_widget)
    if azkar:
        run_gate("check_native_azkar_bridge.py")
    if prayer_widget:
        run_gate("check_native_widget.py")
    print("PASS: reviewed QiblaAstro native integrations applied cross-platform")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
