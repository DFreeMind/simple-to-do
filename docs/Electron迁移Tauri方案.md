# Electron 迁移 Tauri 方案（历史记录）

> 状态：**已完成**。本文件用于说明历史决策，不是当前开发入口。

项目已从 Electron 迁移至 Tauri 2：窗口由 `src-tauri/tauri.conf.json` 配置，原生能力由 Rust command 和 Tauri 插件提供，数据保存为应用数据目录下的 SQLite，前端仅通过 `src/services/platform.js` 访问平台能力。

当前不再维护 Electron 运行时、`window.electronAPI` 或 Electron 打包链路。后续开发应阅读：[技术架构](技术架构.md)、[数据模型](数据模型.md)、[数据库设计](数据库设计.md) 和 [开发规范](../AGENTS.md)。
