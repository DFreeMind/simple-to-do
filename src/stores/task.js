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

  // ========== 计算属性 ==========
  const currentList = computed(() => {
    if (['today', 'week', 'inbox', 'completed', 'trash'].includes(currentView.value)) return null
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
    return tasks.value.find(t => t.id === selectedTaskId.value)
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
    const task = {
      id: genId(),
      title,
      description: '',
      descriptionHtml: '',
      editorMode: 'detail',
      completed: false,
      deleted: false,
      pinned: false,
      listId: listId || currentView.value,
      dueDate: null,
      subtasks: [],
      comments: [],
      attachments: [],
      createdAt: new Date().toISOString()
    }
    // 如果当前视图是今天/最近7天，分配到收集箱
    if (['today', 'week', 'completed', 'trash'].includes(task.listId)) {
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
    }
  }

  function deleteTask(id) {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      task.deleted = true
      task.deletedAt = new Date().toISOString()
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
    if (task) Object.assign(task, updates)
  }

  function togglePin(id) {
    const task = tasks.value.find(t => t.id === id)
    if (task) task.pinned = !task.pinned
  }

  // 子任务
  function addSubtask(taskId, title) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.subtasks.push({ id: genId(), title, completed: false })
    }
  }

  function toggleSubtask(taskId, subId) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      const sub = task.subtasks.find(s => s.id === subId)
      if (sub) sub.completed = !sub.completed
    }
  }

  function deleteSubtask(taskId, subId) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.subtasks = task.subtasks.filter(s => s.id !== subId)
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
    }
  }

  // 视图切换
  function setView(view) {
    currentView.value = view
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
      tasks.value = data.tasks || []
      trash.value = data.trash || []
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

  return {
    lists, tasks, trash, currentView, selectedTaskId, sortBy,
    currentList, filteredTasks, uncompletedTasks, completedTasks, selectedTask, listTaskCounts,
    addList, deleteList, renameList,
    addTask, completeTask, deleteTask, restoreTask, permanentDelete, updateTask, togglePin,
    addSubtask, toggleSubtask, deleteSubtask,
    addComment, addAttachment,
    setView, selectTask, loadData, saveData
  }
})
