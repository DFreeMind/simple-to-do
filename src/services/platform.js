import { invoke } from '@tauri-apps/api/core'
import {
  isPermissionGranted,
  requestPermission,
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

export async function setWindowCloseBehavior(behavior) {
  if (!isTauri()) return false
  return invoke('set_window_close_behavior', { behavior })
}

export async function getSystemIdleSeconds() {
  if (!isTauri()) return null
  try {
    const value = await invoke('get_system_idle_seconds')
    return Number.isFinite(Number(value)) ? Number(value) : null
  } catch (error) {
    console.warn('[Platform] 无法读取系统空闲时长:', error)
    return null
  }
}

export async function saveMigrationBackup(data) {
  try {
    if (isTauri()) return await invoke('save_migration_backup', { data })
    const key = `${STORAGE_KEY}:backup:${Date.now()}`
    localStorage.setItem(key, JSON.stringify(data))
    return key
  } catch (error) {
    throw new Error(formatPlatformError(error, '创建迁移备份失败'))
  }
}

export async function createDataBackup() {
  if (!isTauri()) throw new Error('当前环境不支持创建本机恢复点')
  try {
    return await invoke('create_data_backup')
  } catch (error) {
    throw new Error(formatPlatformError(error, '创建本机恢复点失败'))
  }
}

export async function listDataBackups() {
  if (!isTauri()) return []
  try {
    return await invoke('list_data_backups')
  } catch (error) {
    throw new Error(formatPlatformError(error, '读取恢复点失败'))
  }
}

export async function getDataBackupLocation() {
  if (!isTauri()) return ''
  try {
    return await invoke('data_backup_location')
  } catch (error) {
    throw new Error(formatPlatformError(error, '读取恢复点目录失败'))
  }
}

export async function openDataBackupLocation() {
  if (!isTauri()) throw new Error('当前环境不支持打开本机恢复点目录')
  try {
    return await invoke('open_data_backup_location')
  } catch (error) {
    throw new Error(formatPlatformError(error, '打开恢复点目录失败'))
  }
}

export async function openDataBackup(backupId) {
  if (!isTauri()) throw new Error('当前环境不支持打开本机恢复点')
  try {
    return await invoke('open_data_backup', { backupId })
  } catch (error) {
    throw new Error(formatPlatformError(error, '打开本机恢复点失败'))
  }
}

export async function deleteDataBackup(backupId) {
  if (!isTauri()) throw new Error('当前环境不支持删除本机恢复点')
  try {
    return await invoke('delete_data_backup', { backupId })
  } catch (error) {
    throw new Error(formatPlatformError(error, '删除本机恢复点失败'))
  }
}

export async function restoreDataBackup(backupId) {
  if (!isTauri()) throw new Error('当前环境不支持恢复本机数据')
  try {
    return await invoke('restore_data_backup', { backupId })
  } catch (error) {
    throw new Error(formatPlatformError(error, '恢复本机数据失败'))
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

export async function importProfileAvatar(filePath) {
  if (isTauri()) return invoke('import_profile_avatar', { filePath })
  return null
}

export async function cleanupProfileAvatars(currentRelativePath = null) {
  if (!isTauri()) return 0
  try {
    return await invoke('cleanup_profile_avatars', { currentRelativePath })
  } catch (error) {
    throw new Error(formatPlatformError(error, '清理旧头像失败'))
  }
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

export async function readProfileAvatar(relativePath) {
  if (isTauri()) return invoke('read_profile_avatar', { relativePath })
  return null
}

export async function scanStorageHealth() {
  if (isTauri()) return invoke('scan_storage_health')
  return { supported: false, orphanAttachments: [], quarantinedAttachments: [] }
}

export async function quarantineOrphanAttachments(relativePaths) {
  if (isTauri()) return invoke('quarantine_orphan_attachments', { relativePaths })
  return { affectedCount: 0, affectedBytes: 0 }
}

export async function readQuarantinedAttachment(itemId) {
  if (isTauri()) return invoke('read_quarantined_attachment', { itemId })
  return null
}

export async function restoreQuarantinedAttachments(itemIds) {
  if (isTauri()) return invoke('restore_quarantined_attachments', { itemIds })
  return { affectedCount: 0, affectedBytes: 0 }
}

export async function purgeQuarantinedAttachments(itemIds) {
  if (isTauri()) return invoke('purge_quarantined_attachments', { itemIds })
  return { affectedCount: 0, affectedBytes: 0 }
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

export async function sendTaskReminderNotification(task, settings = {}, options = {}) {
  if (!isTauri() || !task?.id) return { sent: false, reason: 'unsupported' }
  if (settings.reminderNotificationsEnabled === false || task.completed || task.deleted) {
    return { sent: false, reason: 'not-active' }
  }

  const granted = await ensureReminderNotificationPermission({ request: Boolean(options.requestPermission) })
  if (!granted) return { sent: false, reason: 'permission' }

  try {
    const title = options.catchUp ? '任务提醒（补发）' : '任务提醒'
    const body = options.catchUp ? `已到期：${task.title || '未命名任务'}` : (task.title || '未命名任务')

    // Windows 的通知插件不会把点击正文的事件回传给前端。原生 command
    // 成功发送时会在点击后恢复窗口，并通过 task-reminder:open 定位任务。
    try {
      const sentInteractively = await invoke('send_interactive_task_reminder', {
        taskId: task.id,
        title,
        body
      })
      if (sentInteractively) return { sent: true }
    } catch (error) {
      console.warn('[Platform] 可交互提醒不可用，改用普通系统通知:', error)
    }

    sendNotification({
      id: reminderNotificationId(task.id),
      title,
      body,
      group: REMINDER_GROUP,
      autoCancel: true,
      silent: settings.reminderSoundEnabled === false,
      extra: { taskId: task.id }
    })
    return { sent: true }
  } catch (error) {
    console.error('[Platform] 发送提醒失败:', error)
    return { sent: false, reason: 'send-failed', error }
  }
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

function formatPlatformError(error, fallback) {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (error.message) return error.message
  return fallback
}
