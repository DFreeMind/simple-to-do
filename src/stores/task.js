import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { genId } from '@/utils/id'
import { getMonthDays, isToday, toDateString } from '@/utils/date'
import {
  ensureReminderNotificationPermission,
  loadData as loadPlatformData,
  saveData as savePlatformData,
  saveMigrationBackup,
  setWindowCloseBehavior,
  sendReminderTestNotification,
  sendTaskReminderNotification
} from '@/services/platform'
import {
  playCompleteSound,
  playTaskUndoSound,
  playSubtaskCompleteSound,
  playSubtaskUndoSound,
  playDeleteSound,
  playAddSound,
  playRestoreSound,
  playMoveSound,
  playToggleSound,
  playMarkSound,
  playScheduleSound,
  playAttachSound,
  playClearSound,
  playErrorSound,
  playDragStartSound,
  playDragOverSound,
  playDragEndSound,
  playListAddSound,
  playListDeleteSound,
  playListRestoreSound,
  playRenameSound,
  playGroupAddSound,
  playGroupDeleteSound,
  playSoundPreview,
  setSoundEnabled,
  setSoundCategories
} from '@/utils/sound'
import { migrateData, validateData, createBackup, getCurrentVersion } from '@/utils/migrator'
import { matchesTaskSearch, normalizeSearchQuery } from '@/utils/search'
import { getCompletionMessage } from '@/utils/dailyMessages'

const SYSTEM_VIEW_IDS = ['today', 'inbox', 'planned', 'important', 'completed', 'trash', 'search']
const READONLY_VIEWS = ['planned', 'completed', 'trash']
const THEME_IDS = ['mint', 'blue', 'violet', 'graphite']
const TASK_GROUP_COLOR_IDS = ['auto', 'accent', 'blue', 'violet', 'amber', 'rose', 'green', 'cyan', 'coral', 'indigo', 'teal', 'brick', 'custom']
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
  activeModule: 'tasks',
  theme: 'mint',
  themeBackgrounds: false,
  density: 'comfortable',
  sidebarCollapsed: false,
  detailOpen: false,
  detailWidth: 380,
  startView: 'today',
  completedVisible: true,
  groupCompletedDisplayMode: 'in-group',
  groupCompletedVisibleByDefault: true,
  showCompletionDuration: true,
  trashRetentionDays: 30,
  soundEnabled: true,
  soundTaskEnabled: true,
  soundListEnabled: true,
  soundGroupEnabled: true,
  soundDragEnabled: true,
  reminderNotificationsEnabled: true,
  reminderSoundEnabled: true,
  windowCloseBehavior: 'hide',
  dailyGuidanceEnabled: true,
  dailyGuidanceStyle: 'practical'
}

const DEFAULT_PROFILE = {
  id: '',
  nickname: '易简用户',
  avatarRelativePath: null,
  avatarSha256: null,
  avatarUpdatedAt: null,
  accountId: null,
  createdAt: '',
  updatedAt: ''
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

function nextRepeatDueDate(dueDate, repeatRule) {
  const next = new Date(dueDate)
  if (Number.isNaN(next.getTime())) return null
  if (repeatRule === 'daily') next.setDate(next.getDate() + 1)
  else if (repeatRule === 'weekdays') {
    do { next.setDate(next.getDate() + 1) } while (next.getDay() === 0 || next.getDay() === 6)
  } else if (repeatRule === 'weekly') next.setDate(next.getDate() + 7)
  else if (repeatRule === 'monthly') next.setMonth(next.getMonth() + 1)
  else if (repeatRule === 'yearly') next.setFullYear(next.getFullYear() + 1)
  else return null
  return next
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

  if (/工作日|每个工作日/.test(title)) {
    updates.repeatRule = 'weekdays'
    title = title.replace(/工作日|每个工作日/, '')
  } else if (/每天|每日/.test(title)) {
    updates.repeatRule = 'daily'
    title = title.replace(/每天|每日/, '')
  } else if (/每周|每星期/.test(title)) {
    updates.repeatRule = 'weekly'
    title = title.replace(/每周|每星期/, '')
  } else if (/每月/.test(title)) {
    updates.repeatRule = 'monthly'
    title = title.replace(/每月/, '')
  } else if (/每年/.test(title)) {
    updates.repeatRule = 'yearly'
    title = title.replace(/每年/, '')
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
  const taskGroups = ref([])
  const lists = ref(DEFAULT_LISTS.map(list => ({ ...list })))
  const tasks = ref([])
  const trash = ref([])
  const listTrash = ref([])
  const currentView = ref(DEFAULT_SETTINGS.startView)
  const selectedTaskId = ref(null)
  const sortBy = ref('default')
  const listTaskFilters = ref({ status: 'all', date: 'all', priority: 'all' })
  const searchQuery = ref('')
  const saveError = ref('')
  const migrationBlocked = ref(false)
  const dataLoadState = ref('loading')
  const dataLoadError = ref('')
  const isSaving = ref(false)
  const notice = ref(null)
  const settings = ref({ ...DEFAULT_SETTINGS })
  const profile = ref({ ...DEFAULT_PROFILE })
  const settingsOpen = ref(false)
  const helpCenterOpen = ref(false)
  const ungroupedCollapsed = ref(false)
  const calendarCursor = ref(new Date())
  const viewOrders = ref({})
  let pendingSavePayload = null
  let activeSavePromise = null
  let saveTimer = null
  let reminderTimer = null
  let reminderSyncing = false
  let reminderSyncPending = false
  let pendingPermissionRequest = false

  const trashedListIds = computed(() => new Set(listTrash.value.map(item => item.id)))
  const activeTasks = computed(() => tasks.value.filter(task => !task.deleted && !trashedListIds.value.has(task.listId)))
  const visibleTrashTasks = computed(() => trash.value.filter(task => !task.deletedByListId || !trashedListIds.value.has(task.deletedByListId)))
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
    const query = normalizeSearchQuery(searchQuery.value)

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
      case 'completed':
        result = tasks.value.filter(task => task.completed && !task.deleted)
        break
      case 'trash':
        result = [...visibleTrashTasks.value]
        break
      case 'search':
        result = query ? activeTasks.value.filter(task => matchesTaskSearch(task, query)) : []
        break
      default:
        result = activeTasks.value.filter(task => task.listId === currentView.value)
    }

    if (currentList.value) {
      const { status, date, priority } = listTaskFilters.value
      if (status === 'open') result = result.filter(task => !task.completed)
      if (status === 'done') result = result.filter(task => task.completed)

      if (date === 'overdue') result = result.filter(task => !task.completed && getPlanBucket(task) === 'overdue')
      if (date === 'today') result = result.filter(task => getPlanBucket(task) === 'today')
      if (date === 'future') result = result.filter(task => ['tomorrow', 'week', 'later'].includes(getPlanBucket(task)))
      if (date === 'none') result = result.filter(task => !task.dueDate)

      if (priority !== 'all') result = result.filter(task => Number(task.priority || 0) === Number(priority))
    }

    return sortTasks(result)
  })

  const uncompletedTasks = computed(() => filteredTasks.value.filter(task => !task.completed))
  const completedTasks = computed(() => filteredTasks.value.filter(task => task.completed))
  const pinnedTasks = computed(() => uncompletedTasks.value.filter(task => task.pinned))
  const unpinnedTasks = computed(() => uncompletedTasks.value.filter(task => !task.pinned))

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
    counts.completed = tasks.value.filter(task => task.completed && !task.deleted).length
    counts.trash = visibleTrashTasks.value.length + listTrash.value.length
    return counts
  })

  const groupedLists = computed(() => {
    const customLists = lists.value
      .filter(list => !list.isSystem)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const allGroups = [...groups.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const result = allGroups.map(group => ({
      ...group,
      lists: customLists.filter(list => list.groupId === group.id)
    })).concat({
      id: 'ungrouped',
      name: '未分组',
      collapsed: ungroupedCollapsed.value,
      lists: customLists.filter(list => !list.groupId || !allGroups.some(group => group.id === list.groupId))
    }).filter(group => group.lists.length || group.id !== 'ungrouped')
    return result
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
      !isListTaskFilterActive.value &&
      !['completed', 'trash'].includes(currentView.value)
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
      const query = normalizeSearchQuery(searchQuery.value)
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
    // 置顶和未置顶分别排序，各自使用 viewOrder
    const pinnedTasks = source.filter(t => t.pinned)
    const unpinnedTasks = source.filter(t => !t.pinned)
    const rank = new Map(order.map((id, index) => [id, index]))
    function sortByViewOrder(tasks) {
      const fallback = smartSortTasks(tasks)
      const fallbackRank = new Map(fallback.map((task, index) => [task.id, index]))
      return tasks.sort((a, b) => {
        const ar = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER
        const br = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER
        if (ar !== br) return ar - br
        return (fallbackRank.get(a.id) ?? 0) - (fallbackRank.get(b.id) ?? 0)
      })
    }
    return [...sortByViewOrder(pinnedTasks), ...sortByViewOrder(unpinnedTasks)]
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

  function openHelpCenter() {
    helpCenterOpen.value = true
  }

  function closeHelpCenter() {
    helpCenterOpen.value = false
  }

  function updateSettings(updates) {
    settings.value = normalizeSettings({ ...settings.value, ...updates })
    // 更新音效开关
    if ('soundEnabled' in updates) {
      setSoundEnabled(updates.soundEnabled)
    }
    // 更新音效分类开关
    if ('soundTaskEnabled' in updates || 'soundListEnabled' in updates || 'soundGroupEnabled' in updates || 'soundDragEnabled' in updates) {
      setSoundCategories({
        task: updates.soundTaskEnabled ?? settings.value.soundTaskEnabled,
        list: updates.soundListEnabled ?? settings.value.soundListEnabled,
        group: updates.soundGroupEnabled ?? settings.value.soundGroupEnabled,
        drag: updates.soundDragEnabled ?? settings.value.soundDragEnabled
      })
    }
    if ('reminderNotificationsEnabled' in updates || 'reminderSoundEnabled' in updates) {
      syncReminderNotifications({ requestPermission: Boolean(updates.reminderNotificationsEnabled) })
      if (updates.reminderNotificationsEnabled === false) showNotice('任务提醒通知已关闭', 'info')
    }
    if ('windowCloseBehavior' in updates) {
      setWindowCloseBehavior(settings.value.windowCloseBehavior)
        .catch(error => console.warn('[Store] 同步窗口关闭方式失败:', error))
    }
    purgeExpiredTrash()
  }

  function setActiveModule(module) {
    if (!['tasks', 'clock'].includes(module)) return
    updateSettings({ activeModule: module })
  }

  function previewSound(name) {
    playSoundPreview(name)
  }

  async function testReminderNotification() {
    const result = await sendReminderTestNotification(settings.value)
    if (result.sent) {
      showNotice('已发送测试提醒', 'success')
      syncReminderNotifications({ requestPermission: false })
    } else if (result.reason === 'permission') {
      showNotice('通知权限未开启，请在系统设置中允许通知', 'error')
    } else {
      showNotice('当前环境不支持系统通知', 'error')
    }
    return result
  }

  function cycleSort() {
    const order = ['default', 'date', 'priority', 'name']
    const idx = order.indexOf(sortBy.value)
    sortBy.value = order[(idx + 1) % order.length]
  }

  function setSort(value) {
    if (['default', 'date', 'dateDesc', 'priority', 'createdDesc', 'name'].includes(value)) sortBy.value = value
  }

  const isListTaskFilterActive = computed(() => {
    const { status, date, priority } = listTaskFilters.value
    return status !== 'all' || date !== 'all' || priority !== 'all'
  })

  function setListTaskFilters(updates = {}) {
    if (!currentList.value) {
      listTaskFilters.value = { status: 'all', date: 'all', priority: 'all' }
      return
    }
    const next = { ...listTaskFilters.value, ...updates }
    if (!['all', 'open', 'done'].includes(next.status)) next.status = 'all'
    if (!['all', 'overdue', 'today', 'future', 'none'].includes(next.date)) next.date = 'all'
    if (!['all', '1', '2', '3'].includes(String(next.priority))) next.priority = 'all'
    else next.priority = String(next.priority)

    listTaskFilters.value = next
  }

  function addGroup(name) {
    const group = { id: genId(), name, collapsed: false, sortOrder: nextGroupSortOrder() }
    groups.value.push(group)
    playGroupAddSound()
    return group
  }

  function renameGroup(id, name) {
    const group = groups.value.find(item => item.id === id)
    if (group && name.trim()) {
      group.name = name.trim()
      playRenameSound()
    }
  }

  function deleteGroup(id) {
    groups.value = groups.value.filter(group => group.id !== id)
    lists.value.forEach(list => {
      if (list.groupId === id) list.groupId = null
    })
    playGroupDeleteSound()
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
    playListAddSound()
    return list
  }

  function deleteList(id) {
    const list = lists.value.find(item => item.id === id)
    if (!list || list.isSystem || id === 'inbox') return false
    const updatedAt = nowIso()
    const listTasks = tasks.value.filter(task => task.listId === id)
    const deletedTaskGroupIds = new Set(taskGroups.value
      .filter(group => group.listId === id)
      .map(group => group.id))
    listTrash.value = listTrash.value.filter(item => item.id !== id)
    listTrash.value.unshift({
      ...list,
      deleted: true,
      deletedAt: updatedAt,
      taskCount: listTasks.length
    })
    tasks.value.forEach(task => {
      if (task.listId === id) {
        task.deleted = true
        task.deletedAt = updatedAt
        task.deletedByListId = id
        task.updatedAt = updatedAt
        trash.value = trash.value.filter(item => item.id !== task.id)
        trash.value.unshift({ ...task, subtasks: [...task.subtasks], attachments: [...task.attachments] })
        cancelReminder(task.id)
        removeTaskFromOrders(task.id)
      }
    })
    // 任务分组只能属于一个有效清单。清单进入回收站后不再保留其分组，
    // 同时清空任务上的分组引用，避免写入无法通过完整性校验的数据。
    if (deletedTaskGroupIds.size) {
      taskGroups.value = taskGroups.value.filter(group => group.listId !== id)
      const clearTaskGroupReference = (task) => {
        if (deletedTaskGroupIds.has(task.taskGroupId)) task.taskGroupId = null
      }
      tasks.value.forEach(clearTaskGroupReference)
      trash.value.forEach(clearTaskGroupReference)
    }
    lists.value = lists.value.filter(item => item.id !== id)
    if (currentView.value === id) currentView.value = 'inbox'
    playListDeleteSound()
    return true
  }

  function restoreList(id) {
    const idx = listTrash.value.findIndex(list => list.id === id)
    if (idx === -1) return false
    const trashed = listTrash.value[idx]
    if (!lists.value.some(list => list.id === id)) {
      lists.value.push(normalizeList({
        ...trashed,
        deleted: false,
        deletedAt: null
      }))
    }
    const restoredAt = nowIso()
    tasks.value.forEach(task => {
      if (task.deletedByListId === id) {
        task.deleted = false
        task.deletedAt = null
        task.deletedByListId = null
        task.updatedAt = restoredAt
        rescheduleReminder(task)
      }
    })
    trash.value = trash.value.filter(task => task.deletedByListId !== id)
    listTrash.value.splice(idx, 1)
    showNotice('清单已恢复', 'success')
    playListRestoreSound()
    return true
  }

  function permanentDeleteList(id) {
    const idx = listTrash.value.findIndex(list => list.id === id)
    if (idx === -1) return false
    const taskIds = tasks.value.filter(task => task.deletedByListId === id).map(task => task.id)
    taskIds.forEach(cancelReminder)
    tasks.value = tasks.value.filter(task => task.deletedByListId !== id)
    trash.value = trash.value.filter(task => task.deletedByListId !== id)
    taskIds.forEach(removeTaskFromOrders)
    listTrash.value.splice(idx, 1)
    showNotice('清单已永久删除', 'success')
    playListDeleteSound()
    return true
  }

  function renameList(id, name) {
    const list = lists.value.find(item => item.id === id)
    if (list && name.trim()) {
      list.name = name.trim()
      playRenameSound()
    }
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
    playMoveSound()
  }

  // ==================== 任务分组操作 ====================

  const currentViewMode = computed(() => {
    const list = lists.value.find(l => l.id === currentView.value)
    return list?.viewMode || 'list'
  })

  const currentListGroups = computed(() => {
    return taskGroups.value
      .filter(g => g.listId === currentView.value)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  })

  const groupedTasks = computed(() => {
    const groups = currentListGroups.value
    // 未完成置顶任务单独渲染；已完成任务始终回到所属分组。
    const tasks = filteredTasks.value.filter(t => t.completed || !t.pinned)

    function makeTaskBuckets(group, groupTasks) {
      const openTasks = groupTasks.filter(task => !task.completed)
      const completedTasks = groupTasks
        .filter(task => task.completed)
        .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
      return {
        ...group,
        tasks: [...openTasks, ...completedTasks],
        openTasks,
        completedTasks,
        totalCount: groupTasks.length,
        completedCount: completedTasks.length
      }
    }

    const result = groups.map(group => makeTaskBuckets(group, tasks.filter(t => t.taskGroupId === group.id)))

    // 添加"未分组"分组
    const ungrouped = tasks.filter(t => !t.taskGroupId)
    if (ungrouped.length > 0) {
      result.unshift(makeTaskBuckets({ id: null, name: '未分组', emoji: '🗂️' }, ungrouped))
    }

    return isListTaskFilterActive.value
      ? result.filter(group => group.totalCount > 0)
      : result
  })

  function setViewMode(listId, mode) {
    const list = lists.value.find(l => l.id === listId)
    if (list) {
      list.viewMode = mode
    }
  }

  function addTaskGroup(name, listId, emoji, color = 'auto', customColor = '') {
    const groupId = genId()
    const maxSort = Math.max(0, ...taskGroups.value.filter(g => g.listId === listId).map(g => g.sortOrder || 0))
    taskGroups.value.push({
      id: groupId,
      name: name || '新分组',
      emoji: emoji || '',
      color: TASK_GROUP_COLOR_IDS.includes(color) ? color : 'auto',
      customColor: normalizeGroupCustomColor(customColor),
      listId,
      sortOrder: maxSort + 1000,
      collapsed: false,
      createdAt: nowIso(),
      updatedAt: nowIso()
    })
    playGroupAddSound()
    return groupId
  }

  function renameTaskGroup(groupId, name, emoji, color, customColor) {
    const group = taskGroups.value.find(g => g.id === groupId)
    if (group) {
      if (name !== undefined) group.name = name || '未命名分组'
      if (emoji !== undefined) group.emoji = emoji
      if (color !== undefined) group.color = TASK_GROUP_COLOR_IDS.includes(color) ? color : 'auto'
      if (customColor !== undefined) group.customColor = normalizeGroupCustomColor(customColor)
      group.updatedAt = nowIso()
    }
  }

  function deleteTaskGroup(groupId) {
    const index = taskGroups.value.findIndex(g => g.id === groupId)
    if (index === -1) return

    // 将该分组的任务移回未分组
    tasks.value.forEach(task => {
      if (task.taskGroupId === groupId) {
        task.taskGroupId = null
      }
    })

    taskGroups.value.splice(index, 1)
    playGroupDeleteSound()
  }

  function moveTaskToGroup(taskId, groupId) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.taskGroupId = groupId || null
      task.updatedAt = nowIso()
    }
  }

  function reorderTaskGroup(sourceId, targetId, position) {
    if (!sourceId || !targetId || sourceId === targetId) return
    const ordered = [...taskGroups.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const sourceIndex = ordered.findIndex(group => group.id === sourceId)
    const targetIndex = ordered.findIndex(group => group.id === targetId)
    if (sourceIndex === -1 || targetIndex === -1) return
    const [source] = ordered.splice(sourceIndex, 1)
    const nextTargetIndex = ordered.findIndex(group => group.id === targetId)
    ordered.splice(nextTargetIndex + (position === 'after' ? 1 : 0), 0, source)
    ordered.forEach((group, index) => {
      const target = taskGroups.value.find(item => item.id === group.id)
      if (target) {
        target.sortOrder = (index + 1) * 1000
        target.updatedAt = nowIso()
      }
    })
    playMoveSound()
  }

  function setTaskGroupCollapsed(groupId, collapsed) {
    const group = taskGroups.value.find(item => item.id === groupId)
    if (!group) return
    group.collapsed = Boolean(collapsed)
    group.updatedAt = nowIso()
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
    playMoveSound()
  }

  function reorderTask(sourceId, targetId, scopeIds = null, position = 'before') {
    const key = currentTaskOrderKey.value
    if (!canDragTasks.value || !key || !sourceId || !targetId || sourceId === targetId) return
    const visibleIds = Array.isArray(scopeIds) && scopeIds.length
      ? scopeIds
      : uncompletedTasks.value.map(task => task.id)
    if (!visibleIds.includes(sourceId) || !visibleIds.includes(targetId)) return
    // 置顶和未置顶任务分别排序，不能跨组拖拽
    const sourceTask = tasks.value.find(t => t.id === sourceId)
    const targetTask = tasks.value.find(t => t.id === targetId)
    if (sourceTask && targetTask && sourceTask.pinned !== targetTask.pinned) return
    const pinned = sourceTask?.pinned
    const scopedIds = visibleIds.filter(id => {
      const t = tasks.value.find(task => task.id === id)
      return t ? t.pinned === pinned : false
    })
    const existing = Array.isArray(viewOrders.value[key]) ? viewOrders.value[key] : []
    // 合并：当前作用域的置顶/未置顶任务 + 已有顺序中其他任务
    const otherIds = existing.filter(id => !scopedIds.includes(id))
    const merged = [...scopedIds, ...otherIds]
      .filter(id => tasks.value.some(task => task.id === id && !task.deleted))

    if (position === 'after') {
      const targetIdx = merged.indexOf(targetId)
      const nextId = targetIdx >= 0 && targetIdx < merged.length - 1 ? merged[targetIdx + 1] : null
      if (nextId && nextId !== sourceId) {
        moveById(merged, sourceId, nextId)
      } else {
        moveById(merged, sourceId, targetId)
      }
    } else {
      moveById(merged, sourceId, targetId)
    }

    viewOrders.value = {
      ...viewOrders.value,
      [key]: merged
    }
    playMoveSound()
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
    playAddSound()
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
    playScheduleSound()
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
    const isTodayTask = isInMyDay(task) || isToday(task.dueDate)
    task.completed = !task.completed
    const completedAt = task.completed ? nowIso() : null
    task.completedAt = completedAt
    // 主任务完成会收拢未完成子任务；子任务完成不反向影响主任务。
    if (task.completed) {
      task.subtasks.forEach((subtask) => {
        if (subtask.completed) return
        subtask.completed = true
        subtask.completedAt = completedAt
      })
      const nextDueDate = task.repeatRule && task.dueDate ? nextRepeatDueDate(task.dueDate, task.repeatRule) : null
      if (nextDueDate) {
        const reminderOffset = task.reminderAt ? new Date(task.reminderAt).getTime() - new Date(task.dueDate).getTime() : null
        const nextCreatedAt = nowIso()
        const nextTask = normalizeTask({
          ...task,
          id: genId(),
          completed: false,
          completedAt: null,
          deleted: false,
          deletedAt: null,
          myDayDate: null,
          dueDate: nextDueDate.toISOString(),
          reminderAt: Number.isFinite(reminderOffset) ? new Date(nextDueDate.getTime() + reminderOffset).toISOString() : null,
          reminderNotifiedAt: null,
          subtasks: task.subtasks.map(subtask => ({ ...subtask, id: genId(), completed: false, completedAt: null })),
          createdAt: nextCreatedAt,
          updatedAt: nextCreatedAt
        })
        tasks.value.unshift(nextTask)
        prependTaskToOrder(nextTask.id, getPlanBucket(nextTask) === 'none' ? 'inbox' : 'planned')
        rescheduleReminder(nextTask)
        showNotice('已生成下一次重复任务', 'success')
      }
    }
    task.updatedAt = completedAt || nowIso()
    rescheduleReminder(task)
    if (task.completed) {
      playCompleteSound()
      const remainingTodayTasks = activeTasks.value.filter(item => item.id !== task.id && !item.completed && (isInMyDay(item) || isToday(item.dueDate))).length
      if (isTodayTask && remainingTodayTasks === 0 && settings.value.dailyGuidanceEnabled) {
        showNotice(getCompletionMessage({ style: settings.value.dailyGuidanceStyle }), 'success')
      }
    } else {
      playTaskUndoSound()
    }
  }

  function toggleMyDay(id) {
    const task = tasks.value.find(item => item.id === id)
    if (!task) return
    task.myDayDate = isInMyDay(task) ? null : todayKey.value
    task.updatedAt = nowIso()
    playToggleSound()
  }

  function toggleImportant(id) {
    const task = tasks.value.find(item => item.id === id)
    if (!task) return
    task.important = !task.important
    if (task.important && task.priority < 3) task.priority = 3
    task.updatedAt = nowIso()
    playMarkSound()
  }

  function deleteTask(id, options = {}) {
    const task = tasks.value.find(item => item.id === id)
    if (task && !task.deleted) {
      const deletedAt = nowIso()
      task.deleted = true
      task.deletedAt = deletedAt
      task.updatedAt = deletedAt
      trash.value = trash.value.filter(item => item.id !== id)
      trash.value.unshift({ ...task, subtasks: [...task.subtasks], attachments: [...task.attachments] })
      cancelReminder(id)
      removeTaskFromOrders(id)
      if (selectedTaskId.value === id) selectedTaskId.value = null
      showNotice('任务已移入垃圾桶', 'success')
      if (!options.silent) playDeleteSound()
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
      if (original.deletedByListId && !lists.value.some(list => list.id === original.listId)) {
        original.listId = 'inbox'
      }
      original.deletedByListId = null
      original.updatedAt = nowIso()
      rescheduleReminder(original)
    } else {
      const listId = lists.value.some(list => list.id === task.listId) ? task.listId : 'inbox'
      const restored = normalizeTask({ ...task, listId, deleted: false, deletedAt: null, deletedByListId: null, updatedAt: nowIso() })
      tasks.value.unshift(restored)
      rescheduleReminder(restored)
    }
    trash.value.splice(idx, 1)
    showNotice('任务已恢复', 'success')
    playRestoreSound()
  }

  function permanentDelete(id) {
    const existed = tasks.value.some(task => task.id === id) || trash.value.some(task => task.id === id)
    if (!existed) return
    cancelReminder(id)
    tasks.value = tasks.value.filter(task => task.id !== id)
    trash.value = trash.value.filter(task => task.id !== id)
    removeTaskFromOrders(id)
    if (selectedTaskId.value === id) selectedTaskId.value = null
    showNotice('任务已永久删除', 'success')
    playClearSound()
  }

  function updateTask(id, updates) {
    const task = tasks.value.find(item => item.id === id) || trash.value.find(item => item.id === id)
    if (task) {
      const previousDueTime = task.dueDate ? new Date(task.dueDate).getTime() : Number.NaN
      const previousReminderTime = task.reminderAt ? new Date(task.reminderAt).getTime() : Number.NaN
      const isReminderChanged = Object.prototype.hasOwnProperty.call(updates, 'reminderAt')
      const isDueDateChanged = Object.prototype.hasOwnProperty.call(updates, 'dueDate')
      Object.assign(task, updates, { updatedAt: nowIso() })
      if (isDueDateChanged && !isReminderChanged && Number.isFinite(previousDueTime) && Number.isFinite(previousReminderTime) && task.dueDate) {
        const nextDueTime = new Date(task.dueDate).getTime()
        if (Number.isFinite(nextDueTime)) task.reminderAt = new Date(nextDueTime + previousReminderTime - previousDueTime).toISOString()
      }
      if (isDueDateChanged && !isReminderChanged && task.dueDate && !task.reminderAt && !task.reminderDisabled) {
        task.reminderAt = task.dueDate
      }
      if (isReminderChanged || isDueDateChanged) task.reminderNotifiedAt = null
      if (shouldRescheduleReminder(updates)) {
        rescheduleReminder(task, { requestPermission: Boolean(updates.reminderAt) || (isDueDateChanged && Boolean(task.reminderAt)) })
      }
    }
  }

  function moveTaskToDate(id, date) {
    const task = tasks.value.find(item => item.id === id)
    if (!task || task.deleted) return
    const previous = task.dueDate ? new Date(task.dueDate) : new Date(date)
    const previousReminderTime = task.reminderAt ? new Date(task.reminderAt).getTime() : Number.NaN
    const next = date instanceof Date ? new Date(date) : new Date(date)
    next.setHours(previous.getHours() || 9, previous.getMinutes() || 0, 0, 0)
    task.dueDate = next.toISOString()
    if (Number.isFinite(previousReminderTime)) {
      task.reminderAt = new Date(next.getTime() + previousReminderTime - previous.getTime()).toISOString()
    } else if (!task.reminderDisabled) {
      task.reminderAt = task.dueDate
    }
    task.reminderNotifiedAt = null
    task.updatedAt = nowIso()
    rescheduleReminder(task)
    playScheduleSound()
  }

  function togglePin(id) {
    const task = tasks.value.find(item => item.id === id)
    if (task) {
      task.pinned = !task.pinned
      task.updatedAt = nowIso()
      playMarkSound()
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
    playAddSound()
    return task
  }

  function clearCompletedInCurrentView() {
    const completed = filteredTasks.value.filter(task => task.completed && !task.deleted)
    completed.forEach(task => deleteTask(task.id, { silent: true }))
    if (completed.length) playClearSound()
    return completed.length
  }

  function addSubtask(taskId, title) {
    const task = tasks.value.find(item => item.id === taskId)
    if (!task || !title.trim()) return
    task.subtasks.push({
      id: genId(),
      title: title.trim(),
      completed: false,
      createdAt: nowIso(),
      completedAt: null,
      sortOrder: nextSubtaskSortOrder(task)
    })
    task.updatedAt = nowIso()
    playAddSound()
  }

  function toggleSubtask(taskId, subId) {
    const task = tasks.value.find(item => item.id === taskId)
    const subtask = task?.subtasks.find(item => item.id === subId)
    if (!subtask || !task) return
    subtask.completed = !subtask.completed
    task.updatedAt = nowIso()
    if (subtask.completed) {
      subtask.completedAt = nowIso()
      playSubtaskCompleteSound()
    } else {
      subtask.completedAt = null
      playSubtaskUndoSound()
    }
  }

  function deleteSubtask(taskId, subId) {
    const task = tasks.value.find(item => item.id === taskId)
    if (!task) return
    const previousLength = task.subtasks.length
    task.subtasks = task.subtasks.filter(subtask => subtask.id !== subId)
    if (task.subtasks.length === previousLength) return
    task.updatedAt = nowIso()
    playDeleteSound()
  }

  function updateSubtask(taskId, subId, title) {
    const task = tasks.value.find(item => item.id === taskId)
    const subtask = task?.subtasks.find(item => item.id === subId)
    const nextTitle = title.trim()
    if (!subtask || !nextTitle || subtask.title === nextTitle) return
    subtask.title = nextTitle
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
    playMoveSound()
  }

  function addAttachment(taskId, attachment, imageUrl = '') {
    const task = tasks.value.find(item => item.id === taskId)
    if (!task) return
    const source = typeof attachment === 'string'
      ? { path: attachment, originalName: attachment, url: imageUrl }
      : (attachment || {})
    const createdAt = source.createdAt || source.created_at || nowIso()
    task.attachments.push({
      id: source.id || genId(),
      kind: source.kind || inferAttachmentKind(source.mime),
      mime: source.mime || '',
      originalName: source.originalName || source.original_name || source.path || '图片附件',
      path: source.path || source.originalPath || source.original_path || source.originalName || source.original_name || '',
      relativePath: source.relativePath || source.relative_path || '',
      sha256: source.sha256 || '',
      sizeBytes: Number(source.sizeBytes ?? source.size_bytes ?? 0),
      width: Number.isFinite(Number(source.width)) ? Number(source.width) : null,
      height: Number.isFinite(Number(source.height)) ? Number(source.height) : null,
      url: source.url || imageUrl || '',
      createdAt,
      lastReferencedAt: source.lastReferencedAt || source.last_referenced_at || createdAt
    })
    task.updatedAt = nowIso()
    playAttachSound()
  }

  function removeAttachment(taskId, attachmentId) {
    const task = tasks.value.find(item => item.id === taskId)
    if (!task) return
    const previousLength = task.attachments.length
    task.attachments = task.attachments.filter(attachment => attachment.id !== attachmentId)
    if (task.attachments.length === previousLength) return
    task.updatedAt = nowIso()
    playAttachSound()
  }

  function setView(view) {
    currentView.value = view
    listTaskFilters.value = { status: 'all', date: 'all', priority: 'all' }
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
    dataLoadState.value = 'loading'
    dataLoadError.value = ''
    try {
      console.log('[Store] 开始加载数据...')
      const rawData = await loadPlatformData()
      console.log('[Store] 数据加载完成', rawData ? `${Object.keys(rawData).length} 个顶级字段` : '空数据')

      migrationBlocked.value = Boolean(rawData)
      const sourceVersion = rawData?.schemaVersion || 1
      if (rawData && sourceVersion < getCurrentVersion()) {
        const backupLocation = await saveMigrationBackup(createBackup(rawData))
        console.log(`[Store] 已创建迁移备份: ${backupLocation}`)
      }

      const data = migrateData(rawData)
      if (data) {
        const { valid, errors } = validateData(data)
        if (!valid) {
          throw new Error(`数据验证失败：${errors.join('；')}`)
        }
        if (rawData && sourceVersion < getCurrentVersion()) {
          await savePlatformData(data)
          console.log(`[Store] 数据已从 v${sourceVersion} 迁移到 v${getCurrentVersion()}`)
        }
      }

      if (data) {
        groups.value = normalizeGroups(data.groups)
        lists.value = normalizeLists(data.lists)
        tasks.value = (data.tasks || []).map(normalizeTask)
        trash.value = (data.trash || []).map(task => normalizeTask({ ...task, deleted: true }))
        listTrash.value = normalizeListTrash(data.listTrash)
        settings.value = normalizeSettings(data.settings)
        profile.value = normalizeProfile(data.profile)
        viewOrders.value = normalizeViewOrders(data.viewOrders)
        taskGroups.value = (data.taskGroups || []).map(normalizeTaskGroup)
        // 根据用户设置更新音效开关
        setSoundEnabled(settings.value.soundEnabled)
        setSoundCategories({
          task: settings.value.soundTaskEnabled,
          list: settings.value.soundListEnabled,
          group: settings.value.soundGroupEnabled,
          drag: settings.value.soundDragEnabled
        })
        purgeExpiredTrash()
        syncReminderNotifications({ requestPermission: false })
        setWindowCloseBehavior(settings.value.windowCloseBehavior)
          .catch(error => console.warn('[Store] 初始化窗口关闭方式失败:', error))
        console.log(`[Store] 数据初始化完成: ${tasks.value.length} 任务, ${lists.value.length} 清单`)
      }
      currentView.value = settings.value.startView || 'today'
      migrationBlocked.value = false
      saveError.value = ''
      dataLoadState.value = 'ready'
    } catch (error) {
      console.error('[Store] 数据加载失败:', error)
      migrationBlocked.value = true
      saveError.value = error?.message || '读取本地数据失败'
      dataLoadError.value = saveError.value
      dataLoadState.value = 'failed'
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
      playErrorSound()
      showNotice(saveError.value, 'error')
      throw error
    } finally {
      isSaving.value = false
      activeSavePromise = null
    }
  }

  watch([groups, lists, tasks, trash, listTrash, settings, profile, viewOrders, taskGroups], () => {
    scheduleSave()
  }, { deep: true })

  function scheduleSave() {
    if (migrationBlocked.value) return
    if (saveTimer) window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      saveTimer = null
      saveData().catch(() => {})
    }, 180)
  }


  function shouldRescheduleReminder(updates) {
    return ['reminderAt', 'dueDate', 'title', 'completed', 'deleted']
      .some((key) => Object.prototype.hasOwnProperty.call(updates, key))
  }

  function rescheduleReminder(task, options = {}) {
    syncReminderNotifications(options)
  }

  function cancelReminder(taskId) {
    syncReminderNotifications()
  }

  function syncReminderNotifications(options = {}) {
    if (reminderSyncing) {
      reminderSyncPending = true
      pendingPermissionRequest = pendingPermissionRequest || Boolean(options.requestPermission)
      return
    }

    reminderSyncing = true
    void runReminderSync(options).catch((error) => {
      console.error('[Store] 同步提醒失败:', error)
    }).finally(() => {
      reminderSyncing = false
      if (reminderSyncPending) {
        const requestPermission = pendingPermissionRequest
        reminderSyncPending = false
        pendingPermissionRequest = false
        syncReminderNotifications({ requestPermission })
      }
    })
  }

  function clearReminderTimer() {
    if (reminderTimer) window.clearTimeout(reminderTimer)
    reminderTimer = null
  }

  function isReminderPending(task) {
    if (!task?.reminderAt || task.completed || task.deleted || settings.value.reminderNotificationsEnabled === false) return false
    const reminderTime = new Date(task.reminderAt).getTime()
    if (!Number.isFinite(reminderTime)) return false
    const notifiedTime = task.reminderNotifiedAt ? new Date(task.reminderNotifiedAt).getTime() : Number.NaN
    return !Number.isFinite(notifiedTime) || notifiedTime < reminderTime
  }

  async function runReminderSync(options = {}) {
    clearReminderTimer()
    if (settings.value.reminderNotificationsEnabled === false) return

    if (options.requestPermission) {
      const granted = await ensureReminderNotificationPermission({ request: true })
      if (!granted) {
        showNotice('通知权限未开启，提醒时间已保存', 'error')
        return
      }
    }

    const now = Date.now()
    const pendingTasks = tasks.value.filter(isReminderPending)
    const overdueTasks = pendingTasks.filter(task => new Date(task.reminderAt).getTime() <= now)
    let retryNeeded = false

    for (const task of overdueTasks) {
      const result = await sendTaskReminderNotification(task, settings.value, { catchUp: new Date(task.reminderAt).getTime() < now })
      if (result.sent) {
        task.reminderNotifiedAt = nowIso()
        task.updatedAt = nowIso()
      } else if (result.reason !== 'not-active') {
        retryNeeded = true
      }
    }

    const nextTask = pendingTasks
      .filter(task => new Date(task.reminderAt).getTime() > now)
      .sort((a, b) => new Date(a.reminderAt).getTime() - new Date(b.reminderAt).getTime())[0]
    const nextDelay = nextTask ? Math.max(0, new Date(nextTask.reminderAt).getTime() - Date.now()) : null
    const retryDelay = retryNeeded ? 60 * 1000 : null
    const delay = [nextDelay, retryDelay]
      .filter(value => value !== null)
      .reduce((earliest, value) => earliest === null ? value : Math.min(earliest, value), null)

    if (delay !== null) {
      reminderTimer = window.setTimeout(() => syncReminderNotifications(), Math.min(delay, 2_147_483_647))
    }
  }

  function buildSavePayload() {
    const payload = JSON.parse(JSON.stringify({
      schemaVersion: getCurrentVersion(),
      groups: groups.value,
      lists: lists.value,
      tasks: tasks.value,
      trash: trash.value,
      listTrash: listTrash.value,
      viewOrders: viewOrders.value,
      taskGroups: taskGroups.value,
      profile: profile.value,
      settings: settings.value
    }))
    stripHydratedAttachmentUrls(payload)
    return payload
  }

  function stripHydratedAttachmentUrls(value) {
    if (Array.isArray(value)) {
      value.forEach(stripHydratedAttachmentUrls)
      return
    }
    if (!value || typeof value !== 'object') return
    if (value.relativePath) delete value.url
    Object.values(value).forEach(stripHydratedAttachmentUrls)
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

  function normalizeTaskGroup(rawGroup) {
    return {
      id: rawGroup?.id || genId(),
      name: rawGroup?.name || '未命名分组',
      emoji: rawGroup?.emoji || '',
      color: TASK_GROUP_COLOR_IDS.includes(rawGroup?.color) ? rawGroup.color : 'auto',
      customColor: normalizeGroupCustomColor(rawGroup?.customColor),
      listId: rawGroup?.listId || '',
      sortOrder: Number.isFinite(Number(rawGroup?.sortOrder)) ? Number(rawGroup.sortOrder) : 1000,
      collapsed: Boolean(rawGroup?.collapsed),
      createdAt: rawGroup?.createdAt || new Date().toISOString(),
      updatedAt: rawGroup?.updatedAt || new Date().toISOString()
    }
  }

  function normalizeGroupCustomColor(value) {
    return /^#[0-9a-f]{6}$/i.test(value || '') ? value.toUpperCase() : '#5B8DEF'
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
      viewMode: list?.viewMode || 'list',
      isSystem: Boolean(list?.isSystem || list?.id === 'inbox'),
      sortOrder: Number.isFinite(Number(list?.sortOrder)) ? Number(list.sortOrder) : (fallback?.sortOrder ?? (index + 1) * 1000)
    }
  }

  function normalizeTask(task = {}) {
    const createdAt = task.createdAt || nowIso()
    const dueDate = task.dueDate || null
    const reminderDisabled = task.reminderDisabled === true
    const reminderAt = task.reminderAt || (dueDate && !reminderDisabled ? dueDate : null)
    return {
      id: task.id || genId(),
      title: task.title || '未命名任务',
      description: task.description || '',
      descriptionHtml: task.descriptionHtml || '',
      completed: Boolean(task.completed),
      completedAt: task.completedAt || null,
      deleted: Boolean(task.deleted),
      deletedAt: task.deletedAt || null,
      deletedByListId: task.deletedByListId || null,
      pinned: Boolean(task.pinned),
      important: Boolean(task.important || task.priority === 3),
      myDayDate: task.myDayDate || null,
      listId: task.listId || 'inbox',
      taskGroupId: task.taskGroupId || null,
      dueDate,
      reminderAt,
      reminderDisabled,
      reminderNotifiedAt: task.reminderNotifiedAt || null,
      repeatRule: task.repeatRule || null,
      priority: Number(task.priority || 0),
      tags: Array.isArray(task.tags) ? task.tags : [],
      subtasks: Array.isArray(task.subtasks) ? task.subtasks.map((sub, index) => ({
        id: sub.id || genId(),
        title: sub.title || '',
        completed: Boolean(sub.completed),
        // 旧版子任务没有独立创建时间；使用父任务创建时间补齐，保证时间元信息稳定展示。
        createdAt: sub.createdAt || createdAt,
        completedAt: sub.completedAt || null,
        sortOrder: Number.isFinite(Number(sub.sortOrder)) ? Number(sub.sortOrder) : (index + 1) * 1000
      })).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) : [],
      attachments: Array.isArray(task.attachments) ? task.attachments.map(att => ({
        id: att.id || genId(),
        kind: att.kind || inferAttachmentKind(att.mime),
        mime: att.mime || '',
        originalName: att.originalName || att.original_name || att.path || '图片附件',
        path: att.path || att.originalPath || att.original_path || '',
        relativePath: att.relativePath || att.relative_path || '',
        sha256: att.sha256 || '',
        sizeBytes: Number(att.sizeBytes ?? att.size_bytes ?? 0),
        width: Number.isFinite(Number(att.width)) ? Number(att.width) : null,
        height: Number.isFinite(Number(att.height)) ? Number(att.height) : null,
        url: att.url || '',
        createdAt: att.createdAt || att.created_at || createdAt,
        lastReferencedAt: att.lastReferencedAt || att.last_referenced_at || att.createdAt || createdAt
      })) : [],
      comments: Array.isArray(task.comments) ? task.comments : [],
      editorMode: task.editorMode || 'detail',
      createdAt,
      updatedAt: task.updatedAt || createdAt
    }
  }

  function normalizeSettings(rawSettings = {}) {
    const activeModule = ['tasks', 'clock'].includes(rawSettings.activeModule)
      ? rawSettings.activeModule
      : DEFAULT_SETTINGS.activeModule
    const theme = THEME_IDS.includes(rawSettings.theme) ? rawSettings.theme : DEFAULT_SETTINGS.theme
    const density = ['comfortable', 'compact'].includes(rawSettings.density) ? rawSettings.density : DEFAULT_SETTINGS.density
    const startView = SYSTEM_VIEW_IDS.includes(rawSettings.startView) ? rawSettings.startView : DEFAULT_SETTINGS.startView
    const detailWidth = typeof rawSettings.detailWidth === 'number'
      ? Math.max(DETAIL_WIDTH_MIN, Math.min(DETAIL_WIDTH_MAX, rawSettings.detailWidth))
      : DEFAULT_SETTINGS.detailWidth
    const trashRetentionDays = Number.isFinite(Number(rawSettings.trashRetentionDays))
      ? Math.max(1, Math.min(365, Number(rawSettings.trashRetentionDays)))
      : DEFAULT_SETTINGS.trashRetentionDays
    const soundEnabled = rawSettings.soundEnabled !== false
    const soundTaskEnabled = rawSettings.soundTaskEnabled !== false
    const soundListEnabled = rawSettings.soundListEnabled !== false
    const soundGroupEnabled = rawSettings.soundGroupEnabled !== false
    const soundDragEnabled = rawSettings.soundDragEnabled !== false
    const reminderNotificationsEnabled = rawSettings.reminderNotificationsEnabled !== false
    const reminderSoundEnabled = rawSettings.reminderSoundEnabled !== false
    const windowCloseBehavior = ['hide', 'quit'].includes(rawSettings.windowCloseBehavior)
      ? rawSettings.windowCloseBehavior
      : DEFAULT_SETTINGS.windowCloseBehavior
    const dailyGuidanceEnabled = rawSettings.dailyGuidanceEnabled !== false
    const dailyGuidanceStyle = ['calm', 'practical', 'encouraging'].includes(rawSettings.dailyGuidanceStyle)
      ? rawSettings.dailyGuidanceStyle
      : DEFAULT_SETTINGS.dailyGuidanceStyle
    return {
      ...DEFAULT_SETTINGS,
      ...rawSettings,
      theme,
      activeModule,
      themeBackgrounds: rawSettings.themeBackgrounds === true,
      density,
      startView,
      detailOpen: rawSettings.detailOpen !== false,
      sidebarCollapsed: !!rawSettings.sidebarCollapsed,
      detailWidth,
      completedVisible: rawSettings.completedVisible !== false,
      groupCompletedDisplayMode: ['in-group', 'separate-section'].includes(rawSettings.groupCompletedDisplayMode)
        ? rawSettings.groupCompletedDisplayMode
        : DEFAULT_SETTINGS.groupCompletedDisplayMode,
      groupCompletedVisibleByDefault: rawSettings.groupCompletedVisibleByDefault !== false,
      showCompletionDuration: rawSettings.showCompletionDuration !== false,
      trashRetentionDays,
      soundEnabled,
      soundTaskEnabled,
      soundListEnabled,
      soundGroupEnabled,
      soundDragEnabled,
      reminderNotificationsEnabled,
      reminderSoundEnabled,
      windowCloseBehavior,
      dailyGuidanceEnabled,
      dailyGuidanceStyle
    }
  }

  function normalizeProfile(rawProfile = {}) {
    const now = nowIso()
    const nickname = String(rawProfile?.nickname || DEFAULT_PROFILE.nickname).trim().slice(0, 24) || DEFAULT_PROFILE.nickname
    return {
      ...DEFAULT_PROFILE,
      ...rawProfile,
      id: rawProfile?.id || genId(),
      nickname,
      avatarRelativePath: rawProfile?.avatarRelativePath || null,
      avatarSha256: rawProfile?.avatarSha256 || null,
      avatarUpdatedAt: rawProfile?.avatarUpdatedAt || null,
      accountId: rawProfile?.accountId || null,
      createdAt: rawProfile?.createdAt || now,
      updatedAt: rawProfile?.updatedAt || now
    }
  }

  function updateProfile(updates = {}) {
    profile.value = normalizeProfile({
      ...profile.value,
      ...updates,
      updatedAt: nowIso()
    })
  }

  function normalizeListTrash(rawListTrash = []) {
    if (!Array.isArray(rawListTrash)) return []
    return rawListTrash.map((list, index) => ({
      ...normalizeList(list, index),
      deleted: true,
      deletedAt: list.deletedAt || nowIso(),
      taskCount: Number.isFinite(Number(list.taskCount)) ? Number(list.taskCount) : tasks.value.filter(task => task.deletedByListId === list.id).length
    }))
  }

  function purgeExpiredTrash() {
    const retentionDays = Number(settings.value.trashRetentionDays || DEFAULT_SETTINGS.trashRetentionDays)
    const threshold = Date.now() - retentionDays * 86400000
    let removedExpiredItems = false
    const expiredTaskIds = trash.value
      .filter(task => task.deletedAt && new Date(task.deletedAt).getTime() < threshold)
      .map(task => task.id)
    if (expiredTaskIds.length) {
      const expired = new Set(expiredTaskIds)
      expiredTaskIds.forEach(cancelReminder)
      tasks.value = tasks.value.filter(task => !expired.has(task.id))
      trash.value = trash.value.filter(task => !expired.has(task.id))
      expiredTaskIds.forEach(removeTaskFromOrders)
      removedExpiredItems = true
    }
    const expiredListIds = listTrash.value
      .filter(list => list.deletedAt && new Date(list.deletedAt).getTime() < threshold)
      .map(list => list.id)
    expiredListIds.forEach(id => {
      const idx = listTrash.value.findIndex(list => list.id === id)
      if (idx >= 0) {
        tasks.value
          .filter(task => task.deletedByListId === id)
          .forEach(task => cancelReminder(task.id))
        tasks.value = tasks.value.filter(task => task.deletedByListId !== id)
        trash.value = trash.value.filter(task => task.deletedByListId !== id)
        listTrash.value.splice(idx, 1)
        removedExpiredItems = true
      }
    })
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

  function inferAttachmentKind(mime = '') {
    if (mime.startsWith('image/')) return 'image'
    if (mime) return 'file'
    return 'unknown'
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
    taskGroups,
    lists,
    tasks,
    trash,
    listTrash,
    currentView,
    selectedTaskId,
    sortBy,
    listTaskFilters,
    isListTaskFilterActive,
    viewOrders,
    calendarCursor,
    searchQuery,
    saveError,
    migrationBlocked,
    dataLoadState,
    dataLoadError,
    isSaving,
    notice,
    settings,
    profile,
    settingsOpen,
    helpCenterOpen,
    activeTasks,
    visibleTrashTasks,
    currentList,
    selectedList,
    canQuickAddTask,
    filteredTasks,
    uncompletedTasks,
    completedTasks,
    pinnedTasks,
    unpinnedTasks,
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
    currentViewMode,
    currentListGroups,
    groupedTasks,
    isInMyDay,
    getPlanBucket,
    cycleSort,
    setSort,
    setListTaskFilters,
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
    restoreList,
    permanentDeleteList,
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
    setViewMode,
    addTaskGroup,
    renameTaskGroup,
    deleteTaskGroup,
    moveTaskToGroup,
    reorderTaskGroup,
    setTaskGroupCollapsed,
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
    openHelpCenter,
    closeHelpCenter,
    updateSettings,
    setActiveModule,
    previewSound,
    updateProfile,
    testReminderNotification,
    loadData,
    saveData,
    playDragStartSound,
    playDragOverSound,
    playDragEndSound
  }
})
