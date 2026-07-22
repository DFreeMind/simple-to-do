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
          <dl class="data-safety-details">
            <div><dt>当前应用</dt><dd>v{{ appVersion }}</dd></div>
            <div><dt>下一步</dt><dd>{{ recoveryDescription }}</dd></div>
          </dl>
          <div class="data-safety-actions">
            <button class="small-btn" type="button" @click="store.loadData">重新尝试读取</button>
            <button
              v-if="!isDevelopment"
              class="small-btn"
              type="button"
              :disabled="isCheckingRecoveryUpdate"
              @click="checkRecoveryUpdate"
            >{{ recoveryUpdateAction }}</button>
            <button class="text-btn" type="button" @click="openRecoveryBackupLocation">打开备份目录</button>
            <button class="text-btn" type="button" @click="openReleasePage">打开下载页</button>
          </div>
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
        <Sidebar v-if="!store.settings.sidebarCollapsed" />
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
import { getVersion } from '@tauri-apps/api/app'
import { check } from '@tauri-apps/plugin-updater'
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
import { openDataBackupLocation, openReleasePage as openReleasePageInBrowser } from './services/platform'

const store = useTaskStore()
const appVersion = ref(__APP_VERSION__)
const isDevelopment = import.meta.env.DEV
const recoveryUpdateState = ref(isDevelopment ? 'development' : 'idle')
const recoveryUpdateError = ref('')
const recoveryUpdate = ref(null)

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
const isCheckingRecoveryUpdate = computed(() => ['checking', 'downloading', 'installing'].includes(recoveryUpdateState.value))
const recoveryUpdateAction = computed(() => ({
  idle: '检查并安装更新',
  checking: '正在检查…',
  available: '安装更新',
  downloading: '正在下载…',
  installing: '正在启动安装程序…',
  upToDate: '重新检查更新',
  error: '重试检查更新'
}[recoveryUpdateState.value] || '检查并安装更新'))
const recoveryDescription = computed(() => {
  if (recoveryUpdateState.value === 'available') return `发现可用版本 v${recoveryUpdate.value?.version || ''}，安装后可再次打开本机数据。`
  if (recoveryUpdateState.value === 'downloading') return '正在下载已签名的更新包，请勿关闭应用。'
  if (recoveryUpdateState.value === 'installing') return '下载完成，安装程序即将启动。'
  if (recoveryUpdateState.value === 'upToDate') return '当前已是最新稳定版；请保留数据和备份后联系支持。'
  if (recoveryUpdateState.value === 'error') return recoveryUpdateError.value
  if (isDevelopment) return '当前为开发环境，请使用新版正式安装包验证数据兼容性。'
  return '请先检查更新；旧版无法安全打开由新版创建的数据。'
})

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
  const sidebarWidth = 48 + (store.settings.sidebarCollapsed ? 0 : 286)
  return Math.max(
    DETAIL_WIDTH_MIN,
    Math.min(DETAIL_WIDTH_MAX, currentShellWidth - sidebarWidth - TASK_LIST_WIDTH_MIN - RESIZER_WIDTH)
  )
}

function syncShellWidth() {
  shellWidth.value = shellRef.value?.clientWidth || window.innerWidth
}

async function checkRecoveryUpdate() {
  if (recoveryUpdateState.value === 'available' && recoveryUpdate.value) {
    recoveryUpdateState.value = 'downloading'
    try {
      await recoveryUpdate.value.downloadAndInstall((event) => {
        if (event.event === 'Finished') recoveryUpdateState.value = 'installing'
      })
    } catch (error) {
      recoveryUpdateState.value = 'error'
      recoveryUpdateError.value = '更新下载或安装失败。请打开下载页获取最新安装包，数据不会被修改。'
    }
    return
  }

  recoveryUpdateState.value = 'checking'
  recoveryUpdateError.value = ''
  try {
    const update = await check({ timeout: 10000 })
    recoveryUpdate.value = update
    recoveryUpdateState.value = update ? 'available' : 'upToDate'
  } catch (error) {
    recoveryUpdateState.value = 'error'
    const message = String(error?.message || '')
    recoveryUpdateError.value = message.includes('404') || message.includes('latest.json')
      ? '自动更新清单暂不可用，请打开下载页安装最新版本。'
      : '暂时无法检查更新，请检查网络后重试，或打开下载页手动更新。'
  }
}

async function openRecoveryBackupLocation() {
  try {
    await openDataBackupLocation()
  } catch (error) {
    recoveryUpdateState.value = 'error'
    recoveryUpdateError.value = error?.message || '无法打开备份目录。'
  }
}

async function openReleasePage() {
  try {
    await openReleasePageInBrowser()
  } catch (error) {
    recoveryUpdateState.value = 'error'
    recoveryUpdateError.value = error?.message || '无法打开下载页，请稍后重试。'
  }
}

onMounted(async () => {
  if (window.__TAURI_INTERNALS__) {
    getVersion().then(version => { appVersion.value = version }).catch(() => {})
  }
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
