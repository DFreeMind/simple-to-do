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

function isMacOS() {
  return typeof navigator !== 'undefined' && /Macintosh|Mac OS X/.test(navigator.userAgent)
}

async function sendNativeNotification(payload) {
  if (isTauri() && isMacOS()) {
    await invoke('send_macos_notification', {
      title: payload.title,
      body: payload.body,
      soundEnabled: payload.silent !== true
    })
    return
  }
  sendNotification(payload)
}

export function hasNativeFocusScheduler() {
  return isTauri()
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

// 导出文件：Tauri 下弹原生"另存为"对话框并写入用户选择的位置；
// 浏览器环境回退为 blob 下载。
export async function saveTextFile(defaultName, content, fileKind = 'text') {
  const mime = fileKind === 'csv' ? 'text/csv;charset=utf-8' : fileKind === 'markdown' ? 'text/markdown;charset=utf-8' : fileKind === 'html' ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8'
  if (!isTauri()) {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    return defaultName
  }
  return invoke('save_text_file', { defaultName, content, fileKind })
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

function buildWebStorageMock() {
  // Web/演示环境下没有真实附件目录，返回一份可演示的扫描结果，
  // 让"空间管理"页和"数据与安全"页能展示完整结构和文案。
  const orphanAttachments = [
    { id: 'web-orphan-1', relativePath: 'attachments/2024-04/old-photo.png', name: '旧版设计稿.png', sizeBytes: 1840521, kind: 'image', addedAt: '2024-04-12T09:24:00.000Z' },
    { id: 'web-orphan-2', relativePath: 'attachments/2024-05/draft.md', name: '早期草稿.md', sizeBytes: 18421, kind: 'file', addedAt: '2024-05-30T17:11:00.000Z' }
  ]
  const quarantinedAttachments = [
    { id: 'web-quarantine-1', relativePath: 'attachments/2024-06/note.txt', name: '旧笔记.txt', sizeBytes: 6291, kind: 'file', quarantinedAt: '2024-06-21T15:00:00.000Z' }
  ]
  const totalBytes = 12_847_503
  const attachmentBytes = orphanAttachments.reduce((sum, item) => sum + item.sizeBytes, 0)
    + quarantinedAttachments.reduce((sum, item) => sum + item.sizeBytes, 0)
    + 9_822_270
  return {
    supported: true,
    totalBytes,
    attachmentBytes,
    orphanAttachments,
    quarantinedAttachments,
    orphanBytes: orphanAttachments.reduce((sum, item) => sum + item.sizeBytes, 0),
    quarantinedBytes: quarantinedAttachments.reduce((sum, item) => sum + item.sizeBytes, 0),
    orphanImageBytes: orphanAttachments.filter(item => item.kind === 'image').reduce((sum, item) => sum + item.sizeBytes, 0),
    orphanFileBytes: orphanAttachments.filter(item => item.kind !== 'image').reduce((sum, item) => sum + item.sizeBytes, 0),
    databaseBytes: 1_823_410,
    referencedImageBytes: 6_204_512,
    referencedFileBytes: 1_443_120,
    profileBytes: 412_870,
    backupBytes: 2_148_006,
    otherBytes: 102_502,
    missingReferences: []
  }
}

export async function scanStorageHealth() {
  if (isTauri()) return invoke('scan_storage_health')
  return buildWebStorageMock()
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
  if (!isTauri()) {
    return { supported: false, granted: false, permission: 'unsupported' }
  }
  // notify-rust 在部分 macOS 环境会从后台线程初始化
  // UNUserNotificationCenter，触发系统断言并终止整个应用。macOS 改由
  // 原生命令发送通知，因而不再触碰该插件的权限查询路径。
  if (isMacOS()) return { supported: true, granted: true, permission: 'granted' }
  try {
    const granted = await isPermissionGranted()
    return { supported: true, granted, permission: granted ? 'granted' : 'denied' }
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

    await sendNativeNotification({
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

export async function openReleasePage() {
  if (!isTauri()) {
    window.open('https://github.com/DFreeMind/simple-to-do/releases/latest', '_blank', 'noopener,noreferrer')
    return true
  }
  try {
    return await invoke('open_release_page')
  } catch (error) {
    throw new Error(formatPlatformError(error, '打开下载页失败'))
  }
}

export async function sendRhythmReminderNotification(reminder, settings = {}) {
  if (!isTauri() || !reminder?.id || settings.reminderNotificationsEnabled === false) {
    return { sent: false, reason: 'unsupported' }
  }
  const granted = await ensureReminderNotificationPermission()
  if (!granted) return { sent: false, reason: 'permission' }
  try {
    await sendNativeNotification({
      id: reminderNotificationId(`rhythm-${reminder.id}`),
      title: reminder.title || '易简节律提醒',
      body: reminder.message || '该给自己一点短暂的调整时间了。',
      group: REMINDER_GROUP,
      autoCancel: true,
      silent: settings.reminderSoundEnabled === false
    })
    return { sent: true }
  } catch (error) {
    console.error('[Platform] 发送节律提醒失败:', error)
    return { sent: false, reason: 'send-failed', error }
  }
}

export async function scheduleFocusCompletion(schedule, settings = {}) {
  if (!isTauri()) return false
  try {
    return await invoke('schedule_focus_completion', {
      schedule: {
        ...schedule,
        notificationEnabled: settings.focusCompletionNotificationsEnabled !== false,
        soundEnabled: settings.focusCompletionSoundEnabled !== false,
        alwaysOnTop: settings.focusReminderAlwaysOnTop !== false
      }
    })
  } catch (error) {
    console.error('[Platform] 调度专注完成提醒失败:', error)
    return false
  }
}

export async function cancelFocusCompletion(sessionId = null) {
  if (!isTauri()) return false
  try {
    return await invoke('cancel_focus_completion', { sessionId })
  } catch (error) {
    console.warn('[Platform] 取消专注完成提醒失败:', error)
    return false
  }
}

export async function syncFocusController(payload = null) {
  if (!isTauri()) return false
  try {
    return await invoke('sync_focus_controller', { payload })
  } catch (error) {
    console.warn('[Platform] 同步专注控制器失败:', error)
    return false
  }
}

export async function openFocusController() {
  if (!isTauri()) return false
  return invoke('open_focus_controller')
}

export async function getFocusControllerPayload() {
  if (!isTauri()) return null
  return invoke('get_focus_controller_payload')
}

export async function markFocusControllerReady(revision) {
  if (!isTauri()) return false
  return invoke('focus_controller_ready', { revision })
}

export async function setFocusControllerAlwaysOnTop(alwaysOnTop) {
  if (!isTauri()) return false
  return invoke('set_focus_controller_always_on_top', { alwaysOnTop })
}

export async function setFocusControllerStyle(style) {
  if (!isTauri()) return false
  return invoke('set_focus_controller_style', { style })
}

export async function setFocusControllerIslandExpanded(expanded) {
  if (!isTauri()) return false
  return invoke('set_focus_controller_island_expanded', { expanded })
}

export async function handleFocusControllerAction(controller, action) {
  if (!isTauri() || !controller?.sessionId) return false
  return invoke('handle_focus_controller_action', {
    sessionId: controller.sessionId,
    action
  })
}

export async function requestFocusNotificationPermission() {
  if (!isTauri()) return false
  try {
    return await invoke('request_focus_notification_permission')
  } catch (error) {
    console.error('[Platform] 请求专注完成通知权限失败:', error)
    return false
  }
}

export async function openSystemNotificationSettings() {
  if (!isTauri()) return false
  try {
    return await invoke('open_system_notification_settings')
  } catch (error) {
    console.error('[Platform] 打开系统通知设置失败:', error)
    return false
  }
}

export async function sendFocusCompletionTestNotification(settings = {}) {
  if (!isTauri()) return { sent: false, reason: 'unsupported' }
  try {
    await invoke('send_focus_completion_test_notification', {
      soundEnabled: settings.focusCompletionSoundEnabled !== false,
      alwaysOnTop: settings.focusReminderAlwaysOnTop !== false
    })
    return { sent: true }
  } catch (error) {
    console.error('[Platform] 发送专注完成测试提醒失败:', error)
    return { sent: false, reason: 'send-failed', error }
  }
}

export async function getFocusReminderPayload() {
  if (!isTauri()) return null
  return invoke('get_focus_reminder_payload')
}

export async function markFocusReminderReady(revision) {
  if (!isTauri()) return false
  return invoke('focus_reminder_ready', { revision })
}

export async function handleFocusReminderAction(reminder, action) {
  if (!isTauri() || !reminder?.sessionId) return false
  return invoke('handle_focus_reminder_action', {
    revision: reminder.revision,
    sessionId: reminder.sessionId,
    action
  })
}

export async function presentRhythmReminder(reminder, settings = {}) {
  if (!isTauri() || !reminder?.id) return false
  return invoke('present_rhythm_reminder', {
    reminderId: reminder.id,
    title: reminder.title || '节律提醒',
    message: reminder.message || '该给自己一点短暂的调整时间了。',
    triggerLabel: reminder.triggerType === 'active-duration' ? `连续使用 ${Math.round((reminder.intervalSeconds || 0) / 60)} 分钟` : reminder.triggerType === 'fixed-time' ? `固定时刻 ${reminder.time}` : `每 ${Math.round((reminder.intervalSeconds || 0) / 60)} 分钟`,
    notificationEnabled: settings.reminderNotificationsEnabled !== false,
    soundEnabled: settings.reminderSoundEnabled !== false
  })
}

export function hasNativeRhythmScheduler() {
  return isTauri()
}

export async function scheduleRhythmReminder(schedule, settings = {}) {
  if (!isTauri()) return false
  try {
    return await invoke('schedule_rhythm_reminder', {
      schedule: {
        ...schedule,
        notificationEnabled: settings.reminderNotificationsEnabled !== false,
        soundEnabled: settings.reminderSoundEnabled !== false
      }
    })
  } catch (error) {
    console.error('[Platform] 调度节律提醒失败:', error)
    return false
  }
}

export async function cancelRhythmReminder(reminderId = null) {
  if (!isTauri()) return false
  try {
    return await invoke('cancel_rhythm_reminder', { reminderId })
  } catch (error) {
    console.warn('[Platform] 取消节律提醒调度失败:', error)
    return false
  }
}

export async function getRhythmReminderPayload() {
  if (!isTauri()) return null
  return invoke('get_rhythm_reminder_payload')
}

export async function handleRhythmReminderAction(reminder, action) {
  if (!isTauri() || !reminder?.reminderId) return false
  return invoke('handle_rhythm_reminder_action', { revision: reminder.revision, reminderId: reminder.reminderId, action })
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
