import { invoke } from '@tauri-apps/api/core'
import {
  cancel,
  isPermissionGranted,
  pending,
  requestPermission,
  Schedule,
  sendNotification
} from '@tauri-apps/plugin-notification'

const STORAGE_KEY = 'simple-to-do:data'
const REMINDER_GROUP = 'simple-to-do-reminders'

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

function formatPlatformError(error, fallback) {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (error.message) return error.message
  return fallback
}
