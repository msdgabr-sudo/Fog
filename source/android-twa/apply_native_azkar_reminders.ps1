$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $Here
$AppRoot = Join-Path $Here 'app'
$Manifest = Join-Path $AppRoot 'src\main\AndroidManifest.xml'
$JavaDest = Join-Path $AppRoot 'src\main\java\com\qiblalabs\azkar'
$ResDest = Join-Path $AppRoot 'src\main\res'
$RawDest = Join-Path $ResDest 'raw'
$NativeSrc = Join-Path $Here 'native\azkar-reminders'
$NativeRes = Join-Path $NativeSrc 'res'
$AudioSrc = Join-Path $RepoRoot 'assets\audio\azkar-alerts'

if (-not (Test-Path -LiteralPath $Manifest -PathType Leaf)) { throw "Generated AndroidManifest missing: $Manifest" }
if (-not (Test-Path -LiteralPath $NativeSrc -PathType Container)) { throw "Native Azkar source missing: $NativeSrc" }

New-Item -ItemType Directory -Force -Path $JavaDest,$RawDest | Out-Null
$JavaSources = Get-ChildItem -LiteralPath $NativeSrc -Filter '*.java' -File
if ($JavaSources.Count -ne 4) { throw "Expected 4 native Azkar Java sources, found $($JavaSources.Count)." }
$JavaSources | Copy-Item -Destination $JavaDest -Force

$ResourceSets = @('values','values-en','values-fr','values-id','values-ur')
foreach ($set in $ResourceSets) {
    $src = Join-Path $NativeRes "$set\strings.xml"
    if (-not (Test-Path -LiteralPath $src -PathType Leaf)) { throw "Required localized strings missing: $src" }
    $dest = Join-Path $ResDest $set
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Copy-Item -LiteralPath $src -Destination (Join-Path $dest 'qiblaastro_azkar_strings.xml') -Force
}

$AudioMap = [ordered]@{
    'سبحان الله (377).mp3' = 'azkar_subhanallah.mp3'
    'الْحَمْدُ للهِ.mp3' = 'azkar_alhamdulillah.mp3'
    'اللهُ أَكْبَرُ.mp3' = 'azkar_allahuakbar.mp3'
    'لَا إِلٰهَ إِلَّا ال.mp3' = 'azkar_lailahaillallah.mp3'
    'أَسْتَغْفِرُ اللهَ.mp3' = 'azkar_astaghfirullah.mp3'
    'أَسْتَغْفِرُ اللهَ ا.mp3' = 'azkar_astaghfirullahalazim.mp3'
    'سبحان الله وبحمده (377).mp3' = 'azkar_subhanallahwabihamdih.mp3'
    'لَا حَوْلَ وَلَا قُو.mp3' = 'azkar_lahawla.mp3'
    'حَسْبِيَ اللهُ.mp3' = 'azkar_hasbiyallah.mp3'
    'اللَّهُمَّ صَلِّ وَس.mp3' = 'azkar_salat.mp3'
}
foreach ($pair in $AudioMap.GetEnumerator()) {
    $src = Join-Path $AudioSrc $pair.Key
    if (-not (Test-Path -LiteralPath $src -PathType Leaf)) { throw "Required Azkar audio missing: $src" }
    Copy-Item -LiteralPath $src -Destination (Join-Path $RawDest $pair.Value) -Force
}

$text = Get-Content -LiteralPath $Manifest -Raw
if (-not $text.Contains('android.permission.RECEIVE_BOOT_COMPLETED')) {
    $text = $text -replace '(<application\b)', "    <uses-permission android:name=`"android.permission.RECEIVE_BOOT_COMPLETED`" />`r`n`r`n`$1"
}
if (-not $text.Contains('android.permission.POST_NOTIFICATIONS')) {
    $text = $text -replace '(<application\b)', "    <uses-permission android:name=`"android.permission.POST_NOTIFICATIONS`" />`r`n`r`n`$1"
}

$marker = '<!-- QIBLAASTRO_NATIVE_AZKAR_REMINDERS -->'
if (-not $text.Contains($marker)) {
    $components = @"
        $marker
        <activity
            android:name="com.qiblalabs.azkar.AzkarReminderActivity"
            android:exported="true"
            android:excludeFromRecents="true"
            android:theme="@android:style/Theme.Material.Dialog.Alert">
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="qiblaastro" android:host="azkar-reminder" />
            </intent-filter>
        </activity>
        <receiver android:name="com.qiblalabs.azkar.AzkarReminderReceiver" android:exported="false" />
        <receiver android:name="com.qiblalabs.azkar.AzkarBootReceiver" android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>
"@
    $text = $text -replace '</application>', ($components + "`r`n    </application>")
}
Set-Content -LiteralPath $Manifest -Value $text -Encoding UTF8

Write-Host 'PASS: native Azkar reminders + AR/EN/FR/ID/UR Android resources applied.' -ForegroundColor Green
& python (Join-Path $Here 'check_native_azkar_bridge.py')
if ($LASTEXITCODE -ne 0) { throw 'Native Azkar integrity gate failed.' }
