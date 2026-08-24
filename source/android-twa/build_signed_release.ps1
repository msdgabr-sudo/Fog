$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Here

$Manifest = Join-Path $Here 'twa-manifest.json'
$Keystore = Join-Path $Here 'keystore\qiblaastro-upload.jks'
$Alias = 'qiblaastro'

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Required command not found: $Name" }
}

Write-Host 'QiblaAstro ELITE — guarded Android AAB/APK build and signing' -ForegroundColor Cyan
Write-Host 'Release branch: a2-release-prep'
Write-Host 'Package: com.qiblalabs'
Write-Host 'Version: 3.1.0 (code 3)'
Write-Host 'Target: Android 16 / API 36'
Write-Host 'Origin: https://app.qiblalabs.com'
Write-Host ''

Require-Command 'python'
Require-Command 'node'
Require-Command 'bubblewrap'
Require-Command 'keytool'
Require-Command 'jarsigner'
if (-not (Test-Path -LiteralPath $Manifest -PathType Leaf)) { throw "Missing frozen TWA manifest: $Manifest" }
if (-not (Test-Path -LiteralPath $Keystore -PathType Leaf)) { throw "Upload keystore not found at: $Keystore`nCreate/restore it locally. Never download it from GitHub." }

Write-Host '[1/14] Verify local upload key...' -ForegroundColor Yellow
& keytool -list -keystore $Keystore -alias $Alias | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'Upload key verification failed.' }

Write-Host '[2/14] Validate frozen TWA identity and source release contracts...' -ForegroundColor Yellow
& python .\check_twa_config.py
if ($LASTEXITCODE -ne 0) { throw 'TWA configuration gate failed.' }
& python .\check_release_integration.py
if ($LASTEXITCODE -ne 0) { throw 'Source release integration gate failed.' }
& node ..\tests\native-android-localization-security.test.js
if ($LASTEXITCODE -ne 0) { throw 'Native localization/security gate failed.' }

Write-Host '[3/14] Regenerate Android project from frozen Bubblewrap config...' -ForegroundColor Yellow
& bubblewrap update --skipVersionUpgrade --manifest=.\twa-manifest.json
if ($LASTEXITCODE -ne 0) { throw 'Bubblewrap project generation failed.' }
if (-not (Test-Path -LiteralPath (Join-Path $Here 'app\src\main\AndroidManifest.xml') -PathType Leaf)) { throw 'Generated AndroidManifest.xml missing.' }

Write-Host '[4/14] Enforce Android 16 / API 36...' -ForegroundColor Yellow
& python .\ensure_target_api_36.py
if ($LASTEXITCODE -ne 0) { throw 'API 36 enforcement failed.' }

Write-Host '[5/14] Apply localized native Azkar reminders...' -ForegroundColor Yellow
& .\apply_native_azkar_reminders.ps1
if ($LASTEXITCODE -ne 0) { throw 'Native Azkar reminder patch/gate failed.' }

Write-Host '[6/14] Apply authenticated prayer notifications and home Widget...' -ForegroundColor Yellow
& .\apply_native_widget.ps1
if ($LASTEXITCODE -ne 0) { throw 'Authenticated prayer/widget patch/gate failed.' }

Write-Host '[7/14] Verify generated native bridge and release integration...' -ForegroundColor Yellow
& python .\check_release_integration.py
if ($LASTEXITCODE -ne 0) { throw 'Post-injection release integration gate failed.' }
$GeneratedManifest = Join-Path $Here 'app\src\main\AndroidManifest.xml'
$GeneratedManifestText = Get-Content -LiteralPath $GeneratedManifest -Raw
foreach ($RequiredComponent in @('QiblaLauncherActivity','PrayerWidgetSyncActivity','QiblaWidgetProvider')) {
    if (-not $GeneratedManifestText.Contains($RequiredComponent)) { throw "Generated native component missing: $RequiredComponent" }
}
if ($GeneratedManifestText.Contains('WidgetDataActivity')) { throw 'Legacy WidgetDataActivity must remain absent.' }
$SyncActivity = Join-Path $Here 'app\src\main\java\com\qiblalabs\nativebridge\PrayerWidgetSyncActivity.java'
if (-not (Test-Path -LiteralPath $SyncActivity -PathType Leaf)) { throw 'PrayerWidgetSyncActivity.java missing after native injection.' }
if (-not (Get-Content -LiteralPath $SyncActivity -Raw).Contains('NativeBridgeToken.valid')) { throw 'Per-install native bridge token validation missing.' }

$Gradle = Join-Path $Here 'app\build.gradle'
if (-not (Test-Path -LiteralPath $Gradle -PathType Leaf)) { throw 'Generated app/build.gradle missing.' }
$GradleText = Get-Content -LiteralPath $Gradle -Raw
foreach ($Required in @('applicationId "com.qiblalabs"','namespace "com.qiblalabs"','compileSdkVersion 36','targetSdkVersion 36')) {
    if (-not $GradleText.Contains($Required)) { throw "Generated Gradle identity mismatch; missing: $Required" }
}

Write-Host '[8/14] Bind Gradle to the real Android SDK root...' -ForegroundColor Yellow
$SdkCandidates = @()
foreach ($Candidate in @($env:ANDROID_SDK_ROOT, $env:ANDROID_HOME, 'C:\Android')) {
    if ($Candidate -and -not ($SdkCandidates -contains $Candidate)) { $SdkCandidates += $Candidate }
}
$SdkRoot = $null
foreach ($Candidate in $SdkCandidates) {
    if (Test-Path -LiteralPath (Join-Path $Candidate 'platforms\android-36') -PathType Container) { $SdkRoot = $Candidate; break }
}
if (-not $SdkRoot) { throw "Android SDK root with platforms\android-36 was not found. Checked: $($SdkCandidates -join ', ')" }
if (-not (Test-Path -LiteralPath (Join-Path $SdkRoot 'build-tools\35.0.0') -PathType Container)) { throw "Android Build Tools 35.0.0 missing under $SdkRoot." }
$ApkSignerCandidates = @((Join-Path $SdkRoot 'build-tools\36.0.0\apksigner.bat'),(Join-Path $SdkRoot 'build-tools\35.0.0\apksigner.bat'))
$ApkSigner = $ApkSignerCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $ApkSigner) { throw "apksigner.bat was not found under Android Build Tools in $SdkRoot" }
Set-Content -LiteralPath (Join-Path $Here 'local.properties') -Value "sdk.dir=$($SdkRoot.Replace('\','/'))" -Encoding ASCII
Write-Host "Gradle SDK root: $SdkRoot"

Write-Host '[9/14] Merge release manifest with dependency manifests...' -ForegroundColor Yellow
$GradleWrapper = Join-Path $Here 'gradlew.bat'
if (-not (Test-Path -LiteralPath $GradleWrapper -PathType Leaf)) { throw 'Generated gradlew.bat missing.' }
& $GradleWrapper ':app:processReleaseMainManifest' '--no-daemon'
if ($LASTEXITCODE -ne 0) { throw 'Release manifest merge task failed.' }

Write-Host '[10/14] Validate merged release Android permissions...' -ForegroundColor Yellow
& python .\check_generated_permissions.py
if ($LASTEXITCODE -ne 0) { throw 'Merged release permission gate failed.' }

Write-Host '[11/14] Build unsigned APK + AAB with Bubblewrap...' -ForegroundColor Yellow
Write-Host 'Signing is intentionally skipped during compilation.' -ForegroundColor DarkYellow
& bubblewrap build --skipSigning --skipPwaValidation --manifest=.\twa-manifest.json
if ($LASTEXITCODE -ne 0) { throw 'Unsigned Bubblewrap build failed.' }

$UnsignedApk = Join-Path $Here 'app-release-unsigned-aligned.apk'
$UnsignedAabCandidates = @((Join-Path $Here 'app\build\outputs\bundle\release\app-release.aab'),(Join-Path $Here 'app-release-bundle.aab'))
$UnsignedAab = $UnsignedAabCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not (Test-Path -LiteralPath $UnsignedApk -PathType Leaf)) { throw "Expected unsigned aligned APK was not produced: $UnsignedApk" }
if (-not $UnsignedAab) { throw 'Expected unsigned app bundle was not produced.' }

$SignedApk = Join-Path $Here 'app-release-signed.apk'
$SignedAab = Join-Path $Here 'app-release-bundle-signed.aab'
Remove-Item -LiteralPath $SignedApk,$SignedAab -Force -ErrorAction SilentlyContinue

Write-Host '[12/14] Sign Android App Bundle with the local upload key...' -ForegroundColor Yellow
& jarsigner -keystore $Keystore -signedjar $SignedAab $UnsignedAab $Alias
if ($LASTEXITCODE -ne 0) { throw 'AAB signing with jarsigner failed.' }
& jarsigner -verify -verbose -certs $SignedAab | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'Signed AAB verification failed.' }

Write-Host '[13/14] Sign APK with Android apksigner...' -ForegroundColor Yellow
Write-Host 'Enter the local keystore password only at the apksigner prompt.' -ForegroundColor DarkYellow
& $ApkSigner sign --ks $Keystore --ks-key-alias $Alias --out $SignedApk $UnsignedApk
if ($LASTEXITCODE -ne 0) { throw 'APK signing with apksigner failed.' }
& $ApkSigner verify --verbose --print-certs $SignedApk | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'Signed APK verification failed.' }

Write-Host '[14/14] Verify and hash final release artifacts...' -ForegroundColor Yellow
$Artifacts = @($SignedAab,$SignedApk) | ForEach-Object { if (Test-Path -LiteralPath $_ -PathType Leaf) { Get-Item -LiteralPath $_ } }
if ($Artifacts.Count -ne 2) { throw 'Final signed AAB/APK artifacts were not both found.' }
$Artifacts | Select-Object FullName,Length,LastWriteTime | Format-Table -AutoSize
Get-FileHash -Algorithm SHA256 -LiteralPath $SignedAab,$SignedApk | Format-Table -AutoSize
Write-Host 'PASS: local AAB/APK build and signing completed through all guarded release gates.' -ForegroundColor Green
Write-Host 'Native Azkar reminders: INCLUDED.' -ForegroundColor Green
Write-Host 'Authenticated prayer notifications + local Adhan: INCLUDED.' -ForegroundColor Green
Write-Host 'Authenticated home Widget: INCLUDED.' -ForegroundColor Green
Write-Host 'Legacy WidgetDataActivity: FORBIDDEN.' -ForegroundColor Green
Write-Host 'Target SDK: 36.' -ForegroundColor Green
Write-Host 'Play package identity: com.qiblalabs' -ForegroundColor Green
