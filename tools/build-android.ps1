$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$mobileRoot = Join-Path $repoRoot 'apps/mobile'
$previousNodeEnv = $env:NODE_ENV

Push-Location $mobileRoot
try {
    $env:NODE_ENV = 'production'
    # Use Expo's own environment precedence, from the mobile project directory.
    $apiUrl = 'const cli=require.resolve("@expo/cli",{paths:[require.resolve("expo/package.json")]}); const env=require(require.resolve("@expo/env",{paths:[cli]})); env.load(process.cwd()); console.log("API_URL="+(process.env.EXPO_PUBLIC_API_URL||""));' | & node -
    if ($LASTEXITCODE -ne 0) { throw 'Could not load the mobile Expo environment. Run pnpm install first.' }
    $apiUrl = ($apiUrl | Where-Object { $_ -like 'API_URL=*' } | Select-Object -Last 1).Substring(8)
    $parsedUrl = $null
    if (-not [Uri]::TryCreate($apiUrl, [UriKind]::Absolute, [ref]$parsedUrl) -or
        $parsedUrl.Scheme -ne 'https' -or $parsedUrl.IsLoopback) {
        throw 'Set EXPO_PUBLIC_API_URL in apps/mobile/.env.local to your reachable HTTPS backend before building a standalone APK.'
    }
    Write-Host "Building standalone release for API: $apiUrl"

    & pnpm --filter '@raahat/shared' build
    if ($LASTEXITCODE -ne 0) { throw 'Shared package build failed.' }

    if (-not (Test-Path -LiteralPath 'android/gradlew.bat')) {
        & pnpm exec expo prebuild --platform android --no-install
        if ($LASTEXITCODE -ne 0) { throw 'Android prebuild failed.' }
    }

    Push-Location 'android'
    try {
        & ./gradlew.bat :app:assembleRelease --console=plain --init-script (Join-Path $PSScriptRoot 'android-release.init.gradle')
        if ($LASTEXITCODE -ne 0) { throw 'Android release build failed.' }
    } finally { Pop-Location }

    $apk = Join-Path $mobileRoot 'android/app/build/outputs/apk/release/app-release.apk'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($apk)
    try {
        $bundle = $archive.GetEntry('assets/index.android.bundle')
        if ($null -eq $bundle -or $bundle.Length -eq 0) {
            throw 'APK has no embedded JavaScript bundle; refusing to distribute it.'
        }
    } finally { $archive.Dispose() }

    $outputDir = Join-Path $repoRoot 'dist'
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
    $output = Join-Path $outputDir 'raahat-release.apk'
    Copy-Item -LiteralPath $apk -Destination $output -Force
    Write-Host "Standalone APK: $output"
    Write-Host 'This local build uses the native project signing configuration (debug key by default, for device testing).'
} finally {
    $env:NODE_ENV = $previousNodeEnv
    Pop-Location
}
