# Electron 迁移 Tauri 方案

## 当前 Electron 能力
- `electron/main.js` 创建窗口。
- `electron/preload.js` 暴露 `window.electronAPI`。
- IPC 能力包括窗口控制、加载数据、保存数据、选择图片、读取图片。

## Tauri 替换方案
- 窗口创建由 `src-tauri/tauri.conf.json` 配置。
- 数据读写由 Rust command `load_data`、`save_data` 提供。
- 图片选择由 Tauri dialog 插件或 Rust command 提供。
- 图片读取由 Rust command `read_image` 提供。
- 前端通过 `src/services/platform.js` 调用平台 API。

## 迁移步骤
- 新增 `src-tauri/` 和 Rust 入口。
- 替换 npm 脚本：`tauri dev`、`tauri build`。
- 新增前端平台封装。
- 修改 store 和详情组件，移除 `window.electronAPI` 直接调用。
- 确认数据目录和旧 JSON 兼容。

## 清理策略
- Tauri 跑通后删除 Electron 依赖。
- Electron 目录可在迁移提交中删除，避免后续误用。
