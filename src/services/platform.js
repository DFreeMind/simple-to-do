import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  cancel,
  isPermissionGranted,
  pending,
  requestPermission,
  Schedule,
  sendNotification
} from '@tauri-apps/plugin-notification'

const STORAGE_KEY = 'simple-to-do:data'
const WIDGET_STATE_KEY = 'simple-to-do:widget-state'
const REMINDER_GROUP = 'simple-to-do-reminders'

export const DEFAULT_WIDGET_STATE = {
  viewId: 'today',
  showCompleted: false,
  alwaysOnTop: true,
  opacity: 0.96,
  width: 340,
  height: 520,
  x: 100,
  y: 100
}

function isTauri() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__)
}

export async function loadData() {
  try {
    if (isTauri()) {
      return await invoke('load_data')
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    throw new Error(formatPlatformError(error, '读取本地数据失败'))
  }
}

export async function saveData(data) {
  try {
    if (isTauri()) {
      return await invoke('save_data', { data })
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    throw new Error(formatPlatformError(error, '保存本地数据失败'))
  }
}

export async function selectImage() {
  if (isTauri()) {
    return invoke('select_image')
  }
  return null
}

export async function readImage(filePath) {
  if (isTauri()) {
    return invoke('read_image', { filePath })
  }
  return null
}

export async function importImage(filePath) {
  if (isTauri()) {
    return invoke('import_image', { filePath })
  }
  return null
}

export async function importImageData(dataUrl) {
  if (isTauri()) {
    // 解析 data:image/png;base64,xxxxx
    const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!match) return null
    const [, mime, data] = match
    return invoke('import_image_data', { data, mime })
  }
  return null
}

export async function resolveHtmlImages(html) {
  if (isTauri()) {
    return invoke('resolve_html_images', { html })
  }
  return html
}

export async function readAttachment(relativePath) {
  if (isTauri()) {
    return invoke('read_attachment', { relativePath })
  }
  return null
}

export async function cleanupOrphanAttachments(data) {
  if (isTauri()) {
    return invoke('cleanup_orphan_attachments', { data })
  }
  return 0
}

export async function openWidgetWindow() {
  if (isTauri()) {
    return invoke('open_widget_window')
  }
  return false
}

export async function closeWidgetWindow() {
  if (isTauri()) {
    return invoke('close_widget_window')
  }
  window.close()
  return true
}

export async function loadWidgetWindowState() {
  if (isTauri()) {
    return normalizeWidgetState(await invoke('load_widget_window_state'))
  }

  try {
    const raw = localStorage.getItem(WIDGET_STATE_KEY)
    return normalizeWidgetState(raw ? JSON.parse(raw) : null)
  } catch (error) {
    return { ...DEFAULT_WIDGET_STATE }
  }
}

export async function saveWidgetWindowState(state) {
  const nextState = normalizeWidgetState(state)
  if (isTauri()) {
    return normalizeWidgetState(await invoke('save_widget_window_state', { state: nextState }))
  }

  localStorage.setItem(WIDGET_STATE_KEY, JSON.stringify(nextState))
  return nextState
}

export async function focusMainWindowWithTask(taskId = null) {
  if (isTauri()) {
    return invoke('focus_main_window_with_task', { taskId })
  }
  return false
}

export async function startCurrentWindowDrag() {
  if (!isTauri()) return false
  const currentWindow = getCurrentWindow()
  await currentWindow.startDragging()
  return true
}

export async function listenDataChanged(handler) {
  if (isTauri()) {
    const currentLabel = getCurrentWindow().label
    return listen('data-changed', (event) => {
      if (event.payload?.source === currentLabel) return
      handler(event)
    })
  }

  const listener = (event) => {
    if (event.key === STORAGE_KEY || event.type === 'simple-to-do:data-changed') handler(event)
  }
  window.addEventListener('storage', listener)
  window.addEventListener('simple-to-do:data-changed', listener)
  return () => {
    window.removeEventListener('storage', listener)
    window.removeEventListener('simple-to-do:data-changed', listener)
  }
}

export async function listenOpenTaskDetail(handler) {
  if (isTauri()) {
    return listen('open-task-detail', (event) => handler(event.payload))
  }
  return () => {}
}

export async function emitDataChanged() {
  if (isTauri()) {
    return emit('data-changed')
  }
  window.dispatchEvent(new Event('simple-to-do:data-changed'))
  return true
}

export function reminderNotificationId(taskId) {
  const source = String(taskId || '')
  let hash = 0x811c9dc5
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 1
}

export async function getReminderNotificationStatus() {
  if (!isTauri() || typeof window === 'undefined' || !window.Notification) {
    return { supported: false, granted: false, permission: 'unsupported' }
  }
  try {
    const granted = await isPermissionGranted()
    return { supported: true, granted, permission: granted ? 'granted' : window.Notification.permission }
  } catch (error) {
    return { supported: false, granted: false, permission: 'unsupported', error }
  }
}

export async function ensureReminderNotificationPermission({ request = false } = {}) {
  const status = await getReminderNotificationStatus()
  if (!status.supported || status.granted) return status.granted
  if (!request) return false
  const permission = await requestPermission()
  return permission === 'granted'
}

export async function cancelTaskReminderNotification(taskId) {
  if (!isTauri()) return false
  const id = reminderNotificationId(taskId)
  try {
    await cancel([id])
    return true
  } catch (error) {
    console.warn('[Platform] 取消提醒失败:', error)
    return false
  }
}

export async function scheduleTaskReminderNotification(task, settings = {}, options = {}) {
  if (!isTauri() || !task?.id) return { scheduled: false, reason: 'unsupported' }
  const id = reminderNotificationId(task.id)
  await cancelTaskReminderNotification(task.id)

  const enabled = settings.reminderNotificationsEnabled !== false
  const reminderAt = task.reminderAt ? new Date(task.reminderAt) : null
  if (!enabled || !reminderAt || Number.isNaN(reminderAt.getTime())) {
    return { scheduled: false, reason: 'disabled-or-empty' }
  }
  if (task.completed || task.deleted || reminderAt.getTime() <= Date.now()) {
    return { scheduled: false, reason: 'not-active' }
  }

  const granted = await ensureReminderNotificationPermission({ request: Boolean(options.requestPermission) })
  if (!granted) return { scheduled: false, reason: 'permission' }

  sendNotification({
    id,
    title: '任务提醒',
    body: task.title || '未命名任务',
    schedule: Schedule.at(reminderAt),
    group: REMINDER_GROUP,
    autoCancel: true,
    silent: settings.reminderSoundEnabled === false,
    extra: { taskId: task.id }
  })
  return { scheduled: true, id }
}

export async function syncTaskReminderNotifications(tasks = [], settings = {}, options = {}) {
  if (!isTauri()) return { synced: 0, supported: false }
  const results = []
  for (const task of tasks) {
    results.push(await scheduleTaskReminderNotification(task, settings, options))
  }
  return { synced: results.filter((item) => item.scheduled).length, supported: true }
}

export async function sendReminderTestNotification(settings = {}) {
  if (!isTauri()) return { sent: false, reason: 'unsupported' }
  const granted = await ensureReminderNotificationPermission({ request: true })
  if (!granted) return { sent: false, reason: 'permission' }
  sendNotification({
    id: reminderNotificationId('test-reminder'),
    title: '易简清单提醒',
    body: '提醒通知已可用。',
    group: REMINDER_GROUP,
    autoCancel: true,
    silent: settings.reminderSoundEnabled === false
  })
  return { sent: true }
}

export async function getPendingReminderNotifications() {
  if (!isTauri()) return []
  try {
    return await pending()
  } catch (error) {
    console.warn('[Platform] 读取待提醒列表失败:', error)
    return []
  }
}

function normalizeWidgetState(state = {}) {
  return {
    ...DEFAULT_WIDGET_STATE,
    ...(state || {}),
    viewId: typeof state?.viewId === 'string' && state.viewId.trim() ? state.viewId : DEFAULT_WIDGET_STATE.viewId,
    showCompleted: Boolean(state?.showCompleted),
    alwaysOnTop: state?.alwaysOnTop !== false,
    opacity: clampNumber(state?.opacity, 0.72, 1, DEFAULT_WIDGET_STATE.opacity),
    width: clampNumber(state?.width, 280, 720, DEFAULT_WIDGET_STATE.width),
    height: clampNumber(state?.height, 360, 900, DEFAULT_WIDGET_STATE.height),
    x: Number.isFinite(Number(state?.x)) ? Math.round(Number(state.x)) : DEFAULT_WIDGET_STATE.x,
    y: Number.isFinite(Number(state?.y)) ? Math.round(Number(state.y)) : DEFAULT_WIDGET_STATE.y
  }
}

function clampNumber(value, min, max, fallback) {
  const nextValue = Number(value)
  if (!Number.isFinite(nextValue)) return fallback
  return Math.max(min, Math.min(max, nextValue))
}

function formatPlatformError(error, fallback) {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (error.message) return error.message
  return fallback
}
