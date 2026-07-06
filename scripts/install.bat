@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

echo ========================================
echo   易简清单 安装程序
echo ========================================
echo.

:: 强制关闭正在运行的应用进程
echo [1/3] 正在关闭可能正在运行的易简清单...
taskkill /F /IM "simple-to-do.exe" >nul 2>&1
if %errorlevel% equ 0 (
    echo       已关闭正在运行的进程
    timeout /t 2 /nobreak >nul
) else (
    echo       未发现正在运行的进程
)

:: 查找安装包
set "INSTALLER="
if exist "%~dp0易简清单_1.0.0_x64-setup.exe" (
    set "INSTALLER=%~dp0易简清单_1.0.0_x64-setup.exe"
) else if exist "%~dp0nsis-output.exe" (
    set "INSTALLER=%~dp0nsis-output.exe"
) else (
    echo.
    echo [错误] 未找到安装包！
    echo 请将此脚本放在安装包所在目录，或确保安装包命名为：
    echo   易简清单_1.0.0_x64-setup.exe
    echo   或 nsis-output.exe
    pause
    exit /b 1
)

echo [2/3] 找到安装包: %INSTALLER%
echo.

:: 启动安装程序
echo [3/3] 正在启动安装程序...
echo.
start "" "%INSTALLER%"

echo 安装程序已启动。
echo 如果安装过程中仍然报错，请确保已完全关闭易简清单后点击"重试"。
echo.
pause
