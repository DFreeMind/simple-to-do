<template>
  <FocusReminderWindow v-if="isFocusReminderWindow" />
  <RhythmReminderWindow v-else-if="isRhythmReminderWindow" />
  <FocusControllerWindow v-else-if="isFocusControllerWindow" />
  <RhythmControllerWindow v-else-if="isRhythmControllerWindow" />
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
        'app-shell--detail-closed': !detailLayoutOpen,
        'app-shell--task-list-locked': lockedTaskListWidth > 0,
        'app-shell--sidebar-closed': store.settings.sidebarCollapsed
      }"
      :style="{
        '--detail-w': layoutDetailWidth + 'px',
        '--task-list-w': lockedTaskListWidth + 'px'
      }"
    >
      <AppRail />
      <template v-if="store.settings.activeModule === 'tasks'">
        <Sidebar v-if="!store.settings.sidebarCollapsed" />
        <TaskList />
        <div
          v-if="detailLayoutOpen"
          class="col-resizer"
          @pointerdown="onResizeStart"
        />
        <TaskDetail v-if="detailLayoutOpen" @close="closeTaskDetail" />
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
      @complete="handleInAppRhythmAction('complete')"
      @snooze="handleInAppRhythmAction('snooze')"
      @skip="handleInAppRhythmAction('skip')"
      @dismiss="handleInAppRhythmAction('dismiss')"
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
import RhythmControllerWindow from './components/RhythmControllerWindow.vue'
import RhythmReminderPrompt from './components/RhythmReminderPrompt.vue'
import { useTaskStore } from './stores/task'
import { useTheme } from './composables/useTheme'
import { checkForUpdates as checkForUpdatesService, installUpdate as installUpdateService, restartUpdateApplication, updaterState } from './services/updater'
import {
  openDataBackupLocation,
  openReleasePage as openReleasePageInBrowser,
  resizeMainWindowForTaskDetail
} from './services/platform'

const store = useTaskStore()
const isFocusReminderWindow = typeof window !== 'undefined'
  && Boolean(window.__TAURI_INTERNALS__)
  && getCurrentWebviewWindow().label === 'focus-reminder'
const isRhythmReminderWindow = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__) && getCurrentWebviewWindow().label === 'rhythm-reminder'
const isFocusControllerWindow = typeof window !== 'undefined'
  && Boolean(window.__TAURI_INTERNALS__)
  && getCurrentWebviewWindow().label === 'focus-controller'
const isRhythmControllerWindow = typeof window !== 'undefined'
  && Boolean(window.__TAURI_INTERNALS__)
  && getCurrentWebviewWindow().label === 'rhythm-controller'
const isMainWindow = typeof window !== 'undefined'
  && Boolean(window.__TAURI_INTERNALS__)
  && getCurrentWebviewWindow().label === 'main'
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
// 详情偏好会跨模块保留，但只有清单模块需要为它扩展原生窗口。
// 让布局和窗口尺寸共同依赖这一个有效状态，避免切到时钟后留下空白区域。
const shouldShowTaskDetail = computed(() => (
  store.settings.activeModule === 'tasks' && store.settings.detailOpen
))
const shouldExpandTaskDetailWindow = computed(() => (
  shouldShowTaskDetail.value && store.settings.detailDisplayMode === 'window'
))
// 原生窗口先扩展/收起，详情列后显示/隐藏，避免两次网格重排造成视觉跳动。
const detailLayoutOpen = ref(!isMainWindow && shouldShowTaskDetail.value)
const lockedTaskListWidth = ref(0)
const shellRef = ref(null)
const shellWidth = ref(0)
let unlistenReminderAction
let unlistenFocusElapsed
let unlistenFocusReminderAction
let unlistenFocusNotificationOpen
let unlistenFocusNotificationError
let unlistenFocusControllerAction
let unlistenRhythmControllerAction
let unlistenRhythmElapsed
let unlistenRhythmReminderOpen
let unlistenRhythmReminderAction
let shellResizeObserver
let taskDetailWindowExpansion = null
let taskDetailWindowResizeVersion = 0
let taskDetailWindowOpening = false

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
function applyRhythmReminderAction(reminderId, action) {
  if (!reminderId) return false
  if (action === 'complete') return store.completeRhythmReminder(reminderId)
  if (action === 'snooze') return store.snoozeRhythmReminder(reminderId, 5)
  if (action === 'skip') return store.skipRhythmReminderToday(reminderId)
  if (action === 'dismiss') return store.dismissRhythmReminder(reminderId)
  return false
}

function handleInAppRhythmAction(action) {
  const reminderId = store.pendingRhythmReminder?.id
  applyRhythmReminderAction(reminderId, action)
}

function handleRhythmReminderAction(event) {
  const { reminderId, action } = event.payload || {}
  if (!applyRhythmReminderAction(reminderId, action)) return
  store.setClockView('rhythm')
}

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

function handleRhythmControllerAction(event) {
  const { action, reminderId, alwaysOnTop } = event.payload || {}
  if (action === 'set-always-on-top') {
    store.updateSettings({ rhythmControllerAlwaysOnTop: alwaysOnTop !== false })
    return
  }
  if (action === 'pause-all') store.pauseRhythmReminders()
  if (action === 'resume-all') store.resumeRhythmReminders()
  if (action === 'pause') store.pauseRhythmReminder(reminderId)
  if (action === 'resume') store.resumeRhythmReminder(reminderId)
  if (action === 'subtract-five') store.adjustRhythmReminderTiming(reminderId, -5)
  if (action === 'add-five') store.adjustRhythmReminderTiming(reminderId, 5)
  if (action === 'complete') store.completeRhythmReminder(reminderId)
  if (action === 'snooze') store.snoozeRhythmReminder(reminderId, 5)
  if (action === 'skip') store.skipRhythmReminderToday(reminderId)
  if (action === 'open-app') {
    store.setActiveModule('clock')
    store.setClockView('rhythm')
  }
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
const isCheckingRecoveryUpdate = computed(() => ['checking', 'downloading', 'verifying', 'installing', 'restarting'].includes(recoveryUpdateState.value))
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
  verifying: '正在校验签名…',
  installing: '正在完成安装…',
  installed: '重新启动应用',
  restarting: '正在重新启动…',
  upToDate: '重新检查更新',
  error: '重试检查更新'
}[recoveryUpdateState.value] || '检查并安装更新'))
const recoveryDescription = computed(() => {
  if (recoveryUpdateState.value === 'available') return `发现可用版本 v${updaterState.update?.version || ''}，安装后可再次打开本机数据。`
  if (recoveryUpdateState.value === 'downloading') return recoveryUpdateProgressText.value
  if (recoveryUpdateState.value === 'verifying') return '下载完成，正在校验更新包的签名。'
  if (recoveryUpdateState.value === 'installing') return '正在替换应用。macOS 可能会弹出管理员授权窗口。'
  if (recoveryUpdateState.value === 'installed') return updaterState.error || '更新已安装完成，请重新启动应用后继续。'
  if (recoveryUpdateState.value === 'restarting') return '更新已安装，正在关闭并重新打开应用。'
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
  if (typeof v !== 'number') return
  const nextWidth = clampDetailWidth(v)
  if (detailWidth.value === nextWidth) return
  detailWidth.value = nextWidth
  if (isMainWindow && shouldExpandTaskDetailWindow.value && taskDetailWindowExpansion) {
    nextTick(() => { void syncTaskDetailWindowPanelWidth() })
  }
})

function closeTaskDetail() {
  store.updateSettings({ detailOpen: false })
  const selectedTaskId = store.selectedTaskId
  nextTick(() => {
    const taskItem = Array.from(document.querySelectorAll('.task-item'))
      .find(item => item.dataset.taskId === selectedTaskId)
    taskItem?.focus()
  })
}

watch([shouldShowTaskDetail, shouldExpandTaskDetailWindow], ([shouldShow, shouldExpand]) => {
  // 应用内模式无需等待原生窗口操作，直接呈现或收起详情列。
  if (!shouldExpand) {
    detailLayoutOpen.value = shouldShow
    lockedTaskListWidth.value = 0
  }
  void syncTaskDetailWindowWidth(shouldExpand)
})

// 旧数据会把“详情默认开启”恢复为 true，而主窗口启动时不会渲染空详情列。
// 因此首次选中任务时，即使偏好值没有发生变化，也必须补走原生扩窗流程。
watch(() => store.selectedTaskId, (taskId) => {
  if (taskId && shouldShowTaskDetail.value && !shouldExpandTaskDetailWindow.value) {
    detailLayoutOpen.value = true
    return
  }
  if (taskId && shouldExpandTaskDetailWindow.value && !detailLayoutOpen.value) {
    void syncTaskDetailWindowWidth(true)
  }
})

async function syncTaskDetailWindowWidth(isOpen) {
  if (!isMainWindow) {
    detailLayoutOpen.value = shouldShowTaskDetail.value
    if (!shouldShowTaskDetail.value) lockedTaskListWidth.value = 0
    return
  }
  if (isOpen) {
    if (taskDetailWindowExpansion) {
      detailLayoutOpen.value = true
      return
    }
    if (taskDetailWindowOpening) return
    const requestVersion = ++taskDetailWindowResizeVersion
    taskDetailWindowOpening = true
    let reopenAfterCancelledOpening = false
    try {
      // 从应用内模式切换到扩展窗口时，先移除详情列，再按任务列表
      // 的稳定宽度扩窗，避免列表先被挤压、扩窗后又回弹。
      if (detailLayoutOpen.value) {
        detailLayoutOpen.value = false
        await nextTick()
      }
      if (!shouldExpandTaskDetailWindow.value) return
      const width = layoutDetailWidth.value + RESIZER_WIDTH
      lockedTaskListWidth.value = getTaskListWidth()
      const expanded = await resizeMainWindowForTaskDetail(width)

      // 详情在命令执行过程中被关闭时，立即回收这次刚增加的空间。
      if (requestVersion !== taskDetailWindowResizeVersion || !shouldExpandTaskDetailWindow.value) {
        if (expanded) await resizeMainWindowForTaskDetail(-width)
        detailLayoutOpen.value = shouldShowTaskDetail.value
        lockedTaskListWidth.value = 0
        // 原生扩窗尚未结束时可能已经离开又回到清单模块；此时前一次
        // watcher 会因 opening 防重入而提前返回，需要在 finally 后补一次打开。
        reopenAfterCancelledOpening = shouldExpandTaskDetailWindow.value
        return
      }
      if (expanded) {
        const outerSize = await getCurrentWebviewWindow().outerSize().catch(() => null)
        taskDetailWindowExpansion = outerSize
          ? { width, expectedOuterWidth: outerSize.width }
          : { width, expectedOuterWidth: null }
      } else {
        lockedTaskListWidth.value = 0
      }
      detailLayoutOpen.value = true
      return
    } finally {
      taskDetailWindowOpening = false
      if (reopenAfterCancelledOpening) void syncTaskDetailWindowWidth(true)
    }
  }

  const requestVersion = ++taskDetailWindowResizeVersion
  // 先将详情替换成锁宽的空白轨道，再收原生窗口；中间任务列表不会接管被收回的空间。
  detailLayoutOpen.value = shouldShowTaskDetail.value
  const expansion = taskDetailWindowExpansion
  if (!expansion) {
    detailLayoutOpen.value = shouldShowTaskDetail.value
    lockedTaskListWidth.value = 0
    return
  }

  const outerSize = await getCurrentWebviewWindow().outerSize().catch(() => null)
  // 仅在窗口仍保持自动展开后的尺寸时恢复，避免覆盖用户主动改变的窗口大小。
  if (
    expansion.expectedOuterWidth !== null
    && (!outerSize || Math.abs(outerSize.width - expansion.expectedOuterWidth) > 2)
  ) {
    taskDetailWindowExpansion = null
    detailLayoutOpen.value = shouldShowTaskDetail.value
    lockedTaskListWidth.value = 0
    return
  }
  // 用户快速重新打开详情时，保留已展开的窗口，不造成一次不必要的收缩与再展开。
  if (requestVersion !== taskDetailWindowResizeVersion || shouldExpandTaskDetailWindow.value) return
  const shrunk = await resizeMainWindowForTaskDetail(-expansion.width)
  taskDetailWindowExpansion = null
  if (shrunk && (requestVersion !== taskDetailWindowResizeVersion || shouldExpandTaskDetailWindow.value)) {
    void syncTaskDetailWindowWidth(true)
    return
  }
  detailLayoutOpen.value = shouldShowTaskDetail.value
  lockedTaskListWidth.value = 0
}

async function syncTaskDetailWindowPanelWidth() {
  if (!isMainWindow || !shouldExpandTaskDetailWindow.value || !taskDetailWindowExpansion) return
  const expansion = taskDetailWindowExpansion
  const nextWidth = layoutDetailWidth.value + RESIZER_WIDTH
  const delta = nextWidth - expansion.width
  if (!delta) return

  const outerSize = await getCurrentWebviewWindow().outerSize().catch(() => null)
  if (
    expansion.expectedOuterWidth !== null
    && (!outerSize || Math.abs(outerSize.width - expansion.expectedOuterWidth) > 2)
  ) return
  const resized = await resizeMainWindowForTaskDetail(delta)
  if (!resized) return
  const resizedOuterSize = await getCurrentWebviewWindow().outerSize().catch(() => null)
  taskDetailWindowExpansion = {
    width: nextWidth,
    expectedOuterWidth: resizedOuterSize?.width ?? null
  }
}

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
    if (saveWidth) {
      store.settings.detailWidth = detailWidth.value
      void syncTaskDetailWindowPanelWidth()
    }
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

function getTaskListWidth() {
  return Math.round(shellRef.value?.querySelector('.task-list')?.clientWidth || 0)
}

function syncShellWidth() {
  shellWidth.value = shellRef.value?.clientWidth || window.innerWidth
}

async function checkRecoveryUpdate() {
  if (updaterState.status === 'installed') {
    await restartUpdateApplication()
    return
  }
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
  if (isFocusReminderWindow || isRhythmReminderWindow || isFocusControllerWindow || isRhythmControllerWindow) return
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
    listen('rhythm-controller:action', handleRhythmControllerAction)
      .then(unlisten => { unlistenRhythmControllerAction = unlisten })
      .catch(error => console.warn('[App] 注册节律控制器操作失败:', error))
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
  unlistenRhythmControllerAction?.()
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
