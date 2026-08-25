<template>
  <Teleport to="body" :disabled="!isFocusMode">
    <div class="rich-editor-shell" :class="{ 'rich-editor-shell--focus': isFocusMode }" :role="isFocusMode ? 'dialog' : undefined" :aria-modal="isFocusMode || undefined" aria-label="备注编辑器" @mousedown.self="closeFocusMode" @keydown.esc="closeFocusMode">
  <div class="rich-editor" :class="{ 'is-expanded': isExpanded, 'rich-editor--focus': isFocusMode }">
    <button v-if="isFocusMode" class="rich-editor__close-btn" type="button" title="关闭编辑器" aria-label="关闭编辑器" @mousedown.prevent @click="closeFocusMode"><X :size="18" /></button>
    <button v-if="!isExpanded" class="rich-editor__empty-trigger" type="button" @click="focusEditor">
      <PenLine :size="16" />
      <span>{{ placeholder }}</span>
    </button>

    <template v-else>
      <button v-if="compact && toolbarCollapsed" class="rich-editor__edit-bar" type="button" @click="openEditorControls">
        <PenLine :size="15" />
        <span>编辑备注</span>
        <small>点击内容也可开始编辑</small>
      </button>
      <div v-if="!compact || !toolbarCollapsed" class="rich-editor__toolbar" role="toolbar" aria-label="备注格式工具">
        <div class="rich-editor__block-wrap">
          <button ref="blockTriggerRef" class="rich-editor__tool rich-editor__block-trigger" :class="{ active: blockMenuOpen }" type="button" :title="`文本类型：${currentBlockLabel()}`" :aria-label="`文本类型：${currentBlockLabel()}`" :aria-expanded="blockMenuOpen" @mousedown.prevent @click="blockMenuOpen = !blockMenuOpen"><Type :size="16" /><ChevronDown :size="12" /></button>
        </div>
        <span class="rich-editor__toolbar-divider"></span>
        <button class="rich-editor__tool" type="button" title="撤销 (⌘/Ctrl+Z)" aria-label="撤销" @mousedown.prevent @click="editor?.chain().focus().undo().run()"><Undo2 :size="15" /></button>
        <button class="rich-editor__tool" type="button" title="重做 (⌘/Ctrl+Shift+Z)" aria-label="重做" @mousedown.prevent @click="editor?.chain().focus().redo().run()"><Redo2 :size="15" /></button>
        <span class="rich-editor__toolbar-divider"></span>
        <button class="rich-editor__tool" :class="{ active: isActive('bold') }" type="button" title="加粗 (⌘/Ctrl+B)" aria-label="加粗" @mousedown.prevent @click="toggleMark('bold')"><Bold :size="15" /></button>
        <button class="rich-editor__tool" :class="{ active: isActive('italic') }" type="button" title="斜体 (⌘/Ctrl+I)" aria-label="斜体" @mousedown.prevent @click="toggleMark('italic')"><Italic :size="15" /></button>
        <button class="rich-editor__tool" :class="{ active: isActive('strike') }" type="button" title="删除线" aria-label="删除线" @mousedown.prevent @click="toggleMark('strike')"><Strikethrough :size="15" /></button>
        <button class="rich-editor__tool" :class="{ active: isActive('highlight') }" type="button" title="高亮" aria-label="高亮" @mousedown.prevent @click="toggleMark('highlight')"><Highlighter :size="15" /></button>
        <button class="rich-editor__tool" :class="{ active: isActive('code') }" type="button" title="行内代码" aria-label="行内代码" @mousedown.prevent @click="toggleMark('code')"><Code2 :size="15" /></button>
        <button ref="linkTriggerRef" class="rich-editor__tool" :class="{ active: isActive('link') }" type="button" title="添加链接" aria-label="添加链接" @mousedown.prevent @click="openLinkPopover"><Link :size="15" /></button>
        <span class="rich-editor__toolbar-divider"></span>
        <button class="rich-editor__tool" :class="{ active: isActive('bulletList') }" type="button" title="无序列表" aria-label="无序列表" @mousedown.prevent @click="toggleList('bulletList')"><List :size="15" /></button>
        <button class="rich-editor__tool" :class="{ active: isActive('orderedList') }" type="button" title="编号列表" aria-label="编号列表" @mousedown.prevent @click="toggleList('orderedList')"><ListOrdered :size="15" /></button>
        <button class="rich-editor__tool" :class="{ active: isActive('taskList') }" type="button" title="待办列表" aria-label="待办列表" @mousedown.prevent @click="toggleList('taskList')"><ListChecks :size="15" /></button>
        <span class="rich-editor__toolbar-divider"></span>
        <button class="rich-editor__tool" type="button" title="插入图片" aria-label="插入图片" @mousedown.prevent @click="chooseImage"><ImagePlus :size="15" /></button>
        <button class="rich-editor__tool rich-editor__focus-trigger" type="button" :title="isFocusMode ? '退出独立编辑器' : '放大编辑器'" :aria-label="isFocusMode ? '退出独立编辑器' : '放大编辑器'" @mousedown.prevent @click="toggleFocusMode"><Minimize2 v-if="isFocusMode" :size="15" /><Maximize2 v-else :size="15" /></button>
        <div class="rich-editor__more-wrap">
          <button ref="moreTriggerRef" class="rich-editor__tool" :class="{ active: moreMenuOpen }" type="button" title="更多块" aria-label="更多块" @mousedown.prevent @click="moreMenuOpen = !moreMenuOpen"><MoreHorizontal :size="16" /></button>
        </div>
      </div>
      <editor-content :editor="editor" class="editor-content" @click="onEditorContentClick" @focusin="toolbarCollapsed = false" />
      <footer class="rich-editor__status"><span>{{ editorStats.characters }} 字 · {{ editorStats.words }} 词</span><span>{{ editorStats.readingMinutes }} 分钟阅读</span></footer>
    </template>
    <input ref="fileInput" type="file" accept="image/*" multiple class="hidden-file-input" @change="onFileSelected" />
  </div>
    </div>
  </Teleport>

  <ImageLightbox
    :images="lightboxImages"
    :startIndex="lightboxIndex"
    :visible="lightboxVisible"
    @close="lightboxVisible = false"
  />

  <Teleport to="body">
    <div v-if="blockMenuOpen" ref="blockMenuRef" class="rich-editor__block-menu" :style="blockMenuStyle" role="menu">
      <button v-for="item in blockItems" :key="item.value" type="button" role="menuitemradio" :aria-checked="currentBlockType() === item.value" :class="{ active: currentBlockType() === item.value }" @mousedown.prevent @click="setBlockType(item.value)"><strong>{{ item.badge }}</strong><span>{{ item.label }}</span></button>
    </div>
    <div v-if="moreMenuOpen" ref="moreMenuRef" class="rich-editor__more-menu" :style="moreMenuStyle" role="menu">
      <button type="button" role="menuitem" @mousedown.prevent @click="insertBlockquote"><Quote :size="15" /> 引用</button>
      <button type="button" role="menuitem" @mousedown.prevent @click="insertHorizontalRule"><Minus :size="15" /> 分割线</button>
      <button type="button" role="menuitem" @mousedown.prevent @click="toggleMark('underline')"><Underline :size="15" /> 下划线</button>
      <button type="button" role="menuitem" @mousedown.prevent @click="toggleCodeBlock"><Code2 :size="15" /> 代码块</button>
      <button type="button" role="menuitem" @mousedown.prevent @click="insertTable"><Table2 :size="15" /> 表格</button>
      <button type="button" role="menuitem" @mousedown.prevent @click="insertDetails"><ChevronRight :size="15" /> 折叠块</button>
      <button type="button" role="menuitem" @mousedown.prevent @click="openTaskReference"><ListTodo :size="15" /> 任务引用</button>
      <button type="button" role="menuitem" @mousedown.prevent @click="setTextAlign('center')"><AlignCenter :size="15" /> 居中对齐</button>
      <button type="button" role="menuitem" @mousedown.prevent @click="setTextAlign('left')"><AlignLeft :size="15" /> 左对齐</button>
    </div>
    <form v-if="linkPopoverOpen" ref="linkPopoverRef" class="rich-editor__link-popover" :style="linkPopoverStyle" @submit.prevent="applyLink">
      <input ref="linkInput" v-model="linkUrl" type="url" placeholder="https://example.com" aria-label="链接地址" @keydown.esc.prevent="closeLinkPopover" />
      <button type="submit">应用</button>
      <button v-if="isActive('link')" type="button" title="移除链接" aria-label="移除链接" @click="removeLink"><Link2Off :size="14" /></button>
    </form>
    <div v-if="taskReferenceOpen" ref="taskReferenceRef" class="rich-editor__task-reference" :style="taskReferenceStyle">
      <input ref="taskReferenceInput" v-model.trim="taskReferenceQuery" type="search" placeholder="搜索并引用任务" aria-label="搜索任务" @keydown.esc.prevent="taskReferenceOpen = false" />
      <button v-for="task in taskReferenceCandidates" :key="task.id" type="button" @mousedown.prevent @click="insertTaskReference(task)"><ListTodo :size="14" />{{ task.title }}</button>
      <small v-if="!taskReferenceCandidates.length">没有匹配任务</small>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import LinkExtension from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Highlight from '@tiptap/extension-highlight'
import UnderlineExtension from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details'
import { TableKit } from '@tiptap/extension-table'
import { AlignCenter, AlignLeft, Bold, ChevronDown, ChevronRight, Code2, Highlighter, ImagePlus, Italic, Link, Link2Off, List, ListChecks, ListOrdered, ListTodo, Maximize2, Minimize2, Minus, MoreHorizontal, PenLine, Quote, Redo2, Strikethrough, Table2, Type, Underline, Undo2, X } from 'lucide-vue-next'
import { importImageData, readImage, resolveHtmlImages, selectImage } from '@/services/platform'
import ImageLightbox from './ImageLightbox.vue'
import { useTaskStore } from '@/stores/task'

const AttachmentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-attachment-src': {
        default: null,
        parseHTML: element => element.getAttribute('data-attachment-src'),
        renderHTML: attributes => attributes['data-attachment-src'] ? { 'data-attachment-src': attributes['data-attachment-src'] } : {},
      },
    }
  },
})

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '添加备注…' },
  compact: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])
const isExpanded = ref(false)
const isFocusMode = ref(false)
const toolbarCollapsed = ref(false)
const moreMenuOpen = ref(false)
const blockMenuOpen = ref(false)
const linkPopoverOpen = ref(false)
const linkUrl = ref('')
const linkInput = ref(null)
const linkSelection = ref(null)
const taskReferenceOpen = ref(false)
const taskReferenceQuery = ref('')
const fileInput = ref(null)
const editorVersion = ref(0)
const lightboxVisible = ref(false)
const lightboxImages = ref([])
const lightboxIndex = ref(0)
const blockTriggerRef = ref(null)
const moreTriggerRef = ref(null)
const linkTriggerRef = ref(null)
const blockMenuRef = ref(null)
const moreMenuRef = ref(null)
const linkPopoverRef = ref(null)
const taskReferenceRef = ref(null)
const taskReferenceInput = ref(null)
const popoverPositionTick = ref(0)
const blockItems = [
  { value: 'paragraph', label: '正文', badge: 'T' },
  { value: 'heading-1', label: '标题 1', badge: 'H1' },
  { value: 'heading-2', label: '标题 2', badge: 'H2' },
  { value: 'heading-3', label: '标题 3', badge: 'H3' },
]
const taskStore = useTaskStore()
const taskReferenceCandidates = computed(() => {
  const query = taskReferenceQuery.value.toLocaleLowerCase()
  return taskStore.activeTasks.filter(task => task.id !== taskStore.selectedTaskId && task.title.toLocaleLowerCase().includes(query)).slice(0, 6)
})
const editorStats = computed(() => {
  editorVersion.value
  const text = editor.value?.getText({ blockSeparator: ' ' }).trim() || ''
  const characters = text.length
  const words = text ? text.split(/\s+/).length : 0
  return { characters, words, readingMinutes: Math.max(1, Math.ceil(words / 300)) }
})

const MENU_GAP = 6
const VIEWPORT_PADDING = 8

function anchorStyle(triggerEl, menuEl, { rightAlign = false, width = 156, height = null } = {}) {
  if (!triggerEl) return { visibility: 'hidden' }
  popoverPositionTick.value // 触发响应式更新
  const rect = triggerEl.getBoundingClientRect()
  const menuHeight = menuEl?.offsetHeight || height || 200
  const measuredWidth = menuEl?.offsetWidth || width
  const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP
  const flipUp = spaceBelow < menuHeight && rect.top - MENU_GAP >= menuHeight
  const y = flipUp ? rect.top - menuHeight - MENU_GAP : rect.bottom + MENU_GAP
  const x = rightAlign
    ? Math.max(VIEWPORT_PADDING, Math.min(rect.right - measuredWidth, window.innerWidth - measuredWidth - VIEWPORT_PADDING))
    : Math.max(VIEWPORT_PADDING, Math.min(rect.left, window.innerWidth - measuredWidth - VIEWPORT_PADDING))
  return {
    position: 'fixed',
    top: `${Math.max(VIEWPORT_PADDING, y)}px`,
    left: `${x}px`,
    zIndex: 2400,
    visibility: 'visible'
  }
}

const blockMenuStyle = computed(() => {
  if (!blockMenuOpen.value) return null
  popoverPositionTick.value
  return anchorStyle(blockTriggerRef.value, blockMenuRef.value, { rightAlign: false, width: 132 })
})
const moreMenuStyle = computed(() => {
  if (!moreMenuOpen.value) return null
  popoverPositionTick.value
  return anchorStyle(moreTriggerRef.value, moreMenuRef.value, { rightAlign: true, width: 156 })
})
const linkPopoverStyle = computed(() => {
  if (!linkPopoverOpen.value) return null
  popoverPositionTick.value
  return anchorStyle(linkTriggerRef.value, linkPopoverRef.value, { rightAlign: true, width: 300 })
})
const taskReferenceStyle = computed(() => {
  if (!taskReferenceOpen.value) return null
  popoverPositionTick.value
  return anchorStyle(moreTriggerRef.value, taskReferenceRef.value, { rightAlign: true, width: 280 })
})

function refreshPopoverPositions() {
  popoverPositionTick.value += 1
}

function openTaskReference() {
  moreMenuOpen.value = false
  taskReferenceOpen.value = true
  nextTick(() => taskReferenceInput.value?.focus())
}

function touchEditor() {
  editorVersion.value += 1
}

function hasEditorContent() {
  return Boolean(editor.value && !editor.value.isEmpty)
}

function focusEditor() {
  isExpanded.value = true
  nextTick(() => editor.value?.commands.focus('end'))
}

function openEditorControls() {
  toolbarCollapsed.value = false
  nextTick(() => editor.value?.commands.focus('end'))
}

function toggleFocusMode() {
  isFocusMode.value = !isFocusMode.value
  nextTick(() => editor.value?.commands.focus())
}

function closeFocusMode() {
  if (!isFocusMode.value) return
  isFocusMode.value = false
  nextTick(() => editor.value?.commands.focus())
}

function collectEditorImageUrls() {
  if (!editor.value) return []
  // 直接从 DOM 获取，确保 URL 匹配
  const editorEl = editor.value.view.dom
  return Array.from(editorEl.querySelectorAll('img'))
    .map(img => img.currentSrc || img.src)
    .filter(src => src)
}

function onEditorContentClick(e) {
  const taskLink = e.target.closest('a[href^="task://"]')
  if (taskLink) {
    e.preventDefault()
    taskStore.selectTask(taskLink.getAttribute('href').slice('task://'.length))
    return
  }
  const img = e.target.closest('img')
  if (!img || !img.src) return
  const urls = collectEditorImageUrls()
  const src = img.currentSrc || img.src
  const idx = urls.indexOf(src)
  if (idx >= 0) {
    lightboxImages.value = urls
    lightboxIndex.value = idx
  } else {
    lightboxImages.value = [src]
    lightboxIndex.value = 0
  }
  lightboxVisible.value = true
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

async function handleImageBlob(blob) {
  const dataUrl = await blobToDataUrl(blob)
  try {
    const attachment = await importImageData(dataUrl)
    if (attachment) return { src: dataUrl, 'data-attachment-src': `attachments/${attachment.relativePath}` }
  } catch (error) {
    console.error('[RichTextEditor] 图片保存失败:', error)
  }
  return { src: dataUrl }
}

async function insertImageBlob(blob) {
  if (!blob?.type?.startsWith('image/') || !editor.value) return
  const imageAttrs = await handleImageBlob(blob)
  editor.value.chain().focus().setImage(imageAttrs).run()
}

async function insertImageDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/') || !editor.value) return
  const response = await fetch(dataUrl)
  await insertImageBlob(await response.blob())
}

async function chooseImage() {
  try {
    const path = await selectImage()
    if (!path) {
      fileInput.value?.click()
      return
    }
    const dataUrl = await readImage(path)
    if (dataUrl) await insertImageDataUrl(dataUrl)
  } catch (error) {
    console.error('[RichTextEditor] 插入图片失败:', error)
  }
}

function onFileSelected(event) {
  for (const file of event.target.files || []) insertImageBlob(file)
  event.target.value = ''
}

function serializeEditorHtml(html) {
  if (!html) return ''
  const container = document.createElement('div')
  container.innerHTML = html
  container.querySelectorAll('img[data-attachment-src]').forEach((img) => {
    const attachmentSrc = img.getAttribute('data-attachment-src')
    if (isAttachmentPath(attachmentSrc)) {
      img.setAttribute('src', attachmentSrc)
      img.setAttribute('data-attachment-src', attachmentSrc)
    }
  })
  return container.innerHTML
}

function isAttachmentPath(value) {
  return typeof value === 'string' && (value.startsWith('attachments/') || value.startsWith('images/'))
}

async function resolveEditorHtml(html) {
  if (!html || (!html.includes('attachments/') && !html.includes('src="images/'))) return html
  return await resolveHtmlImages(html)
}

async function repairEmbeddedImages() {
  if (!editor.value) return
  const container = document.createElement('div')
  container.innerHTML = editor.value.getHTML()
  let changed = false
  for (const image of container.querySelectorAll('img')) {
    const previewSrc = image.getAttribute('src') || ''
    if (isAttachmentPath(image.getAttribute('data-attachment-src')) || !previewSrc.startsWith('data:image/')) continue
    try {
      const attachment = await importImageData(previewSrc)
      if (!attachment?.relativePath) continue
      image.setAttribute('data-attachment-src', `attachments/${attachment.relativePath}`)
      changed = true
    } catch (error) {
      console.error('[RichTextEditor] 修复历史图片引用失败:', error)
    }
  }
  if (changed && editor.value) {
    editor.value.commands.setContent(container.innerHTML, false)
    emit('update:modelValue', serializeEditorHtml(editor.value.getHTML()))
  }
}

function isActive(name, attributes) {
  editorVersion.value
  return Boolean(editor.value?.isActive(name, attributes))
}

function currentBlockType() {
  editorVersion.value
  if (editor.value?.isActive('heading', { level: 1 })) return 'heading-1'
  if (editor.value?.isActive('heading', { level: 2 })) return 'heading-2'
  if (editor.value?.isActive('heading', { level: 3 })) return 'heading-3'
  return 'paragraph'
}

function currentBlockLabel() {
  return blockItems.find(item => item.value === currentBlockType())?.label || '正文'
}

function setBlockType(value) {
  if (!editor.value) return
  const level = Number(value.replace('heading-', ''))
  const chain = editor.value.chain().focus()
  if (value === 'paragraph') chain.setParagraph().run()
  else chain.toggleHeading({ level }).run()
  blockMenuOpen.value = false
}

function toggleMark(name) {
  editor.value?.chain().focus()[`toggle${name[0].toUpperCase()}${name.slice(1)}`]().run()
}

function toggleList(name) {
  editor.value?.chain().focus()[`toggle${name[0].toUpperCase()}${name.slice(1)}`]().run()
}

function insertBlockquote() {
  editor.value?.chain().focus().toggleBlockquote().run()
  moreMenuOpen.value = false
}

function insertHorizontalRule() {
  editor.value?.chain().focus().setHorizontalRule().run()
  moreMenuOpen.value = false
}

function toggleCodeBlock() { editor.value?.chain().focus().toggleCodeBlock().run(); moreMenuOpen.value = false }
function insertTable() { editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); moreMenuOpen.value = false }
function insertDetails() { editor.value?.chain().focus().setDetails().run(); moreMenuOpen.value = false }
function setTextAlign(alignment) { editor.value?.chain().focus().setTextAlign(alignment).run(); moreMenuOpen.value = false }
function insertTaskReference(task) {
  editor.value?.chain().focus().insertContent(`<a href="task://${task.id}">🔗 ${task.title}</a>`).run()
  taskReferenceOpen.value = false
  taskReferenceQuery.value = ''
}

function openLinkPopover() {
  if (!editor.value) return
  linkSelection.value = editor.value.state.selection
  linkUrl.value = editor.value.getAttributes('link').href || ''
  linkPopoverOpen.value = true
  nextTick(() => {
    refreshPopoverPositions()
    linkInput.value?.focus()
  })
}

function closeLinkPopover() {
  linkPopoverOpen.value = false
  editor.value?.commands.focus()
}

function closeTransientMenus(event) {
  const target = event.target
  if (!(target instanceof Element)) return
  const insideTrigger = (el) => el && (el.contains(target) || target === el)
  if (!insideTrigger(blockTriggerRef.value) && !blockMenuRef.value?.contains(target)) blockMenuOpen.value = false
  if (!insideTrigger(moreTriggerRef.value) && !moreMenuRef.value?.contains(target) && !taskReferenceRef.value?.contains(target)) moreMenuOpen.value = false
  if (!insideTrigger(linkTriggerRef.value) && !linkPopoverRef.value?.contains(target)) linkPopoverOpen.value = false
  if (!insideTrigger(moreTriggerRef.value) && !taskReferenceRef.value?.contains(target)) taskReferenceOpen.value = false
}

function normalizeUrl(value) {
  const url = value.trim()
  return url && !/^[a-z][a-z\d+.-]*:/i.test(url) ? `https://${url}` : url
}

function applyLink() {
  const href = normalizeUrl(linkUrl.value)
  if (!href || !editor.value) return
  const chain = editor.value.chain().focus()
  if (linkSelection.value) chain.setTextSelection(linkSelection.value)
  chain.extendMarkRange('link').setLink({ href }).run()
  linkPopoverOpen.value = false
}

function removeLink() {
  if (!editor.value) return
  const chain = editor.value.chain().focus()
  if (linkSelection.value) chain.setTextSelection(linkSelection.value)
  chain.extendMarkRange('link').unsetLink().run()
  linkPopoverOpen.value = false
}

const slashItems = [
  { title: '正文', description: '普通段落文字', badge: 'T', keywords: '段落 正文 text', action: () => editor.value?.chain().focus().setParagraph().run() },
  { title: '标题 1', description: '大标题', badge: 'H1', keywords: '标题 heading h1', action: () => editor.value?.chain().focus().toggleHeading({ level: 1 }).run() },
  { title: '标题 2', description: '小节标题', badge: 'H2', keywords: '标题 heading h2', action: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run() },
  { title: '标题 3', description: '三级标题', badge: 'H3', keywords: '标题 heading h3', action: () => editor.value?.chain().focus().toggleHeading({ level: 3 }).run() },
  { title: '无序列表', description: '创建项目符号列表', badge: '•', keywords: '列表 bullet', action: () => editor.value?.chain().focus().toggleBulletList().run() },
  { title: '编号列表', description: '创建有序步骤', badge: '1.', keywords: '列表 ordered', action: () => editor.value?.chain().focus().toggleOrderedList().run() },
  { title: '待办列表', description: '创建可勾选事项', badge: '[]', keywords: '待办 checklist task', action: () => editor.value?.chain().focus().toggleTaskList().run() },
  { title: '引用', description: '突出一段引用内容', badge: '"', keywords: '引用 quote', action: insertBlockquote },
  { title: '分割线', description: '分隔不同内容', badge: '—', keywords: '分割线 divider', action: insertHorizontalRule },
  { title: '代码块', description: '插入多行代码或命令', badge: '</>', keywords: '代码 code command', action: toggleCodeBlock },
  { title: '表格', description: '插入 3 × 3 表格', badge: '▦', keywords: '表格 table', action: insertTable },
  { title: '折叠块', description: '插入可展开的详情内容', badge: '›', keywords: '折叠 详情 details', action: insertDetails },
  { title: '图片', description: '从本机插入图片', badge: '▧', keywords: '图片 image upload', action: chooseImage },
]

const SlashCommand = Extension.create({
  name: 'slashCommand',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        allowSpaces: false,
        items: ({ query }) => {
          const normalized = query.toLowerCase()
          return slashItems.filter(item => `${item.title} ${item.keywords}`.toLowerCase().includes(normalized)).slice(0, 5)
        },
        command: ({ editor: targetEditor, range, props: item }) => {
          targetEditor.chain().focus().deleteRange(range).run()
          item.action()
        },
        render: () => {
          let menu = null
          let activeIndex = 0
          let currentProps = null
          const updatePosition = (clientRect) => {
            const rect = clientRect?.()
            if (!rect || !menu) return
            const menuHeight = Math.min(248, window.innerHeight - 24)
            const top = rect.bottom + menuHeight + 8 <= window.innerHeight
              ? rect.bottom + 8
              : Math.max(12, rect.top - menuHeight - 8)
            menu.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 272))}px`
            menu.style.top = `${top}px`
          }
          const renderMenu = (props) => {
            currentProps = props
            activeIndex = Math.min(activeIndex, Math.max(props.items.length - 1, 0))
            menu.innerHTML = props.items.length ? '' : '<p class="slash-command-menu__empty">未找到匹配命令</p>'
            props.items.forEach((item, index) => {
              const button = document.createElement('button')
              button.type = 'button'
              button.className = index === activeIndex ? 'is-active' : ''
              const badge = document.createElement('span')
              badge.className = 'slash-command-menu__badge'
              badge.textContent = item.badge
              const copy = document.createElement('span')
              copy.className = 'slash-command-menu__copy'
              copy.innerHTML = `<strong>${item.title}</strong><small>${item.description}</small>`
              button.append(badge, copy)
              button.addEventListener('mousedown', (event) => {
                event.preventDefault()
                props.command(item)
              })
              menu.appendChild(button)
            })
            updatePosition(props.clientRect)
          }
          return {
            onStart: (props) => {
              menu = document.createElement('div')
              menu.className = 'slash-command-menu'
              menu.setAttribute('role', 'listbox')
              document.body.appendChild(menu)
              renderMenu(props)
            },
            onUpdate: renderMenu,
            onKeyDown: ({ event }) => {
              if (!currentProps?.items.length) return event.key === 'Escape'
              if (event.key === 'ArrowDown') activeIndex = (activeIndex + 1) % currentProps.items.length
              else if (event.key === 'ArrowUp') activeIndex = (activeIndex + currentProps.items.length - 1) % currentProps.items.length
              else if (event.key === 'Enter') {
                currentProps.command(currentProps.items[activeIndex])
                return true
              } else return event.key === 'Escape'
              renderMenu(currentProps)
              return true
            },
            onExit: () => menu?.remove(),
          }
        },
      },
    }
  },
  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })]
  },
})

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] }, horizontalRule: false, link: false }),
    AttachmentImage.configure({ inline: true, allowBase64: true }),
    LinkExtension.configure({ openOnClick: false, autolink: true, linkOnPaste: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
    Highlight.configure({ multicolor: true }),
    UnderlineExtension,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Details,
    DetailsSummary,
    DetailsContent,
    TableKit.configure({ table: { resizable: true } }),
    Placeholder.configure({ placeholder: props.placeholder }),
    TaskList,
    TaskItem.configure({ nested: true }),
    HorizontalRule,
    SlashCommand,
  ],
  editorProps: {
    attributes: { class: 'editor-inner' },
    handlePaste: (view, event) => {
      for (const item of event.clipboardData?.items || []) {
        if (!item.type.startsWith('image/')) continue
        event.preventDefault()
        insertImageBlob(item.getAsFile())
        return true
      }
      return false
    },
    handleDrop: (view, event) => {
      for (const file of event.dataTransfer?.files || []) {
        if (!file.type.startsWith('image/')) continue
        event.preventDefault()
        insertImageBlob(file)
        return true
      }
      return false
    },
  },
  onCreate: ({ editor: targetEditor }) => {
    isExpanded.value = !targetEditor.isEmpty
    toolbarCollapsed.value = props.compact && !targetEditor.isEmpty
    touchEditor()
  },
  onUpdate: ({ editor: targetEditor }) => {
    touchEditor()
    emit('update:modelValue', serializeEditorHtml(targetEditor.getHTML()))
  },
  onSelectionUpdate: touchEditor,
  onFocus: () => {
    isExpanded.value = true
    toolbarCollapsed.value = false
  },
  onBlur: () => {
    window.setTimeout(() => {
      if (!linkPopoverOpen.value && !hasEditorContent()) isExpanded.value = false
      if (!linkPopoverOpen.value && props.compact && hasEditorContent()) toolbarCollapsed.value = true
    }, 120)
  },
})

onMounted(async () => {
  document.addEventListener('pointerdown', closeTransientMenus, true)
  window.addEventListener('resize', refreshPopoverPositions)
  window.addEventListener('scroll', refreshPopoverPositions, true)
  const resolved = await resolveEditorHtml(props.modelValue)
  if (editor.value && resolved !== props.modelValue) editor.value.commands.setContent(resolved, false)
  await repairEmbeddedImages()
})

watch(() => props.modelValue, async (value) => {
  if (editor.value && value !== serializeEditorHtml(editor.value.getHTML())) {
    const resolved = await resolveEditorHtml(value)
    editor.value.commands.setContent(resolved, false)
    isExpanded.value = !editor.value.isEmpty
    toolbarCollapsed.value = props.compact && !editor.value.isEmpty
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeTransientMenus, true)
  window.removeEventListener('resize', refreshPopoverPositions)
  window.removeEventListener('scroll', refreshPopoverPositions, true)
  editor.value?.destroy()
})

defineExpose({ editor, insertImageBlob, insertImageDataUrl })
</script>
