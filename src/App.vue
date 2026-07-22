<template>
  <div
    class="app"
    :class="{ 'app--theme-backgrounds': store.settings.themeBackgrounds }"
    :data-theme="store.settings.theme"
    :data-density="store.settings.density"
  >
    <main v-if="store.dataLoadState !== 'ready'" class="data-safety-screen" aria-live="polite">
      <section class="data-safety-card">
        <template v-if="store.dataLoadState === 'loading'">
          <p class="eyebrow">正在保护本地数据</p>
          <h1>正在加载清单</h1>
          <p>请稍候，应用正在验证本机数据库。</p>
        </template>
        <template v-else>
          <p class="eyebrow">本地数据未打开</p>
          <h1>为保护数据，应用没有加载空白清单</h1>
          <p>{{ store.dataLoadError || '本机数据库暂时无法读取。请重试；若仍失败，请保留应用数据目录并联系支持。' }}</p>
          <button class="small-btn" type="button" @click="store.loadData">重新尝试读取</button>
        </template>
      </section>
    </main>
    <template v-else>
    <div
      ref="shellRef"
      class="app-shell"
      :class="{
        'app-shell--clock': store.settings.activeModule === 'clock',
        'app-shell--detail-closed': !store.settings.detailOpen,
        'app-shell--sidebar-closed': store.settings.sidebarCollapsed
      }"
      :style="{ '--detail-w': layoutDetailWidth + 'px' }"
    >
      <AppRail />
      <template v-if="store.settings.activeModule === 'tasks'">
        <Sidebar />
        <TaskList />
        <div
          v-if="store.settings.detailOpen"
          class="col-resizer"
          @pointerdown="onResizeStart"
        />
        <TaskDetail v-if="store.settings.detailOpen" />
      </template>
      <template v-else>
        <ClockSidebar v-if="!store.settings.sidebarCollapsed" />
        <ClockWorkspace />
      </template>
    </div>

    <SettingsPanel />
    <HelpCenter />

    <div
      v-if="store.notice"
      class="app-toast"
      :class="`app-toast--${store.notice.type}`"
      role="status"
      aria-live="polite"
    >
      {{ store.notice.message }}
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { listen } from '@tauri-apps/api/event'
import AppRail from './components/AppRail.vue'
import Sidebar from './components/Sidebar.vue'
import TaskList from './components/TaskList.vue'
import TaskDetail from './components/TaskDetail.vue'
import ClockSidebar from './components/ClockSidebar.vue'
import ClockWorkspace from './components/ClockWorkspace.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import HelpCenter from './components/HelpCenter.vue'
import { useTaskStore } from './stores/task'
import { useTheme } from './composables/useTheme'

const store = useTaskStore()

// 动态计算主题派生色变量，兼容不支持 color-mix 内 var() 引用的 WebView
const themeRef = computed(() => store.settings.theme)
useTheme(themeRef)

const DETAIL_WIDTH_MIN = 320
const DETAIL_WIDTH_MAX = 800
const TASK_LIST_WIDTH_MIN = 300
const RESIZER_WIDTH = 12

const detailWidth = ref(store.settings.detailWidth || 380)
const shellRef = ref(null)
const shellWidth = ref(0)
let unlistenReminderAction
let shellResizeObserver

const layoutDetailWidth = computed(() => clampDetailWidth(detailWidth.value, getDetailMaxWidth()))

function openReminderTask(event) {
  const taskId = event.payload?.taskId
  const task = store.tasks.find(item => item.id === taskId && !item.deleted)
  if (!task) return

  store.settingsOpen = false
  store.helpCenterOpen = false
  store.setView(task.listId)
  store.selectTask(task.id)
}

watch(() => store.settings.detailWidth, (v) => {
  if (typeof v === 'number') detailWidth.value = clampDetailWidth(v)
})

function onResizeStart(e) {
  const startX = e.clientX
  const startWidth = layoutDetailWidth.value
  const maxDetail = getDetailMaxWidth()
  const target = e.currentTarget

  document.body.classList.add('is-resizing')
  target.setPointerCapture(e.pointerId)

  function onMove(ev) {
    const delta = startX - ev.clientX
    const newWidth = clampDetailWidth(startWidth + delta, maxDetail)
    detailWidth.value = newWidth
  }

  function cleanup(saveWidth = false) {
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
    target.removeEventListener('pointercancel', onCancel)
    target.removeEventListener('lostpointercapture', onCancel)
    if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId)
    document.body.classList.remove('is-resizing')
    if (saveWidth) store.settings.detailWidth = detailWidth.value
  }

  function onUp() {
    cleanup(true)
  }

  function onCancel() {
    cleanup()
  }

  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
  target.addEventListener('pointercancel', onCancel)
  target.addEventListener('lostpointercapture', onCancel)
}

function clampDetailWidth(value, max = DETAIL_WIDTH_MAX) {
  return Math.max(DETAIL_WIDTH_MIN, Math.min(max, value))
}

function getDetailMaxWidth() {
  const currentShellWidth = shellWidth.value || shellRef.value?.clientWidth || window.innerWidth
  const sidebarWidth = 48 + (store.settings.sidebarCollapsed ? 56 : 286)
  return Math.max(
    DETAIL_WIDTH_MIN,
    Math.min(DETAIL_WIDTH_MAX, currentShellWidth - sidebarWidth - TASK_LIST_WIDTH_MIN - RESIZER_WIDTH)
  )
}

function syncShellWidth() {
  shellWidth.value = shellRef.value?.clientWidth || window.innerWidth
}

onMounted(async () => {
  await nextTick()
  syncShellWidth()
  shellResizeObserver = new ResizeObserver(syncShellWidth)
  if (shellRef.value) shellResizeObserver.observe(shellRef.value)
  if (window.__TAURI_INTERNALS__) {
    listen('task-reminder:open', openReminderTask)
      .then(unlisten => { unlistenReminderAction = unlisten })
      .catch(error => console.warn('[App] 注册提醒点击事件失败:', error))
  }
  store.loadData()
})

onBeforeUnmount(() => {
  unlistenReminderAction?.()
  shellResizeObserver?.disconnect()
})

watch(() => store.notice?.id, (id) => {
  if (!id) return
  window.setTimeout(() => {
    if (store.notice?.id === id) store.clearNotice()
  }, 3200)
})
</script>
