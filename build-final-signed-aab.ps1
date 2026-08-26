param(
    [Parameter(Mandatory = $true)]
    [string]$KeystorePath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceRoot = Join-Path $Root 'source'
$AndroidRoot = Join-Path $SourceRoot 'android-twa'
$FrozenShaFile = Join-Path $SourceRoot '.release-source-sha'
$ExpectedSourceSha = '6e49775df5742413371a4165ea985173c43f5f5e'
$ExpectedAlias = 'qiblaastro'
$ExpectedUploadSha256 = 'E8:6F:83:F1:61:0B:6F:AA:4F:57:62:4F:44:B1:B8:74:83:49:DB:84:69:EB:3C:CE:06:A4:BA:05:5B:CB:EC:A7'
$Manifest = Join-Path $AndroidRoot 'twa-manifest.json'

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Test-Jdk17Home([string]$JdkHome) {
    if (-not $JdkHome) { return $false }
    $JavaExe = Join-Path $JdkHome 'bin\java.exe'
    if (-not (Test-Path -LiteralPath $JavaExe -PathType Leaf)) { return $false }
    $SavedPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $VersionText = (& $JavaExe -version 2>&1 | Out-String)
        $ExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $SavedPreference
    }
    if ($ExitCode -ne 0) { return $false }
    return ($VersionText -match 'version\s+"17(?:\.|\")')
}

function Resolve-Jdk17Home {
    $Candidates = New-Object System.Collections.Generic.List[string]
    if ($env:JAVA_HOME) { $Candidates.Add($env:JAVA_HOME) }

    $AdoptiumRoot = 'C:\Program Files\Eclipse Adoptium'
    if (Test-Path -LiteralPath $AdoptiumRoot -PathType Container) {
        Get-ChildItem -LiteralPath $AdoptiumRoot -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { $Candidates.Add($_.FullName) }
    }

    $JavaRoot = 'C:\Program Files\Java'
    if (Test-Path -LiteralPath $JavaRoot -PathType Container) {
        Get-ChildItem -LiteralPath $JavaRoot -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { $Candidates.Add($_.FullName) }
    }

    $PathJava = Get-Command java -ErrorAction SilentlyContinue
    if ($PathJava -and $PathJava.Source) {
        $BinDir = Split-Path -Parent $PathJava.Source
        $HomeFromPath = Split-Path -Parent $BinDir
        if ($HomeFromPath) { $Candidates.Add($HomeFromPath) }
    }

    foreach ($Candidate in ($Candidates | Select-Object -Unique)) {
        if (Test-Jdk17Home $Candidate) { return (Resolve-Path -LiteralPath $Candidate).Path }
    }
    throw 'A compatible JDK 17 installation was not found. Gradle 8.11.1 must not run on JDK 25.'
}

if (-not (Test-Path -LiteralPath $FrozenShaFile -PathType Leaf)) {
    throw 'Frozen source marker is missing. Clone/checkout release/aab-3.1.0 completely before signing.'
}
$ActualSourceSha = (Get-Content -LiteralPath $FrozenShaFile -Raw).Trim()
if ($ActualSourceSha -ne $ExpectedSourceSha) {
    throw "Frozen source mismatch. Expected $ExpectedSourceSha but found $ActualSourceSha"
}
if (-not (Test-Path -LiteralPath $KeystorePath -PathType Leaf)) {
    throw "Upload keystore not found: $KeystorePath"
}
$ResolvedKeystore = (Resolve-Path -LiteralPath $KeystorePath).Path
if ($ResolvedKeystore.StartsWith($SourceRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Security boundary violation: the upload keystore must remain outside the frozen source workspace.'
}

foreach ($Command in @('python','node','bubblewrap','keytool','jarsigner')) {
    Require-Command $Command
}

# Pin this child PowerShell build process to JDK 17. This does not modify the user's
# machine-wide Java configuration and disappears when this PowerShell process exits.
$BuildJdk = Resolve-Jdk17Home
$env:JAVA_HOME = $BuildJdk
$env:Path = (Join-Path $BuildJdk 'bin') + ';' + $env:Path

Write-Host 'QiblaAstro ELITE 3.1.0 - final local signed AAB build' -ForegroundColor Cyan
Write-Host "Frozen source: $ExpectedSourceSha"
Write-Host 'Package: com.qiblalabs'
Write-Host 'Version: 3.1.0 (code 3)'
Write-Host 'Target SDK: 36'
Write-Host "Build JDK: $BuildJdk" -ForegroundColor Green
Write-Host "Expected upload key SHA-256: $ExpectedUploadSha256"
Write-Host "Expected alias: $ExpectedAlias"
Write-Host 'The upload keystore stays outside the frozen source workspace for the entire build.' -ForegroundColor Green
Write-Host ''
Write-Host 'Enter the keystore password only into local keytool/jarsigner/apksigner prompts.' -ForegroundColor Yellow
Write-Host 'Never commit the keystore or password to GitHub.' -ForegroundColor Yellow

Write-Host '[1/15] Verify external upload key identity...' -ForegroundColor Yellow
$SavedErrorActionPreference = $ErrorActionPreference
try {
    # Keep stderr attached to the console so keytool's interactive password prompt is visible.
    # Capture stdout only for certificate parsing, while temporarily allowing native stderr.
    $ErrorActionPreference = 'Continue'
    $KeyInfo = (& keytool -list -v -keystore $ResolvedKeystore -alias $ExpectedAlias | Out-String)
    $KeytoolExitCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $SavedErrorActionPreference
}
if ($KeytoolExitCode -ne 0) { throw 'Upload key verification failed.' }
$KeyInfo | Out-Host
$FingerprintMatch = [regex]::Match($KeyInfo, 'SHA256:\s*([0-9A-Fa-f:]+)')
if (-not $FingerprintMatch.Success) { throw 'Could not read SHA-256 fingerprint from the upload keystore.' }
$ActualUploadSha256 = $FingerprintMatch.Groups[1].Value.ToUpperInvariant()
if ($ActualUploadSha256 -ne $ExpectedUploadSha256) {
    throw "Upload key fingerprint mismatch. Expected $ExpectedUploadSha256 but found $ActualUploadSha256"
}
Write-Host 'PASS: local upload key matches Google Play Upload key certificate.' -ForegroundColor Green

Write-Host '[2/15] Validate frozen source before any Android generation...' -ForegroundColor Yellow
Push-Location $SourceRoot
try {
    & python .\tools\pre_apk_check.py
    if ($LASTEXITCODE -ne 0) { throw 'Pre-APK source gate failed.' }
    & python .\android-twa\check_twa_config.py
    if ($LASTEXITCODE -ne 0) { throw 'TWA configuration gate failed.' }
    & node .\tests\native-android-localization-security.test.js
    if ($LASTEXITCODE -ne 0) { throw 'Native localization/security source gate failed.' }
} finally {
    Pop-Location
}

Write-Host '[3/15] Regenerate Android project from frozen Bubblewrap config...' -ForegroundColor Yellow
Push-Location $AndroidRoot
try {
    & bubblewrap update --skipVersionUpgrade --manifest=.\twa-manifest.json
    if ($LASTEXITCODE -ne 0) { throw 'Bubblewrap project generation failed.' }
} finally {
    Pop-Location
}
$GeneratedManifest = Join-Path $AndroidRoot 'app\src\main\AndroidManifest.xml'
if (-not (Test-Path -LiteralPath $GeneratedManifest -PathType Leaf)) { throw 'Generated AndroidManifest.xml missing.' }

Write-Host '[4/15] Enforce Android 16 / API 36...' -ForegroundColor Yellow
& python (Join-Path $AndroidRoot 'ensure_target_api_36.py')
if ($LASTEXITCODE -ne 0) { throw 'API 36 enforcement failed.' }

Write-Host '[5/15] Apply all reviewed native integrations with the cross-platform injector...' -ForegroundColor Yellow
& python (Join-Path $AndroidRoot 'apply_native_integrations.py') --all
if ($LASTEXITCODE -ne 0) { throw 'Native Azkar/prayer/Adhan/widget injection failed.' }

Write-Host '[6/15] Re-run generated native feature gates...' -ForegroundColor Yellow
& python (Join-Path $AndroidRoot 'check_native_azkar_bridge.py')
if ($LASTEXITCODE -ne 0) { throw 'Native Azkar reminder gate failed.' }
& python (Join-Path $AndroidRoot 'check_native_widget.py')
if ($LASTEXITCODE -ne 0) { throw 'Native prayer/Adhan/widget gate failed.' }

Write-Host '[7/15] Verify generated native bridge and release integration...' -ForegroundColor Yellow
& python (Join-Path $AndroidRoot 'check_release_integration.py')
if ($LASTEXITCODE -ne 0) { throw 'Post-injection release integration gate failed.' }
Push-Location $SourceRoot
try {
    & node .\tests\native-android-localization-security.test.js
    if ($LASTEXITCODE -ne 0) { throw 'Post-injection native localization/security gate failed.' }
} finally {
    Pop-Location
}
$GeneratedManifestText = Get-Content -LiteralPath $GeneratedManifest -Raw
foreach ($RequiredComponent in @('QiblaLauncherActivity','PrayerWidgetSyncActivity','QiblaWidgetProvider')) {
    if (-not $GeneratedManifestText.Contains($RequiredComponent)) { throw "Generated native component missing: $RequiredComponent" }
}
if ($GeneratedManifestText.Contains('WidgetDataActivity')) { throw 'Legacy WidgetDataActivity must remain absent.' }

Write-Host '[8/15] Bind Gradle to Android SDK 36 and JDK 17...' -ForegroundColor Yellow
$SdkCandidates = @()
foreach ($Candidate in @($env:ANDROID_SDK_ROOT, $env:ANDROID_HOME, 'C:\Android')) {
    if ($Candidate -and -not ($SdkCandidates -contains $Candidate)) { $SdkCandidates += $Candidate }
}
$SdkRoot = $null
foreach ($Candidate in $SdkCandidates) {
    if (Test-Path -LiteralPath (Join-Path $Candidate 'platforms\android-36') -PathType Container) {
        $SdkRoot = $Candidate
        break
    }
}
if (-not $SdkRoot) { throw "Android SDK root with platforms\android-36 was not found. Checked: $($SdkCandidates -join ', ')" }
if (-not (Test-Path -LiteralPath (Join-Path $SdkRoot 'build-tools\35.0.0') -PathType Container)) {
    throw "Android Build Tools 35.0.0 missing under $SdkRoot."
}
$ApkSignerCandidates = @(
    (Join-Path $SdkRoot 'build-tools\36.0.0\apksigner.bat'),
    (Join-Path $SdkRoot 'build-tools\35.0.0\apksigner.bat')
)
$ApkSigner = $ApkSignerCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $ApkSigner) { throw "apksigner.bat was not found under Android Build Tools in $SdkRoot" }
Set-Content -LiteralPath (Join-Path $AndroidRoot 'local.properties') -Value "sdk.dir=$($SdkRoot.Replace('\','/'))" -Encoding ASCII
Write-Host "Gradle SDK root: $SdkRoot"
Write-Host "Gradle JAVA_HOME: $env:JAVA_HOME"

Write-Host '[9/15] Merge release manifest...' -ForegroundColor Yellow
$GradleWrapper = Join-Path $AndroidRoot 'gradlew.bat'
if (-not (Test-Path -LiteralPath $GradleWrapper -PathType Leaf)) { throw 'Generated gradlew.bat missing.' }
Push-Location $AndroidRoot
try {
    # Stop any daemon previously launched under another JDK (for example JDK 25), then
    # print the JVM Gradle will actually use before running the release task.
    & $GradleWrapper '--stop' | Out-Host
    & $GradleWrapper '--version' '--no-daemon' | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Gradle JVM verification failed.' }
    & $GradleWrapper ':app:processReleaseMainManifest' '--no-daemon'
    if ($LASTEXITCODE -ne 0) { throw 'Release manifest merge task failed.' }
} finally {
    Pop-Location
}

Write-Host '[10/15] Validate merged release permissions...' -ForegroundColor Yellow
& python (Join-Path $AndroidRoot 'check_generated_permissions.py')
if ($LASTEXITCODE -ne 0) { throw 'Merged release permission gate failed.' }

Write-Host '[11/15] Build unsigned APK + AAB...' -ForegroundColor Yellow
Push-Location $AndroidRoot
try {
    & bubblewrap build --skipSigning --skipPwaValidation --manifest=.\twa-manifest.json
    if ($LASTEXITCODE -ne 0) { throw 'Unsigned Bubblewrap build failed.' }
} finally {
    Pop-Location
}

$UnsignedApk = Join-Path $AndroidRoot 'app-release-unsigned-aligned.apk'
$UnsignedAabCandidates = @(
    (Join-Path $AndroidRoot 'app\build\outputs\bundle\release\app-release.aab'),
    (Join-Path $AndroidRoot 'app-release-bundle.aab')
)
$UnsignedAab = $UnsignedAabCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not (Test-Path -LiteralPath $UnsignedApk -PathType Leaf)) { throw "Expected unsigned aligned APK was not produced: $UnsignedApk" }
if (-not $UnsignedAab) { throw 'Expected unsigned AAB was not produced.' }

$SignedAab = Join-Path $AndroidRoot 'app-release-bundle-signed.aab'
$SignedApk = Join-Path $AndroidRoot 'app-release-signed.apk'
Remove-Item -LiteralPath $SignedAab,$SignedApk -Force -ErrorAction SilentlyContinue

Write-Host '[12/15] Sign AAB with external upload key...' -ForegroundColor Yellow
& jarsigner -keystore $ResolvedKeystore -signedjar $SignedAab $UnsignedAab $ExpectedAlias
if ($LASTEXITCODE -ne 0) { throw 'AAB signing with jarsigner failed.' }

Write-Host '[13/15] Verify signed AAB...' -ForegroundColor Yellow
& jarsigner -verify -verbose -certs $SignedAab | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'Signed AAB verification failed.' }

Write-Host '[14/15] Sign and verify APK with external upload key...' -ForegroundColor Yellow
& $ApkSigner sign --ks $ResolvedKeystore --ks-key-alias $ExpectedAlias --out $SignedApk $UnsignedApk
if ($LASTEXITCODE -ne 0) { throw 'APK signing with apksigner failed.' }
& $ApkSigner verify --verbose --print-certs $SignedApk | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'Signed APK verification failed.' }

Write-Host '[15/15] Stage and hash final release artifacts...' -ForegroundColor Yellow
if (-not (Test-Path -LiteralPath $SignedAab -PathType Leaf)) { throw 'Final signed AAB was not produced.' }
if (-not (Test-Path -LiteralPath $SignedApk -PathType Leaf)) { throw 'Final signed APK was not produced.' }
$Dist = Join-Path $Root 'dist'
New-Item -ItemType Directory -Force -Path $Dist | Out-Null
$FinalAab = Join-Path $Dist 'QiblaAstro-3.1.0-code3-final.aab'
$FinalApk = Join-Path $Dist 'QiblaAstro-3.1.0-code3-final.apk'
Copy-Item -LiteralPath $SignedAab -Destination $FinalAab -Force
Copy-Item -LiteralPath $SignedApk -Destination $FinalApk -Force
$Hashes = Get-FileHash -Algorithm SHA256 -LiteralPath $FinalAab,$FinalApk
$HashFile = Join-Path $Dist 'SHA256SUMS.txt'
$Hashes | ForEach-Object { "{0}  {1}" -f $_.Hash, (Split-Path -Leaf $_.Path) } | Set-Content -LiteralPath $HashFile -Encoding ASCII

Write-Host ''
Write-Host 'PASS: final signed AAB/APK produced from the frozen release snapshot.' -ForegroundColor Green
Write-Host 'Upload key remained outside the frozen source workspace.' -ForegroundColor Green
$Hashes | Format-Table -AutoSize
Write-Host "Artifacts: $Dist" -ForegroundColor Green
