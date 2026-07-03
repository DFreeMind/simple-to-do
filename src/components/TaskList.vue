<template>
  <main class="task-list">
    <!-- 头部 -->
    <div class="task-list__header">
      <div class="header-left">
        <button class="header-menu-btn" title="菜单" @click="showListMenu = !showListMenu">☰</button>
        <h2 class="header-title">
          <span v-if="viewTitle.icon" class="header-icon">{{ viewTitle.icon }}</span>
          {{ viewTitle.label }}
        </h2>
      </div>
      <div class="header-actions">
        <button class="sort-btn" @click="cycleSort" :title="sortLabel">
          <span>↕</span>
        </button>
        <button class="more-btn" title="更多" @click="showListMenu = !showListMenu">⋯</button>
      </div>
    </div>

    <!-- 添加任务 -->
    <div class="task-list__add" v-if="currentView !== 'trash'">
      <input
        ref="addInput"
        v-model="newTaskTitle"
        class="add-input"
        placeholder="+ 添加任务"
        @keydown.enter="addTask"
      />
    </div>

    <!-- 任务列表 -->
    <div class="task-list__items" v-if="currentView !== 'trash'">
      <!-- 未完成任务 -->
      <TaskItem
        v-for="task in store.uncompletedTasks"
        :key="task.id"
        :task="task"
      />

      <!-- 已完成分组 -->
      <div v-if="store.completedTasks.length" class="completed-group">
        <button class="completed-toggle" @click="showCompleted = !showCompleted">
          <span class="toggle-arrow">{{ showCompleted ? '▾' : '▸' }}</span>
          已完成 {{ store.completedTasks.length }}
        </button>
        <TaskItem
          v-if="showCompleted"
          v-for="task in store.completedTasks"
          :key="task.id"
          :task="task"
        />
      </div>
    </div>

    <!-- 垃圾桶视图 -->
    <div class="task-list__items" v-else>
      <TaskItem
        v-for="task in store.trash"
        :key="task.id"
        :task="task"
        isTrash
      />
      <div v-if="!store.trash.length" class="empty-state">垃圾桶是空的</div>
    </div>

    <!-- 空状态 -->
    <div v-if="currentView !== 'trash' && !store.filteredTasks.length" class="empty-state">
      <div class="empty-icon">📋</div>
      <div>暂无任务</div>
    </div>

    <!-- 列表菜单 -->
    <Teleport to="body">
      <div v-if="showListMenu" class="list-menu" @click.stop>
        <button class="list-menu-item" @click="renameCurrentList" v-if="currentList">✏️ 重命名清单</button>
        <button class="list-menu-item" @click="clearCompletedTasks" v-if="currentView !== 'trash'">🧹 清除已完成</button>
        <button class="list-menu-item list-menu-item--danger" @click="deleteCurrentList" v-if="currentList && !currentList.isSystem">🗑️ 删除清单</button>
        <button class="list-menu-item" @click="showListMenu = false">关闭</button>
      </div>
    </Teleport>
  </main>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useTaskStore } from '@/stores/task'
import TaskItem from './TaskItem.vue'

const store = useTaskStore()
const newTaskTitle = ref('')
const showCompleted = ref(true)
const addInput = ref(null)
const showListMenu = ref(false)

const currentList = computed(() => {
  if (['today', 'week', 'inbox', 'completed', 'trash'].includes(store.currentView)) return null
  return store.lists.find(l => l.id === store.currentView)
})

const currentView = computed(() => store.currentView)

const viewTitle = computed(() => {
  const map = {
    today: { icon: '📅', label: '今天' },
    week: { icon: '📆', label: '最近7天' },
    inbox: { icon: '📥', label: '收集箱' },
    completed: { icon: '✅', label: '已完成' },
    trash: { icon: '🗑️', label: '垃圾桶' }
  }
  if (map[store.currentView]) return map[store.currentView]
  const list = store.lists.find(l => l.id === store.currentView)
  return list ? { icon: list.icon, label: list.name } : { icon: '', label: '' }
})

const sortLabel = computed(() => {
  const map = { default: '默认排序', date: '按日期', name: '按名称' }
  return map[store.sortBy]
})

function addTask() {
  const title = newTaskTitle.value.trim()
  if (!title) return
  store.addTask(title)
  newTaskTitle.value = ''
  nextTick(() => addInput.value?.focus())
}

function cycleSort() {
  const order = ['default', 'date', 'name']
  const idx = order.indexOf(store.sortBy)
  store.sortBy = order[(idx + 1) % order.length]
}

function renameCurrentList() {
  if (!currentList.value) return
  const name = prompt('重命名清单', currentList.value.name)
  if (name && name.trim()) {
    store.renameList(currentList.value.id, name.trim())
  }
  showListMenu.value = false
}

function deleteCurrentList() {
  if (!currentList.value) return
  if (confirm(`确定删除清单"${currentList.value.name}"？任务将移至收集箱`)) {
    store.deleteList(currentList.value.id)
  }
  showListMenu.value = false
}

function clearCompletedTasks() {
  const completed = store.tasks.filter(t => t.completed && !t.deleted && t.listId === store.currentView)
  if (completed.length === 0) {
    alert('没有已完成的任务')
  } else if (confirm(`确定清除 ${completed.length} 个已完成任务？`)) {
    completed.forEach(t => store.deleteTask(t.id))
  }
  showListMenu.value = false
}

function closeListMenu() {
  showListMenu.value = false
}

onMounted(() => document.addEventListener('click', closeListMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeListMenu))
</script>
