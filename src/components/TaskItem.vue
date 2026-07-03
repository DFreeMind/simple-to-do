<template>
  <div
    class="task-item"
    :class="{
      completed: task.completed,
      selected: store.selectedTaskId === task.id,
      pinned: task.pinned
    }"
    @click="store.selectTask(task.id)"
    @contextmenu.prevent="toggleMenu"
  >
    <!-- 复选框 - 圆角矩形 -->
    <button
      class="task-check"
      :class="{ checked: task.completed }"
      @click.stop="store.completeTask(task.id)"
    >
      <span v-if="task.completed">✓</span>
    </button>

    <!-- 任务内容 -->
    <div class="task-content">
      <div class="task-title">
        <span v-if="task.pinned" class="pin-icon">📌</span>
        {{ task.title }}
      </div>
      <div class="task-meta">
        <span v-if="task.dueDate" class="meta-date" :class="{ overdue: isOverdue }">
          📅 {{ formatDate(task.dueDate) }}
        </span>
        <span v-if="task.subtasks?.length" class="meta-sub task-meta-icon">
          ☑ {{ task.subtasks.filter(s => s.completed).length }}/{{ task.subtasks.length }}
        </span>
        <span v-if="task.comments?.length" class="meta-comment task-meta-icon">💬 {{ task.comments.length }}</span>
        <span v-if="task.attachments?.length" class="meta-attachment task-meta-icon">📎 {{ task.attachments.length }}</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="task-actions" v-if="!isTrash">
      <button class="action-btn" @click.stop="toggleMenu" title="更多">⋯</button>
    </div>

    <!-- 更多菜单 - 对齐参考图 -->
    <Teleport to="body">
      <div v-if="menuOpen" class="task-menu" :style="menuStyle" @click.stop>
        <button class="menu-item" @click="handleSubtask">📂 添加子任务</button>
        <button class="menu-item" @click="handlePin">
          {{ task.pinned ? '📍 取消置顶' : '📌 置顶' }}
        </button>
        <div class="menu-separator"></div>
        <button class="menu-item" @click="handleMove">📋 移动到清单</button>
        <button class="menu-item" @click="handleCopy">📑 创建副本</button>
        <button class="menu-item" @click="handleCopyLink">🔗 复制链接</button>
        <div class="menu-separator"></div>
        <button class="menu-item menu-item--danger" @click="handleDelete">🗑️ 删除</button>
      </div>
    </Teleport>

    <!-- 移动到清单子菜单 -->
    <Teleport to="body">
      <div v-if="showMoveMenu" class="task-menu" :style="moveMenuStyle" @click.stop>
        <button
          v-for="list in store.lists"
          :key="list.id"
          class="menu-item"
          @click="moveToList(list.id)"
        >
          {{ list.icon }} {{ list.name }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useTaskStore } from '@/stores/task'
import { formatDate as fmtDate } from '@/utils/date'

const props = defineProps({
  task: Object,
  isTrash: Boolean
})

const store = useTaskStore()
const menuOpen = ref(false)
const showMoveMenu = ref(false)
const menuPos = ref({ x: 0, y: 0 })

const formatDate = (d) => fmtDate(d)

const isOverdue = computed(() => {
  if (!props.task.dueDate) return false
  return new Date(props.task.dueDate) < new Date()
})

const menuStyle = computed(() => ({
  left: menuPos.value.x + 'px',
  top: menuPos.value.y + 'px'
}))

const moveMenuStyle = computed(() => ({
  left: (menuPos.value.x + 210) + 'px',
  top: menuPos.value.y + 'px'
}))

function toggleMenu(e) {
  menuPos.value = { x: e.clientX, y: e.clientY }
  menuOpen.value = !menuOpen.value
  showMoveMenu.value = false
}

function handleSubtask() {
  // 聚焦到子任务输入框
  store.selectTask(props.task.id)
  menuOpen.value = false
}

function handlePin() {
  store.togglePin(props.task.id)
  menuOpen.value = false
}

function handleMove() {
  showMoveMenu.value = true
}

function moveToList(listId) {
  store.updateTask(props.task.id, { listId })
  menuOpen.value = false
  showMoveMenu.value = false
}

function handleCopy() {
  store.addTask(props.task.title + ' (副本)', props.task.listId)
  menuOpen.value = false
}

function handleCopyLink() {
  navigator.clipboard?.writeText(`todo://${props.task.id}`)
  menuOpen.value = false
}

function handleDelete() {
  if (props.isTrash) {
    if (confirm('永久删除此任务？')) {
      store.permanentDelete(props.task.id)
    }
  } else {
    store.deleteTask(props.task.id)
  }
  menuOpen.value = false
}

function closeMenu() {
  menuOpen.value = false
  showMoveMenu.value = false
}

onMounted(() => document.addEventListener('click', closeMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))
</script>
