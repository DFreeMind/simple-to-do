<template>
  <FocusReminderWindow v-if="isFocusReminderWindow" />
  <RhythmReminderWindow v-else-if="isRhythmReminderWindow" />
  <FocusControllerWindow v-else-if="isFocusControllerWindow" />
  <div
    v-else
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
    <FocusCelebration :celebration="store.focusCelebration" @dismiss="store.dismissFocusCelebration" @start-break="startBreakFromInApp" />
    <RhythmReminderPrompt
      :reminder="store.pendingRhythmReminder"
      @complete="store.completeRhythmReminder(store.pendingRhythmReminder?.id)"
      @snooze="store.snoozeRhythmReminder(store.pendingRhythmReminder?.id, 5)"
      @skip="store.skipRhythmReminderToday(store.pendingRhythmReminder?.id)"
      @dismiss="store.dismissRhythmReminder(store.pendingRhythmReminder?.id)"
    />

    <div
      v-if="store.notice"
      class="app-toast"
      :class="[
        `app-toast--${store.notice.type}`,
        { 'app-toast--with-action': store.notice.action }
      ]"
      role="status"
      aria-live="polite"
    >
      <span class="app-toast__message">{{ store.notice.message }}</span>
      <button
        v-if="store.notice.action"
        type="button"
        class="app-toast__action"
        @click="handleToastAction"
      >{{ store.notice.action.label }}</button>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getVersion } from '@tauri-apps/api/app'
import AppRail from './components/AppRail.vue'
import Sidebar from './components/Sidebar.vue'
import TaskList from './components/TaskList.vue'
import TaskDetail from './components/TaskDetail.vue'
import ClockSidebar from './components/ClockSidebar.vue'
import ClockWorkspace from './components/ClockWorkspace.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import HelpCenter from './components/HelpCenter.vue'
import FocusCelebration from './components/FocusCelebration.vue'
import FocusReminderWindow from './components/FocusReminderWindow.vue'
import RhythmReminderWindow from './components/RhythmReminderWindow.vue'
import FocusControllerWindow from './components/FocusControllerWindow.vue'
import RhythmReminderPrompt from './components/RhythmReminderPrompt.vue'
import { useTaskStore } from './stores/task'
import { useTheme } from './composables/useTheme'
import { checkForUpdates as checkForUpdatesService, installUpdate as installUpdateService, updaterState } from './services/updater'
import { openDataBackupLocation, openReleasePage as openReleasePageInBrowser } from './services/platform'

const store = useTaskStore()
const isFocusReminderWindow = typeof window !== 'undefined'
  && Boolean(window.__TAURI_INTERNALS__)
  && getCurrentWebviewWindow().label === 'focus-reminder'
const isRhythmReminderWindow = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__) && getCurrentWebviewWindow().label === 'rhythm-reminder'
const isFocusControllerWindow = typeof window !== 'undefined'
  && Boolean(window.__TAURI_INTERNALS__)
  && getCurrentWebviewWindow().label === 'focus-controller'
const appVersion = ref(__APP_VERSION__)
const isDevelopment = import.meta.env.DEV

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
let unlistenFocusElapsed
let unlistenFocusReminderAction
let unlistenFocusNotificationOpen
let unlistenFocusNotificationError
let unlistenFocusControllerAction
let unlistenRhythmElapsed
let unlistenRhythmReminderOpen
let unlistenRhythmReminderAction
let shellResizeObserver

function handleFocusElapsed(event) {
  const sessionId = event.payload?.sessionId
  if (!sessionId) return
  store.completeFocusSessionFromNative(sessionId, event.payload?.delivery)
}

function openFocusCompletion() {
  store.setClockView('focus')
}

function handleFocusReminderAction(event) {
  const sessionId = event.payload?.sessionId
  const action = event.payload?.action
  if (sessionId) store.completeFocusSessionFromNative(sessionId)
  store.dismissFocusCelebration()
  if (action === 'start-break') store.startPendingBreak()
  if (action === 'open-app') store.setClockView('focus')
}

function handleRhythmElapsed(event) {
  const reminderId = event.payload?.reminderId
  if (!reminderId) return
  store.handleRhythmElapsedFromNative(reminderId, event.payload?.dueAt)
}

function openRhythmReminder(event) {
  const reminderId = event.payload?.reminderId
  const reminder = store.rhythmReminders.find(item => item.id === reminderId && item.enabled && item.pendingSince)
  if (!reminder) return
  store.setClockView('rhythm')
}
function handleRhythmReminderAction(event) { const { reminderId, action } = event.payload || {}; if (!reminderId) return; store[action === 'complete' ? 'completeRhythmReminder' : action === 'snooze' ? 'snoozeRhythmReminder' : 'skipRhythmReminderToday']?.(reminderId, action === 'snooze' ? 5 : undefined); store.setClockView('rhythm') }

function handleFocusControllerAction(event) {
  const { action, sessionId, alwaysOnTop, style } = event.payload || {}
  if (action === 'set-always-on-top') {
    store.updateSettings({ focusControllerAlwaysOnTop: alwaysOnTop !== false })
    return
  }
  if (action === 'set-style') {
    store.updateSettings({ focusControllerStyle: style })
    return
  }
  if (!sessionId || store.activeFocusSession?.id !== sessionId) return
  if (action === 'pause') store.pauseFocus()
  if (action === 'resume') store.resumeFocus()
  if (action === 'subtract-five') store.adjustFocusDuration(-5 * 60)
  if (action === 'add-five') store.adjustFocusDuration(5 * 60)
  if (action === 'finish') store.finishFocus('completed')
}

function reportFocusNotificationError(event) {
  const message = event.payload?.message || '系统没有接受这次专注完成提醒'
  console.error('[App] 专注完成系统提醒失败:', message)
  store.showNotice('系统提醒发送失败，请检查系统通知设置', 'error')
}

function startBreakFromInApp() {
  store.dismissFocusCelebration()
  store.startPendingBreak()
}

const layoutDetailWidth = computed(() => clampDetailWidth(detailWidth.value, getDetailMaxWidth()))
const isCheckingRecoveryUpdate = computed(() => ['checking', 'downloading', 'installing'].includes(recoveryUpdateState.value))
const recoveryUpdateState = computed(() => {
  if (isDevelopment) return 'development'
  // 恢复页必须能安装最新版，跳过记录不适用于该场景（force 检查不会进入 skipped）。
  if (updaterState.status === 'skipped' || updaterState.status === 'unsupported') return 'error'
  return updaterState.status
})
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
  if (recoveryUpdateState.value === 'available') return `发现可用版本 v${updaterState.update?.version || ''}，安装后可再次打开本机数据。`
  if (recoveryUpdateState.value === 'downloading') return recoveryUpdateProgressText.value
  if (recoveryUpdateState.value === 'installing') return '下载完成，应用将自动重新打开并完成安装。'
  if (recoveryUpdateState.value === 'upToDate') return '当前已是最新稳定版；请保留数据和备份后联系支持。'
  if (recoveryUpdateState.value === 'error') return updaterState.error
  if (isDevelopment) return '当前为开发环境，请使用新版正式安装包验证数据兼容性。'
  return '请先检查更新；旧版无法安全打开由新版创建的数据。'
})
const recoveryUpdateProgressText = computed(() => {
  const { downloaded, total } = updaterState.progress
  if (!total) return '正在下载已签名的更新包，请勿关闭应用。'
  return `正在下载 ${Math.min(100, Math.round(downloaded / total * 100))}%，请勿关闭应用。`
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
  if (updaterState.status === 'available' && updaterState.update) {
    await installUpdateService()
    return
  }
  // force：恢复页必须能安装最新版，不受「跳过此版本」影响。
  await checkForUpdatesService({ force: true })
}

async function openRecoveryBackupLocation() {
  try {
    await openDataBackupLocation()
  } catch (error) {
    updaterState.status = 'error'
    updaterState.error = error?.message || '无法打开备份目录。'
  }
}

async function openReleasePage() {
  try {
    await openReleasePageInBrowser()
  } catch (error) {
    updaterState.status = 'error'
    updaterState.error = error?.message || '无法打开下载页，请稍后重试。'
  }
}

onMounted(async () => {
  if (isFocusReminderWindow || isRhythmReminderWindow || isFocusControllerWindow) return
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
    listen('focus-timer:elapsed', handleFocusElapsed)
      .then(unlisten => { unlistenFocusElapsed = unlisten })
      .catch(error => console.warn('[App] 注册专注计时完成事件失败:', error))
    listen('focus-reminder:action', handleFocusReminderAction)
      .then(unlisten => { unlistenFocusReminderAction = unlisten })
      .catch(error => console.warn('[App] 注册专注提醒操作失败:', error))
    listen('focus-notification:open', openFocusCompletion)
      .then(unlisten => { unlistenFocusNotificationOpen = unlisten })
      .catch(error => console.warn('[App] 注册专注通知点击事件失败:', error))
    listen('focus-notification:error', reportFocusNotificationError)
      .then(unlisten => { unlistenFocusNotificationError = unlisten })
      .catch(error => console.warn('[App] 注册专注通知错误事件失败:', error))
    listen('rhythm-reminder:open', openRhythmReminder)
      .then(unlisten => { unlistenRhythmReminderOpen = unlisten })
      .catch(error => console.warn('[App] 注册节律通知点击事件失败:', error))
    listen('rhythm-reminder:action', handleRhythmReminderAction).then(unlisten => { unlistenRhythmReminderAction = unlisten })
    listen('rhythm-timer:elapsed', handleRhythmElapsed)
      .then(unlisten => { unlistenRhythmElapsed = unlisten })
      .catch(error => console.warn('[App] 注册节律到时事件失败:', error))
    listen('focus-controller:action', handleFocusControllerAction)
      .then(unlisten => { unlistenFocusControllerAction = unlisten })
      .catch(error => console.warn('[App] 注册专注控制器操作失败:', error))
  }
  store.loadData()
  // 主窗口启动后静默检查更新：发现新版本在设置面板「关于与更新」显示角标，不打扰当前操作。
  if (!isDevelopment && window.__TAURI_INTERNALS__) {
    checkForUpdatesService({ skippedVersion: store.settings.skippedUpdateVersion, silent: true })
  }
})

onBeforeUnmount(() => {
  unlistenReminderAction?.()
  unlistenFocusElapsed?.()
  unlistenFocusReminderAction?.()
  unlistenFocusNotificationOpen?.()
  unlistenFocusNotificationError?.()
  unlistenFocusControllerAction?.()
  unlistenRhythmElapsed?.()
  unlistenRhythmReminderOpen?.()
  unlistenRhythmReminderAction?.()
  shellResizeObserver?.disconnect()
})

watch(() => store.notice?.id, (id) => {
  if (!id) return
  // 带 action 的提示条延长停留时间，给用户足够的撤销窗口
  const ttl = store.notice?.action ? 7000 : 3200
  window.setTimeout(() => {
    if (store.notice?.id === id) store.clearNotice()
  }, ttl)
})

function handleToastAction() {
  const action = store.notice?.action
  if (!action) return
  // 先清掉提示再执行回调，避免回调里 showNotice 把当前 action 提示覆盖
  const callback = action.onClick
  store.clearNotice()
  if (typeof callback === 'function') {
    try { callback() } catch (error) { console.error('[App] notice action 回调执行失败:', error) }
  }
}
</script>
