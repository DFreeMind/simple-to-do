<template>
  <aside class="sidebar">
    <header class="sidebar__header">
      <button class="brand" type="button" aria-label="回到今日" @click="store.setView('today')">
        <span class="brand-mark">
          <img :src="appIcon" alt="" />
        </span>
        <span>
          <strong>易简清单</strong>
          <small>本地优先</small>
        </span>
      </button>
      <button class="icon-btn" type="button" aria-label="打开设置" title="设置" @click="store.openSettings">
        <SettingsIcon :size="18" />
      </button>
    </header>

    <div class="sidebar-search">
      <Search :size="17" />
      <input
        v-model="searchText"
        type="search"
        placeholder="搜索任务、标签、备注"
        aria-label="搜索任务"
        @focus="store.setSearch(searchText)"
        @input="store.setSearch(searchText)"
      />
    </div>

    <nav class="sidebar__nav" aria-label="主要视图">
      <button
        v-for="item in primaryViews"
        :key="item.id"
        class="nav-item"
        :class="{ active: store.currentView === item.id }"
        type="button"
        @click="store.setView(item.id)"
      >
        <component :is="item.icon" :size="18" />
        <span class="nav-label">{{ item.label }}</span>
        <span v-if="store.listTaskCounts[item.id]" class="nav-badge">{{ store.listTaskCounts[item.id] }}</span>
      </button>
    </nav>

    <section class="sidebar__section">
      <div class="section-title">
        <span>我的清单</span>
        <div class="section-actions">
          <button class="mini-btn" type="button" title="新建分组" aria-label="新建分组" @click="startAddGroup">
            <FolderPlus :size="15" />
          </button>
          <button class="mini-btn" type="button" title="新建清单" aria-label="新建清单" @click="startAddList(null)">
            <Plus :size="16" />
          </button>
        </div>
      </div>

      <div v-if="addingGroup" class="inline-create">
        <input
          ref="groupInput"
          v-model="newGroupName"
          placeholder="分组名称"
          @keydown.enter="confirmAddGroup"
          @keydown.esc="cancelInlineCreate"
          @blur="confirmAddGroup"
        />
      </div>

      <div class="group-list" @mousedown="handleMouseDown">
        <div
          v-for="group in store.groupedLists"
          :key="group.id"
          class="list-group"
        >
          <div
            class="group-row"
            :class="{
              'is-dragging': groupDrag.draggingId.value === group.id,
              'drop-target': groupDrag.dragOverId.value === group.id
            }"
          >
            <span
              v-if="group.id !== 'ungrouped'"
              class="sidebar-drag-handle"
              role="button"
              tabindex="-1"
              title="拖动分组排序"
              aria-label="拖动分组排序"
            >
              <GripVertical :size="14" />
            </span>
            <button class="group-toggle" type="button" @click="store.toggleGroup(group.id)" :aria-expanded="!group.collapsed">
              <ChevronRight :size="15" :class="{ rotated: !group.collapsed }" />
              <span>{{ group.name }}</span>
            </button>
            <div class="group-actions">
              <button class="mini-btn" type="button" title="添加清单" aria-label="添加清单" @click="startAddList(group.id)">
                <Plus :size="14" />
              </button>
              <button
                v-if="group.id !== 'ungrouped'"
                class="mini-btn"
                type="button"
                title="分组操作"
                aria-label="分组操作"
                @click="openGroupMenu($event, group)"
              >
                <MoreHorizontal :size="15" />
              </button>
            </div>
          </div>

          <div v-if="!group.collapsed" class="list-stack">
            <div
              v-for="list in group.lists"
              :key="list.id"
              class="list-item"
              :class="{
                active: store.currentView === list.id,
                'is-dragging': listDrag.draggingId.value === list.id,
                'drop-target': listDrag.dragOverId.value === list.id
              }"
              @contextmenu.prevent="openListMenu($event, list)"
            >
              <span
                class="sidebar-drag-handle"
                role="button"
                tabindex="-1"
                title="拖动清单排序"
                aria-label="拖动清单排序"
              >
                <GripVertical :size="14" />
              </span>
              <button class="list-link" type="button" @click="store.setView(list.id)">
                <span class="color-dot" :style="{ backgroundColor: list.color }"></span>
                <span class="nav-label">{{ list.name }}</span>
                <span v-if="store.listTaskCounts[list.id]" class="nav-badge">{{ store.listTaskCounts[list.id] }}</span>
              </button>
              <button class="row-more" type="button" aria-label="清单操作" @click.stop="openListMenu($event, list)">
                <MoreHorizontal :size="15" />
              </button>
            </div>

            <div v-if="addingListGroupId === group.id" class="inline-create inline-create--nested">
              <input
                ref="listInputGrouped"
                v-model="newListName"
                placeholder="清单名称"
                @keydown.enter="confirmAddList"
                @keydown.esc="cancelInlineCreate"
                @blur="confirmAddList"
              />
            </div>
          </div>
        </div>

        <div v-if="addingListGroupId === null" class="inline-create">
          <input
            ref="listInputUngrouped"
            v-model="newListName"
            placeholder="清单名称"
            @keydown.enter="confirmAddList"
            @keydown.esc="cancelInlineCreate"
            @blur="confirmAddList"
          />
        </div>
      </div>
    </section>

    <nav class="sidebar__utility" aria-label="维护视图">
      <button
        v-for="item in utilityViews"
        :key="item.id"
        class="nav-item nav-item--utility"
        :class="{ active: store.currentView === item.id }"
        type="button"
        @click="store.setView(item.id)"
      >
        <component :is="item.icon" :size="18" />
        <span class="nav-label">{{ item.label }}</span>
        <span v-if="store.listTaskCounts[item.id]" class="nav-badge">{{ store.listTaskCounts[item.id] }}</span>
      </button>
    </nav>

    <div
      v-if="menu.show"
      ref="menuEl"
      class="context-menu"
      :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
      role="menu"
      tabindex="-1"
      @click.stop
      @keydown.esc="closeMenu"
    >
      <template v-if="menu.type === 'list'">
        <button class="context-item" role="menuitem" type="button" @click="renameSelectedList">
          <Pencil :size="15" /> 重命名清单
        </button>
        <button class="context-item" role="menuitem" type="button" @click="moveSelectedList">
          <FolderInput :size="15" /> 移动分组
        </button>
        <button class="context-item context-item--danger" role="menuitem" type="button" @click="deleteSelectedList">
          <Trash2 :size="15" /> 删除清单
        </button>
      </template>
      <template v-else>
        <button class="context-item" role="menuitem" type="button" @click="renameSelectedGroup">
          <Pencil :size="15" /> 重命名分组
        </button>
        <button class="context-item context-item--danger" role="menuitem" type="button" @click="deleteSelectedGroup">
          <Trash2 :size="15" /> 删除分组
        </button>
      </template>
    </div>
  </aside>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  FolderInput,
  FolderPlus,
  GripVertical,
  Inbox,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings as SettingsIcon,
  Star,
  Trash2,
  CheckCircle2
} from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { useDragSort } from '@/composables/useDragSort'
import appIcon from '@/assets/app-icon.svg'

const store = useTaskStore()
const searchText = ref('')
const addingGroup = ref(false)
const addingListGroupId = ref(undefined)
const newGroupName = ref('')
const newListName = ref('')
const groupInput = ref(null)
const listInputGrouped = ref(null)
const listInputUngrouped = ref(null)
const menuEl = ref(null)
const menu = ref({ show: false, type: '', x: 0, y: 0, target: null })

const primaryViews = [
  { id: 'today', label: '今日', icon: CalendarCheck },
  { id: 'inbox', label: '收集箱', icon: Inbox },
  { id: 'planned', label: '计划', icon: ListChecks },
  { id: 'important', label: '重要', icon: Star },
  { id: 'calendar', label: '月历', icon: CalendarDays },
  { id: 'stats', label: '统计', icon: BarChart3 }
]

const utilityViews = [
  { id: 'completed', label: '已完成', icon: CheckCircle2 },
  { id: 'trash', label: '垃圾桶', icon: Trash2 }
]

// --- List drag ---
const listDrag = useDragSort({
  scrollContainerSelector: '.group-list',
  onDrop(sourceId, targetId, position) {
    // Find which group the target list belongs to
    for (const group of store.groupedLists) {
      const targetList = group.lists.find(l => l.id === targetId)
      if (targetList) {
        const groupId = group.id === 'ungrouped' ? null : group.id
        if (position === 'after') {
          // Find next list in same group
          const idx = group.lists.findIndex(l => l.id === targetId)
          const nextList = idx >= 0 && idx < group.lists.length - 1 ? group.lists[idx + 1] : null
          if (nextList) {
            store.reorderList(sourceId, nextList.id, groupId)
          } else {
            store.reorderList(sourceId, targetId, groupId)
          }
        } else {
          store.reorderList(sourceId, targetId, groupId)
        }
        return
      }
    }
  },
  getItemEl(target) {
    const handle = target.closest?.('.sidebar-drag-handle')
    if (!handle) return null
    const listItem = handle.closest('.list-item')
    if (!listItem) return null
    const listName = listItem.querySelector('.nav-label')?.textContent
    const list = store.lists.find(l => l.name === listName && !l.isSystem)
    return list ? { id: list.id, el: listItem } : null
  },
  findItemAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y)
    for (const el of elements) {
      const listItem = el.closest?.('.list-item')
      if (listItem) {
        const listName = listItem.querySelector('.nav-label')?.textContent
        const list = store.lists.find(l => l.name === listName && !l.isSystem)
        if (!list) continue
        const rect = listItem.getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        return { id: list.id, position: y < midY ? 'before' : 'after' }
      }
    }
    return null
  }
})

// --- Group drag ---
const groupDrag = useDragSort({
  scrollContainerSelector: '.group-list',
  onDrop(sourceId, targetId) {
    store.reorderGroup(sourceId, targetId)
  },
  getItemEl(target) {
    const handle = target.closest?.('.sidebar-drag-handle')
    if (!handle) return null
    const groupRow = handle.closest('.group-row')
    if (!groupRow) return null
    const groupName = groupRow.querySelector('.group-toggle span')?.textContent
    const group = store.groups.find(g => g.name === groupName && g.id !== 'ungrouped')
    return group ? { id: group.id, el: groupRow } : null
  },
  findItemAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y)
    for (const el of elements) {
      const groupRow = el.closest?.('.group-row')
      if (groupRow) {
        const groupName = groupRow.querySelector('.group-toggle span')?.textContent
        const group = store.groups.find(g => g.name === groupName && g.id !== 'ungrouped')
        if (group) return { id: group.id, position: 'after' }
      }
    }
    return null
  }
})

function handleMouseDown(e) {
  const handle = e.target.closest('.sidebar-drag-handle')
  if (!handle) return

  // Determine if this is a list or group drag handle
  if (handle.closest('.list-item')) {
    const listItem = handle.closest('.list-item')
    const listName = listItem.querySelector('.nav-label')?.textContent
    const list = store.lists.find(l => l.name === listName && !l.isSystem)
    if (list) listDrag.startDrag(e, list.id)
  } else if (handle.closest('.group-row')) {
    const groupRow = handle.closest('.group-row')
    const groupName = groupRow.querySelector('.group-toggle span')?.textContent
    const group = store.groups.find(g => g.name === groupName && g.id !== 'ungrouped')
    if (group) groupDrag.startDrag(e, group.id)
  }
}

function startAddGroup() {
  addingGroup.value = true
  addingListGroupId.value = undefined
  nextTick(() => groupInput.value?.focus())
}

function startAddList(groupId) {
  addingListGroupId.value = groupId
  addingGroup.value = false
  nextTick(() => {
    if (groupId == null) {
      listInputUngrouped.value?.focus()
    } else {
      listInputGrouped.value?.focus()
    }
  })
}

function confirmAddGroup() {
  const name = newGroupName.value.trim()
  if (name) store.addGroup(name)
  cancelInlineCreate()
}

function confirmAddList() {
  const name = newListName.value.trim()
  if (name) {
    const list = store.addList(name, addingListGroupId.value)
    store.setView(list.id)
  }
  cancelInlineCreate()
}

function cancelInlineCreate() {
  addingGroup.value = false
  addingListGroupId.value = undefined
  newGroupName.value = ''
  newListName.value = ''
}

function openListMenu(event, list) {
  event.preventDefault()
  event.stopPropagation()
  menu.value = { show: true, type: 'list', target: list, ...getMenuPosition(event, 192, 148) }
  nextTick(() => menuEl.value?.focus())
}

function openGroupMenu(event, group) {
  event.preventDefault()
  event.stopPropagation()
  menu.value = { show: true, type: 'group', target: group, ...getMenuPosition(event, 192, 104) }
  nextTick(() => menuEl.value?.focus())
}

function closeMenu() {
  menu.value = { show: false, type: '', x: 0, y: 0, target: null }
}

function renameSelectedList() {
  const list = menu.value.target
  if (!list) return
  const name = window.prompt('重命名清单', list.name)
  if (name?.trim()) store.renameList(list.id, name.trim())
  closeMenu()
}

function moveSelectedList() {
  const list = menu.value.target
  if (!list) return
  const names = store.groups.map(group => `${group.name}:${group.id}`).join('\n')
  const groupName = window.prompt(`输入目标分组名称，留空为未分组：\n${names}`, '')
  if (groupName !== null) {
    const group = store.groups.find(item => item.name === groupName.trim())
    store.moveList(list.id, group?.id || null)
    store.showNotice('清单已移动', 'success')
  }
  closeMenu()
}

function deleteSelectedList() {
  const list = menu.value.target
  if (!list) return
  const movedTaskCount = store.tasks.filter(task => task.listId === list.id && !task.deleted).length
  const deleted = store.deleteList(list.id)
  const message = movedTaskCount ? `清单已删除，${movedTaskCount} 个任务已移入收集箱` : '清单已删除'
  store.showNotice(deleted ? message : '此清单不能删除', deleted ? 'success' : 'error')
  closeMenu()
}

function renameSelectedGroup() {
  const group = menu.value.target
  if (!group) return
  const name = window.prompt('重命名分组', group.name)
  if (name?.trim()) store.renameGroup(group.id, name.trim())
  closeMenu()
}

function deleteSelectedGroup() {
  const group = menu.value.target
  if (!group) return
  if (window.confirm(`删除分组"${group.name}"？清单会移动到未分组。`)) {
    store.deleteGroup(group.id)
    store.showNotice('分组已删除，清单已保留', 'success')
  }
  closeMenu()
}

function getMenuPosition(event, width, height) {
  const rect = event.currentTarget?.getBoundingClientRect()
  const x = rect ? rect.right - width : event.clientX
  const y = event.type === 'contextmenu' ? event.clientY : (rect?.bottom ?? event.clientY) + 4
  return clampMenuPosition(x, y, width, height)
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
  if (event.key === 'Escape') {
    closeMenu()
    cancelInlineCreate()
  }
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
