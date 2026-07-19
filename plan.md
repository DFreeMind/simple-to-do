# 任务分组功能设计（历史记录）

> 状态：**已实现**。这份早期设计用于保留任务分组的决策背景，不再作为当前实施计划。

任务分组已支持：清单内列表/分组视图切换、创建、重命名、删除、颜色和图标、折叠、分组排序、任务跨分组拖拽，以及已完成任务显示规则。

当前实现与约束请以以下文档和代码为准：

- [产品需求文档](docs/产品需求文档.md)
- [数据模型](docs/数据模型.md)
- [技术架构](docs/技术架构.md)
- `src/components/TaskList.vue`
- `src/components/TaskGroupHeader.vue`
- `src/components/ViewModeToggle.vue`

后续若扩展任务分组，先定义它如何帮助用户推进复杂事项，并同时评估数据兼容、搜索、拖拽、已完成展示与 Windows/macOS 交互影响。
