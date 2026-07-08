# patch-nsis-lang.ps1
# 构建后补丁：将 override_strings.nsh 中的文案覆盖追加到 Tauri 自动生成的 SimpChinese.nsh
# 用法：npm run build 执行完毕后运行此脚本，然后重新打包 NSIS 安装器
#
# 由于 Tauri 2 每次构建都会重新生成 NSIS 脚本，此脚本需要在 tauri build 之后、NSIS 编译之前运行。
# 实际流程：npm run build → 运行此脚本 → 用 makensis 重新编译安装器

$nsisDir = "src-tauri\target\release\nsis\x64"
$langFile = "$nsisDir\SimpChinese.nsh"
$overrideFile = "src-tauri\nsis\override_strings.nsh"

if (-not (Test-Path $langFile)) {
    Write-Host "[错误] 未找到 $langFile" -ForegroundColor Red
    Write-Host "请先运行 npm run build 生成 NSIS 构建文件" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $overrideFile)) {
    Write-Host "[错误] 未找到 $overrideFile" -ForegroundColor Red
    exit 1
}

# 检查是否已经打过补丁
if (Select-String -Path $langFile -Pattern "install / reinstall" -Quiet) {
    Write-Host "[跳过] SimpChinese.nsh 已包含补丁文案，无需重复操作" -ForegroundColor Cyan
    exit 0
}

# 追加覆盖文案
Write-Host "[补丁] 正在追加文案覆盖到 $langFile ..." -ForegroundColor Green
Add-Content -Path $langFile -Value ""
Add-Content -Path $langFile -Value "; === 以下由 patch-nsis-lang.ps1 自动追加，覆盖不准确的默认翻译 ==="
Get-Content $overrideFile | Add-Content -Path $langFile

Write-Host "[完成] 文案补丁已应用。" -ForegroundColor Green
Write-Host "       如果需要重新编译安装器，请使用 makensis 重新构建。" -ForegroundColor Yellow
