import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { genId } from '@/utils/id'
import { isToday, isWithin7Days } from '@/utils/date'
import { loadData as loadPlatformData, saveData as savePlatformData } from '@/services/platform'

const SYSTEM_VIEW_IDS = ['today', 'week', 'inbox', 'completed', 'trash', 'search']
const READONLY_VIEWS = ['week', 'completed', 'trash']
const DEFAULT_LISTS = [
  { id: 'inbox', name: '收集箱', icon: '📥', isSystem: true },
  { id: 'work', name: '工作任务', icon: '💼', isSystem: false },
  { id: 'personal', name: '个人备忘', icon: '🏠', isSystem: false }
]

function todayAt(hour = 9, minute = 0) {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

export const useTaskStore = defineStore('task', () => {
  // ========== 状态 ==========
  const lists = ref(DEFAULT_LISTS.map(list => ({ ...list })))
  const tasks = ref([])
  const trash = ref([])
  const currentView = ref('inbox') // 'inbox' | 'today' | 'week' | listId | 'completed' | 'trash'
  const selectedTaskId = ref(null)
  const sortBy = ref('default') // 'default' | 'date' | 'name'
  const searchQuery = ref('')
  const saveError = ref('')
  const isSaving = ref(false)
  const notice = ref(null)

  // ========== 计算属性 ==========
  const currentList = computed(() => {
    if (SYSTEM_VIEW_IDS.includes(currentView.value)) return null
    return lists.value.find(l => l.id === currentView.value)
  })

  const canQuickAddTask = computed(() => {
    return currentView.value === 'today' ||
      currentView.value === 'inbox' ||
      Boolean(currentList.value)
  })

  const filteredTasks = computed(() => {
    const active = tasks.value.filter(t => !t.deleted)
    let result = []

    switch (currentView.value) {
      case 'today':
        result = active.filter(t => isToday(t.dueDate))
        break
      case 'week':
        result = active.filter(t => isWithin7Days(t.dueDate))
        break
      case 'inbox':
        result = active.filter(t => t.listId === 'inbox')
        break
      case 'completed':
        result = tasks.value.filter(t => t.completed && !t.deleted)
        break
      case 'trash':
        result = [...trash.value]
        break
      case 'search': {
        const query = searchQuery.value.trim().toLowerCase()
        result = query
          ? active.filter(t => {
              const fields = [
                t.title,
                t.description,
                t.descriptionHtml,
                ...(t.tags || [])
              ].filter(Boolean).join(' ').toLowerCase()
              return fields.includes(query)
            })
          : []
        break
      }
      default:
        result = active.filter(t => t.listId === currentView.value)
    }

    // 排序
    if (sortBy.value === 'date') {
      result.sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate) - new Date(b.dueDate)
      })
    } else if (sortBy.value === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
    } else {
      // 默认：置顶优先，然后按创建时间
      result.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
    }
    return result
  })

  const uncompletedTasks = computed(() => {
    return filteredTasks.value.filter(t => !t.completed)
  })

  const completedTasks = computed(() => {
    return filteredTasks.value.filter(t => t.completed)
  })

  const selectedTask = computed(() => {
    if (!selectedTaskId.value) return null
    return tasks.value.find(t => t.id === selectedTaskId.value) ||
      trash.value.find(t => t.id === selectedTaskId.value)
  })

  const listTaskCounts = computed(() => {
    const counts = {}
    const active = tasks.value.filter(t => !t.completed && !t.deleted)
    lists.value.forEach(l => {
      counts[l.id] = active.filter(t => t.listId === l.id).length
    })
    counts.inbox = active.filter(t => t.listId === 'inbox').length
    counts.today = active.filter(t => isToday(t.dueDate)).length
    counts.week = active.filter(t => isWithin7Days(t.dueDate)).length
    counts.completed = tasks.value.filter(t => t.completed && !t.deleted).length
    counts.trash = trash.value.length
    return counts
  })

  // ========== 操作 ==========

  function showNotice(message, type = 'info') {
    notice.value = { id: genId(), message, type }
  }

  function clearNotice() {
    notice.value = null
  }

  // 清单 CRUD
  function addList(name) {
    const list = { id: genId(), name, icon: '📋', isSystem: false }
    lists.value.push(list)
    return list
  }

  function deleteList(id) {
    if (id === 'inbox') return
    const now = new Date().toISOString()
    // 将清单下的任务移到收集箱
    tasks.value.forEach(t => {
      if (t.listId === id) {
        t.listId = 'inbox'
        t.updatedAt = now
      }
    })
    lists.value = lists.value.filter(l => l.id !== id)
    if (currentView.value === id) currentView.value = 'inbox'
  }

  function renameList(id, name) {
    const list = lists.value.find(l => l.id === id)
    if (list) list.name = name
  }

  // 任务 CRUD
  function addTask(title, listId) {
    if (READONLY_VIEWS.includes(currentView.value)) return null
    const now = new Date().toISOString()
    const targetListId = resolveNewTaskListId(listId)
    const task = {
      id: genId(),
      title,
      description: '',
      descriptionHtml: '',
      editorMode: 'detail',
      completed: false,
      completedAt: null,
      deleted: false,
      deletedAt: null,
      pinned: false,
      listId: targetListId,
      dueDate: currentView.value === 'today' ? todayAt() : null,
      reminderAt: null,
      repeatRule: null,
      priority: 0,
      tags: [],
      subtasks: [],
      comments: [],
      attachments: [],
      createdAt: now,
      updatedAt: now
    }
    tasks.value.unshift(task)
    selectedTaskId.value = task.id
    return task
  }

  function resolveNewTaskListId(listId) {
    if (listId && lists.value.some(list => list.id === listId)) return listId
    if (currentList.value) return currentList.value.id
    return 'inbox'
  }

  function completeTask(id) {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      task.completed = !task.completed
      task.completedAt = task.completed ? new Date().toISOString() : null
      task.updatedAt = new Date().toISOString()
    }
  }

  function deleteTask(id) {
    const task = tasks.value.find(t => t.id === id)
    if (task && !task.deleted) {
      task.deleted = true
      task.deletedAt = new Date().toISOString()
      task.updatedAt = task.deletedAt
      trash.value = trash.value.filter(t => t.id !== id)
      trash.value.unshift({ ...task })
      if (selectedTaskId.value === id) selectedTaskId.value = null
      showNotice('任务已移入垃圾桶', 'success')
    }
  }

  function restoreTask(id) {
    const idx = trash.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      const task = trash.value[idx]
      const original = tasks.value.find(t => t.id === id)
      if (original) {
        original.deleted = false
        original.deletedAt = null
        original.updatedAt = new Date().toISOString()
      } else {
        tasks.value.unshift({
          ...task,
          deleted: false,
          deletedAt: null,
          updatedAt: new Date().toISOString()
        })
      }
      trash.value.splice(idx, 1)
      showNotice('任务已恢复', 'success')
    }
  }

  function permanentDelete(id) {
    tasks.value = tasks.value.filter(t => t.id !== id)
    trash.value = trash.value.filter(t => t.id !== id)
    if (selectedTaskId.value === id) selectedTaskId.value = null
    showNotice('任务已永久删除', 'success')
  }

  function updateTask(id, updates) {
    const task = tasks.value.find(t => t.id === id) || trash.value.find(t => t.id === id)
    if (task) Object.assign(task, updates, { updatedAt: new Date().toISOString() })
  }

  function togglePin(id) {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      task.pinned = !task.pinned
      task.updatedAt = new Date().toISOString()
    }
  }

  function copyTask(id) {
    const source = tasks.value.find(t => t.id === id) || trash.value.find(t => t.id === id)
    if (!source) return null
    const now = new Date().toISOString()
    const task = {
      ...source,
      id: genId(),
      title: `${source.title} (副本)`,
      completed: false,
      completedAt: null,
      deleted: false,
      deletedAt: null,
      pinned: false,
      subtasks: (source.subtasks || []).map(sub => ({ ...sub, id: genId() })),
      comments: (source.comments || []).map(comment => ({ ...comment, id: genId() })),
      attachments: (source.attachments || []).map(att => ({ ...att, id: genId() })),
      createdAt: now,
      updatedAt: now
    }
    tasks.value.unshift(task)
    return task
  }

  function clearCompletedInCurrentView() {
    const completed = filteredTasks.value.filter(t => t.completed && !t.deleted)
    completed.forEach(t => deleteTask(t.id))
    return completed.length
  }

  // 子任务
  function addSubtask(taskId, title) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.subtasks.push({ id: genId(), title, completed: false })
      task.updatedAt = new Date().toISOString()
    }
  }

  function toggleSubtask(taskId, subId) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      const sub = task.subtasks.find(s => s.id === subId)
      if (sub) {
        sub.completed = !sub.completed
        task.updatedAt = new Date().toISOString()
      }
    }
  }

  function deleteSubtask(taskId, subId) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.subtasks = task.subtasks.filter(s => s.id !== subId)
      task.updatedAt = new Date().toISOString()
    }
  }

  function updateSubtask(taskId, subId, title) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task) return
    const subtask = task.subtasks.find(s => s.id === subId)
    if (subtask && title.trim()) {
      subtask.title = title.trim()
      task.updatedAt = new Date().toISOString()
    }
  }

  // 评论
  function addComment(taskId, text) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.comments.push({
        id: genId(),
        text,
        author: '我',
        createdAt: new Date().toISOString()
      })
      task.updatedAt = new Date().toISOString()
    }
  }

  // 附件
  function addAttachment(taskId, filePath, imageUrl) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.attachments.push({
        id: genId(),
        path: filePath,
        url: imageUrl,
        createdAt: new Date().toISOString()
      })
      task.updatedAt = new Date().toISOString()
    }
  }

  function removeAttachment(taskId, attachmentId) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.attachments = task.attachments.filter(attachment => attachment.id !== attachmentId)
      task.updatedAt = new Date().toISOString()
    }
  }

  // 视图切换
  function setView(view) {
    currentView.value = view
    selectedTaskId.value = null
  }

  function setSearch(query) {
    searchQuery.value = query
    currentView.value = 'search'
    selectedTaskId.value = null
  }

  function selectTask(id) {
    selectedTaskId.value = id
  }

  // ========== 持久化 ==========
  async function loadData() {
    try {
      const data = await loadPlatformData()
      if (data) {
        lists.value = normalizeLists(data.lists)
        tasks.value = (data.tasks || []).map(normalizeTask)
        trash.value = (data.trash || []).map(task => normalizeTask({ ...task, deleted: true }))
      }
      saveError.value = ''
    } catch (error) {
      saveError.value = error?.message || '读取本地数据失败'
      showNotice(saveError.value, 'error')
    }
  }

  async function saveData() {
    isSaving.value = true
    try {
      await savePlatformData({
        schemaVersion: 1,
        lists: lists.value,
        tasks: tasks.value,
        trash: trash.value
      })
      saveError.value = ''
    } catch (error) {
      saveError.value = error?.message || '保存本地数据失败'
      showNotice(saveError.value, 'error')
      throw error
    } finally {
      isSaving.value = false
    }
  }

  // 自动保存
  watch([lists, tasks, trash], () => {
    saveData().catch(() => {})
  }, { deep: true })

  function normalizeLists(rawLists) {
    const source = Array.isArray(rawLists) && rawLists.length ? rawLists : DEFAULT_LISTS
    const normalized = source.map(normalizeList)
    if (!normalized.some(list => list.id === 'inbox')) {
      normalized.unshift({ ...DEFAULT_LISTS[0] })
    }
    return normalized
  }

  function normalizeList(list) {
    const fallback = DEFAULT_LISTS.find(item => item.id === list?.id)
    return {
      id: list?.id || genId(),
      name: list?.name || fallback?.name || '未命名清单',
      icon: list?.icon || fallback?.icon || '📋',
      isSystem: Boolean(list?.isSystem || list?.id === 'inbox')
    }
  }

  function normalizeTask(task) {
    const now = task.createdAt || new Date().toISOString()
    return {
      description: '',
      descriptionHtml: '',
      editorMode: 'detail',
      completed: false,
      completedAt: null,
      deleted: false,
      deletedAt: null,
      pinned: false,
      listId: 'inbox',
      dueDate: null,
      reminderAt: null,
      repeatRule: null,
      priority: 0,
      tags: [],
      subtasks: [],
      comments: [],
      attachments: [],
      createdAt: now,
      updatedAt: now,
      ...task
    }
  }

  return {
    lists, tasks, trash, currentView, selectedTaskId, sortBy, searchQuery, saveError, isSaving, notice,
    currentList, canQuickAddTask, filteredTasks, uncompletedTasks, completedTasks, selectedTask, listTaskCounts,
    addList, deleteList, renameList,
    addTask, completeTask, deleteTask, restoreTask, permanentDelete, updateTask, togglePin, copyTask, clearCompletedInCurrentView,
    addSubtask, toggleSubtask, deleteSubtask, updateSubtask,
    addComment, addAttachment, removeAttachment,
    setView, setSearch, selectTask, showNotice, clearNotice, loadData, saveData
  }
})
