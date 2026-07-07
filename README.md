# 易简清单

一个基于 `Tauri 2 + Vue 3 + Pinia + Vite + SCSS` 的跨平台桌面待办应用。产品方向参考滴答清单的核心任务体验，当前阶段聚焦本地个人任务管理，把本地清单做到稳定可日用。

## 技术栈

- 桌面运行时：Tauri 2
- 原生能力：Rust command
- 前端：Vue 3、Pinia、Vite、SCSS
- 富文本：Tiptap
- 本地存储：应用数据目录下的 SQLite 数据库 `simpletodo.db`

## 环境要求

- Node.js 20+
- npm 10+
- Rust stable MSVC toolchain
- Windows 需要 WebView2 和 Visual Studio Build Tools/MSVC

本机已安装并验证：

```powershell
rustc 1.96.1
cargo 1.96.1
rustup 1.29.0
```

如果新终端无法识别 `rustc` 或 `cargo`，重新打开终端，或确认用户 PATH 包含：

```text
C:\Users\qiulu\.cargo\bin
```

## 安装依赖

```powershell
npm install
```

项目已在 `.cargo/config.toml` 配置 Cargo 使用镜像源下载 Rust crates。如果网络环境能稳定访问 crates.io，也可以删除该文件恢复默认源。

## 开发运行

启动 Tauri 桌面应用：

```powershell
npm run dev
```

`npm run dev` 会自动启动内部 Vite 服务，并打开桌面窗口。项目不再把浏览器页面作为产品运行入口；`frontend:dev` 只供 Tauri 开发流程内部使用。

## 构建

构建 Tauri 桌面应用和安装包：

```powershell
npm run build
```

### 构建产物说明

构建完成后，`src-tauri/target/release/` 下会生成大量文件，**只有安装包需要分发**：

| 路径 | 说明 | 是否分发 |
|------|------|---------|
| `bundle/nsis/易简清单_1.0.0_x64-setup.exe` | NSIS 安装包（用户运行此文件） | ✅ 是 |
| `simple-to-do.exe` | 主程序（已打包进安装包） | ❌ 否 |
| `build/*/build_script_build-*.exe` | Rust 编译中间产物 | ❌ 否 |
| `deps/simple_to_do.exe` | 编译依赖产物 | ❌ 否 |

整个 `target/` 目录已被 `.gitignore` 排除，不会进入版本控制。

### Windows 安装注意事项

安装器在写入 `exe` 文件时，如果应用正在运行，Windows 会锁定该文件导致安装失败（报 "Error opening file for writing"）。

- **全新安装**：用户电脑上没有此应用，不会遇到此问题
- **升级安装**：安装器会自动检测并提示关闭正在运行的应用
- **开发者测试**：运行安装包前需先关闭 dev 模式（`Ctrl+C` 停止 `npm run dev`）

### 自定义安装器 UI

安装器支持自定义头部和侧边栏图片，规格要求：

- 头部图片：`src-tauri/nsis/header.bmp`，493×312 像素，24 位 BMP
- 侧边栏图片：`src-tauri/nsis/sidebar.bmp`，164×314 像素，24 位 BMP

在 `tauri.conf.json` 的 `bundle.windows.nsis` 中配置：

```json
{
  "headerImage": "nsis/header.bmp",
  "sidebarImage": "nsis/sidebar.bmp"
}
```

## 验证命令

完整桌面构建：

```powershell
npm run build
```

检查 Tauri 环境：

```powershell
npm run tauri -- info
```

检查 Rust 工具链：

```powershell
rustc --version
cargo --version
rustup show
```

检查 Rust 代码编译：

```powershell
cd src-tauri
cargo check
```

仅检查内嵌前端构建：

```powershell
npm run frontend:build
```

## 当前功能

- 清单管理：新增、重命名、删除。
- 任务管理：新增、编辑、完成、置顶、复制、移动、删除、恢复、永久删除。
- 快捷视图：今天、最近 7 天、收集箱、已完成、垃圾桶、搜索。
- 任务属性：截止日期、提醒字段预留、优先级、标签、子任务、评论、附件。
- 详情面板：富文本详情模式和检查事项模式。
- 本地持久化：通过 Tauri/Rust command 写入应用数据目录。

## 当前取舍

- 只做本地个人任务管理，不展示账号、云同步、协作、完整日历、习惯、番茄和四象限入口。
- 未实现能力不会作为可点击入口出现，避免误导用户。
- 当前开发阶段主存储为 SQLite，不迁移旧 JSON 数据；前端 normalize 仍会为缺失字段补默认值。

## 项目文档

- [AI 开发规范](AGENTS.md)
- [产品调研](docs/产品调研.md)
- [产品需求文档](docs/产品需求文档.md)
- [功能路线图](docs/功能路线图.md)
- [界面设计规范](docs/界面设计规范.md)
- [技术架构](docs/技术架构.md)
- [数据模型](docs/数据模型.md)
- [Electron 迁移 Tauri 方案](docs/Electron迁移Tauri方案.md)

## 开发约定

- 不继续扩展 Electron，原生能力统一走 Tauri/Rust。
- 不维护独立 Web 版本；GUI 是唯一产品形态，Vite 仅作为 Tauri 内嵌前端工具链。
- 前端不要直接访问 Tauri 全局对象，统一通过 `src/services/platform.js` 调用。
- 每完成一个稳定功能并验证通过后提交一次，commit 使用中文。
- 新增数据字段必须同步更新 SQLite 表设计、读写逻辑和前端 normalize 默认值。

## 常见问题

### `cargo` 或 `rustc` 找不到

确认 Rust 已安装，并确认用户 PATH 包含 `.cargo\bin`。如果刚安装完，关闭并重新打开终端。

### `npm uninstall` 因 Electron 文件占用失败

这是历史 `node_modules` 残留导致的本地文件锁问题。源码和 lockfile 已经移除 Electron 依赖；如需彻底清理本地依赖目录，可关闭相关进程后删除 `node_modules/` 并重新运行 `npm install`。

### Vite 提示 chunk 大于 500KB

当前主要来自 Tiptap 富文本依赖，暂不影响功能。后续可以把富文本编辑器改为懒加载来降低首包体积。
