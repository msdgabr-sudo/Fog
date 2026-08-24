#!/usr/bin/env python3
from pathlib import Path
import json, sys

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
errors=[]

def need(path, token, label):
    p=REPO/path
    if not p.is_file():
        errors.append(f"missing {label}: {path}"); return ''
    text=p.read_text(encoding='utf-8',errors='replace')
    if token and token not in text: errors.append(f"{label} missing token: {token}")
    return text

manifest=json.loads((ROOT/'twa-manifest.json').read_text(encoding='utf-8'))
for key,value in [('packageId','com.qiblalabs'),('host','app.qiblalabs.com'),('startUrl','/?twa=1')]:
    if manifest.get(key)!=value: errors.append(f"TWA {key} mismatch: {manifest.get(key)!r}")

sw=need(Path('service-worker.js'),'js/presentation/permissions-onboarding.js','service worker')
for token in ['js/presentation/location-label.js','js/azkar-native-reminders.js','js/presentation/prayer/schedule-sync.js']:
    if token not in sw: errors.append(f"service worker critical cache missing: {token}")
if 'widget-sync.js' in sw: errors.append('disabled widget deep-link sync must not be in the critical cache')

permissions=need(Path('js/presentation/permissions-onboarding.js'),'requestWebNotifications','permissions onboarding')
for forbidden in ['qiblaastro://permissions/notifications','intent://permissions']:
    if forbidden in permissions: errors.append(f"permissions onboarding must not expose native custom-scheme bridge: {forbidden}")

location=need(Path('js/presentation/location-label.js'),'qiblaastro:location-label','city label resolver')
for forbidden in ['LAT=','LON=','gnssSource=','widget-sync.js','qiblaastro://widget/update']:
    if forbidden in location: errors.append(f"location label must remain read-only and widget-decoupled: {forbidden}")

apply=need(Path('android-twa/apply_native_azkar_reminders.ps1'),'check_native_azkar_bridge.py','native integration orchestrator')
for forbidden in ['apply_native_permissions.ps1','apply_native_widget.ps1','check_native_permissions_bridge.py','check_native_widget.py']:
    if forbidden in apply: errors.append(f"release orchestrator must not inject disabled exported bridge: {forbidden}")

azkar=need(Path('android-twa/native/azkar-reminders/AzkarReminderActivity.java'),'NativeBridgeToken.valid','Azkar native bridge')
for required in ['isExpectedBridgeUri','MAX_INTERVAL_MINUTES','safePhraseText','requestPermissionThenStart','AzkarReminderScheduler.stop(this)']:
    if required not in azkar: errors.append(f"Azkar bridge hardening missing: {required}")
if 'getQueryParameter("text")' in azkar: errors.append('Azkar bridge must not trust arbitrary incoming display text')

azweb=need(Path('js/azkar-native-reminders.js'),'qiblaastro://azkar-reminder?','Azkar web/native bridge')
for required in ['topWin.location.href=uri','intent://azkar-reminder?','category=android.intent.category.BROWSABLE','tokenFromStorage']:
    if required not in azweb: errors.append(f"Azkar web bridge missing browser-launch contract: {required}")
if 'a.click()' in azweb: errors.append('Azkar web bridge must not rely on a synthetic anchor click for native launch')
azhost=need(Path('js/presentation/azkar/host.js'),"TOKEN_KEY='qiblaastro:native-token'",'Azkar iframe host')
for required in ["'?twa=1'","'#nativeToken='+encodeURIComponent(token)",'seedFrameContext(frame)']:
    if required not in azhost: errors.append(f"Azkar iframe native context propagation missing: {required}")

prayerweb=need(Path('js/presentation/prayer/schedule-sync.js'),'qiblaastro://prayer-sync?','Prayer web/native bridge')
for required in ["reason==='explicit'",'topWin.location.href=uri','intent://prayer-sync?','category=android.intent.category.BROWSABLE',"closest('#qa-adhan-card"]:
    if required not in prayerweb: errors.append(f"Prayer web bridge missing user-gesture handoff contract: {required}")
if "setTimeout(function(){try{explicitSync()" in prayerweb:
    errors.append('Prayer explicit native sync must stay synchronous inside the trusted user click')

for dangerous in [
    Path('js/presentation/widget-sync.js'),
    Path('android-twa/native/widget/WidgetDataActivity.java'),
    Path('android-twa/native/permissions/NotificationPermissionActivity.java'),
]:
    if (REPO/dangerous).exists(): errors.append(f"disabled exported bridge source must be removed before release: {dangerous}")

print('QiblaAstro — Source Release Integration Gate')
print('='*48)
if errors:
    for e in errors: print('ERROR:',e,file=sys.stderr)
    print(f'FAILED: {len(errors)} integration issue(s)',file=sys.stderr)
    raise SystemExit(1)
print('PASS: TWA identity, city label, permissions onboarding and service-worker cache are consistent')
print('PASS: Azkar iframe propagates authenticated TWA context and uses direct custom-scheme navigation from the user gesture')
print('PASS: Prayer UI synchronously hands the authenticated dated schedule to the published native prayer component from a user gesture')
print('PASS: exported widget-data and standalone notification-permission custom-scheme bridges are absent')
