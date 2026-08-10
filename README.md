# 易简清单 · Simple To Do

> 本地优先的跨平台桌面待办应用。把复杂事情拆清楚，在变化中持续推进，直到做成。

[![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)](https://v2.tauri.app/)
[![Vue](https://img.shields.io/badge/Vue-3-42B883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Local%20first-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)

**易简清单**（Simple To Do）是一款面向 Windows 与 macOS 的个人任务管理软件。它不是把任务越堆越多的“功能集合”，而是帮助你把一件复杂事项拆成明确的下一步：收集、安排、完成、复盘，再继续推进。

[下载最新版本](https://github.com/DFreeMind/simple-to-do/releases/latest) · [查看功能](#核心功能) · [开发文档](#开发)

![易简清单今日视图：今日任务、清单侧栏与快速添加输入框](public/screenshots/today-view.webp)

## 为什么是易简清单

- **本地优先**：任务、设置和附件默认只保存在本机 SQLite 数据库，不要求账号，也不依赖云端。
- **复杂事项可拆可追**：子任务、任务分组、日期、提醒、优先级、标签和富文本备注围绕“下一步是什么”组织。
- **真正的桌面体验**：基于 Tauri 2，提供 Windows 与 macOS 原生窗口、通知、托盘 / Dock 恢复和本地文件选择。
- **克制但完整**：不加入账号、云同步、多人协作、习惯或完整日历等当前不服务于个人任务闭环的功能；专注与节律模块围绕"开始专注"和"日常提示"展开，不扩张为习惯追踪或健康诊断。

## 核心功能

| 让事情落地 | 让进度可见 | 让信息留在本机 |
| --- | --- | --- |
| 收集箱整理、今日工作台、周计划、重要、已完成、垃圾桶与全局搜索 | 子任务进度、任务分组、拖拽排序、重复任务、提醒与逾期重排 | SQLite 持久化、分层附件存储、恢复点、清理站与本地头像 |
| 专注工作台、节律提醒、专注回顾、专注成就 | 今日花朵、12 种花与六阶段成长、成长徽章、桌面专注控制器 | 所有专注与节律记录只保存在本机，不依赖账号 |

- **快速记录与安排**：快速添加能识别日期、时间、重复规则、优先级和 `#标签`；任务可加入今日或计划到具体时间。
- **按场景查看任务**：今日区分计划、到期与建议；收集箱提供加入今日、明天和整理入口；计划按周浏览；已完成跨清单回顾；其余视图保留智能排序和自定义顺序。
- **把大事拆开推进**：任务可配置子任务、进度、任务分组、优先级、标签、截止日期、提醒和重复规则。
- **写清楚而不只记标题**：富文本备注支持标题、列表、待办块、引用、链接与图片附件；图片可直接预览。
- **专注与节律**：专注工作台提供番茄 / 深度 / 自由三种节奏；可从任务直接开始专注并回看关联投入。桌面专注控制器支持轨道表盘 / 专注岛 / 经典卡片三种形态。
- **节律提醒**：护眼、补水、起身、舒展、呼吸、今日收尾等模板，支持按间隔、连续使用或固定时刻触发；右上角桌面控制器可展开查看多项节律并直接处理；后台到点通过系统通知中心送达。
- **长期投入可见**：完成专注会推动今日植物自然成长；累计有效专注分钟逐步解锁 12 种花和成长徽章，所有记录保存在本机。
- **安心整理**：删除先进入垃圾桶；附件有清理站；大批量操作前可创建本机恢复点。
- **跨平台细节**：Windows 系统通知与托盘恢复、macOS 通知中心与 Dock / 菜单栏恢复；操作音效基于 Web Audio 合成，不依赖外部音频文件。

## 从收集到完成，一屏看清

### 把复杂任务拆成能开始的下一步

<p align="center">
  <img src="public/screenshots/subtask-panel.webp" alt="子任务列表：进度条、勾选、拖动排序" width="960" />
</p>

任务详情将子任务进度、日期与提醒、优先级、任务清单、标签和富文本备注放在同一处；完成一个子任务，整体进度会随之更新。

### 用计划视图重新安排时间

<p align="center">
  <img src="public/screenshots/planned-view.webp" alt="计划视图：按已逾期、今天与明天分组查看任务，并展示重复、提醒、标签和子任务进度" width="960" />
</p>

计划默认按周浏览，可前后切换并按天查看安排；逾期和周外任务仍会保留在同一页面。重复任务、提醒、标签和子任务进度无需打开详情即可确认，让你能先处理最需要推进的事。

### 通知有提醒，数据也留有退路

<p align="center">
  <img src="public/screenshots/settings-notifications.webp" alt="通知设置：系统通知、提醒时间与操作音效选项" width="49%" />
  <img src="public/screenshots/profile-security.webp" alt="数据与隐私：本机恢复点、默认清单和本地数据说明" width="49%" />
</p>

可以分别控制系统通知、提醒时机和操作音效；数据默认仅保存在本机，并能创建恢复点，在误操作后恢复到可信状态。

### 专注与花田，让长期投入可见

<p align="center">
  <img src="public/screenshots/focus-workspace.webp" alt="专注工作台：今日花（小雏菊·种子）、今日目标与 3 个内置专注方式" width="49%" />
  <img src="public/screenshots/focus-achievement.webp" alt="专注成就：年/月格温室花田、累计成长环形图与近期足迹" width="49%" />
</p>

时钟模块把专注计时、节律提醒、回顾和成就放在同一处：今日花按专注分钟自然成长，长期投入会逐步解锁 12 种花和成长徽章；所有记录与成长数据保存在本机，不依赖外部账号。

### 桌面专注控制器，让切换应用也不丢节奏

在专注工作台点击"打开桌面控制器"，会弹出一个独立的桌面小窗。设置中可在三种形态间切换：

- **轨道表盘**：232px 圆形矢量表盘，剩余时间、阶段、暂停 / 继续、±5 分钟、完成本轮都集中在仪表盘内
- **专注岛**：紧凑常驻的窄条形态，顶部一行显示当前阶段与剩余时间，需要时再展开操作
- **经典卡片**：保留所有操作按钮的卡片形态，时间、暂停、完成、关闭等始终可见

<p align="center">
  <img src="public/screenshots/settings-focus.webp" alt="专注与休息设置：桌面专注控制器形态、番茄轮次与休息时长" width="960" />
</p>

同一设置页还管理番茄节奏：完成几轮后长休息（2–8 轮）、短 / 长休息时长（3–15 分钟 / 10–30 分钟）和"自动开始休息"；控制器可以独立设置"保持在最前面"，与专注完成提醒分开控制。

### 节律提醒，让屏幕时间有节奏

<p align="center">
  <img src="public/screenshots/rhythm-workspace.webp" alt="节律提醒：按间隔、固定时刻或连续使用触发，最多同时开启 3 项" width="49%" />
  <img src="public/screenshots/settings-notifications.webp" alt="通知与反馈：系统提醒与操作音效" width="49%" />
</p>

节律提醒提供 6 个常用模板（护眼远望、补水、起身活动、肩颈舒展、呼吸放松、今日收尾），支持按间隔、连续使用或固定时刻三种触发方式；每条提醒的标题与正文都支持一句随机提示语。最多同时开启 3 项，专注中可以选择性暂停节律，到期不会打断专注。运行时可打开默认位于屏幕右上角的桌面控制器，紧凑查看当前节律，按需展开后处理多项提醒。

## 快捷键

| 操作 | Windows | macOS |
| --- | --- | --- |
| 打开搜索 | `Ctrl + K` | `⌘ + K` |
| 快速添加任务 | `N` | `N` |
| 将选中任务加入今日 | `D` | `D` |
| 关闭当前弹窗或面板 | `Esc` | `Esc` |
| 富文本加粗 / 斜体 | `Ctrl + B` / `Ctrl + I` | `⌘ + B` / `⌘ + I` |

快捷键仅在应用窗口处于前台时生效；输入框、富文本编辑器和弹窗会优先接收自己的按键，避免误操作。

## 下载与安装

请前往 [GitHub Releases](https://github.com/DFreeMind/simple-to-do/releases/latest) 下载对应系统的安装包：

- Windows：`simple-to-do_<version>_x64-setup.exe`
- macOS Apple Silicon：`simple-to-do_<version>_aarch64.dmg`
- macOS Intel：`simple-to-do_<version>_x64.dmg`

当前 Release 已提供 Windows x64 与 macOS（Apple Silicon / Intel）版本；其他架构的可用情况请以 Release 页面资产列表为准。

应用是本地优先软件：安装、更新或卸载前如需保留数据，建议先在“个人空间 → 数据与安全”创建恢复点。

## 技术栈

- **桌面运行时**：[Tauri 2](https://v2.tauri.app/) + Rust
- **前端**：Vue 3、Pinia、Vite、SCSS
- **富文本**：[Tiptap](https://tiptap.dev/)
- **本地数据**：SQLite；图片附件按内容 hash 分层保存

## 开发

### 环境要求

- Node.js 20+
- npm 10+
- Rust stable toolchain
- Windows 构建需要 WebView2 与 Visual Studio Build Tools / MSVC
- macOS 构建需要 Xcode Command Line Tools

### 本地运行

```bash
npm install
npm run dev
```

`npm run dev` 会启动 Vite 并打开 Tauri 桌面窗口；浏览器页面不是产品运行入口。

### 构建与验证

```bash
# 仅构建前端
npm run frontend:build

# 构建当前平台的桌面安装包
npm run build

# Windows：构建带更新签名的安装包
npm run build:windows
```

构建后的分发文件位于 `src-tauri/target/release/bundle/`。只分发 Release 安装包，不分发 `target/` 下的中间编译产物。

## 产品边界

易简清单当前聚焦**本地个人任务管理与复杂事项推进**。以下能力暂不纳入：账号登录、云同步、多人协作、共享清单、外部日历同步、习惯追踪和四象限。专注与节律模块围绕"开始专注"和"日常提示"展开，不扩张为习惯打卡或健康诊断。

## 文档

- [文档中心](docs/README.md)
- [安装与使用](docs/安装与使用.md)
- [产品需求文档](docs/产品需求文档.md)
- [产品调研](docs/产品调研.md)
- [功能路线图](docs/功能路线图.md)
- [界面设计规范](docs/界面设计规范.md)
- [技术架构](docs/技术架构.md)
- [数据模型](docs/数据模型.md)
- [开发规范](AGENTS.md)

## 许可证与品牌

本项目代码采用 [MIT License](LICENSE)。你可以在保留版权与许可证声明的前提下使用、修改和分发代码。

MIT 许可只授予软件著作权许可；“易简清单 / Simple To Do”名称、应用图标及其他品牌标识不因此获得商标或品牌使用许可。

## 反馈

欢迎通过 [Issues](https://github.com/DFreeMind/simple-to-do/issues) 提交问题、使用场景或改进建议。请尽量说明系统版本、应用版本和复现步骤；涉及本地数据时请先移除个人隐私信息。
