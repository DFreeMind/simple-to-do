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
      <header class="detail-hero">
        <div class="detail-hero__card">
          <div class="detail-toolbar">
            <button
              class="task-check task-check--large"
              :class="{ checked: task.completed }"
              type="button"
              :aria-label="task.completed ? '标记为未完成' : '标记为完成'"
              @click="store.completeTask(task.id)"
            >
              <Check v-if="task.completed" :size="16" />
            </button>
            <div class="detail-toolbar__actions">
              <button
                class="detail-icon-action"
                :class="{ active: store.isInMyDay(task) }"
                type="button"
                :title="store.isInMyDay(task) ? '已加入今日' : '加入今日'"
                :aria-label="store.isInMyDay(task) ? '已加入今日' : '加入今日'"
                @click="store.toggleMyDay(task.id)"
              >
                <Sun :size="16" />
              </button>
              <button
                class="detail-icon-action"
                :class="{ active: task.important || task.priority === 3 }"
                type="button"
                :title="task.important || task.priority === 3 ? '取消重要' : '标记重要'"
                :aria-label="task.important || task.priority === 3 ? '取消重要' : '标记重要'"
                @click="store.toggleImportant(task.id)"
              >
                <Star :size="16" />
              </button>
              <button
                class="detail-icon-action"
                :class="{ active: task.pinned }"
                type="button"
                :title="task.pinned ? '取消置顶' : '置顶'"
                :aria-label="task.pinned ? '取消置顶' : '置顶'"
                @click="store.togglePin(task.id)"
              >
                <Pin :size="16" />
              </button>
              <button class="detail-icon-action detail-icon-action--close" type="button" aria-label="关闭详情" title="关闭详情" @click="store.updateSettings({ detailOpen: false })">
                <X :size="18" />
              </button>
            </div>
          </div>
          <textarea
            ref="titleInput"
            class="detail-title-input"
            :value="task.title"
            rows="1"
            placeholder="任务标题"
            @input="updateTitle"
          ></textarea>
          <div class="detail-hero__footer">
            <div v-if="task.subtasks.length" class="detail-hero-progress">
              <div class="detail-hero-progress__ring" :style="{ '--progress': subtaskProgressPercent * 3.6 + 'deg' }"></div>
              <span class="detail-hero-progress__count">{{ completedSubtasks }}/{{ task.subtasks.length }}</span>
            </div>
            <div class="detail-hero__meta">
              <Clock :size="12" />
              <span :title="formatFullDate(task.createdAt)">{{ formatCreatedAt(task.createdAt) }}</span>
            </div>
          </div>
        </div>
      </header>

      <section class="detail-section detail-section--grid" aria-label="任务属性">
        <div class="field">
          <span><ListChecks :size="15" /> 清单</span>
          <div class="detail-select">
            <button class="detail-select__button detail-select__button--list" type="button" :title="selectedListName" @click.stop="toggleSelect('list')">
              <span class="color-dot" :style="{ backgroundColor: selectedListColor }"></span>
              <span class="detail-select__text">{{ selectedListName }}</span>
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
          <span><CalendarClock :size="15" /> 日期</span>
          <div class="date-field">
            <button class="detail-select__button" type="button" @click.stop="toggleDatePicker('dueDate')">
              <span class="date-field__value" :class="{ empty: !task.dueDate }">
                <span class="date-field__main">{{ task.dueDate ? dateSummaryText : '设置日期' }}</span>
                <span v-if="task.reminderAt" class="date-field__meta" :title="`提醒 ${formatTime(task.reminderAt)}`">
                  <Bell :size="12" />
                  <span>{{ formatTime(task.reminderAt) }}</span>
                </span>
                <span v-if="task.repeatRule" class="date-field__meta" :title="repeatLabel">
                  <Repeat2 :size="12" />
                  <span>{{ repeatLabel }}</span>
                </span>
              </span>
              <ChevronDown :size="16" :class="{ rotated: openDatePicker === 'dueDate' }" />
            </button>
            <DatePicker
              v-if="openDatePicker === 'dueDate'"
              :task="task"
              field="dueDate"
              title="日期"
              :show-extras="true"
              @close="openDatePicker = ''"
            />
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
            :data-subtask-id="subtask.id"
            :class="{
              completed: subtask.completed,
              'is-dragging': subtaskDrag.draggingId.value === subtask.id,
              'drop-target': subtaskDrag.dragOverId.value === subtask.id,
              'drop-target-before': subtaskDrag.dragOverId.value === subtask.id && subtaskDrag.dropPosition.value === 'before',
              'drop-target-after': subtaskDrag.dragOverId.value === subtask.id && subtaskDrag.dropPosition.value === 'after'
            }"
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

      <section ref="editorSection" class="detail-section detail-section--editor" @click="onEditorSectionClick">
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
            <img :src="attachment.url" :alt="attachment.originalName || attachment.path || '任务附件'" @click="openLightbox(attachmentIndex(attachment))" />
            <figcaption>
              <span>{{ attachment.originalName || attachment.path || '图片附件' }}</span>
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

      <ImageLightbox
        :images="previewImages"
        :startIndex="previewIndex"
        :visible="previewVisible"
        @close="previewVisible = false"
      />

      <ConfirmDialog
        :visible="confirmDialog.visible"
        :title="confirmDialog.title"
        :message="confirmDialog.message"
        :confirm-text="confirmDialog.confirmText"
        :type="confirmDialog.type"
        @confirm="confirmDialog.onConfirm"
        @cancel="confirmDialog.visible = false"
      />
    </template>
  </aside>
</template>

<script setup>
import { computed, ref, reactive, watch, defineAsyncComponent, h, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  Clock,
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
import { formatCreatedAt, formatFullDate } from '@/utils/date'
import FormatMenu from './FormatMenu.vue'
import DatePicker from './DatePicker.vue'
import ImageLightbox from './ImageLightbox.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { importImage, readImage, selectImage } from '@/services/platform'

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
const titleInput = ref(null)
const editorSection = ref(null)
const formatMenuVisible = ref(false)
const formatMenuPos = ref({ x: 0, y: 0 })
const fileInput = ref(null)
const previewVisible = ref(false)
const previewIndex = ref(0)
const editorImageUrls = ref([])
const previewImages = ref([])
const confirmDialog = reactive({
  visible: false,
  title: '',
  message: '',
  confirmText: '确定',
  type: 'danger',
  onConfirm: () => {}
})

const allImageUrls = computed(() => {
  if (!task.value) return []
  const urls = []
  if (task.value.attachments) {
    for (const a of task.value.attachments) {
      if (a.url) urls.push(a.url)
    }
  }
  editorImageUrls.value.forEach(url => {
    if (url && !urls.includes(url)) urls.push(url)
  })
  return urls
})

function attachmentIndex(attachment) {
  return allImageUrls.value.indexOf(attachment.url)
}

function openLightbox(index, images = allImageUrls.value) {
  if (index < 0) return
  previewImages.value = images
  previewIndex.value = index
  previewVisible.value = true
}

function onEditorSectionClick(e) {
  const img = e.target.closest('.editor-content img')
  if (!img || !img.src) return
  const urls = collectEditorImageUrls()
  editorImageUrls.value = urls
  const src = img.currentSrc || img.src
  const idx = urls.indexOf(src)
  if (idx >= 0) openLightbox(idx, urls)
  else openLightbox(0, [src])
}
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
    const item = target.closest?.('.subtask-item')
    if (!item) return null
    const subtaskId = item.dataset.subtaskId
    return subtaskId ? { id: subtaskId, el: item } : null
  },
  findItemAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y)
    for (const el of elements) {
      const item = el.closest?.('.subtask-item')
      if (item) {
        const subtaskId = item.dataset.subtaskId
        if (!subtaskId) continue
        const rect = item.getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        return { id: subtaskId, position: y < midY ? 'before' : 'after' }
      }
    }
    return null
  },
  onDragStart: () => store.playDragStartSound(),
  onDragOver: () => store.playDragOverSound(),
  onDragEnd: () => store.playDragEndSound()
})

function handleSubtaskMouseDown(e) {
  if (isSubtaskDragIgnored(e.target)) return
  const item = e.target.closest('.subtask-item')
  if (!item) return
  const subtaskId = item.dataset.subtaskId
  if (subtaskId) subtaskDrag.startDrag(e, subtaskId)
}

function isSubtaskDragIgnored(target) {
  return Boolean(target.closest?.('button, input, textarea, select, a'))
}

const task = computed(() => store.selectedTask)
const completedSubtasks = computed(() => task.value?.subtasks.filter(item => item.completed).length || 0)
const subtaskProgressPercent = computed(() => {
  const total = task.value?.subtasks.length || 0
  if (!total) return 0
  return Math.round((completedSubtasks.value / total) * 100)
})
const priorityOptions = [
  { value: 0, label: '无优先级' },
  { value: 1, label: '低' },
  { value: 2, label: '中' },
  { value: 3, label: '高' }
]
const selectedListName = computed(() => store.selectedList?.name || '收集箱')
const selectedListColor = computed(() => store.selectedList?.color || '#5fb8ad')
const priorityLabel = computed(() => priorityOptions.find(option => option.value === Number(task.value?.priority || 0))?.label || '无优先级')

// 日期摘要文本，如 "7月8日 · 明天"
const summaryWeekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const dateSummaryText = computed(() => {
  if (!task.value?.dueDate) return ''
  const d = new Date(task.value.dueDate)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((target - today) / 86400000)
  let relative = ''
  if (diff === 0) relative = '今天'
  else if (diff === 1) relative = '明天'
  else if (diff === -1) relative = '昨天'
  else if (diff > 0 && diff <= 7) relative = '本' + summaryWeekdays[d.getDay()]
  else if (diff > 7 && diff <= 14) relative = '下周' + summaryWeekdays[d.getDay()]
  return relative ? `${month}月${day}日 · ${relative}` : `${month}月${day}日`
})
const repeatLabels = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年'
}
const repeatLabel = computed(() => repeatLabels[task.value?.repeatRule] || task.value?.repeatRule || '')

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

watch(task, (nextTask) => {
  editorContent.value = nextTask?.descriptionHtml || ''
  openSelect.value = ''
  openDatePicker.value = ''
  tagInput.value = ''
  nextTick(() => {
    if (titleInput.value) autoResize(titleInput.value)
  })
}, { immediate: true })

watch(editorContent, (value) => {
  if (task.value && value !== task.value.descriptionHtml) {
    store.updateTask(task.value.id, { descriptionHtml: value })
  }
  nextTick(refreshEditorImageUrls)
})

function collectEditorImageUrls() {
  if (!editorSection.value) return []
  return Array.from(editorSection.value.querySelectorAll('.editor-content img'))
    .map(img => img.currentSrc || img.src)
    .filter(Boolean)
}

function refreshEditorImageUrls() {
  editorImageUrls.value = collectEditorImageUrls()
}

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


function openFormatMenu(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  formatMenuPos.value = clampFloatingPosition(rect.left - 120, rect.bottom + 8, 240, 340)
  formatMenuVisible.value = true
}

function onFormatMenuOutsideClick(e) {
  if (formatMenuVisible.value) {
    formatMenuVisible.value = false
  }
}

watch(formatMenuVisible, (visible) => {
  if (visible) {
    setTimeout(() => document.addEventListener('click', onFormatMenuOutsideClick, { once: true }), 0)
  }
})

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
    const attachment = await importImage(path)
    if (attachment) {
      const url = await readImage(path)
      store.addAttachment(task.value.id, { ...attachment, path, url })
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
  confirmDialog.title = '删除任务'
  confirmDialog.message = '删除此任务？任务会先进入垃圾桶。'
  confirmDialog.confirmText = '删除'
  confirmDialog.type = 'danger'
  confirmDialog.onConfirm = () => {
    store.deleteTask(task.value.id)
    confirmDialog.visible = false
  }
  confirmDialog.visible = true
}

function autoResize(element) {
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 64)}px`
}

function handleSelectKeydown(event) {
  if (event.key === 'Escape') closeSelect()
}

onMounted(() => {
  window.addEventListener('click', closeSelect)
  window.addEventListener('keydown', handleSelectKeydown)
  nextTick(refreshEditorImageUrls)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeSelect)
  window.removeEventListener('keydown', handleSelectKeydown)
})
</script>
