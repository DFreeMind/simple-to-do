<template>
  <aside class="task-detail" :class="{ 'task-detail--empty': !task }">
    <div v-if="!task" class="detail-empty">
      <div class="empty-state__icon">
        <PanelRightOpen :size="28" />
      </div>
      <h2>选择任务查看详情</h2>
      <p>任务属性、子任务和富文本备注会显示在这里。</p>
    </div>

    <template v-else>
      <header class="detail-header">
        <button
          class="task-check task-check--large"
          :class="{ checked: task.completed }"
          type="button"
          :aria-label="task.completed ? '标记为未完成' : '标记为完成'"
          @click="store.completeTask(task.id)"
        >
          <Check v-if="task.completed" :size="16" />
        </button>
        <textarea
          class="detail-title-input"
          :value="task.title"
          rows="1"
          placeholder="任务标题"
          @input="updateTitle"
        ></textarea>
        <button class="icon-btn" type="button" aria-label="关闭详情" title="关闭详情" @click="store.updateSettings({ detailOpen: false })">
          <X :size="18" />
        </button>
      </header>

      <section class="detail-actions">
        <button class="attribute-toggle" type="button" :class="{ active: store.isInMyDay(task) }" @click="store.toggleMyDay(task.id)">
          <Sun :size="16" />
          <span>{{ store.isInMyDay(task) ? '今日' : '加入今日' }}</span>
        </button>
        <button class="attribute-toggle" type="button" :class="{ active: task.important || task.priority === 3 }" @click="store.toggleImportant(task.id)">
          <Star :size="16" />
          <span>{{ task.important || task.priority === 3 ? '重要' : '标记重要' }}</span>
        </button>
        <button class="attribute-toggle" type="button" :class="{ active: task.pinned }" @click="store.togglePin(task.id)">
          <Pin :size="16" />
          <span>{{ task.pinned ? '已置顶' : '置顶' }}</span>
        </button>
      </section>

      <section class="detail-section detail-section--grid" aria-label="任务属性">
        <div class="field">
          <span><ListChecks :size="15" /> 清单</span>
          <div class="detail-select">
            <button class="detail-select__button" type="button" @click.stop="toggleSelect('list')">
              <span>{{ selectedListName }}</span>
              <ChevronDown :size="16" :class="{ rotated: openSelect === 'list' }" />
            </button>
            <div v-if="openSelect === 'list'" class="detail-select__menu">
              <button
                v-for="list in store.lists"
                :key="list.id"
                class="detail-select__option"
                :class="{ active: task.listId === list.id }"
                type="button"
                @click="chooseList(list.id)"
              >
                <span class="color-dot" :style="{ backgroundColor: list.color }"></span>
                <span>{{ list.name }}</span>
                <Check v-if="task.listId === list.id" :size="15" />
              </button>
            </div>
          </div>
        </div>

        <div class="field">
          <span><CalendarClock :size="15" /> 截止日期</span>
          <div class="date-field">
            <button class="detail-select__button" type="button" @click.stop="toggleDatePicker('dueDate')">
              <span>{{ formatDateValue(task.dueDate) || '设置截止日期' }}</span>
              <ChevronDown :size="16" :class="{ rotated: openDatePicker === 'dueDate' }" />
            </button>
            <DatePicker
              v-if="openDatePicker === 'dueDate'"
              :task="task"
              field="dueDate"
              title="截止日期"
              @close="openDatePicker = ''"
            />
          </div>
        </div>

        <div class="field">
          <span><Bell :size="15" /> 提醒</span>
          <div class="date-field">
            <button class="detail-select__button" type="button" @click.stop="toggleDatePicker('reminderAt')">
              <span>{{ formatDateValue(task.reminderAt) || '设置提醒时间' }}</span>
              <ChevronDown :size="16" :class="{ rotated: openDatePicker === 'reminderAt' }" />
            </button>
            <DatePicker
              v-if="openDatePicker === 'reminderAt'"
              :task="task"
              field="reminderAt"
              title="提醒时间"
              @close="openDatePicker = ''"
            />
          </div>
        </div>

        <div class="field">
          <span><Repeat2 :size="15" /> 重复</span>
          <div class="detail-select">
            <button class="detail-select__button" type="button" @click.stop="toggleSelect('repeat')">
              <span>{{ repeatLabel }}</span>
              <ChevronDown :size="16" :class="{ rotated: openSelect === 'repeat' }" />
            </button>
            <div v-if="openSelect === 'repeat'" class="detail-select__menu">
              <button
                v-for="option in repeatOptions"
                :key="option.value || 'none'"
                class="detail-select__option"
                :class="{ active: (task.repeatRule || '') === option.value }"
                type="button"
                @click="chooseRepeat(option.value)"
              >
                <span>{{ option.label }}</span>
                <Check v-if="(task.repeatRule || '') === option.value" :size="15" />
              </button>
            </div>
          </div>
        </div>

        <div class="field">
          <span><Flag :size="15" /> 优先级</span>
          <div class="detail-select">
            <button class="detail-select__button" type="button" @click.stop="toggleSelect('priority')">
              <span>{{ priorityLabel }}</span>
              <ChevronDown :size="16" :class="{ rotated: openSelect === 'priority' }" />
            </button>
            <div v-if="openSelect === 'priority'" class="detail-select__menu">
              <button
                v-for="option in priorityOptions"
                :key="option.value"
                class="detail-select__option"
                :class="{ active: Number(task.priority || 0) === option.value }"
                type="button"
                @click="choosePriority(option.value)"
              >
                <span>{{ option.label }}</span>
                <Check v-if="Number(task.priority || 0) === option.value" :size="15" />
              </button>
            </div>
          </div>
        </div>

        <div class="field">
          <span><Tags :size="15" /> 标签</span>
          <div class="tag-editor">
            <button
              v-for="tag in task.tags || []"
              :key="tag"
              class="tag-pill"
              type="button"
              :title="`编辑标签 ${tag}`"
              @click="editTag(tag)"
            >
              <span>{{ tag }}</span>
              <X :size="13" @click.stop="removeTag(tag)" />
            </button>
            <input
              v-model="tagInput"
              placeholder="添加标签"
              @keydown.enter.prevent="commitTagInput"
              @keydown="handleTagKeydown"
              @blur="commitTagInput"
            />
          </div>
        </div>
      </section>

      <section class="detail-section">
        <div class="section-heading">
          <h2>子任务</h2>
          <span>{{ completedSubtasks }}/{{ task.subtasks.length }}</span>
        </div>

        <div class="subtask-list" @mousedown="handleSubtaskMouseDown">
          <div
            v-for="subtask in task.subtasks"
            :key="subtask.id"
            class="subtask-item"
            :class="{ completed: subtask.completed, 'is-dragging': subtaskDrag.draggingId.value === subtask.id, 'drop-target': subtaskDrag.dragOverId.value === subtask.id }"
          >
            <span
              class="subtask-drag-handle"
              role="button"
              tabindex="-1"
              title="拖动排序"
              aria-label="拖动子任务排序"
            >
              <GripVertical :size="15" />
            </span>
            <button class="task-check" :class="{ checked: subtask.completed }" type="button" aria-label="切换子任务完成状态" @click="store.toggleSubtask(task.id, subtask.id)">
              <span class="sr-only">{{ subtask.completed ? '已完成' : '未完成' }}</span>
              <Check v-if="subtask.completed" :size="14" />
            </button>
            <input
              :value="subtask.title"
              aria-label="子任务标题"
              @change="store.updateSubtask(task.id, subtask.id, $event.target.value)"
              @keydown.enter="$event.target.blur()"
            />
            <button class="ghost-icon danger" type="button" aria-label="删除子任务" @click="store.deleteSubtask(task.id, subtask.id)">
              <X :size="15" />
            </button>
          </div>

          <div class="subtask-add">
            <Plus :size="16" />
            <input v-model="newSubtask" placeholder="添加子任务" @keydown.enter="addSubtask" />
            <button class="small-btn" type="button" :disabled="!newSubtask.trim()" @click="addSubtask">添加</button>
          </div>
        </div>
      </section>

      <section class="detail-section detail-section--editor">
        <div class="section-heading">
          <h2>备注</h2>
          <button class="small-btn" type="button" @click.stop="openFormatMenu">
            <Pilcrow :size="15" />
            插入块
          </button>
        </div>
        <RichTextEditor ref="richTextEditor" v-model="editorContent" placeholder="写下背景、链接、待办块或粘贴图片..." />
      </section>

      <section class="detail-section">
        <div class="section-heading">
          <h2>附件</h2>
          <button class="small-btn" type="button" @click="triggerImageUpload">
            <ImagePlus :size="15" />
            添加图片
          </button>
        </div>
        <div v-if="task.attachments.length" class="attachment-grid">
          <figure v-for="attachment in task.attachments" :key="attachment.id" class="attachment-card">
            <img :src="attachment.url" :alt="attachment.path || '任务附件'" @click="previewUrl = attachment.url" />
            <figcaption>
              <span>{{ attachment.path || '图片附件' }}</span>
              <button class="ghost-icon danger" type="button" aria-label="移除附件" @click="removeAttachment(attachment.id)">
                <Trash2 :size="15" />
              </button>
            </figcaption>
          </figure>
        </div>
        <p v-else class="muted-text">还没有附件。</p>
      </section>

      <footer class="detail-footer">
        <button class="pill-btn" type="button" @click="copyTask">
          <Copy :size="16" />
          创建副本
        </button>
        <button class="pill-btn" type="button" @click="copyLink">
          <LinkIcon :size="16" />
          复制链接
        </button>
        <button class="pill-btn danger" type="button" @click="deleteTask">
          <Trash2 :size="16" />
          删除
        </button>
      </footer>

      <FormatMenu
        :show="formatMenuVisible"
        :editor="richTextEditor?.editor"
        :position="formatMenuPos"
        @close="formatMenuVisible = false"
        @insertImage="triggerImageUpload"
      />

      <input ref="fileInput" type="file" accept="image/*" multiple class="hidden-file-input" @change="onFileSelected" />

      <Teleport to="body">
        <div v-if="previewUrl" class="image-preview" role="dialog" aria-modal="true" @click="previewUrl = null">
          <img :src="previewUrl" alt="附件预览" />
        </div>
      </Teleport>
    </template>
  </aside>
</template>

<script setup>
import { computed, ref, watch, defineAsyncComponent, h, onMounted, onBeforeUnmount } from 'vue'
import {
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  Copy,
  Flag,
  GripVertical,
  ImagePlus,
  Link as LinkIcon,
  ListChecks,
  PanelRightOpen,
  Pilcrow,
  Pin,
  Plus,
  Repeat2,
  Star,
  Sun,
  Tags,
  Trash2,
  X
} from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { useDragSort } from '@/composables/useDragSort'
import FormatMenu from './FormatMenu.vue'
import DatePicker from './DatePicker.vue'
import { readImage, selectImage } from '@/services/platform'

const RichTextEditor = defineAsyncComponent({
  loader: () => import('./RichTextEditor.vue'),
  loadingComponent: {
    render: () => h('div', { class: 'rich-editor-loading' }, '正在加载编辑器...')
  }
})

const store = useTaskStore()
const newSubtask = ref('')
const editorContent = ref('')
const richTextEditor = ref(null)
const formatMenuVisible = ref(false)
const formatMenuPos = ref({ x: 0, y: 0 })
const fileInput = ref(null)
const previewUrl = ref(null)
const openSelect = ref('')
const openDatePicker = ref('')
const tagInput = ref('')
const subtaskDrag = useDragSort({
  scrollContainerSelector: '.subtask-list',
  onDrop(sourceId, targetId, position) {
    if (!task.value) return
    if (position === 'after') {
      const idx = task.value.subtasks.findIndex(s => s.id === targetId)
      const nextSubtask = idx >= 0 && idx < task.value.subtasks.length - 1 ? task.value.subtasks[idx + 1] : null
      if (nextSubtask) {
        store.reorderSubtask(task.value.id, sourceId, nextSubtask.id)
      } else {
        store.reorderSubtask(task.value.id, sourceId, targetId)
      }
    } else {
      store.reorderSubtask(task.value.id, sourceId, targetId)
    }
  },
  getItemEl(target) {
    const handle = target.closest?.('.subtask-drag-handle')
    if (!handle) return null
    const item = handle.closest('.subtask-item')
    if (!item) return null
    const input = item.querySelector('input')
    const subtask = task.value?.subtasks.find(s => s.title === input?.value)
    return subtask ? { id: subtask.id, el: item } : null
  },
  findItemAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y)
    for (const el of elements) {
      const item = el.closest?.('.subtask-item')
      if (item) {
        const input = item.querySelector('input')
        const subtask = task.value?.subtasks.find(s => s.title === input?.value)
        if (!subtask) continue
        const rect = item.getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        return { id: subtask.id, position: y < midY ? 'before' : 'after' }
      }
    }
    return null
  }
})

function handleSubtaskMouseDown(e) {
  const handle = e.target.closest('.subtask-drag-handle')
  if (!handle) return
  const item = handle.closest('.subtask-item')
  if (!item) return
  const input = item.querySelector('input')
  const subtask = task.value?.subtasks.find(s => s.title === input?.value)
  if (subtask) subtaskDrag.startDrag(e, subtask.id)
}

const task = computed(() => store.selectedTask)
const completedSubtasks = computed(() => task.value?.subtasks.filter(item => item.completed).length || 0)
const repeatOptions = [
  { value: '', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' }
]
const priorityOptions = [
  { value: 0, label: '无优先级' },
  { value: 1, label: '低' },
  { value: 2, label: '中' },
  { value: 3, label: '高' }
]
const selectedListName = computed(() => store.selectedList?.name || '收集箱')
const repeatLabel = computed(() => repeatOptions.find(option => option.value === (task.value?.repeatRule || ''))?.label || '不重复')
const priorityLabel = computed(() => priorityOptions.find(option => option.value === Number(task.value?.priority || 0))?.label || '无优先级')

watch(task, (nextTask) => {
  editorContent.value = nextTask?.descriptionHtml || ''
  openSelect.value = ''
  openDatePicker.value = ''
  tagInput.value = ''
}, { immediate: true })

watch(editorContent, (value) => {
  if (task.value && value !== task.value.descriptionHtml) {
    store.updateTask(task.value.id, { descriptionHtml: value })
  }
})

function updateTitle(event) {
  store.updateTask(task.value.id, { title: event.target.value })
  autoResize(event.target)
}

function toggleSelect(name) {
  openSelect.value = openSelect.value === name ? '' : name
  openDatePicker.value = ''
}

function chooseList(listId) {
  store.updateTask(task.value.id, { listId })
  openSelect.value = ''
}

function chooseRepeat(value) {
  store.updateTask(task.value.id, { repeatRule: value || null })
  openSelect.value = ''
}

function choosePriority(priority) {
  store.updateTask(task.value.id, { priority, important: priority === 3 ? true : task.value.important })
  openSelect.value = ''
}

function closeSelect() {
  openSelect.value = ''
  openDatePicker.value = ''
}

function toggleDatePicker(field) {
  openDatePicker.value = openDatePicker.value === field ? '' : field
  openSelect.value = ''
}

function commitTagInput() {
  const values = tagInput.value
    .split(/[,，]/)
    .map(item => item.trim())
    .filter(Boolean)
  if (!values.length || !task.value) {
    tagInput.value = ''
    return
  }
  const tags = Array.from(new Set([...(task.value.tags || []), ...values]))
  store.updateTask(task.value.id, { tags })
  tagInput.value = ''
}

function removeTag(tag) {
  store.updateTask(task.value.id, {
    tags: (task.value.tags || []).filter(item => item !== tag)
  })
}

function editTag(tag) {
  tagInput.value = tag
  removeTag(tag)
}

function handleTagKeydown(event) {
  if (event.key === ',' || event.key === '，') {
    event.preventDefault()
    commitTagInput()
  }
}

function addSubtask() {
  const title = newSubtask.value.trim()
  if (!title || !task.value) return
  store.addSubtask(task.value.id, title)
  newSubtask.value = ''
}


function formatDateValue(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function openFormatMenu(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  formatMenuPos.value = clampFloatingPosition(rect.left - 120, rect.bottom + 8, 240, 340)
  formatMenuVisible.value = true
}

function clampFloatingPosition(x, y, width, height) {
  const margin = 12
  return {
    x: Math.max(margin, Math.min(x, window.innerWidth - width - margin)),
    y: Math.max(margin, Math.min(y, window.innerHeight - height - margin))
  }
}

async function triggerImageUpload() {
  if (!task.value) return
  try {
    const path = await selectImage()
    if (!path) {
      fileInput.value?.click()
      return
    }
    const url = await readImage(path)
    if (url) {
      store.addAttachment(task.value.id, path, url)
      store.showNotice('图片已添加', 'success')
    }
  } catch (error) {
    store.showNotice(error?.message || '添加图片失败', 'error')
  }
}

function onFileSelected(event) {
  const files = event.target.files
  if (!files?.length || !task.value) return
  for (const file of files) {
    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      store.addAttachment(task.value.id, file.name, readerEvent.target.result)
    }
    reader.readAsDataURL(file)
  }
  event.target.value = ''
  store.showNotice('图片已添加', 'success')
}

function removeAttachment(id) {
  store.removeAttachment(task.value.id, id)
  store.showNotice('附件已移除', 'success')
}

function copyTask() {
  const copied = store.copyTask(task.value.id)
  if (copied) {
    store.selectTask(copied.id)
    store.showNotice('已创建任务副本', 'success')
  }
}

async function copyLink() {
  try {
    await navigator.clipboard?.writeText(`todo://${task.value.id}`)
    store.showNotice('任务链接已复制', 'success')
  } catch (error) {
    store.showNotice('复制失败，请检查剪贴板权限', 'error')
  }
}

function deleteTask() {
  if (window.confirm('删除此任务？任务会先进入垃圾桶。')) {
    store.deleteTask(task.value.id)
  }
}

function autoResize(element) {
  element.style.height = 'auto'
  element.style.height = `${element.scrollHeight}px`
}

function handleSelectKeydown(event) {
  if (event.key === 'Escape') closeSelect()
}

onMounted(() => {
  window.addEventListener('click', closeSelect)
  window.addEventListener('keydown', handleSelectKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeSelect)
  window.removeEventListener('keydown', handleSelectKeydown)
})
</script>
