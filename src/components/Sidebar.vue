<template>
  <aside class="sidebar">
    <div class="sidebar__content">
      <!-- 用户头像 -->
      <div class="sidebar__avatar">
        <div class="avatar-circle">🧑</div>
      </div>

      <!-- 快捷视图 -->
      <nav class="sidebar__nav">
        <button
          v-for="item in quickViews"
          :key="item.id"
          class="nav-item"
          :class="{ active: store.currentView === item.id }"
          @click="store.setView(item.id)"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
          <span v-if="store.listTaskCounts[item.id]" class="nav-badge">{{ store.listTaskCounts[item.id] }}</span>
        </button>
      </nav>

      <!-- 清单列表 -->
      <div class="sidebar__section">
        <div class="section-header">
          <span>清单</span>
          <button class="section-add" @click="showAddList = true">+</button>
        </div>
        <div class="section-list">
          <button
            v-for="list in customLists"
            :key="list.id"
            class="nav-item"
            :class="{ active: store.currentView === list.id }"
            @click="store.setView(list.id)"
            @contextmenu.prevent="onListContext($event, list)"
          >
            <span class="nav-icon">{{ list.icon }}</span>
            <span class="nav-label">{{ list.name }}</span>
            <span v-if="store.listTaskCounts[list.id]" class="nav-badge">{{ store.listTaskCounts[list.id] }}</span>
          </button>

          <!-- 添加清单输入 -->
          <div v-if="showAddList" class="add-list-input">
            <input
              ref="addListInput"
              v-model="newListName"
              placeholder="清单名称"
              @keydown.enter="confirmAddList"
              @keydown.esc="showAddList = false"
              @blur="confirmAddList"
            />
          </div>
        </div>
      </div>

      <!-- 底部区域 -->
      <div class="sidebar__bottom">
        <button
          class="nav-item"
          :class="{ active: store.currentView === 'completed' }"
          @click="store.setView('completed')"
        >
          <span class="nav-icon">✅</span>
          <span class="nav-label">已完成</span>
          <span v-if="store.listTaskCounts.completed" class="nav-badge">{{ store.listTaskCounts.completed }}</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: store.currentView === 'trash' }"
          @click="store.setView('trash')"
        >
          <span class="nav-icon">🗑️</span>
          <span class="nav-label">垃圾桶</span>
          <span v-if="store.trash.length" class="nav-badge">{{ store.trash.length }}</span>
        </button>
      </div>
    </div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div v-if="contextMenu.show" class="context-menu" :style="contextMenuStyle" @click.stop>
        <button class="context-item" @click="renameList">✏️ 重命名</button>
        <button class="context-item context-item--danger" @click="deleteList">🗑️ 删除清单</button>
      </div>
    </Teleport>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useTaskStore } from '@/stores/task'

const store = useTaskStore()
const showAddList = ref(false)
const newListName = ref('')
const addListInput = ref(null)
const contextMenu = ref({ show: false, x: 0, y: 0, list: null })

const quickViews = [
  { id: 'today', icon: '📅', label: '今天' },
  { id: 'week', icon: '📆', label: '最近7天' },
  { id: 'inbox', icon: '📥', label: '收集箱' }
]

const customLists = computed(() => store.lists.filter(l => !l.isSystem))

const contextMenuStyle = computed(() => ({
  left: contextMenu.value.x + 'px',
  top: contextMenu.value.y + 'px'
}))

async function confirmAddList() {
  const name = newListName.value.trim()
  if (name) {
    const list = store.addList(name)
    store.setView(list.id)
  }
  showAddList.value = false
  newListName.value = ''
}

function onListContext(e, list) {
  contextMenu.value = { show: true, x: e.clientX, y: e.clientY, list }
}

function renameList() {
  const list = contextMenu.value.list
  const name = prompt('重命名清单', list.name)
  if (name && name.trim()) {
    store.renameList(list.id, name.trim())
  }
  contextMenu.value.show = false
}

function deleteList() {
  const list = contextMenu.value.list
  if (confirm(`确定删除清单"${list.name}"？任务将移至收集箱`)) {
    store.deleteList(list.id)
  }
  contextMenu.value.show = false
}

function closeContextMenu() {
  contextMenu.value.show = false
}

onMounted(() => document.addEventListener('click', closeContextMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeContextMenu))
</script>
