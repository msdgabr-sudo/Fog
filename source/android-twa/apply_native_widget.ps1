$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $Here
$AppRoot = Join-Path $Here 'app'
$Manifest = Join-Path $AppRoot 'src\main\AndroidManifest.xml'
$Src = Join-Path $Here 'native\prayer-widget'
$WidgetSrc = Join-Path $Here 'native\widget'
$JavaBridge = Join-Path $AppRoot 'src\main\java\com\qiblalabs\nativebridge'
$JavaWidget = Join-Path $AppRoot 'src\main\java\com\qiblalabs\widget'
$Res = Join-Path $AppRoot 'src\main\res'
$Raw = Join-Path $Res 'raw'

if (-not (Test-Path -LiteralPath $Manifest -PathType Leaf)) { throw "Generated AndroidManifest missing: $Manifest" }
if (-not (Test-Path -LiteralPath $Src -PathType Container)) { throw "Native prayer/widget source missing: $Src" }
New-Item -ItemType Directory -Force -Path $JavaBridge,$JavaWidget,(Join-Path $Res 'layout'),(Join-Path $Res 'xml'),$Raw | Out-Null
Get-ChildItem -LiteralPath $Src -Filter '*.java' -File | Copy-Item -Destination $JavaBridge -Force
Copy-Item -LiteralPath (Join-Path $WidgetSrc 'QiblaWidgetProvider.java') -Destination $JavaWidget -Force
Copy-Item -LiteralPath (Join-Path $WidgetSrc 'qibla_widget.xml') -Destination (Join-Path $Res 'layout\qibla_widget.xml') -Force
Copy-Item -LiteralPath (Join-Path $WidgetSrc 'qibla_widget_info.xml') -Destination (Join-Path $Res 'xml\qibla_widget_info.xml') -Force
$sets=@('values','values-en','values-fr','values-id','values-ur')
foreach($set in $sets){$dest=Join-Path $Res $set;New-Item -ItemType Directory -Force -Path $dest|Out-Null;Copy-Item -LiteralPath (Join-Path $WidgetSrc "res\$set\strings.xml") -Destination (Join-Path $dest 'qiblaastro_widget_strings.xml') -Force;Copy-Item -LiteralPath (Join-Path $Src "res\$set\strings.xml") -Destination (Join-Path $dest 'qiblaastro_prayer_native_strings.xml') -Force}
$adhan=@{'audio\adhan\mecca.mp3'='adhan_mecca.mp3';'audio\adhan\ahmed-al-nufais.mp3'='adhan_ahmed_al_nufais.mp3';'audio\adhan\islam-sobhi.mp3'='adhan_islam_sobhi.mp3';'audio\adhan\fajr-alafasy.mp3'='adhan_fajr.mp3'}
foreach($pair in $adhan.GetEnumerator()){$from=Join-Path $RepoRoot $pair.Key;if(-not(Test-Path -LiteralPath $from -PathType Leaf)){throw "Required local Adhan file missing: $from"};Copy-Item -LiteralPath $from -Destination (Join-Path $Raw $pair.Value) -Force}

$text=Get-Content -LiteralPath $Manifest -Raw
$permissions=@(
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'android.permission.WAKE_LOCK'
)
foreach($permission in $permissions){if(-not $text.Contains($permission)){$text=$text -replace '(<application\b)',"    <uses-permission android:name=`"$permission`" />`r`n`r`n`$1"}}
$marker='<!-- QIBLAASTRO_AUTHENTICATED_PRAYER_WIDGET -->'
if(-not $text.Contains($marker)){$components=@"
        $marker
        <activity android:name="com.qiblalabs.nativebridge.PrayerWidgetSyncActivity" android:exported="true" android:excludeFromRecents="true" android:theme="@android:style/Theme.Translucent.NoTitleBar">
            <intent-filter><action android:name="android.intent.action.VIEW" /><category android:name="android.intent.category.DEFAULT" /><category android:name="android.intent.category.BROWSABLE" /><data android:scheme="qiblaastro" android:host="prayer-sync" /></intent-filter>
        </activity>
        <receiver android:name="com.qiblalabs.nativebridge.PrayerNotificationReceiver" android:exported="false" />
        <service android:name="com.qiblalabs.nativebridge.AdhanPlaybackService" android:exported="false" android:foregroundServiceType="mediaPlayback" android:stopWithTask="false" />
        <receiver android:name="com.qiblalabs.nativebridge.PrayerWidgetRefreshReceiver" android:exported="false" />
        <receiver android:name="com.qiblalabs.nativebridge.PrayerBootReceiver" android:exported="false"><intent-filter><action android:name="android.intent.action.BOOT_COMPLETED" /><action android:name="android.intent.action.MY_PACKAGE_REPLACED" /><action android:name="android.intent.action.TIMEZONE_CHANGED" /><action android:name="android.intent.action.TIME_SET" /><action android:name="android.intent.action.LOCALE_CHANGED" /><action android:name="android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED" /></intent-filter></receiver>
        <receiver android:name="com.qiblalabs.widget.QiblaWidgetProvider" android:exported="true"><intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter><meta-data android:name="android.appwidget.provider" android:resource="@xml/qibla_widget_info" /></receiver>
"@;$text=$text -replace '</application>',($components+"`r`n    </application>")}
Set-Content -LiteralPath $Manifest -Value $text -Encoding UTF8

# Bubblewrap may change the concrete launcher class. Resolve the actual MAIN+LAUNCHER activity from the generated manifest.
[xml]$doc=Get-Content -LiteralPath $Manifest -Raw
$androidNs='http://schemas.android.com/apk/res/android'
$launcher=$null
foreach($activity in @($doc.manifest.application.activity)){
  foreach($filter in @($activity.'intent-filter')){
    $hasMain=$false;$hasLauncher=$false
    foreach($action in @($filter.action)){if($action.GetAttribute('name',$androidNs)-eq 'android.intent.action.MAIN'){$hasMain=$true}}
    foreach($category in @($filter.category)){if($category.GetAttribute('name',$androidNs)-eq 'android.intent.category.LAUNCHER'){$hasLauncher=$true}}
    if($hasMain-and$hasLauncher){$launcher=$activity;break}
  }
  if($launcher){break}
}
if(-not $launcher){throw 'Generated MAIN/LAUNCHER activity not found.'}
$launcher.SetAttribute('name',$androidNs,'com.qiblalabs.nativebridge.QiblaLauncherActivity')
$doc.Save($Manifest)
$text=Get-Content -LiteralPath $Manifest -Raw

if($text -match 'android:name=["''](?:com\.qiblalabs\.)?WidgetDataActivity["'']'){throw 'Legacy exported WidgetDataActivity must not return.'}
if($text -notmatch 'QiblaLauncherActivity'){throw 'Authenticated launcher replacement failed.'}
$sync=Get-Content -LiteralPath (Join-Path $JavaBridge 'PrayerWidgetSyncActivity.java') -Raw
$token=Get-Content -LiteralPath (Join-Path $JavaBridge 'NativeBridgeToken.java') -Raw
if($sync -notmatch 'NativeBridgeToken\.valid'){throw 'Prayer/widget sync token validation missing.'}
if($token -notmatch 'SecureRandom' -or $token -notmatch 'MODE_PRIVATE'){throw 'Per-install cryptographic private token store missing.'}
if($sync -notmatch 'MODE_PRIVATE'){throw 'Private native prayer/widget store requirement missing.'}
& python (Join-Path $Here 'check_native_widget.py')
if($LASTEXITCODE -ne 0){throw 'Native prayer/Adhan/widget integrity gate failed.'}
Write-Host 'PASS: exact prayer alarms + foreground local Adhan + translated event-driven widget integrated.' -ForegroundColor Green
