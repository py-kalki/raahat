$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$project = Join-Path $repoRoot 'apps/web-apk'
$signingFile = Join-Path $project 'signing.properties'
$keyFile = Join-Path $project 'raahat-release.jks'
$javaBin = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin' } else { Split-Path (Get-Command java).Source }

if (-not (Test-Path $signingFile)) {
    if (Test-Path $keyFile) { throw 'Signing key exists without signing.properties. Restore its password; do not replace the key.' }
    $randomBytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($randomBytes)
    $rng.Dispose()
    $env:RAAHAT_SIGNING_PASSWORD = [Convert]::ToBase64String($randomBytes)
    try {
        & (Join-Path $javaBin 'keytool.exe') -genkeypair -keystore $keyFile -storetype JKS -alias raahat -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Raahat Demo' -storepass:env RAAHAT_SIGNING_PASSWORD -keypass:env RAAHAT_SIGNING_PASSWORD
        if ($LASTEXITCODE -ne 0) { throw 'Signing key generation failed.' }
        $settings = "storeFile=raahat-release.jks`nstorePassword=$env:RAAHAT_SIGNING_PASSWORD`nkeyAlias=raahat`nkeyPassword=$env:RAAHAT_SIGNING_PASSWORD`n"
        [IO.File]::WriteAllText($signingFile, $settings)
    } finally { Remove-Item Env:RAAHAT_SIGNING_PASSWORD -ErrorAction SilentlyContinue }
}

$signing = ConvertFrom-StringData (Get-Content $signingFile -Raw)
$env:RAAHAT_SIGNING_PASSWORD = $signing.storePassword
try {
    $cert = & (Join-Path $javaBin 'keytool.exe') -list -v -keystore $keyFile -alias raahat -storepass:env RAAHAT_SIGNING_PASSWORD
    if ($LASTEXITCODE -ne 0) { throw 'Could not read signing certificate.' }
    $fingerprint = [regex]::Match(($cert -join "`n"), 'SHA256:\s*([A-Fa-f0-9:]+)').Groups[1].Value
    if (-not $fingerprint) { throw 'Signing certificate fingerprint missing.' }
} finally { Remove-Item Env:RAAHAT_SIGNING_PASSWORD -ErrorAction SilentlyContinue }

$assetDir = Join-Path $repoRoot 'apps/mobile/public/.well-known'
New-Item -ItemType Directory -Force $assetDir | Out-Null
$assetLinks = @(@{
    relation = @('delegate_permission/common.handle_all_urls')
    target = @{ namespace = 'android_app'; package_name = 'com.raahat.web'; sha256_cert_fingerprints = @($fingerprint) }
})
[IO.File]::WriteAllText((Join-Path $assetDir 'assetlinks.json'), (ConvertTo-Json -InputObject $assetLinks -Depth 5))

Push-Location $project
try {
    & ./gradlew.bat :app:testReleaseUnitTest :app:assembleRelease :app:lintRelease --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'APK build or Android lint failed.' }
} finally { Pop-Location }

$outputDir = Join-Path $repoRoot 'dist'
New-Item -ItemType Directory -Force $outputDir | Out-Null
$output = Join-Path $outputDir 'raahat-web-release.apk'
Copy-Item (Join-Path $project 'app/build/outputs/apk/release/app-release.apk') $output -Force
$sdk = $env:ANDROID_HOME
if (-not $sdk -and (Test-Path (Join-Path $project 'local.properties'))) {
    $sdkLine = Get-Content (Join-Path $project 'local.properties') | Where-Object { $_ -match '^sdk.dir=' } | Select-Object -First 1
    if ($sdkLine) { $sdk = $sdkLine.Substring(8).Replace('\:', ':').Replace('\\', '\') }
}
if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
$signer = Get-ChildItem (Join-Path $sdk 'build-tools/*/apksigner.bat') | Sort-Object FullName -Descending | Select-Object -First 1
if (-not $signer) { throw 'Android apksigner not found; cannot verify APK.' }
$signatureCheck = & $signer.FullName verify --verbose --print-certs $output
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
$apkFingerprint = [regex]::Match(($signatureCheck -join "`n"), 'certificate SHA-256 digest:\s*([a-fA-F0-9]+)').Groups[1].Value
if ($apkFingerprint -ne $fingerprint.Replace(':', '')) { throw 'APK signing certificate does not match website association.' }
Write-Host 'APK signature verified and matches the website association.'
Write-Host "APK: $output"
Write-Host 'Keep apps/web-apk/raahat-release.jks and signing.properties backed up privately for updates.'
Write-Host 'Deploy public/.well-known/assetlinks.json before testing fullscreen launch.'
