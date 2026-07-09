<template>
  <div
    class="widget-root"
    :data-theme="store.settings.theme"
    :style="{ '--widget-opacity': widgetState.opacity }"
  >
    <header class="widget-titlebar" @pointerdown="startDrag">
      <div class="widget-titlebar__brand">
        <GripVertical :size="15" />
        <div>
          <strong>桌面清单</strong>
          <span>{{ openCount }} 待办 · {{ doneCount }} 已完成</span>
        </div>
      </div>

      <div class="widget-titlebar__actions">
        <button
          class="icon-btn"
          :class="{ active: widgetState.alwaysOnTop }"
          type="button"
          :title="widgetState.alwaysOnTop ? '取消置顶' : '置顶窗口'"
          :aria-label="widgetState.alwaysOnTop ? '取消置顶' : '置顶窗口'"
          @click="toggleAlwaysOnTop"
        >
          <Pin :size="15" />
        </button>
        <button
          class="icon-btn"
          type="button"
          title="小组件设置"
          aria-label="小组件设置"
          @click="settingsOpen = !settingsOpen"
        >
          <SlidersHorizontal :size="15" />
        </button>
        <button class="icon-btn" type="button" title="关闭" aria-label="关闭" @click="closeWidget">
          <X :size="16" />
        </button>
      </div>
    </header>

    <section class="widget-toolbar">
      <label class="view-select">
        <ListChecks :size="15" />
        <select v-model="widgetState.viewId" @change="persistWidgetState">
          <option v-for="view in availableViews" :key="view.id" :value="view.id">
            {{ view.label }}
          </option>
        </select>
      </label>
      <button
        class="text-toggle"
        :class="{ active: widgetState.showCompleted }"
        type="button"
        @click="toggleCompletedVisible"
      >
        <CheckCircle2 :size="14" />
        已完成
      </button>
    </section>

    <section v-if="settingsOpen" class="widget-settings">
      <label class="switch-row">
        <span>窗口置顶</span>
        <input v-model="widgetState.alwaysOnTop" type="checkbox" @change="persistWidgetState" />
      </label>
      <label class="range-row">
        <span>便签透明度</span>
        <input
          v-model.number="widgetState.opacity"
          type="range"
          min="0.72"
          max="1"
          step="0.02"
          @input="scheduleWidgetStateSave"
        />
      </label>
    </section>

    <form class="quick-add" @submit.prevent="addTask">
      <Plus :size="17" />
      <input
        ref="quickInput"
        v-model="newTaskTitle"
        type="text"
        :placeholder="quickPlaceholder"
        aria-label="快速添加任务"
      />
      <button class="quick-add__button" type="submit" :disabled="!newTaskTitle.trim() || saving">
        添加
      </button>
    </form>

    <main class="widget-body">
      <div v-if="displayedTasks.length" class="task-list">
        <article
          v-for="task in displayedTasks"
          :key="task.id"
          class="widget-task"
          :class="{ 'widget-task--completed': task.completed, 'widget-task--selected': selectedTaskId === task.id }"
        >
          <button
            class="task-check"
            :class="{ checked: task.completed }"
            type="button"
            :aria-label="task.completed ? '撤销完成' : '标记完成'"
            @click="toggleTask(task)"
          >
            <Check v-if="task.completed" :size="13" />
          </button>
          <button class="task-main" type="button" @click="selectTask(task)">
            <span class="task-title">{{ task.title }}</span>
            <span class="task-meta">
              <span v-if="task.dueDate" :class="{ danger: isOverdue(task.dueDate) && !task.completed }">
                <CalendarClock :size="12" />
                {{ formatDueDate(task.dueDate) }}
              </span>
              <span v-if="task.important || task.priority === 3">
                <Star :size="12" />
                重要
              </span>
              <span v-if="task.subtasks.length">
                <ListChecks :size="12" />
                {{ completedSubtasks(task) }}/{{ task.subtasks.length }}
              </span>
            </span>
          </button>
          <div class="task-actions">
            <button class="ghost-icon" type="button" title="编辑" aria-label="编辑" @click="selectTask(task)">
              <Pencil :size="14" />
            </button>
            <button class="ghost-icon" type="button" title="在主应用中打开" aria-label="在主应用中打开" @click="openInMain(task)">
              <ExternalLink :size="14" />
            </button>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <CheckCheck :size="30" />
        <strong>{{ currentViewLabel }}没有待办</strong>
        <span>在上方输入框添加一条新任务。</span>
      </div>
    </main>

    <aside v-if="selectedTask" class="editor-panel">
      <header class="editor-panel__header">
        <strong>编辑任务</strong>
        <button class="icon-btn" type="button" title="收起" aria-label="收起" @click="selectedTaskId = null">
          <ChevronDown :size="16" />
        </button>
      </header>

      <div class="editor-field">
        <label>标题</label>
        <input
          v-model="editTitle"
          type="text"
          placeholder="任务标题"
          @blur="saveTitle"
          @keydown.enter.prevent="saveTitle"
        />
      </div>

      <div class="editor-grid">
        <label class="editor-field">
          <span>清单</span>
          <select :value="selectedTask.listId" @change="updateTask(selectedTask.id, { listId: $event.target.value })">
            <option v-for="list in store.lists" :key="list.id" :value="list.id">
              {{ list.name }}
            </option>
          </select>
        </label>

        <label class="editor-field">
          <span>日期</span>
          <input :value="dateInputValue(selectedTask.dueDate)" type="date" @change="setDueDate($event.target.value)" />
        </label>
      </div>

      <div class="editor-actions">
        <button
          class="chip-button"
          :class="{ active: store.isInMyDay(selectedTask) }"
          type="button"
          @click="toggleMyDay(selectedTask)"
        >
          <Sun :size="14" />
          今日
        </button>
        <button
          class="chip-button"
          :class="{ active: selectedTask.important || selectedTask.priority === 3 }"
          type="button"
          @click="toggleImportant(selectedTask)"
        >
          <Star :size="14" />
          重要
        </button>
        <label class="priority-select">
          <Flag :size="14" />
          <select :value="selectedTask.priority || 0" @change="setPriority(Number($event.target.value))">
            <option :value="0">无优先级</option>
            <option :value="1">低优先级</option>
            <option :value="2">中优先级</option>
            <option :value="3">高优先级</option>
          </select>
        </label>
      </div>

      <section class="subtasks">
        <div class="subtasks__header">
          <span>子任务</span>
          <small>{{ completedSubtasks(selectedTask) }}/{{ selectedTask.subtasks.length }}</small>
        </div>
        <div v-if="selectedTask.subtasks.length" class="subtask-list">
          <label v-for="subtask in selectedTask.subtasks" :key="subtask.id" class="subtask-row">
            <input type="checkbox" :checked="subtask.completed" @change="toggleSubtask(selectedTask.id, subtask.id)" />
            <span :class="{ completed: subtask.completed }">{{ subtask.title }}</span>
            <button type="button" title="删除子任务" aria-label="删除子任务" @click.prevent="deleteSubtask(selectedTask.id, subtask.id)">
              <X :size="13" />
            </button>
          </label>
        </div>
        <form class="subtask-add" @submit.prevent="addSubtask">
          <input v-model="newSubtaskTitle" type="text" placeholder="添加子任务" />
          <button type="submit" :disabled="!newSubtaskTitle.trim()">添加</button>
        </form>
      </section>

      <section class="detail-summary">
        <span v-if="selectedTask.description || selectedTask.descriptionHtml">
          <AlignLeft :size="13" />
          有备注
        </span>
        <span v-if="selectedTask.attachments.length">
          <Paperclip :size="13" />
          {{ selectedTask.attachments.length }} 个图片
        </span>
        <span v-if="selectedTask.reminderAt">
          <Bell :size="13" />
          有提醒
        </span>
        <span v-if="selectedTask.repeatRule">
          <Repeat2 :size="13" />
          重复
        </span>
      </section>

      <button class="open-main-btn" type="button" @click="openInMain(selectedTask)">
        <ExternalLink :size="15" />
        在主应用中编辑备注、提醒和附件
      </button>
    </aside>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  AlignLeft,
  Bell,
  CalendarClock,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Flag,
  GripVertical,
  ListChecks,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  Repeat2,
  SlidersHorizontal,
  Star,
  Sun,
  X
} from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import {
  DEFAULT_WIDGET_STATE,
  closeWidgetWindow,
  focusMainWindowWithTask,
  listenDataChanged,
  loadWidgetWindowState,
  saveWidgetWindowState,
  startCurrentWindowDrag
} from '@/services/platform'

const store = useTaskStore()

const widgetState = reactive({ ...DEFAULT_WIDGET_STATE })
const settingsOpen = ref(false)
const newTaskTitle = ref('')
const quickInput = ref(null)
const saving = ref(false)
const selectedTaskId = ref(null)
const editTitle = ref('')
const newSubtaskTitle = ref('')

let unlistenDataChanged = null
let saveStateTimer = null

const systemViews = [
  { id: 'today', label: '今日' },
  { id: 'inbox', label: '收集箱' },
  { id: 'planned', label: '计划' },
  { id: 'important', label: '重要' }
]

const availableViews = computed(() => [
  ...systemViews,
  ...store.lists
    .filter((list) => !list.isSystem)
    .map((list) => ({ id: list.id, label: list.name }))
])

const currentViewLabel = computed(() => availableViews.value.find((view) => view.id === widgetState.viewId)?.label || '今日')

const sourceTasks = computed(() => {
  const tasks = store.activeTasks || []
  switch (widgetState.viewId) {
    case 'today':
      return tasks.filter((task) => store.isInMyDay(task) || isToday(task.dueDate))
    case 'inbox':
      return tasks.filter((task) => task.listId === 'inbox')
    case 'planned':
      return tasks.filter((task) => task.dueDate)
    case 'important':
      return tasks.filter((task) => task.important || task.priority === 3 || task.pinned)
    default:
      return tasks.filter((task) => task.listId === widgetState.viewId)
  }
})

const orderedTasks = computed(() => [...sourceTasks.value].sort(compareTasks))
const displayedTasks = computed(() => orderedTasks.value.filter((task) => widgetState.showCompleted || !task.completed))
const openCount = computed(() => sourceTasks.value.filter((task) => !task.completed).length)
const doneCount = computed(() => sourceTasks.value.filter((task) => task.completed).length)
const selectedTask = computed(() => store.tasks.find((task) => task.id === selectedTaskId.value) || null)
const quickPlaceholder = computed(() => {
  if (widgetState.viewId === 'planned') return '添加计划任务，例如：明天 9点 复盘'
  return `添加到${currentViewLabel.value}`
})

watch(selectedTask, (task) => {
  editTitle.value = task?.title || ''
}, { immediate: true })

watch(availableViews, () => {
  if (!availableViews.value.some((view) => view.id === widgetState.viewId)) {
    widgetState.viewId = 'today'
    persistWidgetState()
  }
})

onMounted(async () => {
  await store.loadData()
  Object.assign(widgetState, await loadWidgetWindowState())
  unlistenDataChanged = await listenDataChanged(() => {
    store.loadData()
  })
  nextTick(() => quickInput.value?.focus())
})

onBeforeUnmount(() => {
  if (unlistenDataChanged) unlistenDataChanged()
  if (saveStateTimer) window.clearTimeout(saveStateTimer)
})

function compareTasks(a, b) {
  if (a.completed !== b.completed) return a.completed ? 1 : -1
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  const importantA = a.important || a.priority === 3
  const importantB = b.important || b.priority === 3
  if (importantA !== importantB) return importantA ? -1 : 1
  if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate)
  if (a.dueDate !== b.dueDate) return a.dueDate ? -1 : 1
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
}

async function addTask() {
  const title = newTaskTitle.value.trim()
  if (!title || saving.value) return
  saving.value = true
  const previousView = store.currentView
  const previousSelected = store.selectedTaskId
  try {
    const tempView = widgetState.viewId === 'planned' ? 'inbox' : widgetState.viewId
    store.setView(tempView)
    const listId = ['today', 'important', 'planned'].includes(widgetState.viewId) ? 'inbox' : widgetState.viewId
    const task = store.addTask(title, listId)
    store.currentView = previousView
    store.selectedTaskId = previousSelected
    if (task) {
      newTaskTitle.value = ''
      await store.saveData()
    }
  } finally {
    store.currentView = previousView
    store.selectedTaskId = previousSelected
    saving.value = false
  }
}

async function toggleTask(task) {
  store.completeTask(task.id)
  await store.saveData()
}

function selectTask(task) {
  selectedTaskId.value = task.id
}

async function updateTask(taskId, updates) {
  store.updateTask(taskId, updates)
  await store.saveData()
}

async function saveTitle() {
  if (!selectedTask.value) return
  const title = editTitle.value.trim()
  if (!title || title === selectedTask.value.title) return
  await updateTask(selectedTask.value.id, { title })
}

async function setDueDate(value) {
  if (!selectedTask.value) return
  const dueDate = value ? new Date(`${value}T09:00:00`).toISOString() : null
  await updateTask(selectedTask.value.id, { dueDate })
}

async function toggleMyDay(task) {
  store.toggleMyDay(task.id)
  await store.saveData()
}

async function toggleImportant(task) {
  store.toggleImportant(task.id)
  await store.saveData()
}

async function setPriority(priority) {
  if (!selectedTask.value) return
  await updateTask(selectedTask.value.id, {
    priority,
    important: priority === 3 ? true : selectedTask.value.important
  })
}

async function toggleSubtask(taskId, subtaskId) {
  store.toggleSubtask(taskId, subtaskId)
  await store.saveData()
}

async function deleteSubtask(taskId, subtaskId) {
  store.deleteSubtask(taskId, subtaskId)
  await store.saveData()
}

async function addSubtask() {
  if (!selectedTask.value) return
  const title = newSubtaskTitle.value.trim()
  if (!title) return
  store.addSubtask(selectedTask.value.id, title)
  newSubtaskTitle.value = ''
  await store.saveData()
}

async function openInMain(task) {
  await focusMainWindowWithTask(task.id)
}

async function closeWidget() {
  await persistWidgetState()
  await closeWidgetWindow()
}

async function startDrag(event) {
  if (event.target.closest('button, input, select, textarea')) return
  try {
    await startCurrentWindowDrag()
    scheduleWidgetStateSave()
  } catch (error) {
    console.warn('[Widget] 拖动窗口失败:', error)
  }
}

function toggleAlwaysOnTop() {
  widgetState.alwaysOnTop = !widgetState.alwaysOnTop
  persistWidgetState()
}

function toggleCompletedVisible() {
  widgetState.showCompleted = !widgetState.showCompleted
  persistWidgetState()
}

function scheduleWidgetStateSave() {
  if (saveStateTimer) window.clearTimeout(saveStateTimer)
  saveStateTimer = window.setTimeout(() => {
    saveStateTimer = null
    persistWidgetState()
  }, 160)
}

async function persistWidgetState() {
  Object.assign(widgetState, await saveWidgetWindowState({ ...widgetState }))
}

function completedSubtasks(task) {
  return task.subtasks.filter((subtask) => subtask.completed).length
}

function dateInputValue(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isToday(dateStr) {
  return dateInputValue(dateStr) === dateInputValue(new Date().toISOString())
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

function formatDueDate(dateStr) {
  const value = dateInputValue(dateStr)
  if (!value) return ''
  const today = dateInputValue(new Date().toISOString())
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = dateInputValue(tomorrowDate.toISOString())
  if (value === today) return '今天'
  if (value === tomorrow) return '明天'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}
</script>

<style>
:root {
  --widget-primary: #5fb8ad;
  --widget-primary-strong: #1f7d76;
  --widget-primary-soft: #e2f4f1;
  --widget-bg: #fbfefd;
  --widget-surface: #f1f8f6;
  --widget-surface-strong: #e4f0ed;
  --widget-text: #17211f;
  --widget-muted: #687674;
  --widget-faint: #9aaba7;
  --widget-border: #d9e8e5;
  --widget-danger: #d64f4f;
  --widget-warning: #d8942e;
  --widget-shadow: 0 18px 48px rgba(30, 70, 64, 0.22);
}

[data-theme="blue"] {
  --widget-primary: #4f8de8;
  --widget-primary-strong: #2563eb;
  --widget-primary-soft: #e8f0fc;
  --widget-surface: #f4f8fd;
  --widget-surface-strong: #e6eefb;
  --widget-border: #d8e4f5;
}

[data-theme="violet"] {
  --widget-primary: #7c6ee6;
  --widget-primary-strong: #5b21b6;
  --widget-primary-soft: #f0eefc;
  --widget-surface: #f8f7fc;
  --widget-surface-strong: #eeeafa;
  --widget-border: #e0dbf2;
}

[data-theme="graphite"] {
  --widget-primary: #6b7280;
  --widget-primary-strong: #374151;
  --widget-primary-soft: #f3f4f6;
  --widget-surface: #f7f8f9;
  --widget-surface-strong: #e9ecef;
  --widget-border: #dde1e6;
}

@media (prefers-color-scheme: dark) {
  :root {
    --widget-bg: #181c1b;
    --widget-surface: #202726;
    --widget-surface-strong: #2a3331;
    --widget-text: #eef5f3;
    --widget-muted: #a1afac;
    --widget-faint: #75827f;
    --widget-border: #35423f;
    --widget-primary-soft: #173b36;
    --widget-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
  }
}
</style>

<style scoped>
.widget-root {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0)),
    var(--widget-bg);
  color: var(--widget-text);
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: 12px;
  box-shadow: var(--widget-shadow);
  opacity: var(--widget-opacity);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.widget-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 46px;
  padding: 8px 10px 7px 12px;
  background: var(--widget-surface);
  border-bottom: 1px solid var(--widget-border);
  cursor: grab;
}

.widget-titlebar:active {
  cursor: grabbing;
}

.widget-titlebar__brand,
.widget-titlebar__actions,
.task-meta,
.editor-actions,
.detail-summary {
  display: flex;
  align-items: center;
}

.widget-titlebar__brand {
  gap: 8px;
  min-width: 0;
}

.widget-titlebar__brand > div {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.widget-titlebar__brand strong {
  font-size: 13px;
  line-height: 1.2;
}

.widget-titlebar__brand span {
  color: var(--widget-muted);
  font-size: 11px;
  white-space: nowrap;
}

.widget-titlebar__actions {
  gap: 3px;
}

button,
input,
select {
  font: inherit;
}

button {
  border: 0;
}

.icon-btn,
.ghost-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: transparent;
  color: var(--widget-muted);
  cursor: pointer;
}

.icon-btn:hover,
.ghost-icon:hover,
.icon-btn.active {
  background: var(--widget-primary-soft);
  color: var(--widget-primary-strong);
}

.widget-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  padding: 9px 10px;
}

.view-select {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--widget-border);
  border-radius: 8px;
  background: var(--widget-bg);
}

.view-select select,
.priority-select select,
.editor-field select,
.editor-field input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--widget-text);
}

.text-toggle,
.chip-button,
.priority-select {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 32px;
  padding: 0 9px;
  border-radius: 8px;
  background: var(--widget-surface);
  color: var(--widget-muted);
  cursor: pointer;
}

.text-toggle.active,
.chip-button.active {
  background: var(--widget-primary-soft);
  color: var(--widget-primary-strong);
}

.widget-settings {
  display: grid;
  gap: 8px;
  padding: 0 12px 10px;
}

.switch-row,
.range-row {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  color: var(--widget-muted);
  font-size: 12px;
}

.quick-add {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin: 0 10px 10px;
  padding: 7px 8px;
  border: 1px solid var(--widget-border);
  border-radius: 9px;
  background: var(--widget-bg);
}

.quick-add input {
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--widget-text);
}

.quick-add__button,
.subtask-add button,
.open-main-btn {
  border-radius: 7px;
  background: var(--widget-primary);
  color: #fff;
  cursor: pointer;
}

.quick-add__button {
  min-height: 28px;
  padding: 0 10px;
}

.quick-add__button:disabled,
.subtask-add button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.widget-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 8px 10px;
}

.task-list {
  display: grid;
  gap: 5px;
}

.widget-task {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
  padding: 9px 7px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
}

.widget-task:hover,
.widget-task--selected {
  background: var(--widget-surface);
  border-color: var(--widget-border);
}

.task-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 19px;
  height: 19px;
  margin-top: 1px;
  border: 1.5px solid var(--widget-border);
  border-radius: 6px;
  background: var(--widget-bg);
  color: transparent;
  cursor: pointer;
}

.task-check.checked {
  background: var(--widget-primary);
  border-color: var(--widget-primary);
  color: #fff;
}

.task-main {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.task-title {
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.35;
}

.widget-task--completed .task-title {
  color: var(--widget-faint);
  text-decoration: line-through;
}

.task-meta {
  flex-wrap: wrap;
  gap: 7px;
  color: var(--widget-muted);
  font-size: 11px;
}

.task-meta span,
.detail-summary span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.task-meta .danger {
  color: var(--widget-danger);
}

.task-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
}

.widget-task:hover .task-actions,
.widget-task--selected .task-actions {
  opacity: 1;
}

.empty-state {
  height: 100%;
  min-height: 170px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  color: var(--widget-muted);
  text-align: center;
}

.empty-state strong {
  color: var(--widget-text);
  font-size: 14px;
}

.empty-state span {
  font-size: 12px;
}

.editor-panel {
  display: grid;
  gap: 10px;
  max-height: 48vh;
  overflow-y: auto;
  padding: 10px;
  border-top: 1px solid var(--widget-border);
  background: var(--widget-surface);
}

.editor-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.editor-field {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.editor-field label,
.editor-field span,
.subtasks__header,
.detail-summary {
  color: var(--widget-muted);
  font-size: 12px;
}

.editor-field input,
.editor-field select,
.subtask-add input {
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--widget-border);
  border-radius: 8px;
  background: var(--widget-bg);
  color: var(--widget-text);
  outline: 0;
}

.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 122px;
  gap: 8px;
}

.editor-actions {
  flex-wrap: wrap;
  gap: 6px;
}

.priority-select {
  flex: 1;
  min-width: 136px;
  background: var(--widget-bg);
  border: 1px solid var(--widget-border);
}

.subtasks {
  display: grid;
  gap: 7px;
}

.subtasks__header {
  display: flex;
  justify-content: space-between;
}

.subtask-list {
  display: grid;
  gap: 4px;
}

.subtask-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 7px;
  align-items: center;
  min-height: 28px;
  padding: 4px 5px;
  border-radius: 7px;
  background: var(--widget-bg);
  font-size: 12px;
}

.subtask-row span {
  overflow-wrap: anywhere;
}

.subtask-row .completed {
  color: var(--widget-faint);
  text-decoration: line-through;
}

.subtask-row button {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: transparent;
  color: var(--widget-faint);
  cursor: pointer;
}

.subtask-add {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
}

.subtask-add button {
  padding: 0 10px;
}

.detail-summary {
  flex-wrap: wrap;
  gap: 8px;
}

.open-main-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
}

@media (max-width: 300px) {
  .widget-titlebar__brand span,
  .task-actions {
    display: none;
  }

  .editor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
