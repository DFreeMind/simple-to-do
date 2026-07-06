<template>
  <main class="task-list">
    <header class="task-list__header">
      <div>
        <p class="eyebrow">{{ viewMeta.eyebrow }}</p>
        <h1>{{ viewMeta.title }}</h1>
      </div>
      <div class="header-actions">
        <div v-if="showTaskActions" class="sort-select">
          <button class="pill-btn" type="button" :title="sortLabel" :aria-label="sortLabel" @click.stop="sortMenuOpen = !sortMenuOpen">
            <ArrowUpDown :size="16" />
            <span>{{ sortLabel }}</span>
            <ChevronDown :size="15" :class="{ rotated: sortMenuOpen }" />
          </button>
          <div v-if="sortMenuOpen" class="sort-menu" @click.stop>
            <button
              v-for="option in sortOptions"
              :key="option.value"
              class="sort-menu__item"
              :class="{ active: store.sortBy === option.value }"
              type="button"
              @click="selectSort(option.value)"
            >
              <span>{{ option.label }}</span>
              <Check v-if="store.sortBy === option.value" :size="15" />
            </button>
          </div>
        </div>
        <button v-if="showTaskActions" class="icon-btn" type="button" title="清除已完成" aria-label="清除已完成" @click="clearCompleted">
          <ArchiveX :size="18" />
        </button>
        <button
          class="icon-btn"
          type="button"
          :title="store.settings.detailOpen ? '隐藏详情' : '显示详情'"
          :aria-label="store.settings.detailOpen ? '隐藏详情' : '显示详情'"
          @click="store.updateSettings({ detailOpen: !store.settings.detailOpen })"
        >
          <PanelRight :size="18" />
        </button>
      </div>
    </header>

    <CalendarView v-if="store.currentView === 'calendar'" />
    <StatsView v-else-if="store.currentView === 'stats'" />

    <template v-else>
    <section v-if="store.currentView === 'search'" class="search-panel">
      <Search :size="18" />
      <input
        :value="store.searchQuery"
        type="search"
        placeholder="输入关键词搜索标题、备注或标签"
        aria-label="搜索任务"
        @input="store.setSearch($event.target.value)"
      />
    </section>

    <section v-else-if="store.canQuickAddTask" class="quick-add">
      <div class="quick-add__row">
        <Plus :size="19" />
        <input
          ref="quickInput"
          v-model="newTaskTitle"
          :placeholder="quickPlaceholder"
          aria-label="快速添加任务"
          @keydown.enter="addTask"
        />
        <button class="primary-btn" type="button" :disabled="!newTaskTitle.trim()" @click="addTask">添加</button>
      </div>
      <div v-if="quickParseChips.length" class="quick-add__chips" aria-label="快速添加解析结果">
        <span v-for="chip in quickParseChips" :key="`${chip.type}:${chip.label}`" class="quick-chip" :class="`quick-chip--${chip.type}`">
          <component :is="chip.icon" :size="13" />
          {{ chip.label }}
        </span>
      </div>
    </section>

    <section v-else class="readonly-hint">
      <Info :size="18" />
      <span>{{ readonlyHint }}</span>
    </section>

    <section
      class="task-list__content"
      :class="{ 'task-list__content--empty': isEmpty }"
      @mousedown="handleMouseDown"
    >
      <template v-if="store.currentView === 'planned' && store.plannedSections.length">
        <div v-for="section in store.plannedSections" :key="section.id" class="task-section">
          <h2>{{ section.label }}</h2>
          <TaskItem
            v-for="task in section.tasks"
            :key="task.id"
            :task="task"
            :draggable="store.canDragTasks"
            :is-dragging="taskDrag.draggingId.value === task.id"
            :is-drop-target="taskDrag.dragOverId.value === task.id"
            :drop-position="taskDrag.dragOverId.value === task.id ? taskDrag.dropPosition.value : ''"
          />
        </div>
      </template>

      <template v-else-if="store.currentView === 'trash'">
        <TaskItem v-for="task in store.trash" :key="task.id" :task="task" is-trash />
      </template>

      <template v-else>
        <TaskItem
          v-for="task in store.uncompletedTasks"
          :key="task.id"
          :task="task"
          :draggable="store.canDragTasks"
          :is-dragging="taskDrag.draggingId.value === task.id"
          :is-drop-target="taskDrag.dragOverId.value === task.id"
          :drop-position="taskDrag.dragOverId.value === task.id ? taskDrag.dropPosition.value : ''"
        />

        <div v-if="store.completedTasks.length" class="task-section completed-section">
          <button class="completed-toggle" type="button" @click="toggleCompleted">
            <ChevronRight :size="16" :class="{ rotated: store.settings.completedVisible }" />
            <span>已完成 {{ store.completedTasks.length }}</span>
          </button>
          <TaskItem
            v-if="store.settings.completedVisible"
            v-for="task in store.completedTasks"
            :key="task.id"
            :task="task"
          />
        </div>
      </template>

      <div v-if="isEmpty" class="empty-state">
        <div class="empty-state__icon">
          <CheckCheck :size="28" />
        </div>
        <h2>{{ emptyTitle }}</h2>
        <p>{{ emptyText }}</p>
      </div>
    </section>
    </template>
  </main>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import {
  ArchiveX,
  ArrowUpDown,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Flag,
  Info,
  PanelRight,
  Plus,
  Repeat2,
  Search,
  Tags
} from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { useDragSort } from '@/composables/useDragSort'
import TaskItem from './TaskItem.vue'
import CalendarView from './CalendarView.vue'
import StatsView from './StatsView.vue'

const store = useTaskStore()
const newTaskTitle = ref('')
const quickInput = ref(null)
const sortMenuOpen = ref(false)
const sortOptions = [
  { value: 'default', label: '智能排序' },
  { value: 'date', label: '截止日期近' },
  { value: 'dateDesc', label: '截止日期远' },
  { value: 'priority', label: '重要优先' },
  { value: 'createdDesc', label: '最近创建' },
  { value: 'name', label: '按名称' }
]

const taskDrag = useDragSort({
  scrollContainerSelector: '.task-list__content',
  onDrop(sourceId, targetId, position) {
    // Find which scope the tasks belong to
    if (store.currentView === 'planned') {
      const section = store.plannedSections.find(s => s.tasks.some(t => t.id === sourceId || t.id === targetId))
      if (section) {
        store.reorderTask(sourceId, targetId, section.tasks.map(t => t.id), position)
      }
    } else {
      store.reorderTask(sourceId, targetId, store.uncompletedTasks.map(t => t.id), position)
    }
  },
  getItemEl(target) {
    const handle = target.closest?.('.task-drag-handle')
    if (!handle) return null
    const article = handle.closest('.task-item')
    if (!article) return null
    const taskId = article.dataset.taskId
    return taskId ? { id: taskId, el: article } : null
  },
  findItemAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y)
    for (const el of elements) {
      const article = el.closest?.('.task-item')
      if (!article) continue
      const taskId = article.dataset.taskId
      if (!taskId) continue
      // Determine position: top half = before, bottom half = after
      const rect = article.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      const position = y < midY ? 'before' : 'after'
      return { id: taskId, position }
    }
    return null
  }
})

function handleMouseDown(e) {
  if (!store.canDragTasks) return
  const handle = e.target.closest('.task-drag-handle')
  if (!handle) return
  const article = handle.closest('.task-item')
  if (!article) return
  const taskId = article.dataset.taskId
  if (taskId) taskDrag.startDrag(e, taskId)
}

const viewMeta = computed(() => {
  const system = {
    today: { title: '今日', eyebrow: '聚焦今天真正要推进的事' },
    inbox: { title: '收集箱', eyebrow: '先记录，再整理' },
    planned: { title: '计划', eyebrow: '按时间推进任务' },
    important: { title: '重要', eyebrow: '需要优先处理的任务' },
    calendar: { title: '月历', eyebrow: '按日期查看和安排任务' },
    stats: { title: '统计', eyebrow: '回顾近期推进情况' },
    completed: { title: '已完成', eyebrow: '回顾和清理已经完成的事项' },
    trash: { title: '垃圾桶', eyebrow: '恢复或永久删除任务' },
    search: { title: '搜索', eyebrow: '查找任务、标签和备注' }
  }
  if (system[store.currentView]) return system[store.currentView]
  return {
    title: store.currentList?.name || '清单',
    eyebrow: '当前清单'
  }
})

const sortLabel = computed(() => {
  return sortOptions.find(option => option.value === store.sortBy)?.label || '智能排序'
})

const showTaskActions = computed(() => !['calendar', 'stats'].includes(store.currentView))

const quickPlaceholder = computed(() => {
  if (store.currentView === 'today') return '添加到今日，例如：明天 9点 写周报 #工作'
  if (store.currentView === 'important') return '添加重要任务'
  return '添加任务，可输入"明天 18点""每周""#标签"'
})

const quickParseChips = computed(() => {
  const input = newTaskTitle.value.trim()
  if (!input) return []
  const chips = []
  const tagMatches = [...input.matchAll(/#([\p{L}\p{N}_-]+)/gu)]

  if (/(今天|今日)/.test(input)) chips.push({ type: 'date', label: '今天', icon: CalendarClock })
  else if (/明天/.test(input)) chips.push({ type: 'date', label: '明天', icon: CalendarClock })
  else if (/后天/.test(input)) chips.push({ type: 'date', label: '后天', icon: CalendarClock })
  else if (/(下周|下星期)/.test(input)) chips.push({ type: 'date', label: '下周', icon: CalendarClock })
  else if (store.currentView === 'today') chips.push({ type: 'date', label: '今天', icon: CalendarClock })

  const timeMatch = input.match(/(?:^|\s)(\d{1,2})[:：点](\d{2})?/)
  if (timeMatch) chips.push({ type: 'date', label: `${timeMatch[1].padStart(2, '0')}:${timeMatch[2] || '00'}`, icon: CalendarClock })

  if (/每天|每日/.test(input)) chips.push({ type: 'repeat', label: '每天重复', icon: Repeat2 })
  else if (/每周|每星期/.test(input)) chips.push({ type: 'repeat', label: '每周重复', icon: Repeat2 })
  else if (/每月/.test(input)) chips.push({ type: 'repeat', label: '每月重复', icon: Repeat2 })

  if (/重要|高优先级/.test(input) || store.currentView === 'important') chips.push({ type: 'priority', label: '重要', icon: Flag })
  for (const match of tagMatches.slice(0, 3)) {
    chips.push({ type: 'tag', label: `#${match[1]}`, icon: Tags })
  }
  return chips.slice(0, 5)
})

const readonlyHint = computed(() => {
  const map = {
    planned: '计划视图按截止日期自动汇总，请在今日、收集箱或清单中添加任务。',
    completed: '已完成视图用于回顾和清理任务。',
    trash: '垃圾桶中的任务可以恢复或永久删除。'
  }
  return map[store.currentView] || ''
})

const isEmpty = computed(() => {
  if (store.currentView === 'trash') return store.trash.length === 0
  if (store.currentView === 'planned') return store.plannedSections.length === 0
  return store.filteredTasks.length === 0
})

const emptyTitle = computed(() => {
  const map = {
    today: '今天很清爽',
    inbox: '收集箱为空',
    planned: '还没有计划任务',
    important: '没有重要任务',
    completed: '还没有完成记录',
    trash: '垃圾桶为空',
    search: '没有搜索结果'
  }
  return map[store.currentView] || '这个清单还没有任务'
})

const emptyText = computed(() => {
  const map = {
    today: '添加一个今日任务，或从建议中挑选今天要推进的事项。',
    inbox: '把临时想法先放在这里，之后再安排日期或清单。',
    planned: '给任务设置截止日期后，它们会出现在这里。',
    important: '给任务点亮重要标记后，它们会集中到这里。',
    completed: '完成任务后可以在这里回看。',
    trash: '删除后的任务会先进入垃圾桶。',
    search: '换个关键词试试，支持标题、备注和标签。'
  }
  return map[store.currentView] || '使用上方输入框添加第一条任务。'
})

function addTask() {
  const title = newTaskTitle.value.trim()
  if (!title) return
  store.addTask(title)
  newTaskTitle.value = ''
  nextTick(() => quickInput.value?.focus())
}

function selectSort(value) {
  store.setSort(value)
  sortMenuOpen.value = false
}

function closeSortMenu() {
  sortMenuOpen.value = false
}

function handleSortKeydown(event) {
  if (event.key === 'Escape') closeSortMenu()
}

onMounted(() => {
  window.addEventListener('click', closeSortMenu)
  window.addEventListener('keydown', handleSortKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeSortMenu)
  window.removeEventListener('keydown', handleSortKeydown)
})

function toggleCompleted() {
  store.updateSettings({ completedVisible: !store.settings.completedVisible })
}

function clearCompleted() {
  const count = store.filteredTasks.filter(task => task.completed && !task.deleted).length
  if (!count) {
    store.showNotice('没有可清理的已完成任务', 'info')
    return
  }
  if (window.confirm(`清理 ${count} 个已完成任务？它们会进入垃圾桶。`)) {
    store.clearCompletedInCurrentView()
    store.showNotice(`已清理 ${count} 个任务`, 'success')
  }
}
</script>
