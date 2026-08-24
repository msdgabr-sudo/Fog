$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$KeyDir = Join-Path $ScriptDir 'keystore'
$KeyPath = Join-Path $KeyDir 'qiblaastro-upload.jks'
$Alias = 'qiblaastro-upload'

Write-Host 'QiblaAstro ELITE - Local Upload Key Generator' -ForegroundColor Cyan
Write-Host 'Package ID: com.qiblalabs.qiblaastro'
Write-Host 'This creates the Google Play UPLOAD key, not the Play App Signing key.' -ForegroundColor Yellow
Write-Host 'The keystore and passwords must NEVER be committed to GitHub.' -ForegroundColor Yellow
Write-Host ''

if (-not (Get-Command keytool -ErrorAction SilentlyContinue)) {
    throw 'keytool was not found. Install/use a JDK (Android Studio includes one) and ensure keytool is available.'
}

if (Test-Path $KeyPath) {
    throw "Refusing to overwrite existing upload key: $KeyPath"
}

New-Item -ItemType Directory -Force -Path $KeyDir | Out-Null

Write-Host 'You will now be prompted by keytool for the keystore password.' -ForegroundColor Green
Write-Host 'Choose a strong password and store it offline. Do not paste it into GitHub or this repository.' -ForegroundColor Green
Write-Host ''

& keytool -genkeypair `
    -v `
    -keystore $KeyPath `
    -alias $Alias `
    -keyalg RSA `
    -keysize 4096 `
    -validity 10000 `
    -dname 'CN=QiblaAstro ELITE Upload Key, O=Qiblalabs'

if ($LASTEXITCODE -ne 0) {
    throw "keytool failed with exit code $LASTEXITCODE"
}

if (-not (Test-Path $KeyPath)) {
    throw 'Key generation reported success but the keystore file was not created.'
}

Write-Host ''
Write-Host 'Upload key created successfully:' -ForegroundColor Green
Write-Host $KeyPath
Write-Host ''
Write-Host 'Verifying certificate and printing SHA-256 fingerprint...' -ForegroundColor Cyan
& keytool -list -v -keystore $KeyPath -alias $Alias

if ($LASTEXITCODE -ne 0) {
    throw "keytool verification failed with exit code $LASTEXITCODE"
}

Write-Host ''
Write-Host 'IMPORTANT:' -ForegroundColor Yellow
Write-Host '1. Back up qiblaastro-upload.jks to at least two secure offline locations.'
Write-Host '2. Keep the password separately from the keystore backup.'
Write-Host '3. Do NOT use this Upload Key fingerprint as the only production Digital Asset Links fingerprint after Play App Signing is enabled.'
Write-Host '4. For Google Play-delivered builds, capture the Play App Signing certificate SHA-256 from Play Console and add that real fingerprint to assetlinks.json.'
