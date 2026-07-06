import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { genId } from '@/utils/id'
import { getMonthDays, isToday, toDateString } from '@/utils/date'
import { loadData as loadPlatformData, saveData as savePlatformData } from '@/services/platform'

const SYSTEM_VIEW_IDS = ['today', 'inbox', 'planned', 'important', 'calendar', 'stats', 'completed', 'trash', 'search']
const READONLY_VIEWS = ['planned', 'calendar', 'stats', 'completed', 'trash']
const THEME_IDS = ['mint', 'blue', 'violet', 'graphite']
const DETAIL_WIDTH_MIN = 320
const DETAIL_WIDTH_MAX = 800

const DEFAULT_GROUPS = [
  { id: 'life', name: '生活', collapsed: false, sortOrder: 1000 },
  { id: 'work', name: '工作', collapsed: false, sortOrder: 2000 }
]

const DEFAULT_LISTS = [
  { id: 'inbox', name: '收集箱', groupId: null, color: '#5fb8ad', isSystem: true, sortOrder: 0 },
  { id: 'work', name: '工作任务', groupId: 'work', color: '#4f8de8', isSystem: false, sortOrder: 1000 },
  { id: 'personal', name: '个人备忘', groupId: 'life', color: '#e0a54f', isSystem: false, sortOrder: 2000 }
]

const DEFAULT_SETTINGS = {
  theme: 'mint',
  density: 'comfortable',
  detailOpen: true,
  detailWidth: 380,
  startView: 'today',
  completedVisible: true
}

function nowIso() {
  return new Date().toISOString()
}

function localDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function atTime(date, hour = 9, minute = 0) {
  const d = new Date(date)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function addDays(days, hour = 9, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return atTime(d, hour, minute)
}

function startOfDay(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return d
}

function getPlanBucket(task) {
  if (!task.dueDate) return 'none'
  const due = startOfDay(task.dueDate)
  const today = startOfDay(new Date())
  const diff = Math.round((due - today) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff <= 7) return 'week'
  return 'later'
}

function parseQuickTitle(input) {
  let title = input.trim()
  const updates = {}
  const tags = []

  title = title.replace(/#([\p{L}\p{N}_-]+)/gu, (_, tag) => {
    tags.push(tag)
    return ''
  })

  const rules = [
    { pattern: /(今天|今日)/, date: () => addDays(0) },
    { pattern: /明天/, date: () => addDays(1) },
    { pattern: /后天/, date: () => addDays(2) },
    { pattern: /(下周|下星期)/, date: () => addDays(7) }
  ]

  for (const rule of rules) {
    if (rule.pattern.test(title)) {
      updates.dueDate = rule.date()
      title = title.replace(rule.pattern, '')
      break
    }
  }

  const timeMatch = title.match(/(?:^|\s)(\d{1,2})[:：点](\d{2})?/)
  if (timeMatch) {
    const date = updates.dueDate ? new Date(updates.dueDate) : new Date()
    date.setHours(Number(timeMatch[1]), Number(timeMatch[2] || 0), 0, 0)
    updates.dueDate = date.toISOString()
    title = title.replace(timeMatch[0], ' ')
  }

  if (/每天|每日/.test(title)) {
    updates.repeatRule = 'daily'
    title = title.replace(/每天|每日/, '')
  } else if (/每周|每星期/.test(title)) {
    updates.repeatRule = 'weekly'
    title = title.replace(/每周|每星期/, '')
  } else if (/每月/.test(title)) {
    updates.repeatRule = 'monthly'
    title = title.replace(/每月/, '')
  }

  if (/重要|高优先级/.test(title)) {
    updates.priority = 3
    updates.important = true
    title = title.replace(/重要|高优先级/g, '')
  }

  return {
    title: title.replace(/\s+/g, ' ').trim(),
    updates,
    tags
  }
}

export const useTaskStore = defineStore('task', () => {
  const groups = ref(DEFAULT_GROUPS.map(group => ({ ...group })))
  const lists = ref(DEFAULT_LISTS.map(list => ({ ...list })))
  const tasks = ref([])
  const trash = ref([])
  const currentView = ref(DEFAULT_SETTINGS.startView)
  const selectedTaskId = ref(null)
  const sortBy = ref('default')
  const searchQuery = ref('')
  const saveError = ref('')
  const isSaving = ref(false)
  const notice = ref(null)
  const settings = ref({ ...DEFAULT_SETTINGS })
  const settingsOpen = ref(false)
  const ungroupedCollapsed = ref(false)
  const calendarCursor = ref(new Date())
  const viewOrders = ref({})
  let pendingSavePayload = null
  let activeSavePromise = null
  let saveTimer = null

  const activeTasks = computed(() => tasks.value.filter(task => !task.deleted))
  const todayKey = computed(() => localDateKey())

  const currentList = computed(() => {
    if (SYSTEM_VIEW_IDS.includes(currentView.value)) return null
    return lists.value.find(list => list.id === currentView.value) || null
  })

  const canQuickAddTask = computed(() => {
    return currentView.value === 'today' ||
      currentView.value === 'inbox' ||
      currentView.value === 'important' ||
      Boolean(currentList.value)
  })

  const filteredTasks = computed(() => {
    let result = []
    const query = searchQuery.value.trim().toLowerCase()

    switch (currentView.value) {
      case 'today':
        result = activeTasks.value.filter(task => isInMyDay(task) || isToday(task.dueDate))
        break
      case 'inbox':
        result = activeTasks.value.filter(task => task.listId === 'inbox')
        break
      case 'planned':
        result = activeTasks.value.filter(task => task.dueDate)
        break
      case 'important':
        result = activeTasks.value.filter(task => task.important || task.priority === 3 || task.pinned)
        break
      case 'calendar':
      case 'stats':
        result = []
        break
      case 'completed':
        result = tasks.value.filter(task => task.completed && !task.deleted)
        break
      case 'trash':
        result = [...trash.value]
        break
      case 'search':
        result = query ? activeTasks.value.filter(task => {
          const fields = [
            task.title,
            task.description,
            task.descriptionHtml,
            task.repeatRule,
            ...(task.tags || [])
          ].filter(Boolean).join(' ').toLowerCase()
          return fields.includes(query)
        }) : []
        break
      default:
        result = activeTasks.value.filter(task => task.listId === currentView.value)
    }

    return sortTasks(result)
  })

  const uncompletedTasks = computed(() => filteredTasks.value.filter(task => !task.completed))
  const completedTasks = computed(() => filteredTasks.value.filter(task => task.completed))

  const selectedTask = computed(() => {
    if (!selectedTaskId.value) return null
    return tasks.value.find(task => task.id === selectedTaskId.value) ||
      trash.value.find(task => task.id === selectedTaskId.value) ||
      null
  })

  const selectedList = computed(() => {
    if (!selectedTask.value) return null
    return lists.value.find(list => list.id === selectedTask.value.listId) || lists.value.find(list => list.id === 'inbox')
  })

  const listTaskCounts = computed(() => {
    const counts = {}
    const open = activeTasks.value.filter(task => !task.completed)
    lists.value.forEach(list => {
      counts[list.id] = open.filter(task => task.listId === list.id).length
    })
    counts.today = open.filter(task => isInMyDay(task) || isToday(task.dueDate)).length
    counts.inbox = open.filter(task => task.listId === 'inbox').length
    counts.planned = open.filter(task => task.dueDate).length
    counts.important = open.filter(task => task.important || task.priority === 3 || task.pinned).length
    counts.calendar = open.filter(task => task.dueDate).length
    counts.completed = tasks.value.filter(task => task.completed && !task.deleted).length
    counts.trash = trash.value.length
    return counts
  })

  const groupedLists = computed(() => {
    const customLists = lists.value
      .filter(list => !list.isSystem)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    return [...groups.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(group => ({
      ...group,
      lists: customLists.filter(list => list.groupId === group.id)
    })).concat({
      id: 'ungrouped',
      name: '未分组',
      collapsed: ungroupedCollapsed.value,
      lists: customLists.filter(list => !list.groupId || !groups.value.some(group => group.id === list.groupId))
    }).filter(group => group.lists.length || group.id !== 'ungrouped')
  })

  const suggestedTodayTasks = computed(() => {
    return activeTasks.value
      .filter(task => !task.completed && !isInMyDay(task))
      .filter(task => task.listId === 'inbox' || task.pinned || task.important || getPlanBucket(task) === 'overdue')
      .slice(0, 5)
  })

  const plannedSections = computed(() => {
    const buckets = [
      ['overdue', '已逾期'],
      ['today', '今天'],
      ['tomorrow', '明天'],
      ['week', '本周'],
      ['later', '以后']
    ]
    return buckets.map(([id, label]) => ({
      id,
      label,
      tasks: filteredTasks.value.filter(task => getPlanBucket(task) === id)
    })).filter(section => section.tasks.length)
  })

  const calendarYear = computed(() => calendarCursor.value.getFullYear())
  const calendarMonth = computed(() => calendarCursor.value.getMonth())
  const calendarTasksByDate = computed(() => {
    const byDate = {}
    activeTasks.value
      .filter(task => task.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .forEach(task => {
        const key = localDateKey(task.dueDate)
        if (!byDate[key]) byDate[key] = []
        byDate[key].push(task)
      })
    return byDate
  })
  const calendarMonthDays = computed(() => {
    return getMonthDays(calendarYear.value, calendarMonth.value).map(day => {
      const key = toDateString(day.date)
      return {
        ...day,
        key,
        tasks: calendarTasksByDate.value[key] || []
      }
    })
  })

  const statsSummary = computed(() => {
    const open = activeTasks.value.filter(task => !task.completed)
    const completed = tasks.value.filter(task => task.completed && !task.deleted)
    const total = open.length + completed.length
    return {
      open: open.length,
      overdue: open.filter(task => task.dueDate && startOfDay(task.dueDate) < startOfDay(new Date())).length,
      dueThisWeek: open.filter(task => isWithinFutureDays(task.dueDate, 7)).length,
      doneToday: completed.filter(task => task.completedAt && localDateKey(task.completedAt) === todayKey.value).length,
      completedThisWeek: completed.filter(task => isWithinPastDays(task.completedAt, 7)).length,
      completionRate: total ? Math.round((completed.length / total) * 100) : 0
    }
  })

  const statsTrend7Days = computed(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      const key = localDateKey(date)
      return {
        key,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        completed: tasks.value.filter(task => task.completedAt && localDateKey(task.completedAt) === key).length,
        created: tasks.value.filter(task => task.createdAt && localDateKey(task.createdAt) === key).length
      }
    })
  })

  const listDistribution = computed(() => {
    const open = activeTasks.value.filter(task => !task.completed)
    return lists.value
      .map(list => ({
        id: list.id,
        name: list.name,
        color: list.color,
        count: open.filter(task => task.listId === list.id).length
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
  })

  const currentTaskOrderKey = computed(() => getTaskOrderKey())
  const canDragTasks = computed(() => {
    return sortBy.value === 'default' &&
      Boolean(currentTaskOrderKey.value) &&
      !['calendar', 'stats', 'completed', 'trash'].includes(currentView.value)
  })

  function sortTasks(source) {
    const result = [...source]
    if (sortBy.value === 'date') {
      result.sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate) - new Date(b.dueDate)
      })
    } else if (sortBy.value === 'dateDesc') {
      result.sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(b.dueDate) - new Date(a.dueDate)
      })
    } else if (sortBy.value === 'priority') {
      result.sort((a, b) => {
        const ap = Number(a.priority || 0) + (a.important ? 1 : 0) + (a.pinned ? 2 : 0)
        const bp = Number(b.priority || 0) + (b.important ? 1 : 0) + (b.pinned ? 2 : 0)
        if (ap !== bp) return bp - ap
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
    } else if (sortBy.value === 'createdDesc') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else if (sortBy.value === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
    } else {
      const ordered = applyViewOrder(result)
      if (ordered) return ordered
      result.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        if ((a.important || a.priority === 3) !== (b.important || b.priority === 3)) {
          return (a.important || a.priority === 3) ? -1 : 1
        }
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
    }
    return result
  }

  function getTaskOrderKey() {
    if (currentView.value === 'search') {
      const query = searchQuery.value.trim().toLowerCase()
      return query ? `search:${query}` : null
    }
    if (['today', 'inbox', 'planned', 'important'].includes(currentView.value)) return currentView.value
    if (currentList.value) return `list:${currentList.value.id}`
    return null
  }

  function smartSortTasks(source) {
    return [...source].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      if ((a.important || a.priority === 3) !== (b.important || b.priority === 3)) {
        return (a.important || a.priority === 3) ? -1 : 1
      }
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }

  function applyViewOrder(source, key = currentTaskOrderKey.value) {
    const order = key ? viewOrders.value[key] : null
    if (!Array.isArray(order) || !order.some(id => source.some(task => task.id === id))) return null
    const rank = new Map(order.map((id, index) => [id, index]))
    const fallback = smartSortTasks(source)
    const fallbackRank = new Map(fallback.map((task, index) => [task.id, index]))
    return [...source].sort((a, b) => {
      const ar = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER
      const br = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER
      if (ar !== br) return ar - br
      return (fallbackRank.get(a.id) ?? 0) - (fallbackRank.get(b.id) ?? 0)
    })
  }

  function isInMyDay(task) {
    return task.myDayDate === todayKey.value
  }

  function showNotice(message, type = 'info') {
    notice.value = { id: genId(), message, type }
  }

  function clearNotice() {
    notice.value = null
  }

  function openSettings() {
    settingsOpen.value = true
  }

  function closeSettings() {
    settingsOpen.value = false
  }

  function updateSettings(updates) {
    settings.value = normalizeSettings({ ...settings.value, ...updates })
  }

  function cycleSort() {
    const order = ['default', 'date', 'priority', 'name']
    const idx = order.indexOf(sortBy.value)
    sortBy.value = order[(idx + 1) % order.length]
  }

  function setSort(value) {
    if (['default', 'date', 'dateDesc', 'priority', 'createdDesc', 'name'].includes(value)) sortBy.value = value
  }

  function addGroup(name) {
    const group = { id: genId(), name, collapsed: false, sortOrder: nextGroupSortOrder() }
    groups.value.push(group)
    return group
  }

  function renameGroup(id, name) {
    const group = groups.value.find(item => item.id === id)
    if (group && name.trim()) group.name = name.trim()
  }

  function deleteGroup(id) {
    groups.value = groups.value.filter(group => group.id !== id)
    lists.value.forEach(list => {
      if (list.groupId === id) list.groupId = null
    })
  }

  function toggleGroup(id) {
    if (id === 'ungrouped') {
      ungroupedCollapsed.value = !ungroupedCollapsed.value
      return
    }
    const group = groups.value.find(item => item.id === id)
    if (group) group.collapsed = !group.collapsed
  }

  function addList(name, groupId = null) {
    const list = {
      id: genId(),
      name,
      groupId,
      color: pickListColor(),
      isSystem: false,
      sortOrder: nextListSortOrder(groupId || null)
    }
    lists.value.push(list)
    return list
  }

  function deleteList(id) {
    const list = lists.value.find(item => item.id === id)
    if (!list || list.isSystem || id === 'inbox') return false
    const updatedAt = nowIso()
    tasks.value.forEach(task => {
      if (task.listId === id) {
        task.listId = 'inbox'
        task.updatedAt = updatedAt
      }
    })
    lists.value = lists.value.filter(item => item.id !== id)
    if (currentView.value === id) currentView.value = 'inbox'
    return true
  }

  function renameList(id, name) {
    const list = lists.value.find(item => item.id === id)
    if (list && name.trim()) list.name = name.trim()
  }

  function moveList(id, groupId) {
    const list = lists.value.find(item => item.id === id)
    if (list && !list.isSystem) list.groupId = groupId || null
  }

  function reorderGroup(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return
    const ordered = [...groups.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    moveById(ordered, sourceId, targetId)
    ordered.forEach((group, index) => {
      const target = groups.value.find(item => item.id === group.id)
      if (target) target.sortOrder = (index + 1) * 1000
    })
  }

  function reorderList(sourceId, targetId, groupId = null) {
    if (!sourceId || !targetId || sourceId === targetId) return
    const source = lists.value.find(item => item.id === sourceId)
    const target = lists.value.find(item => item.id === targetId)
    if (!source || !target || source.isSystem || target.isSystem) return
    source.groupId = groupId ?? target.groupId ?? null
    const siblings = lists.value
      .filter(list => !list.isSystem && (list.groupId || null) === (source.groupId || null))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    moveById(siblings, sourceId, targetId)
    siblings.forEach((list, index) => {
      const item = lists.value.find(candidate => candidate.id === list.id)
      if (item) item.sortOrder = (index + 1) * 1000
    })
  }

  function reorderTask(sourceId, targetId, scopeIds = null, position = 'before') {
    const key = currentTaskOrderKey.value
    if (!canDragTasks.value || !key || !sourceId || !targetId || sourceId === targetId) return
    const visibleIds = Array.isArray(scopeIds) && scopeIds.length
      ? scopeIds
      : uncompletedTasks.value.map(task => task.id)
    if (!visibleIds.includes(sourceId) || !visibleIds.includes(targetId)) return
    const existing = Array.isArray(viewOrders.value[key]) ? viewOrders.value[key] : []
    const merged = [
      ...visibleIds,
      ...existing.filter(id => !visibleIds.includes(id))
    ].filter(id => tasks.value.some(task => task.id === id && !task.deleted))

    if (position === 'after') {
      // Find the next item after target to insert after
      const targetIdx = merged.indexOf(targetId)
      const nextId = targetIdx >= 0 && targetIdx < merged.length - 1 ? merged[targetIdx + 1] : null
      if (nextId && nextId !== sourceId) {
        moveById(merged, sourceId, nextId)
      } else {
        // At the end, just move to target position (will end up after target)
        moveById(merged, sourceId, targetId)
      }
    } else {
      moveById(merged, sourceId, targetId)
    }

    viewOrders.value = {
      ...viewOrders.value,
      [key]: merged
    }
  }

  function moveListToGroup(listId, groupId = null) {
    const list = lists.value.find(item => item.id === listId)
    if (!list || list.isSystem) return
    list.groupId = groupId || null
    list.sortOrder = nextListSortOrder(groupId || null)
  }

  function addTask(input, listId) {
    if (READONLY_VIEWS.includes(currentView.value)) return null
    const parsed = parseQuickTitle(input)
    const title = parsed.title || input.trim()
    if (!title) return null
    const createdAt = nowIso()
    const targetListId = resolveNewTaskListId(listId)
    const task = normalizeTask({
      id: genId(),
      title,
      listId: targetListId,
      tags: parsed.tags,
      ...parsed.updates,
      myDayDate: currentView.value === 'today' ? todayKey.value : null,
      important: currentView.value === 'important' || parsed.updates.important || false,
      dueDate: currentView.value === 'today' ? (parsed.updates.dueDate || atTime(new Date())) : parsed.updates.dueDate,
      createdAt,
      updatedAt: createdAt
    })
    tasks.value.unshift(task)
    prependTaskToCurrentOrder(task.id)
    selectedTaskId.value = task.id
    return task
  }

  function addTaskOnDate(input, date, listId = 'inbox') {
    const parsed = parseQuickTitle(input)
    const title = parsed.title || input.trim()
    if (!title) return null
    const due = date instanceof Date ? new Date(date) : new Date(date)
    due.setHours(9, 0, 0, 0)
    const createdAt = nowIso()
    const task = normalizeTask({
      id: genId(),
      title,
      listId: lists.value.some(list => list.id === listId) ? listId : 'inbox',
      tags: parsed.tags,
      ...parsed.updates,
      dueDate: parsed.updates.dueDate || due.toISOString(),
      createdAt,
      updatedAt: createdAt
    })
    tasks.value.unshift(task)
    prependTaskToOrder(task.id, 'planned')
    selectedTaskId.value = task.id
    return task
  }

  function resolveNewTaskListId(listId) {
    if (listId && lists.value.some(list => list.id === listId)) return listId
    if (currentList.value) return currentList.value.id
    return 'inbox'
  }

  function completeTask(id) {
    const task = tasks.value.find(item => item.id === id)
    if (!task) return
    task.completed = !task.completed
    task.completedAt = task.completed ? nowIso() : null
    task.updatedAt = nowIso()
  }

  function toggleMyDay(id) {
    const task = tasks.value.find(item => item.id === id)
    if (!task) return
    task.myDayDate = isInMyDay(task) ? null : todayKey.value
    task.updatedAt = nowIso()
  }

  function toggleImportant(id) {
    const task = tasks.value.find(item => item.id === id)
    if (!task) return
    task.important = !task.important
    if (task.important && task.priority < 3) task.priority = 3
    task.updatedAt = nowIso()
  }

  function deleteTask(id) {
    const task = tasks.value.find(item => item.id === id)
    if (task && !task.deleted) {
      const deletedAt = nowIso()
      task.deleted = true
      task.deletedAt = deletedAt
      task.updatedAt = deletedAt
      trash.value = trash.value.filter(item => item.id !== id)
      trash.value.unshift({ ...task, subtasks: [...task.subtasks], attachments: [...task.attachments] })
      removeTaskFromOrders(id)
      if (selectedTaskId.value === id) selectedTaskId.value = null
      showNotice('任务已移入垃圾桶', 'success')
    }
  }

  function restoreTask(id) {
    const idx = trash.value.findIndex(task => task.id === id)
    if (idx === -1) return
    const task = trash.value[idx]
    const original = tasks.value.find(item => item.id === id)
    if (original) {
      original.deleted = false
      original.deletedAt = null
      original.updatedAt = nowIso()
    } else {
      tasks.value.unshift(normalizeTask({ ...task, deleted: false, deletedAt: null, updatedAt: nowIso() }))
    }
    trash.value.splice(idx, 1)
    showNotice('任务已恢复', 'success')
  }

  function permanentDelete(id) {
    tasks.value = tasks.value.filter(task => task.id !== id)
    trash.value = trash.value.filter(task => task.id !== id)
    removeTaskFromOrders(id)
    if (selectedTaskId.value === id) selectedTaskId.value = null
    showNotice('任务已永久删除', 'success')
  }

  function updateTask(id, updates) {
    const task = tasks.value.find(item => item.id === id) || trash.value.find(item => item.id === id)
    if (task) Object.assign(task, updates, { updatedAt: nowIso() })
  }

  function moveTaskToDate(id, date) {
    const task = tasks.value.find(item => item.id === id)
    if (!task || task.deleted) return
    const previous = task.dueDate ? new Date(task.dueDate) : new Date(date)
    const next = date instanceof Date ? new Date(date) : new Date(date)
    next.setHours(previous.getHours() || 9, previous.getMinutes() || 0, 0, 0)
    task.dueDate = next.toISOString()
    task.updatedAt = nowIso()
  }

  function togglePin(id) {
    const task = tasks.value.find(item => item.id === id)
    if (task) {
      task.pinned = !task.pinned
      task.updatedAt = nowIso()
    }
  }

  function copyTask(id) {
    const source = tasks.value.find(task => task.id === id) || trash.value.find(task => task.id === id)
    if (!source) return null
    const createdAt = nowIso()
    const task = normalizeTask({
      ...source,
      id: genId(),
      title: `${source.title} 副本`,
      completed: false,
      completedAt: null,
      deleted: false,
      deletedAt: null,
      pinned: false,
      subtasks: (source.subtasks || []).map(sub => ({ ...sub, id: genId() })),
      attachments: (source.attachments || []).map(att => ({ ...att, id: genId() })),
      createdAt,
      updatedAt: createdAt
    })
    tasks.value.unshift(task)
    return task
  }

  function clearCompletedInCurrentView() {
    const completed = filteredTasks.value.filter(task => task.completed && !task.deleted)
    completed.forEach(task => deleteTask(task.id))
    return completed.length
  }

  function addSubtask(taskId, title) {
    const task = tasks.value.find(item => item.id === taskId)
    if (!task || !title.trim()) return
    task.subtasks.push({ id: genId(), title: title.trim(), completed: false, sortOrder: nextSubtaskSortOrder(task) })
    task.updatedAt = nowIso()
  }

  function toggleSubtask(taskId, subId) {
    const task = tasks.value.find(item => item.id === taskId)
    const subtask = task?.subtasks.find(item => item.id === subId)
    if (!subtask || !task) return
    subtask.completed = !subtask.completed
    task.updatedAt = nowIso()
  }

  function deleteSubtask(taskId, subId) {
    const task = tasks.value.find(item => item.id === taskId)
    if (!task) return
    task.subtasks = task.subtasks.filter(subtask => subtask.id !== subId)
    task.updatedAt = nowIso()
  }

  function updateSubtask(taskId, subId, title) {
    const task = tasks.value.find(item => item.id === taskId)
    const subtask = task?.subtasks.find(item => item.id === subId)
    if (!subtask || !title.trim()) return
    subtask.title = title.trim()
    task.updatedAt = nowIso()
  }

  function reorderSubtask(taskId, sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return
    const task = tasks.value.find(item => item.id === taskId)
    if (!task) return
    const ordered = [...task.subtasks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    moveById(ordered, sourceId, targetId)
    ordered.forEach((subtask, index) => {
      const item = task.subtasks.find(candidate => candidate.id === subtask.id)
      if (item) item.sortOrder = (index + 1) * 1000
    })
    task.subtasks = ordered
    task.updatedAt = nowIso()
  }

  function addAttachment(taskId, filePath, imageUrl) {
    const task = tasks.value.find(item => item.id === taskId)
    if (!task) return
    task.attachments.push({
      id: genId(),
      path: filePath,
      url: imageUrl,
      createdAt: nowIso()
    })
    task.updatedAt = nowIso()
  }

  function removeAttachment(taskId, attachmentId) {
    const task = tasks.value.find(item => item.id === taskId)
    if (!task) return
    task.attachments = task.attachments.filter(attachment => attachment.id !== attachmentId)
    task.updatedAt = nowIso()
  }

  function setView(view) {
    currentView.value = view
    selectedTaskId.value = null
  }

  function setCalendarMonth(year, month) {
    calendarCursor.value = new Date(year, month, 1)
  }

  function shiftCalendarMonth(delta) {
    calendarCursor.value = new Date(calendarYear.value, calendarMonth.value + delta, 1)
  }

  function shiftCalendarYear(delta) {
    calendarCursor.value = new Date(calendarYear.value + delta, calendarMonth.value, 1)
  }

  function resetCalendarToday() {
    calendarCursor.value = new Date()
  }

  function setSearch(query = searchQuery.value) {
    searchQuery.value = query
    currentView.value = 'search'
    selectedTaskId.value = null
  }

  function selectTask(id) {
    selectedTaskId.value = id
    if (id && !settings.value.detailOpen) settings.value.detailOpen = true
  }

  async function loadData() {
    try {
      const data = await loadPlatformData()
      if (data) {
        groups.value = normalizeGroups(data.groups)
        lists.value = normalizeLists(data.lists)
        tasks.value = (data.tasks || []).map(normalizeTask)
        trash.value = (data.trash || []).map(task => normalizeTask({ ...task, deleted: true }))
        settings.value = normalizeSettings(data.settings)
        viewOrders.value = normalizeViewOrders(data.viewOrders)
      }
      currentView.value = settings.value.startView || 'today'
      saveError.value = ''
    } catch (error) {
      saveError.value = error?.message || '读取本地数据失败'
      showNotice(saveError.value, 'error')
    }
  }

  async function saveData() {
    pendingSavePayload = buildSavePayload()
    if (activeSavePromise) return activeSavePromise

    activeSavePromise = flushPendingSaves()
    return activeSavePromise
  }

  async function flushPendingSaves() {
    isSaving.value = true
    try {
      while (pendingSavePayload) {
        const payload = pendingSavePayload
        pendingSavePayload = null
        await savePlatformData(payload)
      }
      saveError.value = ''
    } catch (error) {
      saveError.value = error?.message || '保存本地数据失败'
      showNotice(saveError.value, 'error')
      throw error
    } finally {
      isSaving.value = false
      activeSavePromise = null
    }
  }

  watch([groups, lists, tasks, trash, settings, viewOrders], () => {
    scheduleSave()
  }, { deep: true })

  function scheduleSave() {
    if (saveTimer) window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      saveTimer = null
      saveData().catch(() => {})
    }, 180)
  }

  function buildSavePayload() {
    return JSON.parse(JSON.stringify({
      schemaVersion: 2,
      groups: groups.value,
      lists: lists.value,
      tasks: tasks.value,
      trash: trash.value,
      viewOrders: viewOrders.value,
      settings: settings.value
    }))
  }

  function normalizeGroups(rawGroups) {
    const source = Array.isArray(rawGroups) && rawGroups.length ? rawGroups : DEFAULT_GROUPS
    return source.map((group, index) => ({
      id: group?.id || genId(),
      name: group?.name || '未命名分组',
      collapsed: Boolean(group?.collapsed),
      sortOrder: Number.isFinite(Number(group?.sortOrder)) ? Number(group.sortOrder) : (index + 1) * 1000
    }))
  }

  function normalizeLists(rawLists) {
    const source = Array.isArray(rawLists) && rawLists.length ? rawLists : DEFAULT_LISTS
    const normalized = source.map(normalizeList)
    if (!normalized.some(list => list.id === 'inbox')) normalized.unshift({ ...DEFAULT_LISTS[0] })
    return normalized
  }

  function normalizeList(list, index = 0) {
    const fallback = DEFAULT_LISTS.find(item => item.id === list?.id)
    return {
      id: list?.id || genId(),
      name: list?.name || fallback?.name || '未命名清单',
      groupId: list?.groupId ?? fallback?.groupId ?? null,
      color: list?.color || fallback?.color || pickListColor(),
      isSystem: Boolean(list?.isSystem || list?.id === 'inbox'),
      sortOrder: Number.isFinite(Number(list?.sortOrder)) ? Number(list.sortOrder) : (fallback?.sortOrder ?? (index + 1) * 1000)
    }
  }

  function normalizeTask(task = {}) {
    const createdAt = task.createdAt || nowIso()
    return {
      id: task.id || genId(),
      title: task.title || '未命名任务',
      description: task.description || '',
      descriptionHtml: task.descriptionHtml || '',
      completed: Boolean(task.completed),
      completedAt: task.completedAt || null,
      deleted: Boolean(task.deleted),
      deletedAt: task.deletedAt || null,
      pinned: Boolean(task.pinned),
      important: Boolean(task.important || task.priority === 3),
      myDayDate: task.myDayDate || null,
      listId: task.listId || 'inbox',
      dueDate: task.dueDate || null,
      reminderAt: task.reminderAt || null,
      repeatRule: task.repeatRule || null,
      priority: Number(task.priority || 0),
      tags: Array.isArray(task.tags) ? task.tags : [],
      subtasks: Array.isArray(task.subtasks) ? task.subtasks.map((sub, index) => ({
        id: sub.id || genId(),
        title: sub.title || '',
        completed: Boolean(sub.completed),
        sortOrder: Number.isFinite(Number(sub.sortOrder)) ? Number(sub.sortOrder) : (index + 1) * 1000
      })).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) : [],
      attachments: Array.isArray(task.attachments) ? task.attachments.map(att => ({
        id: att.id || genId(),
        path: att.path || '',
        url: att.url || '',
        createdAt: att.createdAt || createdAt
      })) : [],
      comments: Array.isArray(task.comments) ? task.comments : [],
      editorMode: task.editorMode || 'detail',
      createdAt,
      updatedAt: task.updatedAt || createdAt
    }
  }

  function normalizeSettings(rawSettings = {}) {
    const theme = THEME_IDS.includes(rawSettings.theme) ? rawSettings.theme : DEFAULT_SETTINGS.theme
    const density = ['comfortable', 'compact'].includes(rawSettings.density) ? rawSettings.density : DEFAULT_SETTINGS.density
    const startView = SYSTEM_VIEW_IDS.includes(rawSettings.startView) ? rawSettings.startView : DEFAULT_SETTINGS.startView
    const detailWidth = typeof rawSettings.detailWidth === 'number'
      ? Math.max(DETAIL_WIDTH_MIN, Math.min(DETAIL_WIDTH_MAX, rawSettings.detailWidth))
      : DEFAULT_SETTINGS.detailWidth
    return {
      ...DEFAULT_SETTINGS,
      ...rawSettings,
      theme,
      density,
      startView,
      detailOpen: rawSettings.detailOpen !== false,
      detailWidth,
      completedVisible: rawSettings.completedVisible !== false
    }
  }

  function normalizeViewOrders(rawOrders = {}) {
    if (!rawOrders || typeof rawOrders !== 'object' || Array.isArray(rawOrders)) return {}
    return Object.fromEntries(Object.entries(rawOrders).map(([key, ids]) => [
      key,
      Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []
    ]))
  }

  function pickListColor() {
    const colors = ['#5fb8ad', '#4f8de8', '#e0a54f', '#cf6f87', '#7c6ee6', '#5f9e72']
    return colors[lists.value.length % colors.length]
  }

  function nextGroupSortOrder() {
    return Math.max(0, ...groups.value.map(group => Number(group.sortOrder || 0))) + 1000
  }

  function nextListSortOrder(groupId) {
    const candidates = groupId === undefined
      ? lists.value.filter(list => !list.isSystem)
      : lists.value.filter(list => !list.isSystem && (list.groupId || null) === (groupId || null))
    return Math.max(0, ...candidates.map(list => Number(list.sortOrder || 0))) + 1000
  }

  function nextSubtaskSortOrder(task) {
    return Math.max(0, ...(task.subtasks || []).map(subtask => Number(subtask.sortOrder || 0))) + 1000
  }

  function prependTaskToCurrentOrder(taskId) {
    const key = currentTaskOrderKey.value
    if (key) prependTaskToOrder(taskId, key)
  }

  function prependTaskToOrder(taskId, key) {
    const current = Array.isArray(viewOrders.value[key]) ? viewOrders.value[key].filter(id => id !== taskId) : []
    viewOrders.value = {
      ...viewOrders.value,
      [key]: [taskId, ...current]
    }
  }

  function removeTaskFromOrders(taskId) {
    viewOrders.value = Object.fromEntries(Object.entries(viewOrders.value).map(([key, ids]) => [
      key,
      Array.isArray(ids) ? ids.filter(id => id !== taskId) : []
    ]))
  }

  function moveById(items, sourceId, targetId) {
    const getId = (item) => typeof item === 'string' ? item : item.id
    const from = items.findIndex(item => getId(item) === sourceId)
    const to = items.findIndex(item => getId(item) === targetId)
    if (from === -1 || to === -1) return
    const [item] = items.splice(from, 1)
    items.splice(to, 0, item)
  }

  function isWithinPastDays(dateStr, days) {
    if (!dateStr) return false
    const date = startOfDay(dateStr)
    const today = startOfDay(new Date())
    const diff = Math.round((today - date) / 86400000)
    return diff >= 0 && diff < days
  }

  function isWithinFutureDays(dateStr, days) {
    if (!dateStr) return false
    const date = startOfDay(dateStr)
    const today = startOfDay(new Date())
    const diff = Math.round((date - today) / 86400000)
    return diff >= 0 && diff < days
  }

  return {
    groups,
    lists,
    tasks,
    trash,
    currentView,
    selectedTaskId,
    sortBy,
    viewOrders,
    calendarCursor,
    searchQuery,
    saveError,
    isSaving,
    notice,
    settings,
    settingsOpen,
    activeTasks,
    currentList,
    selectedList,
    canQuickAddTask,
    filteredTasks,
    uncompletedTasks,
    completedTasks,
    canDragTasks,
    selectedTask,
    listTaskCounts,
    groupedLists,
    suggestedTodayTasks,
    plannedSections,
    calendarYear,
    calendarMonth,
    calendarMonthDays,
    calendarTasksByDate,
    statsSummary,
    statsTrend7Days,
    listDistribution,
    isInMyDay,
    getPlanBucket,
    cycleSort,
    setSort,
    reorderGroup,
    reorderList,
    reorderTask,
    moveListToGroup,
    addGroup,
    renameGroup,
    deleteGroup,
    toggleGroup,
    addList,
    deleteList,
    renameList,
    moveList,
    addTask,
    addTaskOnDate,
    completeTask,
    toggleMyDay,
    toggleImportant,
    deleteTask,
    restoreTask,
    permanentDelete,
    updateTask,
    moveTaskToDate,
    togglePin,
    copyTask,
    clearCompletedInCurrentView,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateSubtask,
    reorderSubtask,
    addAttachment,
    removeAttachment,
    setView,
    setCalendarMonth,
    shiftCalendarMonth,
    shiftCalendarYear,
    resetCalendarToday,
    setSearch,
    selectTask,
    showNotice,
    clearNotice,
    openSettings,
    closeSettings,
    updateSettings,
    loadData,
    saveData
  }
})
