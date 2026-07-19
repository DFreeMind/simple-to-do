$keyPath = Join-Path $env:USERPROFILE '.tauri\simple-to-do-updater-v3.key'
$passwordPath = Join-Path $env:USERPROFILE '.tauri\simple-to-do-updater-v3.password'

if (-not (Test-Path -LiteralPath $keyPath -PathType Leaf)) {
  throw "找不到 Tauri 更新私钥：$keyPath"
}
if (-not (Test-Path -LiteralPath $passwordPath -PathType Leaf)) {
  throw "找不到 Tauri 更新私钥密码文件：$passwordPath"
}

# 私钥和密码只注入本次 npm 子进程；不写入项目文件或用户级环境变量。
$previousPrivateKey = [Environment]::GetEnvironmentVariable('TAURI_SIGNING_PRIVATE_KEY', 'Process')
$previousPrivateKeyPassword = [Environment]::GetEnvironmentVariable('TAURI_SIGNING_PRIVATE_KEY_PASSWORD', 'Process')

try {
  $env:TAURI_SIGNING_PRIVATE_KEY = [System.IO.File]::ReadAllText($keyPath)
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = [System.IO.File]::ReadAllText($passwordPath).Trim()
  & npm run tauri:build
  exit $LASTEXITCODE
} finally {
  if ($null -eq $previousPrivateKey) {
    Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY -ErrorAction SilentlyContinue
  } else {
    $env:TAURI_SIGNING_PRIVATE_KEY = $previousPrivateKey
  }
  if ($null -eq $previousPrivateKeyPassword) {
    Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD -ErrorAction SilentlyContinue
  } else {
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $previousPrivateKeyPassword
  }
}
