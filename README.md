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

### 安装器文案定制

Tauri 2 每次构建会自动生成 NSIS 语言文件（`SimpChinese.nsh`），部分默认中文翻译不够准确。可通过以下步骤应用文案补丁：

```powershell
npm run build
powershell -File scripts/patch-nsis-lang.ps1
```

补丁文件为 `src-tauri/nsis/override_strings.nsh`，修改后重新运行补丁脚本即可。详见脚本内注释。

### 构建产物说明

构建完成后，`src-tauri/target/release/` 下会生成大量文件，**只有安装包需要分发**：

| 路径 | 说明 | 是否分发 |
|------|------|---------|
| `bundle/nsis/易简清单_0.1.1_x64-setup.exe` | NSIS 安装包（用户运行此文件） | ✅ 是 |
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

- 清单管理：新增、重命名、删除；清单分组拖拽排序；清单置顶；清单颜色。
- 任务管理：新增、编辑、完成、置顶、复制、移动到其他清单、标记重要/今日、删除、恢复、永久删除、批量清理已完成。
- 快捷视图：今日、计划（按日期分组）、重要、收集箱、已完成、垃圾桶、搜索。
- 任务属性：截止日期（含时间）、提醒、重复规则（每日/每周/每月/每年）、优先级（无/低/中/高）、标签、子任务（含拖拽排序和进度环）、图片附件（含灯箱预览）。
- 富文本备注：使用 Tiptap，支持标题、列表、待办块、引用、分割线、粘贴/拖入图片。
- 快速添加解析：输入时实时识别日期、时间、重复规则、优先级和 `#标签`，以芯片形式预览。
- 排序：智能排序、按日期/优先级/创建时间/名称排序，支持自定义拖拽顺序。
- 拖拽排序：基于鼠标事件的自定义实现，适用于 Tauri/WebView，支持任务、清单、分组、子任务拖拽。
- 三栏布局：左侧导航、中央任务列表、右侧详情面板；左栏可折叠为 56px 图标栏（Rail），右栏可折叠/展开并支持拖拽调整宽度。
- 操作音效：基于 Web Audio API 合成，每类操作有独特音色（sine 明亮 / triangle 柔和），覆盖任务完成/添加/删除/恢复、清单置顶/重命名、分组操作、拖拽、数据保存等，无外部音频文件。
- 系统托盘：关闭窗口最小化到托盘，托盘左键点击恢复窗口，右键菜单可显示或退出。
- 本地持久化：SQLite 主存储，图片附件按 `attachments/images/YYYY/MM/{sha256}.{ext}` 分层存储，附件自动清理。
- 任务分组：清单支持分组视图（`viewMode="group"`），可创建任务分组（TaskGroup），分组支持图标、颜色、折叠；任务可归属分组，列表模式与分组模式可切换。

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

当前主要来自 Tiptap 富文本依赖，`RichTextEditor` 已通过 `defineAsyncComponent` 懒加载，不影响首屏加载速度。
