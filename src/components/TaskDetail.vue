<template>
  <aside class="task-detail" v-if="task">
    <!-- 顶部工具栏 -->
    <div class="detail-toolbar">
      <button class="toolbar-check" @click="store.completeTask(task.id)">
        <span class="check-circle" :class="{ checked: task.completed }">
          <span v-if="task.completed">✓</span>
        </span>
      </button>
      <div class="toolbar-sep"></div>
      <button class="toolbar-date" @click="showDatePicker = !showDatePicker">
        📅 日期与提醒
      </button>
      <select class="toolbar-select" :value="task.priority || 0" @change="updatePriority">
        <option :value="0">无优先级</option>
        <option :value="3">高优先级</option>
        <option :value="2">中优先级</option>
        <option :value="1">低优先级</option>
      </select>
      <div style="flex:1"></div>
      <!-- 模式切换 -->
      <button class="toolbar-mode" @click="toggleMode" :title="editorMode === 'detail' ? '切换为检查事项' : '切换为详情'">
        {{ editorMode === 'detail' ? '☰' : '📝' }}
      </button>
    </div>

    <!-- 标题 -->
    <div class="detail-title-row">
      <input
        class="detail-title-input"
        :value="task.title"
        @input="updateTitle"
        placeholder="任务标题"
      />
    </div>

    <!-- 日期选择器 -->
    <DatePicker
      v-if="showDatePicker"
      :task="task"
      @close="showDatePicker = false"
    />

    <div class="detail-tags-row">
      <span class="detail-tags-label">标签</span>
      <input
        class="detail-tags-input"
        :value="tagText"
        placeholder="用逗号分隔，例如 工作,重要"
        @change="updateTags"
      />
    </div>

    <!-- 详情模式：富文本编辑器 -->
    <div class="detail-editor-area" v-if="editorMode === 'detail'">
      <RichTextEditor
        ref="richTextEditor"
        v-model="editorContent"
        placeholder="开始输入..."
      />
      <!-- 格式菜单触发按钮 -->
      <div class="add-block-btn" @click="showFormatMenu">
        <span class="add-icon">+</span>
      </div>
    </div>

    <!-- 检查事项模式 -->
    <div class="detail-checklist-area" v-else>
      <div class="checklist-label">描述</div>
      <!-- 描述文本 -->
      <div class="checklist-desc">
        <textarea
          class="checklist-desc-input"
          :value="task.description"
          @input="updateDesc"
          placeholder="添加描述..."
          rows="1"
        ></textarea>
      </div>
      <!-- 子任务列表 -->
      <div
        v-for="sub in task.subtasks"
        :key="sub.id"
        class="checklist-item"
        :class="{ completed: sub.completed }"
      >
        <button
          class="sub-check"
          :class="{ checked: sub.completed }"
          @click.stop="store.toggleSubtask(task.id, sub.id)"
        >
          <span v-if="sub.completed">✓</span>
        </button>
        <span class="sub-text" contenteditable="true" @blur="onSubtaskEdit($event, sub)">{{ sub.title }}</span>
        <button class="sub-del" @click.stop="store.deleteSubtask(task.id, sub.id)">✕</button>
      </div>
      <!-- 添加子任务 -->
      <div class="checklist-add" v-if="!newSubtask">
        <button class="add-sub-trigger" @click="startAddSub">+ 添加子任务</button>
      </div>
      <div class="checklist-add editing" v-else>
        <button class="sub-check"></button>
        <input
          ref="subInput"
          v-model="newSubtask"
          class="sub-input"
          placeholder="子任务标题"
          @keydown.enter="confirmAddSub"
          @keydown.esc="cancelAddSub"
          @blur="confirmAddSub"
        />
      </div>
    </div>

    <!-- 图片附件（详情模式下显示） -->
    <div class="detail-images" v-if="editorMode === 'detail' && task.attachments?.length">
      <div v-for="att in task.attachments" :key="att.id" class="detail-img-item">
        <img :src="att.url" class="detail-img" @click.stop="previewImage(att)" />
        <button class="detail-img-del" @click.stop="removeAttachment(att.id)">✕</button>
      </div>
    </div>

    <!-- 评论区域 -->
    <div class="detail-comments" v-if="task.comments?.length">
      <div class="comments-header">评论 {{ task.comments.length }}</div>
      <div class="comment-list">
        <div v-for="c in task.comments" :key="c.id" class="comment-item">
          <div class="comment-avatar">🧑</div>
          <div class="comment-body">
            <div class="comment-meta">
              <span class="comment-name">{{ c.author }}</span>
              <span class="comment-time">{{ timeAgo(c.createdAt) }}</span>
            </div>
            <div class="comment-text">{{ c.text }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 评论输入 -->
    <div class="comment-input-bar">
      <input
        v-model="newComment"
        class="comment-input"
        placeholder="添加评论"
        @keydown.enter="addComment"
      />
      <button class="comment-action" @click="showEmojiPicker = !showEmojiPicker" title="表情">😊</button>
      <button class="comment-action" @click="triggerImageUpload" title="图片">🖼️</button>
    </div>

    <!-- 表情选择器弹窗 -->
    <Teleport to="body">
      <div v-if="showEmojiPicker" class="emoji-picker-popup" @click.stop>
        <div class="emoji-search">
          <input v-model="emojiSearch" placeholder="搜索" class="emoji-search-input" />
        </div>
        <div class="emoji-categories">
          <button v-for="cat in emojiCategories" :key="cat.name" class="emoji-cat-btn" :class="{ active: activeEmojiCat === cat.name }" @click="activeEmojiCat = cat.name">
            {{ cat.icon }}
          </button>
        </div>
        <div class="emoji-grid">
          <button v-for="em in currentEmojis" :key="em" class="emoji-item" @click="insertEmoji(em)">
            {{ em }}
          </button>
        </div>
      </div>
    </Teleport>

    <!-- 格式菜单 -->
    <FormatMenu
      :show="formatMenuVisible"
      :editor="richTextEditor?.editor"
      :position="formatMenuPos"
      @close="formatMenuVisible = false"
      @insertImage="triggerImageUpload"
    />

    <!-- 底部所属清单 -->
    <div class="detail-footer">
      <span class="footer-list-label">
        {{ currentList?.icon || '📋' }} {{ currentList?.name || '收集箱' }}
      </span>
      <div class="footer-right">
        <button class="footer-btn" title="格式" @click="showFormatMenuFromFooter">A</button>
        <button class="footer-btn" title="评论" @click="scrollToComment">💬</button>
        <button class="footer-btn" title="更多" @click="showMoreMenu = !showMoreMenu">⋯</button>
      </div>
    </div>

    <!-- 更多菜单 -->
    <Teleport to="body">
      <div v-if="showMoreMenu" class="detail-more-menu" @click.stop>
        <button class="more-menu-item" @click="handlePin">
          {{ task?.pinned ? '📍 取消置顶' : '📌 置顶' }}
        </button>
        <button class="more-menu-item" @click="handleCopyTask">📑 创建副本</button>
        <button class="more-menu-item" @click="handleCopyLink">🔗 复制链接</button>
        <div class="more-menu-sep"></div>
        <button class="more-menu-item more-menu-item--danger" @click="handleDeleteTask">🗑️ 删除任务</button>
      </div>
    </Teleport>

    <!-- 隐藏的文件上传 -->
    <input ref="fileInput" type="file" accept="image/*" multiple class="hidden-file-input" @change="onFileSelected" />

    <!-- 图片预览 -->
    <Teleport to="body">
      <div v-if="previewUrl" class="image-preview" @click="previewUrl = null">
        <img :src="previewUrl" />
      </div>
    </Teleport>
  </aside>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useTaskStore } from '@/stores/task'
import DatePicker from './DatePicker.vue'
import RichTextEditor from './RichTextEditor.vue'
import FormatMenu from './FormatMenu.vue'
import { readImage, selectImage } from '@/services/platform'

const store = useTaskStore()
const newSubtask = ref('')
const newComment = ref('')
const showDatePicker = ref(false)
const previewUrl = ref(null)
const showEmojiPicker = ref(false)
const emojiSearch = ref('')
const activeEmojiCat = ref('人物')
const editorMode = ref('detail')
const editorContent = ref('')
const richTextEditor = ref(null)
const subInput = ref(null)
const fileInput = ref(null)
const formatMenuVisible = ref(false)
const formatMenuPos = ref({ x: 0, y: 0 })
const showMoreMenu = ref(false)

const emojiCategories = [
  { name: '人物', icon: '😀' },
  { name: '动物', icon: '🐶' },
  { name: '食物', icon: '🍔' },
  { name: '旅行', icon: '✈️' },
  { name: '物品', icon: '💡' },
  { name: '符号', icon: '❤️' },
  { name: '旗帜', icon: '🏁' }
]

const emojiData = {
  '人物': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😏','😒','🙄','😬','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'],
  '动物': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔'],
  '食物': ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥝','🍅'],
  '旅行': ['✈️','🚀','🛸','🏠','🏡','🏢','🏣','🏥','🏦','🏨','🏩','🏰','🗼','🗽','⛪','🕌'],
  '物品': ['💡','🔦','💻','📱','⌨️','🖥️','🖨️','🖱️','💾','💿','📷','📹','🎥','📺','📻','⏱️'],
  '符号': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖'],
  '旗帜': ['🏁','🚩','🎌','🏴','🏳️','🇺🇸','🇬🇧','🇨🇳','🇯🇵','🇰🇷','🇫🇷','🇩🇪','🇮🇹','🇪🇸','🇷🇺','🇧🇷']
}

const currentEmojis = computed(() => emojiData[activeEmojiCat.value] || [])
const task = computed(() => store.selectedTask)
const currentList = computed(() => {
  if (!task.value) return null
  return store.lists.find(l => l.id === task.value.listId)
})

// 同步编辑器内容到任务
watch(editorContent, (val) => {
  if (task.value) {
    store.updateTask(task.value.id, { descriptionHtml: val })
  }
})

// 切换任务时同步编辑器内容
watch(task, (t) => {
  if (t) {
    editorContent.value = t.descriptionHtml || ''
    editorMode.value = t.editorMode || 'detail'
  }
}, { immediate: true })

function toggleMode() {
  editorMode.value = editorMode.value === 'detail' ? 'checklist' : 'detail'
  if (task.value) {
    store.updateTask(task.value.id, { editorMode: editorMode.value })
  }
}

function updateTitle(e) {
  store.updateTask(task.value.id, { title: e.target.value })
}

function updateDesc(e) {
  store.updateTask(task.value.id, { description: e.target.value })
  autoResize(e.target)
}

const tagText = computed(() => (task.value?.tags || []).join(', '))

function updatePriority(e) {
  store.updateTask(task.value.id, { priority: Number(e.target.value) })
}

function updateTags(e) {
  const tags = e.target.value
    .split(/[,，]/)
    .map(tag => tag.trim())
    .filter(Boolean)
  store.updateTask(task.value.id, { tags })
}

function autoResize(el) {
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

// 格式菜单
function showFormatMenu(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  formatMenuPos.value = { x: rect.left, y: rect.top - 320 }
  formatMenuVisible.value = true
}

function showFormatMenuFromFooter(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  formatMenuPos.value = { x: rect.left - 160, y: rect.top - 320 }
  formatMenuVisible.value = true
}

function scrollToComment() {
  // 滚动到评论输入框
  const commentInput = document.querySelector('.comment-input')
  if (commentInput) {
    commentInput.scrollIntoView({ behavior: 'smooth' })
    commentInput.focus()
  }
}

// 更多菜单
function handlePin() {
  if (task.value) {
    store.togglePin(task.value.id)
  }
  showMoreMenu.value = false
}

function handleCopyTask() {
  if (task.value) {
    store.copyTask(task.value.id)
  }
  showMoreMenu.value = false
}

function handleCopyLink() {
  if (task.value) {
    navigator.clipboard?.writeText(`todo://${task.value.id}`).then(() => {
      alert('链接已复制')
    })
  }
  showMoreMenu.value = false
}

function handleDeleteTask() {
  if (task.value) {
    store.deleteTask(task.value.id)
  }
  showMoreMenu.value = false
}

// 子任务
function startAddSub() {
  newSubtask.value = ' '
  nextTick(() => {
    subInput.value?.focus()
    subInput.value?.select()
  })
}

function confirmAddSub() {
  const title = newSubtask.value.trim()
  if (title) {
    store.addSubtask(task.value.id, title)
  }
  newSubtask.value = ''
}

function cancelAddSub() {
  newSubtask.value = ''
}

function onSubtaskEdit(e, sub) {
  const text = e.target.innerText.trim()
  if (text && text !== sub.title) {
    const idx = task.value.subtasks.findIndex(s => s.id === sub.id)
    if (idx !== -1) {
      task.value.subtasks[idx].title = text
    }
  }
}

// 评论
function addComment() {
  const text = newComment.value.trim()
  if (!text) return
  store.addComment(task.value.id, text)
  newComment.value = ''
}

function insertEmoji(em) {
  newComment.value += em
  showEmojiPicker.value = false
}

// 图片
function triggerImageUpload() {
  selectImage().then(path => {
    if (!path) {
      fileInput.value?.click()
      return
    }

    readImage(path).then(url => {
      if (url) store.addAttachment(task.value.id, path, url)
    })
  })
}

function onFileSelected(e) {
  const files = e.target.files
  if (!files || !files.length) return
  for (const file of files) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      store.addAttachment(task.value.id, file.name, ev.target.result)
    }
    reader.readAsDataURL(file)
  }
  e.target.value = ''
}

function removeAttachment(id) {
  if (!task.value) return
  task.value.attachments = task.value.attachments.filter(a => a.id !== id)
}

function previewImage(att) {
  previewUrl.value = att.url
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}小时前`
  const days = Math.floor(hrs / 24)
  return `${days}天前`
}

function closeMenus() {
  showMoreMenu.value = false
  formatMenuVisible.value = false
}

onMounted(() => document.addEventListener('click', closeMenus))
onBeforeUnmount(() => document.removeEventListener('click', closeMenus))
</script>
