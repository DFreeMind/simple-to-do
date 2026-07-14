<template>
  <aside class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
    <!-- 折叠 Rail 模式 -->
    <template v-if="collapsed">
      <nav class="rail-nav" aria-label="侧栏控制">
        <button class="rail-item rail-profile" type="button" :title="`${store.profile.nickname} · 个人资料`" :aria-label="`${store.profile.nickname}，打开个人资料`" @click="profilePanelOpen = true">
          <img v-if="profileAvatarSrc" :src="profileAvatarSrc" alt="" />
          <span v-else>{{ profileInitial }}</span>
        </button>
        <button class="rail-item" type="button" aria-label="展开侧栏" title="展开侧栏" @click="expand">
          <PanelLeft :size="20" />
        </button>
      </nav>

      <nav class="rail-nav" aria-label="搜索">
        <button
          class="rail-item"
          :class="{ active: store.currentView === 'search' }"
          type="button"
          title="搜索（Ctrl/Cmd + K）"
          aria-label="搜索（Ctrl/Cmd + K）"
          aria-keyshortcuts="Control+K Meta+K"
          :aria-current="store.currentView === 'search' ? 'page' : undefined"
          @click="openSearch"
        >
          <Search :size="20" />
        </button>
      </nav>

      <div class="rail-divider"></div>

      <nav class="rail-nav" aria-label="主要视图">
        <button
          v-for="item in primaryViews"
          :key="item.id"
          class="rail-item"
          :class="{ active: store.currentView === item.id }"
          type="button"
          :title="item.label"
          :aria-label="item.label"
          :aria-current="store.currentView === item.id ? 'page' : undefined"
          @click="store.setView(item.id)"
        >
          <component :is="item.icon" :size="20" />
          <span v-if="store.listTaskCounts[item.id]" class="rail-badge">{{ store.listTaskCounts[item.id] }}</span>
        </button>
      </nav>

      <div class="rail-divider"></div>

      <div class="rail-flyout-anchor">
        <button
          ref="folderBtnRef"
          class="rail-item"
          :class="{ active: isCurrentViewList }"
          type="button"
          title="我的清单"
          aria-label="我的清单"
          @click.stop="toggleListsFlyout"
        >
          <Folder :size="20" />
        </button>

        <!-- 清单浮动卡片 -->
        <Transition name="flyout">
          <div
            v-if="listsFlyout"
            class="rail-flyout"
            :style="{ top: flyoutTop + 'px' }"
            @click.stop
          >
            <div class="rail-flyout__head">
              <span class="rail-flyout__title">我的清单</span>
              <button class="rail-flyout__close" type="button" aria-label="关闭" @click="listsFlyout = false">
                <X :size="13" />
              </button>
            </div>

            <div class="rail-flyout__search">
              <Search :size="13" />
              <input
                v-model="flyoutSearch"
                type="search"
                placeholder="搜索清单…"
                aria-label="搜索清单"
              />
            </div>

            <div class="rail-flyout__body">
              <!-- 置顶快捷区 -->
              <div v-if="pinnedLists.length > 0 && !flyoutSearch" class="rail-flyout__section">
                <div class="rail-flyout__section-label">
                  <Pin :size="10" />
                  <span>已置顶</span>
                </div>
                <button
                  v-for="list in pinnedLists"
                  :key="list.id"
                  class="rail-flyout__item"
                  :class="{ active: store.currentView === list.id }"
                  type="button"
                  @click="selectList(list.id)"
                >
                  <span class="rail-flyout__dot" :style="{ backgroundColor: list.color }"></span>
                  <span class="rail-flyout__name">{{ list.name }}</span>
                  <span v-if="store.listTaskCounts[list.id]" class="rail-flyout__count">{{ store.listTaskCounts[list.id] }}</span>
                </button>
              </div>

              <!-- 分组清单 -->
              <template v-for="group in filteredGroups" :key="group.id">
                <div v-if="group.lists.length > 0" class="rail-flyout__section">
                  <div v-if="group.id !== 'ungrouped' && !flyoutSearch" class="rail-flyout__section-label">
                    <span>{{ group.name }}</span>
                  </div>
                  <button
                    v-for="list in group.lists"
                    :key="list.id"
                    class="rail-flyout__item"
                    :class="{ active: store.currentView === list.id }"
                    type="button"
                    @click="selectList(list.id)"
                  >
                    <span class="rail-flyout__dot" :style="{ backgroundColor: list.color }"></span>
                    <span class="rail-flyout__name">{{ list.name }}</span>
                    <span v-if="store.listTaskCounts[list.id]" class="rail-flyout__count">{{ store.listTaskCounts[list.id] }}</span>
                  </button>
                </div>
              </template>

              <div v-if="flyoutSearch && totalFiltered === 0" class="rail-flyout__empty">
                <Search :size="20" class="rail-flyout__empty-icon" />
                <span>未找到匹配的清单</span>
              </div>

              <div v-if="!flyoutSearch && totalLists === 0" class="rail-flyout__empty">
                <Folder :size="24" class="rail-flyout__empty-icon" />
                <span>暂无清单</span>
                <small>展开侧栏后可创建</small>
              </div>
            </div>

            <button class="rail-flyout__create" type="button" @click="createListFromFlyout">
              <Plus :size="14" />
              <span>新建清单</span>
            </button>
          </div>
        </Transition>
      </div>

      <nav class="rail-nav" aria-label="维护视图">
        <button
          v-for="item in utilityViews"
          :key="item.id"
          class="rail-item"
          :class="{ active: store.currentView === item.id }"
          type="button"
          :title="item.label"
          :aria-label="item.label"
          :aria-current="store.currentView === item.id ? 'page' : undefined"
          @click="store.setView(item.id)"
        >
          <component :is="item.icon" :size="20" />
          <span v-if="store.listTaskCounts[item.id]" class="rail-badge">{{ store.listTaskCounts[item.id] }}</span>
        </button>
      </nav>

      <div class="rail-spacer"></div>

      <div class="rail-bottom">
        <button class="rail-item" type="button" title="使用指南" aria-label="使用指南" @click="store.openHelpCenter">
          <Compass :size="20" />
        </button>
        <button class="rail-item" type="button" title="设置" aria-label="设置" @click="store.openSettings">
          <SettingsIcon :size="20" />
        </button>
      </div>
    </template>

    <!-- 展开完整模式 -->
    <template v-else>
      <header class="sidebar__header">
        <button class="profile-entry" type="button" aria-label="打开个人资料" @click="profilePanelOpen = true">
          <img v-if="profileAvatarSrc" class="profile-avatar" :src="profileAvatarSrc" alt="" />
          <span v-else class="profile-avatar">{{ profileInitial }}</span>
          <span class="profile-entry__copy"><strong>{{ store.profile.nickname }}</strong><small><i></i>本地空间</small></span>
        </button>
        <div class="sidebar__header-actions">
          <button class="icon-btn sidebar-header-action" type="button" aria-label="折叠侧栏" title="收起侧栏" @click="collapse">
            <PanelLeft :size="18" />
          </button>
          <button class="icon-btn sidebar-header-action" type="button" aria-label="打开设置" title="应用设置" @click="store.openSettings">
            <SettingsIcon :size="18" />
          </button>
        </div>
      </header>

      <div class="sidebar-search">
        <Search :size="17" />
        <input
          :value="store.searchQuery"
          type="search"
          placeholder="搜索任务、标签、备注"
          aria-label="搜索任务"
          @focus="store.setSearch(store.searchQuery)"
          @input="store.setSearch($event.target.value)"
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
              :data-group-id="group.id"
              :class="{
                'is-dragging': groupDrag.draggingId.value === group.id,
                'drop-target': groupDrag.dragOverId.value === group.id
              }"
            >
              <span
                v-if="group.id !== 'ungrouped' && group.id !== 'pinned'"
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
                <button
                  v-if="group.id !== 'pinned'"
                  class="mini-btn"
                  type="button"
                  title="添加清单"
                  aria-label="添加清单"
                  @click="startAddList(group.id)"
                >
                  <Plus :size="14" />
                </button>
                <button
                  v-if="group.id !== 'ungrouped' && group.id !== 'pinned'"
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
                :data-list-id="list.id"
                :class="{
                  active: store.currentView === list.id,
                  'is-dragging': listDrag.draggingId.value === list.id,
                  'drop-target': listDrag.dragOverId.value === list.id,
                  'drop-target-before': listDrag.dragOverId.value === list.id && listDrag.dropPosition.value === 'before',
                  'drop-target-after': listDrag.dragOverId.value === list.id && listDrag.dropPosition.value === 'after'
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
                  <Pin v-if="list.pinned" :size="11" class="inline-icon" />
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
        <button class="nav-item nav-item--utility" type="button" @click="store.openHelpCenter">
          <Compass :size="18" />
          <span class="nav-label">使用指南</span>
        </button>
      </nav>
    </template>

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
        <button class="context-item" role="menuitem" type="button" @click="toggleSelectedListPin">
          <Pin :size="15" /> {{ menu.target?.pinned ? '取消置顶' : '置顶清单' }}
        </button>
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

    <ConfirmDialog
      :visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :tag="confirmDialog.tag"
      :details="confirmDialog.details"
      :confirm-text="confirmDialog.confirmText"
      type="danger"
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
    <ProfilePanel v-if="profilePanelOpen" @close="profilePanelOpen = false" />
  </aside>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  FolderInput,
  FolderPlus,
  GripVertical,
  Folder,
  Inbox,
  ListChecks,
  MoreHorizontal,
  Pencil,
  PanelLeft,
  Pin,
  Plus,
  Search,
  Settings as SettingsIcon,
  X,
  Star,
  Trash2,
  Users,
  CheckCircle2,
  Compass
} from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { useDragSort } from '@/composables/useDragSort'
import { readProfileAvatar } from '@/services/platform'
import ConfirmDialog from './ConfirmDialog.vue'
import InputDialog from './InputDialog.vue'
import ProfilePanel from './ProfilePanel.vue'

const store = useTaskStore()
const collapsed = computed(() => store.settings.sidebarCollapsed)
const profilePanelOpen = ref(false)
const profileAvatarUrl = ref('')
const profileInitial = computed(() => Array.from(store.profile.nickname?.trim() || '易')[0] || '易')
const builtInAvatarModules = import.meta.glob('@/assets/avatars/*.png', { eager: true, import: 'default' })
const profileAvatarSrc = computed(() => {
  if (profileAvatarUrl.value) return profileAvatarUrl.value
  const id = store.profile.avatarRelativePath?.startsWith('builtin:') ? store.profile.avatarRelativePath.slice(8) : ''
  return Object.entries(builtInAvatarModules).find(([path]) => path.endsWith(`/${id}.png`))?.[1] || ''
})

async function loadProfileAvatar() {
  if (store.profile.avatarRelativePath?.startsWith('builtin:')) { profileAvatarUrl.value = ''; return }
  if (!store.profile.avatarRelativePath) { profileAvatarUrl.value = ''; return }
  try { profileAvatarUrl.value = await readProfileAvatar(store.profile.avatarRelativePath) || '' } catch { profileAvatarUrl.value = '' }
}
watch(() => store.profile.avatarRelativePath, loadProfileAvatar, { immediate: true })

function collapse() {
  store.updateSettings({ sidebarCollapsed: true })
}

function expand() {
  store.updateSettings({ sidebarCollapsed: false })
}

function openSearch() {
  store.setSearch(store.searchQuery)
  nextTick(() => window.dispatchEvent(new Event('task-list:focus-search')))
}

function handleSearchShortcut(event) {
  const isSearchShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k'
  if (!isSearchShortcut || event.defaultPrevented || event.isComposing || store.settingsOpen) return
  event.preventDefault()
  openSearch()
}

const listsFlyout = ref(false)
const folderBtnRef = ref(null)
const flyoutTop = ref(0)

function toggleListsFlyout() {
  if (!listsFlyout.value && folderBtnRef.value) {
    const btn = folderBtnRef.value
    const anchor = btn.parentElement // .rail-flyout-anchor
    const btnRect = btn.getBoundingClientRect()
    const anchorRect = anchor.getBoundingClientRect()
    const btnCenterY = btnRect.top - anchorRect.top + btnRect.height / 2
    flyoutTop.value = Math.max(8, btnCenterY - 24)
  }
  listsFlyout.value = !listsFlyout.value
}

const isCurrentViewList = computed(() => {
  const id = store.currentView
  return store.lists.some(l => l.id === id)
})

const totalLists = computed(() => store.groupedLists.reduce((sum, g) => sum + g.lists.length, 0))

// --- 飞出面板 ---
const flyoutSearch = ref('')

const pinnedLists = computed(() => store.lists.filter(l => l.pinned && !l.deleted))

const filteredGroups = computed(() => {
  const q = flyoutSearch.value.trim().toLowerCase()
  if (!q) return store.groupedLists
  return store.groupedLists.map(g => ({
    ...g,
    lists: g.lists.filter(l => l.name.toLowerCase().includes(q))
  }))
})

const totalFiltered = computed(() => filteredGroups.value.reduce((sum, g) => sum + g.lists.length, 0))

function createListFromFlyout() {
  listsFlyout.value = false
  store.updateSettings({ sidebarCollapsed: false })
}

function selectList(id) {
  store.setView(id)
  listsFlyout.value = false
  flyoutSearch.value = ''
}

const addingGroup = ref(false)
const addingListGroupId = ref(undefined)
const newGroupName = ref('')
const newListName = ref('')
const groupInput = ref(null)
const listInputGrouped = ref(null)
const listInputUngrouped = ref(null)
const menuEl = ref(null)
const menu = ref({ show: false, type: '', x: 0, y: 0, target: null })
const confirmDialog = reactive({
  visible: false,
  title: '',
  message: '',
  tag: '',
  details: [],
  confirmText: '确定',
  onConfirm: () => {}
})

const inputDialog = reactive({
  visible: false,
  title: '',
  message: '',
  placeholder: '',
  defaultValue: '',
  confirmText: '确定',
  type: 'edit',
  onConfirm: () => {}
})

const primaryViews = [
  { id: 'today', label: '今日', icon: CalendarCheck },
  { id: 'inbox', label: '收集箱', icon: Inbox },
  { id: 'planned', label: '计划', icon: ListChecks },
  { id: 'important', label: '重要', icon: Star }
]

const utilityViews = [
  { id: 'completed', label: '已完成', icon: CheckCircle2 },
  { id: 'trash', label: '垃圾桶', icon: Trash2 }
]

// --- List drag ---
const listDrag = useDragSort({
  scrollContainerSelector: '.group-list',
  onDragStart: () => store.playDragStartSound(),
  onDragOver: () => store.playDragOverSound(),
  onDragEnd: () => store.playDragEndSound(),
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
    const listItem = target.closest?.('.list-item')
    if (!listItem) return null
    const listId = listItem.dataset.listId
    return listId ? { id: listId, el: listItem } : null
  },
  findItemAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y)
    for (const el of elements) {
      const listItem = el.closest?.('.list-item')
      if (listItem) {
        const listId = listItem.dataset.listId
        if (!listId) continue
        const rect = listItem.getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        return { id: listId, position: y < midY ? 'before' : 'after' }
      }
    }
    return null
  }
})

// --- Group drag ---
const groupDrag = useDragSort({
  scrollContainerSelector: '.group-list',
  onDragStart: () => store.playDragStartSound(),
  onDragOver: () => store.playDragOverSound(),
  onDragEnd: () => store.playDragEndSound(),
  onDrop(sourceId, targetId) {
    store.reorderGroup(sourceId, targetId)
  },
  getItemEl(target) {
    const groupRow = target.closest?.('.group-row')
    if (!groupRow) return null
    const groupId = groupRow.dataset.groupId
    return groupId && groupId !== 'ungrouped' ? { id: groupId, el: groupRow } : null
  },
  findItemAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y)
    for (const el of elements) {
      const groupRow = el.closest?.('.group-row')
      if (groupRow) {
        const groupId = groupRow.dataset.groupId
        if (groupId && groupId !== 'ungrouped') return { id: groupId, position: 'after' }
      }
    }
    return null
  }
})

function handleMouseDown(e) {
  if (isDragIgnored(e.target)) return

  if (e.target.closest('.list-item')) {
    const listItem = e.target.closest('.list-item')
    const listId = listItem.dataset.listId
    if (listId) listDrag.startDrag(e, listId)
  } else if (e.target.closest('.group-row')) {
    const groupRow = e.target.closest('.group-row')
    const groupId = groupRow.dataset.groupId
    if (groupId && groupId !== 'ungrouped') groupDrag.startDrag(e, groupId)
  }
}

function isDragIgnored(target) {
  return Boolean(target.closest?.('.group-actions, .row-more, .mini-btn, .inline-create, input, textarea, select, .context-menu'))
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
  inputDialog.title = '重命名清单'
  inputDialog.message = '输入新的清单名称'
  inputDialog.placeholder = '清单名称'
  inputDialog.defaultValue = list.name
  inputDialog.confirmText = '保存'
  inputDialog.type = 'edit'
  inputDialog.onConfirm = (name) => {
    store.renameList(list.id, name)
    inputDialog.visible = false
  }
  inputDialog.visible = true
  closeMenu()
}

function toggleSelectedListPin() {
  const list = menu.value.target
  if (!list) return
  store.toggleListPin(list.id)
  closeMenu()
}

function moveSelectedList() {
  const list = menu.value.target
  if (!list) return
  const groupNames = store.groups.map(group => group.name).join('、')
  inputDialog.title = '移动清单'
  inputDialog.message = `输入目标分组名称，留空为未分组。可选分组：${groupNames}`
  inputDialog.placeholder = '分组名称（留空为未分组）'
  inputDialog.defaultValue = ''
  inputDialog.confirmText = '移动'
  inputDialog.type = 'move'
  inputDialog.onConfirm = (groupName) => {
    const group = store.groups.find(item => item.name === groupName)
    store.moveList(list.id, group?.id || null)
    store.showNotice('清单已移动', 'success')
    inputDialog.visible = false
  }
  inputDialog.visible = true
  closeMenu()
}

function deleteSelectedList() {
  const list = menu.value.target
  if (!list) return
  const taskCount = store.tasks.filter(task => task.listId === list.id && !task.deleted).length
  const deleted = store.deleteList(list.id)
  const message = taskCount ? `清单已移入垃圾桶，包含 ${taskCount} 个任务` : '清单已移入垃圾桶'
  store.showNotice(deleted ? message : '此清单不能删除', deleted ? 'success' : 'error')
  closeMenu()
}

function renameSelectedGroup() {
  const group = menu.value.target
  if (!group) return
  inputDialog.title = '重命名分组'
  inputDialog.message = '输入新的分组名称'
  inputDialog.placeholder = '分组名称'
  inputDialog.defaultValue = group.name
  inputDialog.confirmText = '保存'
  inputDialog.type = 'edit'
  inputDialog.onConfirm = (name) => {
    store.renameGroup(group.id, name)
    inputDialog.visible = false
  }
  inputDialog.visible = true
  closeMenu()
}

function deleteSelectedGroup() {
  const group = menu.value.target
  if (!group) return
  confirmDialog.title = '确认删除这个分组？'
  confirmDialog.message = `分组将被删除，分组内的清单会自动移动到"未分组"。`
  confirmDialog.tag = group.name
  confirmDialog.details = [
    { label: '删除对象', value: '分组', type: 'danger' },
    { label: '影响范围', value: '仅调整归属，不删除清单', type: 'info' }
  ]
  confirmDialog.confirmText = '删除分组'
  confirmDialog.onConfirm = () => {
    store.deleteGroup(group.id)
    store.showNotice('分组已删除，清单已保留', 'success')
    confirmDialog.visible = false
  }
  confirmDialog.visible = true
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
  listsFlyout.value = false
}

function onDocumentKeydown(event) {
  if (event.key === 'Escape') {
    closeMenu()
    listsFlyout.value = false
    cancelInlineCreate()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('keydown', handleSearchShortcut)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('keydown', handleSearchShortcut)
})
</script>
