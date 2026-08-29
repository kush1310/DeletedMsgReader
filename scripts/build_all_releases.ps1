$ErrorActionPreference = 'Continue'
$tags = @('v2.0.6', 'v2.0.5', 'v2.0.4', 'v2.0.3', 'v2.0.2', 'v2.0.1', 'v1.6.3', 'v1.6.2', 'v1.6.0', 'v1.5.0', 'v1.4.0', 'v1.3.0', 'v1.2.0', 'v1.1.0', 'v1.0.0')

New-Item -ItemType Directory -Force -Path release_binaries | Out-Null

foreach ($tag in $tags) {
    Write-Host "`n>>> Processing $tag <<<"
    git checkout $tag --force
    npx vite build
    npx cap sync android
    Set-Location android
    .\gradlew.bat assembleDebug --no-daemon
    Set-Location ..
    $dest = "release_binaries\NotiCatch-$tag.apk"
    Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" $dest -Force
    if (Test-Path $dest) {
        $size = (Get-Item $dest).Length
        Write-Host "SUCCESS: Created $dest ($size bytes)"
    } else {
        Write-Host "ERROR: Could not find output APK for $tag"
    }
}

git checkout main --force
Write-Host "`n>>> Restored working tree to main <<<"
