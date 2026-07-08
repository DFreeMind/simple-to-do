; 覆盖 Tauri NSIS 模板中不准确的简体中文翻译
; 使用方式：在构建后用脚本将此文件内容追加到 SimpChinese.nsh 之后
; 或手动将需要覆盖的 LangString 复制到 SimpChinese.nsh 末尾

; --- 安装模式选择页面 ---
LangString addOrReinstall ${LANG_SIMPCHINESE} "安装 / 重新安装"
LangString choowHowToInstall ${LANG_SIMPCHINESE} "选择操作以继续。"

; --- 版本共存/降级页面 ---
LangString dontUninstall ${LANG_SIMPCHINESE} "保留当前版本"
LangString dontUninstallDowngrade ${LANG_SIMPCHINESE} "保留当前版本（不支持降级安装）"
LangString uninstallBeforeInstalling ${LANG_SIMPCHINESE} "先卸载旧版本再安装"
