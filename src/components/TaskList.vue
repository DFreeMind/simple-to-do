<template>
  <main class="task-list">
    <header class="task-list__header">
      <div>
        <p class="eyebrow">{{ viewMeta.eyebrow }}</p>
        <h1>{{ viewMeta.title }}</h1>
      </div>
      <div class="header-actions">
        <ViewModeToggle v-if="showTaskActions && !['planned', 'completed', 'trash'].includes(store.currentView)" v-model="viewMode" />
        <button v-if="showTaskActions && viewMode === 'group' && !['planned', 'completed', 'trash'].includes(store.currentView)" class="icon-btn" type="button" title="新建分组" @click="addGroup">
          <Plus :size="18" />
        </button>
        <button
          v-if="showTaskActions && viewMode === 'group' && store.currentListGroups.length && !['planned', 'completed', 'trash'].includes(store.currentView)"
          class="icon-btn"
          type="button"
          :title="allGroupsExpanded ? '折叠全部' : '展开全部'"
          @click="toggleAllGroups"
        >
          <ChevronsDown v-if="!allGroupsExpanded" :size="18" />
          <ChevronsUp v-else :size="18" />
        </button>
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
      ref="contentRef"
      class="task-list__content"
      :class="{ 'task-list__content--empty': isEmpty, 'is-scrolling': isScrolling }"
      @mousedown="handleMouseDown"
      @scroll.passive="onContentScroll"
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
        <div v-if="store.listTrash.length" class="task-section">
          <h2>已删除清单</h2>
          <article v-for="list in store.listTrash" :key="list.id" class="trash-list-card">
            <div class="trash-list-card__icon">
              <Folder :size="18" />
            </div>
            <div class="trash-list-card__body">
              <strong>{{ list.name }}</strong>
              <span>{{ list.taskCount || 0 }} 个任务 · {{ formatTrashDate(list.deletedAt) }}</span>
            </div>
            <div class="task-actions task-actions--visible">
              <button class="ghost-icon" type="button" title="恢复清单" aria-label="恢复清单" @click.stop="store.restoreList(list.id)">
                <RotateCcw :size="16" />
              </button>
              <button class="ghost-icon danger" type="button" title="永久删除清单" aria-label="永久删除清单" @click.stop="deleteListForever(list)">
                <Trash2 :size="16" />
              </button>
            </div>
          </article>
        </div>
        <TaskItem v-for="task in store.visibleTrashTasks" :key="task.id" :task="task" is-trash />
      </template>

      <template v-else>
        <!-- 列表模式 -->
        <template v-if="viewMode === 'list'">
          <template v-if="store.pinnedTasks.length">
            <div class="pinned-section">
              <div class="task-group-header is-system pinned-header">
                <div class="task-group-header__main">
                  <button class="task-group-header__toggle" type="button" :title="pinnedVisible ? '折叠置顶' : '展开置顶'" @click="pinnedVisible = !pinnedVisible">
                  <ChevronDown :size="16" :class="{ rotated: !pinnedVisible }" />
                  </button>
                  <span class="task-group-header__emoji">📌</span>
                  <span class="task-group-header__name">置顶</span>
                  <span class="task-group-header__count">{{ store.pinnedTasks.length }}</span>
                </div>
              </div>
              <TaskItem
                v-if="pinnedVisible"
                v-for="task in store.pinnedTasks"
                :key="task.id"
                :task="task"
                :draggable="store.canDragTasks"
                :is-dragging="taskDrag.draggingId.value === task.id"
                :is-drop-target="taskDrag.dragOverId.value === task.id"
                :drop-position="taskDrag.dragOverId.value === task.id ? taskDrag.dropPosition.value : ''"
              />
            </div>
          </template>

          <TaskItem
            v-for="task in store.unpinnedTasks"
            :key="task.id"
            :task="task"
            :draggable="store.canDragTasks"
            :is-dragging="taskDrag.draggingId.value === task.id"
            :is-drop-target="taskDrag.dragOverId.value === task.id"
            :drop-position="taskDrag.dragOverId.value === task.id ? taskDrag.dropPosition.value : ''"
          />
        </template>

        <!-- 分组模式 -->
        <template v-else>
          <template v-if="store.pinnedTasks.length">
            <div class="pinned-section">
              <div class="task-group-header is-system pinned-header">
                <div class="task-group-header__main">
                  <button class="task-group-header__toggle" type="button" :title="pinnedVisible ? '折叠置顶' : '展开置顶'" @click="pinnedVisible = !pinnedVisible">
                  <ChevronDown :size="16" :class="{ rotated: !pinnedVisible }" />
                  </button>
                  <span class="task-group-header__emoji">📌</span>
                  <span class="task-group-header__name">置顶</span>
                  <span class="task-group-header__count">{{ store.pinnedTasks.length }}</span>
                </div>
              </div>
              <TaskItem
                v-if="pinnedVisible"
                v-for="task in store.pinnedTasks"
                :key="task.id"
                :task="task"
                :draggable="store.canDragTasks"
                :is-dragging="taskDrag.draggingId.value === task.id"
                :is-drop-target="taskDrag.dragOverId.value === task.id"
                :drop-position="taskDrag.dragOverId.value === task.id ? taskDrag.dropPosition.value : ''"
              />
            </div>
          </template>

          <div v-for="group in store.groupedTasks" :key="group.id || 'ungrouped'" class="task-group" :class="[getGroupToneClass(group), { 'is-dragging': groupDrag.draggingId.value === group.id, 'is-drop-target': groupDrag.dragOverId.value === group.id, [`drop-${groupDrag.dropPosition.value}`]: groupDrag.dragOverId.value === group.id }]">
            <TaskGroupHeader
              :group="{ ...group, collapsed: isGroupCollapsed(group.id) }"
              @mousedown="handleGroupMouseDown($event, group.id)"
              @toggle="toggleGroupCollapse"
              @addTask="addGroupTask"
              @menu="showGroupMenu"
            />
            <template v-if="!isGroupCollapsed(group.id)">
              <TaskItem
                v-for="task in group.tasks"
                :key="task.id"
                :task="task"
                :draggable="store.canDragTasks"
                :is-dragging="taskDrag.draggingId.value === task.id"
                :is-drop-target="taskDrag.dragOverId.value === task.id"
                :drop-position="taskDrag.dragOverId.value === task.id ? taskDrag.dropPosition.value : ''"
              />
            </template>
          </div>
        </template>

        <!-- 分组右键菜单 -->
        <div
          v-if="groupMenu.visible"
          ref="groupMenuRef"
          class="context-menu"
          :style="groupMenuStyle"
          role="menu"
          tabindex="-1"
          @click.stop
          @keydown.esc="closeGroupMenu"
        >
          <button class="context-item" role="menuitem" type="button" @click="renameGroup">
            <Pencil :size="15" /> 重命名
          </button>
          <button class="context-item context-item--danger" role="menuitem" type="button" @click="deleteGroup">
            <Trash2 :size="15" /> 删除分组
          </button>
        </div>

        <!-- 分组添加任务弹出框 -->
        <div
          v-if="activeGroupAddId"
          class="group-add-popup-overlay"
          @click="cancelGroupAdd"
        >
          <div class="group-add-popup" :style="groupAddPopupStyle" @click.stop>
            <div class="group-add-popup__row">
              <Plus :size="19" />
              <input
                ref="groupAddInputRef"
                v-model="groupAddTitle"
                type="text"
                placeholder="添加任务，可输入'明天 18点''每周''#标签'"
                aria-label="快速添加任务"
                @keydown.enter="submitGroupAdd"
                @keydown.escape="cancelGroupAdd"
              />
              <button class="primary-btn" type="button" :disabled="!groupAddTitle.trim()" @click="submitGroupAdd">添加</button>
            </div>
          </div>
        </div>

        <div v-if="store.completedTasks.length" class="completed-section">
          <div class="task-group-header is-system completed-header">
            <div class="task-group-header__main">
              <button
                class="task-group-header__toggle"
                type="button"
                :title="store.settings.completedVisible ? '折叠已完成' : '展开已完成'"
                @click="toggleCompleted"
              >
                <ChevronDown :size="16" :class="{ rotated: !store.settings.completedVisible }" />
              </button>
              <span class="task-group-header__emoji">🎉</span>
              <span class="task-group-header__name">已完成</span>
              <span class="task-group-header__count">{{ store.completedTasks.length }}</span>
            </div>
            <div class="task-group-header__actions">
              <button
                class="task-group-header__menu"
                type="button"
                title="清除已完成"
                aria-label="清除已完成"
                @click.stop="clearCompleted"
              >
                <ArchiveX :size="14" />
              </button>
            </div>
          </div>
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

    <div
      v-show="scrollIndicator.visible"
      class="task-list__scroll-indicator"
      :class="{ 'is-visible': isScrolling }"
      :style="{ top: `${scrollIndicator.top}px`, height: `${scrollIndicator.height}px` }"
      aria-hidden="true"
    ></div>

    <ConfirmDialog
      :visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :type="confirmDialog.type"
      @confirm="confirmDialog.onConfirm"
      @cancel="confirmDialog.visible = false"
    />

    <InputDialog
      :visible="inputDialog.visible"
      :title="inputDialog.title"
      :message="inputDialog.message"
      :placeholder="inputDialog.placeholder"
      :default-value="inputDialog.defaultValue"
      :confirm-text="inputDialog.confirmText"
      :type="inputDialog.type"
      @confirm="inputDialog.onConfirm"
      @cancel="inputDialog.visible = false"
    />

    <!-- 分组创建/重命名弹窗 -->
    <Teleport to="body">
      <div v-if="groupDialog.visible" class="input-overlay" @click.self="closeGroupDialog">
        <div class="input-dialog group-dialog" @click.stop>
          <button class="input-close" type="button" title="关闭" @click="closeGroupDialog">
            <X :size="18" />
          </button>
          <div class="input-header input-header--edit">
            <div class="input-icon-wrapper">
              <div class="input-icon input-icon--edit">
                <FolderInput :size="28" />
              </div>
            </div>
          </div>
          <div class="input-body group-dialog__body">
            <h3>{{ groupDialog.title }}</h3>
            <p class="input-description">为任务分组，方便按主题整理和回顾</p>

            <div class="group-dialog__name-row">
              <button ref="emojiButtonRef" type="button" class="group-dialog__emoji-trigger" title="选择 Emoji" @click.stop="toggleEmojiPicker">
                <span v-if="groupDialog.emoji">{{ groupDialog.emoji }}</span>
                <Smile v-else :size="20" />
              </button>
              <div class="input-field-wrapper group-dialog__name-field">
                <input
                  ref="groupDialogInput"
                  v-model="groupDialog.name"
                  type="text"
                  placeholder="分组名称，例如：工作"
                  class="input-field"
                  maxlength="30"
                  @keydown.enter="confirmGroupDialog"
                />
              </div>
            </div>

            <div class="group-dialog__section">
              <div class="group-dialog__section-title"><span>背景颜色</span></div>
              <button type="button" class="group-dialog__auto-color" :class="{ active: groupDialog.color === 'auto' }" @click="groupDialog.color = 'auto'">
                <span class="group-dialog__auto-swatch">✦</span>
                <span><strong>自动配色</strong><small>根据当前主题生成协调色</small></span>
                <Check v-if="groupDialog.color === 'auto'" :size="16" />
              </button>
              <div class="group-dialog__manual-colors">
                <span>手动选择</span>
                <div class="group-dialog__color-options">
                <button
                  v-for="option in groupColorOptions.filter(option => option.id !== 'auto')"
                  :key="option.id"
                  type="button"
                  class="group-dialog__color-option"
                  :class="{ active: groupDialog.color === option.id }"
                  :title="option.label"
                  :aria-label="option.label"
                  :style="{ '--swatch-color': option.color }"
                  @click="groupDialog.color = option.id"
                >
                  <span class="group-dialog__color-swatch"></span>
                  <Check v-if="groupDialog.color === option.id" :size="13" />
                </button>
                </div>
              </div>
            </div>
          </div>
          <div class="input-footer">
            <button class="input-btn input-btn--cancel" type="button" @click="closeGroupDialog">
              取消
            </button>
            <button
              class="input-btn input-btn--edit"
              type="button"
              :disabled="!groupDialog.name.trim()"
              @click="confirmGroupDialog"
            >
              {{ groupDialog.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <EmojiPicker
      v-model="groupDialog.emoji"
      :visible="groupDialog.showEmoji"
      :anchor-el="emojiButtonEl"
      @update:visible="groupDialog.showEmoji = $event"
    />
  </main>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import {
  ArchiveX,
  ArrowUpDown,
  CalendarClock,
  FolderInput,
  Pencil,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Flag,
  Folder,
  Info,
  PanelRight,
  Plus,
  Repeat2,
  RotateCcw,
  Search,
  Smile,
  Tags,
  Trash2,
  X
} from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { useDragSort } from '@/composables/useDragSort'
import TaskItem from './TaskItem.vue'
import TaskGroupHeader from './TaskGroupHeader.vue'
import EmojiPicker from './EmojiPicker.vue'
import ViewModeToggle from './ViewModeToggle.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import InputDialog from './InputDialog.vue'

const store = useTaskStore()
const newTaskTitle = ref('')
const quickInput = ref(null)
const sortMenuOpen = ref(false)
const pinnedVisible = ref(true)
const groupCollapseState = reactive({})
const contentRef = ref(null)
const isScrolling = ref(false)
const scrollIndicator = reactive({ visible: false, top: 0, height: 0 })
let scrollTimer = null
const groupMenu = reactive({ visible: false, x: 0, y: 0, groupId: null })
const groupMenuRef = ref(null)
const groupDialog = reactive({
  visible: false,
  title: '新建分组',
  name: '',
  emoji: '',
  color: 'auto',
  showEmoji: false,
  confirmText: '创建',
  editingGroupId: null
})
const groupDialogInput = ref(null)
const emojiButtonRef = ref(null)
const emojiButtonEl = computed(() => emojiButtonRef.value?.$el || emojiButtonRef.value)
const groupColorOptions = [
  { id: 'auto', label: '自动', color: '' },
  { id: 'accent', label: '主题', color: 'var(--accent)' },
  { id: 'blue', label: '海蓝', color: '#5b8def' },
  { id: 'violet', label: '紫罗兰', color: '#8b76df' },
  { id: 'amber', label: '暖橙', color: '#d99a42' },
  { id: 'rose', label: '玫瑰', color: '#d97991' },
  { id: 'green', label: '草绿', color: '#62a97b' }
]
const activeGroupAddId = ref(null)
const activeGroupAddGroupId = ref(null)
const groupAddTitle = ref('')
const groupAddInputRef = ref(null)
const groupAddPopupPos = reactive({ x: 0, y: 0 })
const groupAddPopupStyle = computed(() => {
  const w = 420
  const h = 52
  const pad = 12
  let x = groupAddPopupPos.x
  let y = groupAddPopupPos.y
  if (x + w > window.innerWidth - pad) x = window.innerWidth - w - pad
  if (y + h > window.innerHeight - pad) y = window.innerHeight - h - pad
  if (x < pad) x = pad
  if (y < pad) y = pad
  return { left: `${x}px`, top: `${y}px` }
})
const groupMenuStyle = computed(() => {
  const menuW = 140
  const menuH = 80
  const pad = 8
  let x = groupMenu.x
  let y = groupMenu.y
  if (x + menuW > window.innerWidth - pad) x = window.innerWidth - menuW - pad
  if (y + menuH > window.innerHeight - pad) y = window.innerHeight - menuH - pad
  if (x < pad) x = pad
  if (y < pad) y = pad
  return { left: `${x}px`, top: `${y}px` }
})
const confirmDialog = reactive({
  visible: false,
  title: '',
  message: '',
  confirmText: '确定',
  type: 'danger',
  onConfirm: () => {}
})
const inputDialog = reactive({
  visible: false,
  title: '',
  message: '',
  placeholder: '',
  defaultValue: '',
  confirmText: '保存',
  type: 'edit',
  onConfirm: () => {}
})
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
  onDragStart: () => store.playDragStartSound(),
  onDragOver: () => store.playDragOverSound(),
  onDragEnd: () => store.playDragEndSound(),
  onDrop(sourceId, targetId, position, groupId) {
    // 如果是分组模式且有目标分组，移动任务到分组
    if (viewMode.value === 'group' && groupId !== undefined) {
      store.moveTaskToGroup(sourceId, groupId)
    }

    // 如果是拖到分组头部（__group__前缀），只移动分组，不重排序
    if (targetId.startsWith('__group__')) return

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
    const article = target.closest?.('.task-item')
    if (!article) return null
    const taskId = article.dataset.taskId
    return taskId ? { id: taskId, el: article } : null
  },
  findItemAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y)
    for (const el of elements) {
      // 检查是否拖到了分组头部区域
      const groupHeader = el.closest?.('.task-group-header')
      if (groupHeader) {
        const groupId = groupHeader.dataset.groupId
        if (groupId) {
          // 返回分组ID作为目标
          return { id: '__group__' + groupId, position: 'after', groupId }
        }
      }

      const article = el.closest?.('.task-item')
      if (!article) continue
      const taskId = article.dataset.taskId
      if (!taskId) continue
      // Determine position: top half = before, bottom half = after
      const rect = article.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      const position = y < midY ? 'before' : 'after'

      // 查找任务所属的分组
      const groupEl = article.closest('.task-group')
      const groupId = groupEl?.querySelector('.task-group-header')?.dataset.groupId || null

      return { id: taskId, position, groupId }
    }
    return null
  }
})

const groupDrag = useDragSort({
  scrollContainerSelector: '.task-list__content',
  onDragStart: () => store.playDragStartSound(),
  onDragOver: () => store.playDragOverSound(),
  onDragEnd: () => store.playDragEndSound(),
  onDrop(sourceId, targetId, position) {
    store.reorderTaskGroup(sourceId, targetId, position)
  },
  getItemEl(target) {
    const header = target.closest?.('.task-group-header:not(.is-system)')
    const groupId = header?.dataset.groupId
    return groupId ? { id: groupId, el: header } : null
  },
  findItemAtPoint(x, y) {
    const group = document.elementsFromPoint(x, y)
      .map(el => el.closest?.('.task-group'))
      .find(Boolean)
    const header = group?.querySelector('.task-group-header:not(.is-system)')
    const groupId = header?.dataset.groupId
    if (!groupId) return null
    const rect = group.getBoundingClientRect()
    return { id: groupId, position: y < rect.top + rect.height / 2 ? 'before' : 'after' }
  }
})

function handleMouseDown(e) {
  if (!store.canDragTasks) return
  if (isDragIgnored(e.target)) return
  const article = e.target.closest('.task-item')
  if (!article) return
  const taskId = article.dataset.taskId
  if (taskId) taskDrag.startDrag(e, taskId)
}

function handleGroupMouseDown(e, groupId) {
  if (isDragIgnored(e.target)) return
  groupDrag.startDrag(e, groupId)
}

function isDragIgnored(target) {
  return Boolean(target.closest?.('button, input, textarea, select, a, .context-menu'))
}

function getGroupToneClass(group) {
  if (!group.id) return 'task-group--ungrouped'
  if (group.color && group.color !== 'auto') return `task-group--color-${group.color}`
  const groupId = group.id
  let hash = 0
  for (const char of groupId) hash = ((hash << 5) - hash) + char.charCodeAt(0)
  return `task-group--tone-${Math.abs(hash) % 4}`
}

function updateScrollIndicator(element = contentRef.value) {
  if (!element) return
  const { clientHeight, scrollHeight, scrollTop, offsetTop } = element
  const hasOverflow = scrollHeight > clientHeight + 1
  scrollIndicator.visible = hasOverflow
  if (!hasOverflow) return
  const height = Math.max(32, Math.round((clientHeight * clientHeight) / scrollHeight))
  const maxTop = Math.max(0, clientHeight - height)
  const progress = (scrollHeight - clientHeight) > 0 ? scrollTop / (scrollHeight - clientHeight) : 0
  scrollIndicator.height = height
  scrollIndicator.top = offsetTop + Math.round(maxTop * progress)
}

function onContentScroll(event) {
  updateScrollIndicator(event?.currentTarget)
  isScrolling.value = true
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    isScrolling.value = false
  }, 850)
}

const viewMeta = computed(() => {
  const system = {
    today: { title: '今日', eyebrow: '聚焦今天真正要推进的事' },
    inbox: { title: '收集箱', eyebrow: '先记录，再整理' },
    planned: { title: '计划', eyebrow: '按时间推进任务' },
    important: { title: '重要', eyebrow: '需要优先处理的任务' },
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

const showTaskActions = computed(() => true)

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
  if (store.currentView === 'trash') return store.visibleTrashTasks.length === 0 && store.listTrash.length === 0
  if (store.currentView === 'planned') return store.plannedSections.length === 0
  return store.filteredTasks.length === 0
})

const viewMode = computed({
  get: () => store.currentViewMode,
  set: (mode) => store.setViewMode(store.currentView, mode)
})

function toggleGroupCollapse(groupId) {
  if (groupId) {
    store.setTaskGroupCollapsed(groupId, !isGroupCollapsed(groupId))
    return
  }
  groupCollapseState.__ungrouped__ = !groupCollapseState.__ungrouped__
}

function isGroupCollapsed(groupId) {
  if (!groupId) return !!groupCollapseState.__ungrouped__
  return !!store.currentListGroups.find(group => group.id === groupId)?.collapsed
}

const allGroupsExpanded = computed(() => {
  const allKeys = store.groupedTasks.map(g => g.id || '__ungrouped__')
  return allKeys.length > 0 && allKeys.every(key => !isGroupCollapsed(key === '__ungrouped__' ? null : key))
})

function toggleAllGroups() {
  const allExpanded = allGroupsExpanded.value
  const allKeys = store.groupedTasks.map(g => g.id || '__ungrouped__')
  allKeys.forEach(key => {
    if (key === '__ungrouped__') groupCollapseState.__ungrouped__ = allExpanded
    else store.setTaskGroupCollapsed(key, allExpanded)
  })
}

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

function addGroupTask(groupId, event) {
  const key = groupId || '__ungrouped__'
  // 点击同一个分组的添加按钮则关闭
  if (activeGroupAddId.value === key) {
    cancelGroupAdd()
    return
  }
  // 定位弹出框到按钮附近
  if (event) {
    const rect = event.target.getBoundingClientRect()
    groupAddPopupPos.x = rect.left
    groupAddPopupPos.y = rect.bottom + 6
  }
  activeGroupAddId.value = key
  activeGroupAddGroupId.value = groupId
  groupAddTitle.value = ''
  nextTick(() => groupAddInputRef.value?.focus())
}

function submitGroupAdd() {
  const title = groupAddTitle.value.trim()
  if (!title) return
  const task = store.addTask(title)
  if (task && activeGroupAddGroupId.value) {
    store.moveTaskToGroup(task.id, activeGroupAddGroupId.value)
  }
  groupAddTitle.value = ''
  nextTick(() => groupAddInputRef.value?.focus())
}

function cancelGroupAdd() {
  activeGroupAddId.value = null
  activeGroupAddGroupId.value = null
  groupAddTitle.value = ''
}

function showGroupMenu({ groupId, event }) {
  groupMenu.groupId = groupId
  groupMenu.x = event.clientX
  groupMenu.y = event.clientY
  groupMenu.visible = true
  nextTick(() => {
    document.addEventListener('click', closeGroupMenu, { once: true })
  })
}

function closeGroupMenu() {
  groupMenu.visible = false
  groupMenu.groupId = null
}

function renameGroup() {
  const groupId = groupMenu.groupId
  closeGroupMenu()
  if (!groupId) return
  const group = store.currentListGroups.find(g => g.id === groupId)
  if (!group) return
  groupDialog.title = '重命名分组'
  groupDialog.name = group.name
  groupDialog.emoji = group.emoji || ''
  groupDialog.color = group.color || 'auto'
  groupDialog.showEmoji = false
  groupDialog.confirmText = '保存'
  groupDialog.editingGroupId = groupId
  groupDialog.visible = true
  nextTick(() => groupDialogInput.value?.focus())
}

function closeGroupDialog() {
  groupDialog.visible = false
  groupDialog.showEmoji = false
  groupDialog.editingGroupId = null
}

function toggleEmojiPicker() {
  groupDialog.showEmoji = !groupDialog.showEmoji
  if (groupDialog.showEmoji) {
    nextTick(() => groupDialogInput.value?.focus())
  }
}

function handleGroupDialogKeydown(event) {
  if (event.key === 'Escape') {
    if (groupDialog.showEmoji) {
      groupDialog.showEmoji = false
    } else {
      closeGroupDialog()
    }
  }
}

function deleteGroup() {
  const groupId = groupMenu.groupId
  closeGroupMenu()
  if (!groupId) return
  const group = store.currentListGroups.find(g => g.id === groupId)
  if (!group) return
  const taskCount = store.groupedTasks.find(g => g.id === groupId)?.tasks?.length || 0
  confirmDialog.title = '删除分组'
  confirmDialog.message = taskCount > 0
    ? `分组"${group.name}"下有 ${taskCount} 个任务，删除后任务将移至"未分组"。确定删除？`
    : `确定删除分组"${group.name}"？`
  confirmDialog.confirmText = '删除'
  confirmDialog.type = 'danger'
  confirmDialog.onConfirm = () => {
    // 把分组内的任务移到未分组
    const tasks = store.groupedTasks.find(g => g.id === groupId)?.tasks || []
    tasks.forEach(t => store.moveTaskToGroup(t.id, null))
    store.deleteTaskGroup(groupId)
    store.showNotice(`已删除分组"${group.name}"`, 'success')
    confirmDialog.visible = false
  }
  confirmDialog.visible = true
}

function addGroup() {
  groupDialog.title = '新建分组'
  groupDialog.name = ''
  groupDialog.emoji = ''
  groupDialog.color = 'auto'
  groupDialog.showEmoji = false
  groupDialog.confirmText = '创建'
  groupDialog.editingGroupId = null
  groupDialog.visible = true
  nextTick(() => groupDialogInput.value?.focus())
}

function confirmGroupDialog() {
  const name = groupDialog.name.trim()
  if (!name) return
  if (groupDialog.editingGroupId) {
    store.renameTaskGroup(groupDialog.editingGroupId, name, groupDialog.emoji, groupDialog.color)
  } else {
    store.addTaskGroup(name, store.currentView, groupDialog.emoji, groupDialog.color)
  }
  closeGroupDialog()
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
  window.addEventListener('keydown', handleGroupDialogKeydown)
  nextTick(() => updateScrollIndicator())
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeSortMenu)
  window.removeEventListener('keydown', handleSortKeydown)
  window.removeEventListener('keydown', handleGroupDialogKeydown)
  if (scrollTimer) clearTimeout(scrollTimer)
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
  confirmDialog.title = '清理已完成任务'
  confirmDialog.message = `清理 ${count} 个已完成任务？它们会进入垃圾桶。`
  confirmDialog.confirmText = '清理'
  confirmDialog.type = 'danger'
  confirmDialog.onConfirm = () => {
    store.clearCompletedInCurrentView()
    store.showNotice(`已清理 ${count} 个任务`, 'success')
    confirmDialog.visible = false
  }
  confirmDialog.visible = true
}

function formatTrashDate(value) {
  if (!value) return '删除时间未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '删除时间未知'
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function deleteListForever(list) {
  confirmDialog.title = '永久删除清单'
  confirmDialog.message = `永久删除清单"${list.name}"及其任务？此操作不可撤销。`
  confirmDialog.confirmText = '永久删除'
  confirmDialog.type = 'danger'
  confirmDialog.onConfirm = () => {
    store.permanentDeleteList(list.id)
    confirmDialog.visible = false
  }
  confirmDialog.visible = true
}
</script>
