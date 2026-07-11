# 清单内部分组功能设计

## 需求分析

当前清单内任务显示逻辑：
- 置顶任务在最上方
- 未完成任务按排序显示
- 已完成任务在最下方单独分组

用户希望在清单内添加**自由分组**功能，可以将任务组织到自定义分组中，方便管理。

### 视图模式切换

清单支持两种显示模式，用户可自由切换：

| 模式 | 显示方式 | 适用场景 |
|------|----------|----------|
| **列表模式**（默认） | 保持现有行为，平铺显示所有任务 | 简单清单，任务数量少 |
| **分组模式** | 按自定义分组组织任务，支持折叠 | 复杂项目，需要分类管理 |

## 数据模型设计

### 新增实体：TaskGroup（任务分组）

```js
{
  id: string,           // 分组ID，genId() 生成
  name: string,         // 分组名称，如"进行中"、"待审核"
  listId: string,       // 所属清单ID
  sortOrder: number,    // 排序顺序，用于分组间排序
  collapsed: boolean,   // 是否折叠，默认 false
  createdAt: string,    // 创建时间
  updatedAt: string     // 更新时间
}
```

### Task 实体新增字段

```js
{
  // ... 现有字段 ...
  taskGroupId: string|null  // 所属分组ID，null 表示未分组
}
```

### 清单/视图设置新增字段

```js
{
  // ... 现有字段 ...
  viewMode: 'list' | 'group'  // 显示模式，默认 'list'
}
```

### 数据兼容性与升级策略

### 架构设计：专用迁移处理器

创建独立的迁移模块 `src/utils/migrator.js`，专门负责数据版本迁移：

```js
// src/utils/migrator.js
const CURRENT_VERSION = 3

// 迁移函数注册表：key 是源版本，value 是迁移函数
const migrations = {
  2: migrateV2ToV3  // 从 v2 升级到 v3
}

/**
 * 执行数据迁移
 * @param {Object} data - 原始数据
 * @returns {Object} 迁移后的数据
 */
export function migrateData(data) {
  let currentVersion = data.schemaVersion || 1
  let migrated = { ...data }

  // 逐步执行迁移，直到当前版本
  while (currentVersion < CURRENT_VERSION) {
    const migrationFn = migrations[currentVersion]
    if (migrationFn) {
      migrated = migrationFn(migrated)
      migrated.schemaVersion = currentVersion + 1
    }
    currentVersion++
  }

  return migrated
}

/**
 * v2 → v3 迁移：添加任务分组功能
 */
function migrateV2ToV3(data) {
  // 1. 添加 taskGroups 空数组
  if (!data.taskGroups) {
    data.taskGroups = []
  }

  // 2. 为旧清单添加 viewMode 字段
  if (data.lists) {
    data.lists = data.lists.map(list => ({
      ...list,
      viewMode: list.viewMode || 'list'
    }))
  }

  // 3. 为旧任务添加 taskGroupId 字段
  if (data.tasks) {
    data.tasks = data.tasks.map(task => ({
      ...task,
      taskGroupId: task.taskGroupId || null
    }))
  }

  // 4. 处理垃圾桶中的任务
  if (data.trash) {
    data.trash = data.trash.map(task => ({
      ...task,
      taskGroupId: task.taskGroupId || null
    }))
  }

  return data
}
```

### 调用方式

在 store 的 `loadData` 中调用：

```js
// src/stores/task.js
import { migrateData } from '@/utils/migrator'

async function loadData() {
  const raw = await loadPlatformData()
  const migrated = migrateData(raw)  // 自动检测并迁移
  // ... 继续处理
}
```

### 版本管理规范

- 当前 schemaVersion 从 `2` 升级到 `3`
- 每个版本升级有独立的迁移函数（纯函数，可测试）
- normalize 函数只负责数据清洗，不处理版本迁移
- 新增字段提供默认值，旧数据自动适配

### 升级流程

1. 用户安装新版本
2. 应用启动时加载原始数据
3. `migrateData()` 检测 schemaVersion < 3
4. 调用 `migrateV2ToV3()` 执行迁移
5. 自动添加 `taskGroups: []`
6. 为旧清单添加 `viewMode: 'list'`
7. 为旧任务添加 `taskGroupId: null`
8. schemaVersion 更新为 3
9. 用户无感知完成升级

### 回滚策略

- 新增字段都有默认值，可安全降级
- 降级后忽略 `taskGroups` 和 `viewMode` 字段
- 任务分组信息保留在数据中，不影响旧版本使用

### 未来扩展

新增版本迁移时，只需：
1. 在 `migrations` 对象中添加新的迁移函数
2. 递增 `CURRENT_VERSION`
3. 编写对应的迁移逻辑

## 渲染逻辑设计

### 模式切换 UI

在清单标题右侧添加模式切换按钮组：

```
月度结算任务                          [☰] [▦]
                                      ↑    ↑
                                    列表  分组
```

- **列表模式**（☰）：平铺显示，当前行为
- **分组模式**（▦）：按分组组织显示

### 列表模式（现有行为）

1. **置顶任务**（pinned = true）
2. **未完成任务**（按排序显示）
3. **已完成任务**（completed = true，可折叠）

### 分组模式

1. **置顶任务**（pinned = true，无分组）
2. **未分组任务**（taskGroupId = null，未完成）
3. **各分组任务**（按 sortOrder 排序）
   - 分组标题（可折叠，显示任务数量）
   - 分组内的任务
4. **已完成任务**（completed = true，可折叠）

### 分组标题交互

- 点击标题可折叠/展开分组
- 显示分组内任务数量
- 右键菜单：重命名、删除、移动到其他分组
- 拖拽手柄可调整分组顺序

## Store 改动

### src/stores/task.js

**新增状态：**
```js
const taskGroups = ref([])  // 所有任务分组
```

**新增计算属性：**
```js
// 当前清单的显示模式
const currentViewMode = computed(() => {
  const list = lists.value.find(l => l.id === currentView.value)
  return list?.viewMode || 'list'
})

// 当前清单的分组列表
const currentListGroups = computed(() => {
  return taskGroups.value
    .filter(g => g.listId === currentView.value)
    .sort((a, b) => a.sortOrder - b.sortOrder)
})

// 分组后的任务列表（仅分组模式使用）
const groupedTasks = computed(() => {
  const groups = currentListGroups.value
  const tasks = filteredTasks.value.filter(t => !t.completed)
  
  const result = groups.map(group => ({
    ...group,
    tasks: tasks.filter(t => t.taskGroupId === group.id)
  }))
  
  // 添加"未分组"分组
  const ungrouped = tasks.filter(t => !t.taskGroupId)
  if (ungrouped.length > 0) {
    result.unshift({ id: null, name: '未分组', tasks: ungrouped })
  }
  
  return result
})
```

**新增/修改 Actions：**
```js
// 切换视图模式
function setViewMode(listId, mode) {
  const list = lists.value.find(l => l.id === listId)
  if (list) {
    list.viewMode = mode
  }
}

// 创建分组
function addTaskGroup(name, listId)

// 重命名分组
function renameTaskGroup(groupId, name)

// 删除分组（任务移回未分组）
function deleteTaskGroup(groupId)

// 移动任务到分组
function moveTaskToGroup(taskId, groupId)

// 重排分组顺序
function reorderTaskGroup(sourceId, targetId, position)
```

## 组件改动

### TaskList.vue

- 添加模式切换按钮组（列表/分组）
- 根据当前模式选择渲染逻辑：
  - 列表模式：保持现有 pinned/unpinned 分区
  - 分组模式：渲染分组结构
- 为每个分组添加折叠标题
- 集成分组的拖拽排序

### TaskItem.vue

- 右键菜单新增"移动到分组"选项（仅分组模式）
- 显示任务所属分组标签（可选）

### 新增组件：TaskGroupHeader.vue

- 分组标题显示
- 折叠/展开按钮
- 任务数量统计
- 右键菜单（重命名、删除、移动分组）

### 新增组件：ViewModeToggle.vue

- 模式切换按钮组
- 显示当前模式状态
- 切换时平滑过渡

## 拖拽改动

### useDragSort.js

- 扩展支持分组内拖拽
- 支持跨分组拖拽任务
- 支持分组间的排序

### TaskList.vue 拖拽配置

```js
// 分组内拖拽
onDrop(sourceId, targetId, position, targetGroupId) {
  // 移动任务到目标分组并调整顺序
}

// 分组标题拖拽
onGroupDrop(sourceId, targetId, position) {
  // 调整分组顺序
}
```

## 受影响的功能

### 需要调整

1. **智能排序** - 分组模式下需要按分组组织任务后再排序
2. **搜索** - 搜索结果需要显示任务所属分组（分组模式）
3. **批量操作** - "全部完成"等操作需要按分组处理
4. **日历视图** - 显示任务时需要考虑分组
5. **拖拽排序** - 分组内和跨分组拖拽逻辑
6. **导出功能** - 导出时需要包含分组信息
7. **模式切换** - 列表/分组模式的切换和状态保存

### 无需调整

1. **清单/侧边栏分组** - 这是清单级别的分组，与任务分组独立
2. **已完成任务区** - 已完成任务不参与分组显示（两种模式相同）
3. **垃圾桶/已删除** - 删除的任务分组信息可保留或清除
4. **列表模式** - 保持现有行为，无变化

## 实现步骤

### Phase 1：数据层
1. 创建 `src/utils/migrator.js` 迁移处理器
2. 实现 `migrateV2ToV3()` 迁移函数
3. 在 store 中集成 `migrateData()` 调用
4. 在 normalizeTask 中添加 taskGroupId 字段
5. 新增 normalizeTaskGroup 函数
6. 在 normalizeList 中添加 viewMode 字段
7. 在 store 中添加 taskGroups 状态
8. 实现分组 CRUD actions
9. 实现 setViewMode action

### Phase 2：渲染层
1. 创建 ViewModeToggle 组件
2. 创建 TaskGroupHeader 组件
3. 修改 TaskList.vue 渲染逻辑
   - 添加模式切换按钮
   - 根据模式选择渲染逻辑
4. 添加分组折叠状态管理

### Phase 3：交互层
1. 实现分组的拖拽排序
2. 实现任务跨分组拖拽
3. 添加右键菜单"移动到分组"
4. 添加分组管理入口（新建、重命名、删除）
5. 实现模式切换的平滑过渡

### Phase 4：集成
1. 更新智能排序逻辑
2. 更新搜索结果显示
3. 更新批量操作
4. 测试数据兼容性
5. 测试两种模式的切换

## UI 设计参考

### 列表模式（现有行为）
```
月度结算任务                          [☰] [▦]
                                      ↑ 选中
┌─────────────────────────────────────────┐
│ 📌 置顶任务                              │
│   □ 重要任务1                            │
│   □ 重要任务2                            │
├─────────────────────────────────────────┤
│   □ 任务A                               │
│   □ 任务B                               │
│   □ 任务C                               │
│   □ 任务D                               │
│   □ 任务E                               │
├─────────────────────────────────────────┤
│ ▶ 已完成 (5)                             │
└─────────────────────────────────────────┘
```

### 分组模式
```
月度结算任务                          [☰] [▦]
                                          ↑ 选中
┌─────────────────────────────────────────┐
│ 📌 置顶任务                              │
│   □ 重要任务1                            │
│   □ 重要任务2                            │
├─────────────────────────────────────────┤
│ ▼ 进行中 (3)                             │
│   □ 任务A                               │
│   □ 任务B                               │
│   □ 任务C                               │
├─────────────────────────────────────────┤
│ ▶ 待审核 (0)                             │
├─────────────────────────────────────────┤
│ 未分组 (2)                               │
│   □ 任务D                               │
│   □ 任务E                               │
├─────────────────────────────────────────┤
│ ▶ 已完成 (5)                             │
└─────────────────────────────────────────┘
```

### 分组管理入口

分组模式下，清单视图顶部添加"新建分组"按钮：
```
+ 新建分组
```

## 技术风险

1. **性能影响** - 分组计算增加复杂度，但可通过 memoization 控制
2. **拖拽复杂度** - 跨分组拖拽需要精确计算位置
3. **数据迁移** - 专用迁移处理器确保升级安全可靠
4. **模式切换状态** - 需要正确保存和恢复每个清单的显示模式
5. **迁移顺序** - 多个迁移函数需要按版本号顺序执行

## 总结

本方案通过新增 `TaskGroup` 实体和 `taskGroupId` 字段，在不破坏现有数据的情况下实现清单内自由分组。支持列表/分组两种显示模式，用户可根据需要自由切换。采用专用迁移处理器（`migrator.js`）管理数据版本升级，架构清晰，易于维护和扩展。改动集中在数据层和渲染层，对现有功能影响可控。
