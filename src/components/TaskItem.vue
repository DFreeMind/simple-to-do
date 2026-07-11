<template>
  <article
    class="task-item"
    :data-task-id="task.id"
    :class="{
      selected: store.selectedTaskId === task.id,
      completed: task.completed,
      pinned: task.pinned,
      'is-dragging': isDragging,
      'drop-target-before': isDropTarget && dropPosition === 'before',
      'drop-target-after': isDropTarget && dropPosition === 'after',
      'no-drag-handle': !draggable || isTrash
    }"
    tabindex="0"
    role="button"
    :aria-label="`${task.completed ? '已完成' : '未完成'}任务：${task.title}`"
    @click="store.selectTask(task.id)"
    @keydown.enter.prevent="store.selectTask(task.id)"
    @keydown.space.prevent="store.selectTask(task.id)"
  >
    <span
      v-if="draggable && !isTrash"
      class="task-drag-handle"
      role="button"
      tabindex="-1"
      title="拖动排序"
      aria-label="拖动任务排序"
    >
      <GripVertical :size="16" />
    </span>

    <button
      class="task-check"
      :class="{ checked: task.completed }"
      type="button"
      :aria-label="task.completed ? '标记为未完成' : '标记为完成'"
      @click.stop="store.completeTask(task.id)"
    >
      <Check v-if="task.completed" :size="15" />
    </button>

    <div class="task-main">
      <div class="task-title-row">
        <span class="task-title">{{ task.title }}</span>
        <Pin v-if="task.pinned" :size="13" class="inline-icon" />
      </div>
      <div class="task-meta">
        <span v-if="list" class="meta-chip">
          <span class="color-dot" :style="{ backgroundColor: list.color }"></span>
          {{ list.name }}
        </span>
        <span v-if="store.currentView === 'search' && taskGroup" class="meta-chip">
          {{ taskGroup.emoji || '📂' }} {{ taskGroup.name }}
        </span>
        <span v-if="task.dueDate" class="meta-chip" :class="{ overdue: isOverdue }">
          <CalendarClock :size="13" />
          {{ formatDate(task.dueDate) }}
        </span>
        <span v-if="store.isInMyDay(task)" class="meta-chip">
          <Sun :size="13" />
          今日
        </span>
        <span v-if="task.repeatRule" class="meta-chip">
          <Repeat2 :size="13" />
          {{ repeatLabel }}
        </span>
        <span v-if="task.subtasks?.length" class="meta-chip">
          <ListChecks :size="13" />
          {{ completedSubtasks }}/{{ task.subtasks.length }}
        </span>
        <span v-if="task.attachments?.length" class="meta-chip">
          <Paperclip :size="13" />
          {{ task.attachments.length }}
        </span>
        <span v-for="tag in task.tags || []" :key="tag" class="meta-chip">#{{ tag }}</span>
        <span v-if="task.createdAt" class="meta-chip meta-chip--muted">
          <Clock :size="12" />
          {{ formatCreatedAt(task.createdAt) }}
        </span>
      </div>
    </div>

    <div v-if="!isTrash" class="task-actions">
      <button
        class="ghost-icon"
        type="button"
        :class="{ active: store.isInMyDay(task) }"
        :title="store.isInMyDay(task) ? '移出今日' : '加入今日'"
        :aria-label="store.isInMyDay(task) ? '移出今日' : '加入今日'"
        @click.stop="store.toggleMyDay(task.id)"
      >
        <Sun :size="16" />
      </button>
      <button
        class="ghost-icon"
        type="button"
        :class="{ active: task.important || task.priority === 3 }"
        :title="task.important || task.priority === 3 ? '取消重要' : '标记重要'"
        :aria-label="task.important || task.priority === 3 ? '取消重要' : '标记重要'"
        @click.stop="store.toggleImportant(task.id)"
      >
        <Star :size="16" />
      </button>
      <button class="ghost-icon" type="button" title="更多" aria-label="更多任务操作" @click.stop="openMenu">
        <MoreHorizontal :size="17" />
      </button>
    </div>

    <div v-else class="task-actions task-actions--visible">
      <button class="ghost-icon" type="button" title="恢复" aria-label="恢复任务" @click.stop="store.restoreTask(task.id)">
        <RotateCcw :size="16" />
      </button>
      <button class="ghost-icon danger" type="button" title="永久删除" aria-label="永久删除任务" @click.stop="deleteForever">
        <Trash2 :size="16" />
      </button>
    </div>

    <div
      v-if="menuOpen"
      ref="menuEl"
      class="context-menu"
      :style="{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }"
      role="menu"
      tabindex="-1"
      @click.stop
      @keydown.esc="closeMenu"
    >
      <button class="context-item" role="menuitem" type="button" @click="togglePin">
        <Pin :size="15" /> {{ task.pinned ? '取消置顶' : '置顶' }}
      </button>
      <button class="context-item" role="menuitem" type="button" @click="copyTask">
        <Copy :size="15" /> 创建副本
      </button>
      <button class="context-item" role="menuitem" type="button" @click="copyLink">
        <LinkIcon :size="15" /> 复制任务链接
      </button>
      <button class="context-item" role="menuitem" type="button" @click="openMoveModal">
        <FolderInput :size="15" /> 移动到清单
      </button>
      <template v-if="canMoveToGroup">
        <div class="context-separator"></div>
        <button class="context-item" role="menuitem" type="button" @click="openGroupMoveModal">
          <FolderInput :size="15" /> 移动至分组…
        </button>
        <div v-if="groupMoveSubmenuOpen" class="context-menu group-move-submenu" :style="groupMoveSubmenuStyle" @click.stop>
          <div class="group-move-submenu__head"><strong>移动至分组</strong><span>{{ filteredMoveGroups.length }} 项</span></div>
          <label class="group-move-submenu__search"><Search :size="14" /><input ref="groupMoveSearchInput" v-model="groupMoveQuery" type="search" placeholder="搜索分组" /></label>
          <div class="group-move-submenu__options">
            <button class="context-item" :class="{ active: !task.taskGroupId }" type="button" @click="moveToGroup(null)"><FolderInput :size="15" /> 未分组</button>
            <button v-for="group in filteredMoveGroups" :key="group.id" class="context-item" :class="{ active: task.taskGroupId === group.id }" type="button" :disabled="task.taskGroupId === group.id" @click="moveToGroup(group.id)"><span class="group-move-submenu__emoji">{{ group.emoji || '📂' }}</span> {{ group.name }}<small v-if="task.taskGroupId === group.id">当前</small></button>
            <p v-if="!filteredMoveGroups.length" class="group-move-submenu__empty">未找到匹配分组</p>
          </div>
        </div>
      </template>
      <div class="context-separator"></div>
      <button class="context-item context-item--danger" role="menuitem" type="button" @click="deleteTask">
        <Trash2 :size="15" /> 删除
      </button>
    </div>

    <MoveToListModal
      :visible="moveModalOpen"
      :current-list-id="task.listId"
      @close="moveModalOpen = false"
      @select="moveToList"
    />


    <ConfirmDialog
      :visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :type="confirmDialog.type"
      @confirm="confirmDialog.onConfirm"
      @cancel="confirmDialog.visible = false"
    />
  </article>
</template>

<script setup>
import { computed, ref, reactive, nextTick, onMounted, onBeforeUnmount } from 'vue'
import {
  CalendarClock,
  Check,
  Clock,
  Copy,
  FolderInput,
  GripVertical,
  Link as LinkIcon,
  ListChecks,
  MoreHorizontal,
  Paperclip,
  Pin,
  Repeat2,
  RotateCcw,
  Search,
  Star,
  Sun,
  Trash2
} from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { formatDate as fmtDate, formatCreatedAt } from '@/utils/date'
import MoveToListModal from './MoveToListModal.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps({
  task: { type: Object, required: true },
  isTrash: Boolean,
  draggable: Boolean,
  isDragging: Boolean,
  isDropTarget: Boolean,
  dropPosition: String // 'before' or 'after'
})

const store = useTaskStore()
const menuOpen = ref(false)
const moveModalOpen = ref(false)
const groupMoveSubmenuOpen = ref(false)
const groupMoveQuery = ref('')
const groupMoveSearchInput = ref(null)
const groupMoveSubmenuPos = ref({ x: 0, y: 0 })
const menuPos = ref({ x: 0, y: 0 })
const menuEl = ref(null)
const confirmDialog = reactive({
  visible: false,
  title: '',
  message: '',
  confirmText: '确定',
  type: 'danger',
  onConfirm: () => {}
})

const list = computed(() => store.lists.find(item => item.id === props.task.listId))
const taskGroup = computed(() => store.taskGroups.find(group => group.id === props.task.taskGroupId) || null)
const canMoveToGroup = computed(() => {
  return store.currentViewMode === 'group' && store.currentList?.id === props.task.listId
})
const filteredMoveGroups = computed(() => {
  const query = groupMoveQuery.value.trim().toLowerCase()
  const groups = store.groupedTasks.filter(group => group.id)
  return query ? groups.filter(group => `${group.name} ${group.emoji || ''}`.toLowerCase().includes(query)) : groups
})
const groupMoveSubmenuStyle = computed(() => ({ left: `${groupMoveSubmenuPos.value.x}px`, top: `${groupMoveSubmenuPos.value.y}px` }))
const completedSubtasks = computed(() => props.task.subtasks?.filter(item => item.completed).length || 0)
const isOverdue = computed(() => props.task.dueDate && !props.task.completed && new Date(props.task.dueDate) < new Date())
const repeatLabel = computed(() => {
  const map = { daily: '每天', weekly: '每周', monthly: '每月', yearly: '每年' }
  return map[props.task.repeatRule] || props.task.repeatRule
})

function formatDate(date) {
  return fmtDate(date)
}

function openMenu(event) {
  menuPos.value = clampMenuPosition(event.clientX, event.clientY, 220, 320)
  menuOpen.value = true
  nextTick(() => menuEl.value?.focus())
}

function closeMenu() {
  menuOpen.value = false
  groupMoveSubmenuOpen.value = false
  groupMoveQuery.value = ''
}

function openMoveModal() {
  menuOpen.value = false
  moveModalOpen.value = true
}

function openGroupMoveModal() {
  groupMoveQuery.value = ''
  groupMoveSubmenuOpen.value = true
  nextTick(() => {
    const rect = menuEl.value?.getBoundingClientRect()
    if (!rect) return
    const width = 280
    const height = Math.min(390, window.innerHeight - 20)
    const x = rect.right + width + 8 <= window.innerWidth ? rect.right + 8 : Math.max(10, rect.left - width - 8)
    const y = Math.max(10, Math.min(rect.top, window.innerHeight - height - 10))
    groupMoveSubmenuPos.value = { x, y }
    groupMoveSearchInput.value?.focus()
  })
}

function togglePin() {
  store.togglePin(props.task.id)
  closeMenu()
}

function copyTask() {
  const copied = store.copyTask(props.task.id)
  if (copied) {
    store.selectTask(copied.id)
    store.showNotice('已创建任务副本', 'success')
  }
  closeMenu()
}

async function copyLink() {
  try {
    await navigator.clipboard?.writeText(`todo://${props.task.id}`)
    store.showNotice('任务链接已复制', 'success')
  } catch (error) {
    store.showNotice('复制失败，请检查剪贴板权限', 'error')
  }
  closeMenu()
}

function moveToList(listId) {
  store.updateTask(props.task.id, { listId, taskGroupId: null })
  store.showNotice('任务已移动', 'success')
  closeMenu()
}

function moveToGroup(groupId) {
  store.moveTaskToGroup(props.task.id, groupId)
  store.showNotice(groupId ? '任务已移动到分组' : '任务已移至未分组', 'success')
  closeMenu()
}

function deleteTask() {
  store.deleteTask(props.task.id)
  closeMenu()
}

function deleteForever() {
  confirmDialog.title = '永久删除任务'
  confirmDialog.message = '永久删除此任务？此操作不可撤销。'
  confirmDialog.confirmText = '永久删除'
  confirmDialog.type = 'danger'
  confirmDialog.onConfirm = () => {
    store.permanentDelete(props.task.id)
    confirmDialog.visible = false
  }
  confirmDialog.visible = true
}

function clampMenuPosition(x, y, width, height) {
  const margin = 10
  return {
    x: Math.max(margin, Math.min(x, window.innerWidth - width - margin)),
    y: Math.max(margin, Math.min(y, window.innerHeight - height - margin))
  }
}

function onDocumentClick() {
  closeMenu()
}

function onDocumentKeydown(event) {
  if (event.key === 'Escape') closeMenu()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>
