<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="close">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <div>
            <h3>移动到清单</h3>
            <p class="modal-subtitle">从左侧分组中选择目标清单</p>
          </div>
          <button class="modal-close" type="button" @click="close">
            <X :size="18" />
          </button>
        </div>

        <div class="modal-search">
          <Search :size="16" />
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="搜索清单或分组..."
            aria-label="搜索清单"
          />
        </div>

        <div class="modal-body">
          <div class="sidebar-nav">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="nav-tab"
              :class="{ active: activeTab === tab.id }"
              type="button"
              @click="activeTab = tab.id"
            >
              <component :is="tab.icon" :size="16" />
              <span>{{ tab.label }}</span>
            </button>
          </div>

          <div class="list-content">
            <div v-if="filteredLists.length === 0" class="no-results">
              没有找到匹配的清单
            </div>

            <template v-else>
              <!-- 收集箱 -->
              <button
                v-if="showInbox && matchesFilter(inboxList)"
                class="list-item"
                :class="{ selected: selectedListId === inboxList.id }"
                type="button"
                @click="selectList(inboxList.id)"
              >
                <Inbox :size="16" />
                <span class="list-name">收集箱</span>
                <span class="list-count">{{ getTaskCount(inboxList.id) }} 项</span>
              </button>

              <!-- 分组清单 -->
              <template v-for="group in filteredGroups" :key="group.id">
                <div v-if="shouldShowGroup(group)" class="list-group">
                  <button
                    class="list-item list-item--group"
                    :class="{ 'is-expanded': expandedGroups.has(group.id) }"
                    type="button"
                    @click="toggleGroup(group.id)"
                  >
                    <ChevronRight :size="14" class="chevron" :class="{ expanded: expandedGroups.has(group.id) }" />
                    <Folder :size="16" />
                    <span class="list-name">{{ group.name }}</span>
                    <span class="list-count">{{ getGroupTaskCount(group) }} 项</span>
                  </button>

                  <div v-if="expandedGroups.has(group.id)" class="list-children">
                    <button
                      v-for="list in group.lists"
                      :key="list.id"
                      class="list-item list-item--child"
                      :class="{ selected: selectedListId === list.id }"
                      type="button"
                      @click="selectList(list.id)"
                    >
                      <span class="color-dot" :style="{ backgroundColor: list.color }"></span>
                      <span class="list-name">{{ list.name }}</span>
                      <span class="list-count">{{ getTaskCount(list.id) }} 项</span>
                    </button>
                  </div>
                </div>
              </template>

              <!-- 未分组清单 -->
              <button
                v-for="list in ungroupedLists"
                :key="list.id"
                class="list-item"
                :class="{ selected: selectedListId === list.id }"
                type="button"
                @click="selectList(list.id)"
              >
                <span class="color-dot" :style="{ backgroundColor: list.color }"></span>
                <span class="list-name">{{ list.name }}</span>
                <span class="list-count">{{ getTaskCount(list.id) }} 项</span>
              </button>
            </template>
          </div>
        </div>

        <div class="modal-footer">
          <div class="selected-path" v-if="selectedListPath">
            将移动到：<span class="path-text">{{ selectedListPath }}</span>
          </div>
          <div class="footer-actions">
            <button class="btn btn--cancel" type="button" @click="close">
              取消
            </button>
            <button
              class="btn btn--confirm"
              type="button"
              :disabled="!selectedListId"
              @click="confirmMove"
            >
              确认移动
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { X, Search, ChevronRight, Folder, Inbox, LayoutGrid, Clock, Users } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'

const props = defineProps({
  visible: Boolean,
  currentListId: String
})

const emit = defineEmits(['close', 'select'])

const store = useTaskStore()
const searchQuery = ref('')
const searchInput = ref(null)
const expandedGroups = ref(new Set())
const activeTab = ref('all')
const selectedListId = ref(null)

const tabs = [
  { id: 'all', label: '全部', icon: LayoutGrid },
  { id: 'recent', label: '最近使用', icon: Clock },
  { id: 'mine', label: '我的清单', icon: Users }
]

// 收集箱
const inboxList = computed(() => ({
  id: 'inbox',
  name: '收集箱',
  color: '#10b981'
}))

// 最近使用的清单（根据任务更新时间）
const recentListIds = computed(() => {
  const listTaskMap = new Map()
  store.tasks.forEach(task => {
    if (!task.deleted && task.updatedAt) {
      const existing = listTaskMap.get(task.listId)
      if (!existing || new Date(task.updatedAt) > new Date(existing.updatedAt)) {
        listTaskMap.set(task.listId, task.updatedAt)
      }
    }
  })
  return Array.from(listTaskMap.entries())
    .sort((a, b) => new Date(b[1]) - new Date(a[1]))
    .slice(0, 5)
    .map(([listId]) => listId)
})

// 分组后的清单（根据搜索和标签过滤）
const filteredGroups = computed(() => {
  const groups = store.groupedLists || []
  const query = searchQuery.value.toLowerCase()

  return groups.map(group => ({
    ...group,
    lists: group.lists.filter(list => {
      // 排除当前清单
      if (list.id === props.currentListId) return false
      // 如果有搜索词，过滤匹配的清单
      if (query && !list.name.toLowerCase().includes(query)) return false
      // 最近使用：只显示最近使用的清单
      if (activeTab.value === 'recent' && !recentListIds.value.includes(list.id)) return false
      // 我的清单：只显示非系统清单
      if (activeTab.value === 'mine' && list.isSystem) return false
      return true
    })
  })).filter(group => group.lists.length > 0)
})

// 未分组的清单（排除收集箱和当前清单，根据搜索过滤）
const ungroupedLists = computed(() => {
  const query = searchQuery.value.toLowerCase()
  return store.lists.filter(list => {
    // 排除非未分组、当前清单、收集箱
    if (list.groupId || list.id === props.currentListId || list.id === 'inbox') return false
    // 如果有搜索词，过滤匹配的清单
    if (query && !list.name.toLowerCase().includes(query)) return false
    // 最近使用：只显示最近使用的清单
    if (activeTab.value === 'recent' && !recentListIds.value.includes(list.id)) return false
    // 我的清单：只显示非系统清单
    if (activeTab.value === 'mine' && list.isSystem) return false
    return true
  })
})

// 是否显示收集箱
const showInbox = computed(() => {
  if (activeTab.value === 'mine') return false
  if (activeTab.value === 'recent') return recentListIds.value.includes('inbox')
  return true
})

// 所有清单（用于搜索）
const allLists = computed(() => {
  const lists = [inboxList.value]
  filteredGroups.value.forEach(group => {
    lists.push(...group.lists)
  })
  lists.push(...ungroupedLists.value)
  return lists
})

// 过滤后的清单
const filteredLists = computed(() => {
  if (!searchQuery.value.trim()) return allLists.value
  const query = searchQuery.value.toLowerCase()
  return allLists.value.filter(list =>
    list.name.toLowerCase().includes(query)
  )
})

// 选中的清单路径
const selectedListPath = computed(() => {
  if (!selectedListId.value) return ''

  // 检查是否是收集箱
  if (selectedListId.value === 'inbox') {
    return '收集箱'
  }

  // 在分组中查找
  for (const group of filteredGroups.value) {
    const list = group.lists.find(l => l.id === selectedListId.value)
    if (list) {
      return `${group.name} / ${list.name}`
    }
  }

  // 在未分组中查找
  const list = ungroupedLists.value.find(l => l.id === selectedListId.value)
  if (list) {
    return list.name
  }

  return ''
})

// 检查是否匹配搜索
function matchesFilter(list) {
  if (!searchQuery.value.trim()) return true
  return list.name.toLowerCase().includes(searchQuery.value.toLowerCase())
}

// 检查是否应该显示分组
function shouldShowGroup(group) {
  if (activeTab.value === 'recent') {
    return group.lists.some(list => recentListIds.value.includes(list.id))
  }
  if (activeTab.value === 'mine') {
    return group.lists.some(list => !list.isSystem)
  }
  return true
}

// 切换分组展开
function toggleGroup(groupId) {
  const newSet = new Set(expandedGroups.value)
  if (newSet.has(groupId)) {
    newSet.delete(groupId)
  } else {
    newSet.add(groupId)
  }
  expandedGroups.value = newSet
}

// 选择清单
function selectList(listId) {
  selectedListId.value = listId
}

// 确认移动
function confirmMove() {
  if (selectedListId.value) {
    emit('select', selectedListId.value)
    close()
  }
}

// 关闭弹窗
function close() {
  emit('close')
  searchQuery.value = ''
  expandedGroups.value.clear()
  selectedListId.value = null
}

// 获取任务数量
function getTaskCount(listId) {
  return store.tasks.filter(task => task.listId === listId && !task.deleted).length
}

// 获取分组任务数量
function getGroupTaskCount(group) {
  return group.lists.reduce((total, list) => {
    return total + getTaskCount(list.id)
  }, 0)
}

// 自动展开搜索到的分组
watch(searchQuery, (query) => {
  if (query.trim()) {
    // 搜索时展开所有分组
    const newSet = new Set(expandedGroups.value)
    filteredGroups.value.forEach(group => {
      newSet.add(group.id)
    })
    expandedGroups.value = newSet
  }
})

// 自动聚焦搜索框
watch(() => props.visible, (visible) => {
  if (visible) {
    nextTick(() => searchInput.value?.focus())
  }
})
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay, rgba(0, 0, 0, 0.5));
  backdrop-filter: blur(4px);
}

.modal-content {
  width: 580px;
  height: 520px;
  background: var(--surface-raised, #fff);
  color: var(--text, #111827);
  border: 1px solid var(--border, transparent);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-elevated, 0 25px 80px rgba(0, 0, 0, 0.25));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 24px 16px;

  h3 {
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 700;
    color: var(--text, #111827);
  }

  .modal-subtitle {
    margin: 0;
    font-size: 14px;
    color: var(--text-muted, #6b7280);
  }
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm, 8px);
  background: var(--surface-muted, #f3f4f6);
  color: var(--text-muted, #6b7280);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--accent-tint, #e5e7eb);
    color: var(--text, #374151);
  }
}

.modal-search {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 24px;
  padding: 12px 16px;
  background: var(--surface, #f9fafb);
  border: 1px solid var(--border, transparent);
  border-radius: var(--radius-md, 12px);
  color: var(--text-subtle, #9ca3af);

  input {
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 14px;
    color: var(--text, #111827);

    &::placeholder {
      color: var(--text-subtle, #9ca3af);
    }
  }
}

.modal-body {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 16px 24px;
  gap: 16px;
  overflow: hidden;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 140px;
  flex-shrink: 0;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text-muted, #6b7280);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--surface-muted, #f3f4f6);
    color: var(--text, #374151);
  }

  &.active {
    background: var(--accent-soft, #f0fdf4);
    color: var(--accent-strong, #059669);
  }
}

.list-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb, #e5e7eb) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--scrollbar-thumb, #e5e7eb);
    border-radius: 3px;
  }
}

.no-results {
  padding: 32px;
  text-align: center;
  color: var(--text-subtle, #9ca3af);
  font-size: 14px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text-muted, #374151);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--surface-muted, #f9fafb);
    color: var(--text, #374151);
  }

  &.selected {
    background: var(--accent-soft, #f0fdf4);
    color: var(--accent-strong, #059669);
  }

  &--group {
    font-weight: 600;
    color: var(--text, #111827);
  }

  &--child {
    padding-left: 42px;
  }
}

.list-children {
  animation: slideDown 0.15s ease;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.list-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-count {
  color: var(--text-subtle, #9ca3af);
  font-size: 13px;
  flex-shrink: 0;
}

.chevron {
  transition: transform 0.2s ease;

  &.expanded {
    transform: rotate(90deg);
  }
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--divider-soft, #f3f4f6);
  gap: 16px;
}

.selected-path {
  margin-right: auto;
  font-size: 14px;
  color: var(--text-muted, #6b7280);

  .path-text {
    display: inline-block;
    padding: 4px 10px;
    margin-left: 6px;
    background: var(--accent-soft, #f0fdf4);
    color: var(--accent-strong, #059669);
    border-radius: 6px;
    font-weight: 500;
  }
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: 0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &--cancel {
    background: var(--surface-muted, #f3f4f6);
    color: var(--text, #374151);
    border: 1px solid var(--border, transparent);

    &:hover {
      background: var(--accent-tint, #e5e7eb);
    }
  }

  &--confirm {
    background: var(--success, #10b981);
    color: var(--on-success, #fff);
    box-shadow: 0 4px 14px color-mix(in srgb, var(--success, #059669) 34%, transparent);

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px color-mix(in srgb, var(--success, #059669) 40%, transparent);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
