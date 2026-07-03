import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { genId } from '@/utils/id'
import { isToday, isWithin7Days } from '@/utils/date'
import { loadData as loadPlatformData, saveData as savePlatformData } from '@/services/platform'

export const useTaskStore = defineStore('task', () => {
  // ========== 状态 ==========
  const lists = ref([
    { id: 'inbox', name: '收集箱', icon: '📥', isSystem: true },
    { id: 'work', name: '工作任务', icon: '💼' },
    { id: 'personal', name: '个人备忘', icon: '🏠' }
  ])
  const tasks = ref([])
  const trash = ref([])
  const currentView = ref('inbox') // 'inbox' | 'today' | 'week' | listId | 'completed' | 'trash'
  const selectedTaskId = ref(null)
  const sortBy = ref('default') // 'default' | 'date' | 'name'
  const searchQuery = ref('')

  // ========== 计算属性 ==========
  const currentList = computed(() => {
    if (['today', 'week', 'inbox', 'completed', 'trash', 'search'].includes(currentView.value)) return null
    return lists.value.find(l => l.id === currentView.value)
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
        result = trash.value
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

  // 清单 CRUD
  function addList(name) {
    const list = { id: genId(), name, icon: '📋' }
    lists.value.push(list)
    return list
  }

  function deleteList(id) {
    if (id === 'inbox') return
    // 将清单下的任务移到收集箱
    tasks.value.forEach(t => {
      if (t.listId === id) t.listId = 'inbox'
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
    const now = new Date().toISOString()
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
      listId: listId || currentView.value,
      dueDate: null,
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
    // 如果当前视图是今天/最近7天，分配到收集箱
    if (['today', 'week', 'completed', 'trash', 'search'].includes(task.listId)) {
      task.listId = 'inbox'
    }
    tasks.value.unshift(task)
    return task
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
    if (task) {
      task.deleted = true
      task.deletedAt = new Date().toISOString()
      task.updatedAt = task.deletedAt
      trash.value.push({ ...task })
      if (selectedTaskId.value === id) selectedTaskId.value = null
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
      }
      trash.value.splice(idx, 1)
    }
  }

  function permanentDelete(id) {
    tasks.value = tasks.value.filter(t => t.id !== id)
    trash.value = trash.value.filter(t => t.id !== id)
    if (selectedTaskId.value === id) selectedTaskId.value = null
  }

  function updateTask(id, updates) {
    const task = tasks.value.find(t => t.id === id)
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
    const data = await loadPlatformData()
    if (data) {
      lists.value = data.lists || lists.value
      tasks.value = (data.tasks || []).map(normalizeTask)
      trash.value = (data.trash || []).map(normalizeTask)
    }
  }

  async function saveData() {
    await savePlatformData({
      lists: lists.value,
      tasks: tasks.value,
      trash: trash.value
    })
  }

  // 自动保存
  watch([lists, tasks, trash], () => saveData(), { deep: true })

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
    lists, tasks, trash, currentView, selectedTaskId, sortBy, searchQuery,
    currentList, filteredTasks, uncompletedTasks, completedTasks, selectedTask, listTaskCounts,
    addList, deleteList, renameList,
    addTask, completeTask, deleteTask, restoreTask, permanentDelete, updateTask, togglePin, copyTask, clearCompletedInCurrentView,
    addSubtask, toggleSubtask, deleteSubtask,
    addComment, addAttachment,
    setView, setSearch, selectTask, loadData, saveData
  }
})
