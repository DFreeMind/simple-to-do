/** 前端状态结构迁移。数据库表结构迁移由 Rust 侧负责。 */
const CURRENT_VERSION = 11
const TASK_GROUP_COLOR_IDS = ['auto', 'accent', 'blue', 'violet', 'amber', 'rose', 'green', 'cyan', 'coral', 'indigo', 'teal', 'brick', 'custom']

export class MigrationError extends Error {
  constructor(message, code = 'migration-failed') {
    super(message)
    this.name = 'MigrationError'
    this.code = code
  }
}

const migrations = {
  1: migrateV1ToV2,
  2: migrateV2ToV3,
  3: migrateV3ToV4,
  4: migrateV4ToV5,
  5: migrateV5ToV6,
  6: migrateV6ToV7,
  7: migrateV7ToV8,
  8: migrateV8ToV9,
  9: migrateV9ToV10,
  10: migrateV10ToV11
}

export function migrateData(data) {
  if (!data) return data
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new MigrationError('数据根节点不是有效对象', 'invalid-data')
  }

  const originalVersion = Number.isInteger(data.schemaVersion) ? data.schemaVersion : 1
  if (originalVersion < 1) throw new MigrationError(`不支持的数据版本: ${originalVersion}`, 'invalid-version')
  if (originalVersion > CURRENT_VERSION) {
    throw new MigrationError(`数据版本 v${originalVersion} 高于当前应用支持的 v${CURRENT_VERSION}，请升级应用后再打开。`, 'future-version')
  }

  let version = originalVersion
  let migrated = JSON.parse(JSON.stringify(data))
  while (version < CURRENT_VERSION) {
    const migration = migrations[version]
    if (!migration) throw new MigrationError(`缺少 v${version} → v${version + 1} 的迁移函数`, 'missing-migration')
    try {
      migrated = migration(migrated)
      migrated.schemaVersion = version + 1
      version += 1
    } catch (error) {
      throw new MigrationError(`迁移 v${version} → v${version + 1} 失败：${error.message || error}`, 'migration-failed')
    }
  }
  return migrated
}

function migrateV1ToV2(data) {
  return {
    ...data,
    groups: Array.isArray(data.groups) ? data.groups : [],
    lists: Array.isArray(data.lists) ? data.lists : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    trash: Array.isArray(data.trash) ? data.trash : [],
    listTrash: Array.isArray(data.listTrash) ? data.listTrash : [],
    viewOrders: data.viewOrders && typeof data.viewOrders === 'object' && !Array.isArray(data.viewOrders) ? data.viewOrders : {},
    settings: data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings) ? data.settings : {}
  }
}

function migrateV2ToV3(data) {
  return {
    ...data,
    taskGroups: Array.isArray(data.taskGroups) ? data.taskGroups : [],
    lists: (data.lists || []).map(list => ({ ...list, viewMode: ['list', 'group'].includes(list.viewMode) ? list.viewMode : 'list' })),
    tasks: (data.tasks || []).map(task => ({ ...task, taskGroupId: task.taskGroupId || null })),
    trash: (data.trash || []).map(task => ({ ...task, taskGroupId: task.taskGroupId || null })),
    listTrash: (data.listTrash || []).map(list => ({ ...list, viewMode: ['list', 'group'].includes(list.viewMode) ? list.viewMode : 'list' }))
  }
}

function migrateV3ToV4(data) {
  return {
    ...data,
    taskGroups: (data.taskGroups || []).map(group => ({
      ...group,
      color: TASK_GROUP_COLOR_IDS.includes(group.color) ? group.color : 'auto'
    }))
  }
}

function migrateV4ToV5(data) {
  const settings = data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)
    ? data.settings
    : {}
  return {
    ...data,
    settings: {
      ...settings,
      groupCompletedDisplayMode: ['in-group', 'separate-section'].includes(settings.groupCompletedDisplayMode)
        ? settings.groupCompletedDisplayMode
        : 'in-group',
      groupCompletedVisibleByDefault: settings.groupCompletedVisibleByDefault !== false
    }
  }
}

function migrateV5ToV6(data) {
  const addReminderDeliveryState = (task) => ({
    ...task,
    reminderNotifiedAt: task?.reminderNotifiedAt || null
  })
  return {
    ...data,
    tasks: (data.tasks || []).map(addReminderDeliveryState),
    trash: (data.trash || []).map(addReminderDeliveryState)
  }
}

function migrateV6ToV7(data) {
  const now = new Date().toISOString()
  return {
    ...data,
    profile: data.profile && typeof data.profile === 'object' && !Array.isArray(data.profile)
      ? data.profile
      : {
          id: `profile-${Date.now().toString(36)}`,
          nickname: '易简用户',
          avatarRelativePath: null,
          avatarSha256: null,
          avatarUpdatedAt: null,
          accountId: null,
          createdAt: now,
          updatedAt: now
        }
  }
}

function migrateV7ToV8(data) {
  const addReminderPreference = (task) => ({
    ...task,
    reminderDisabled: task?.reminderDisabled === true
  })
  return {
    ...data,
    tasks: (data.tasks || []).map(addReminderPreference),
    trash: (data.trash || []).map(addReminderPreference)
  }
}

// v0.3.1 之前删除清单时没有同步删除其任务分组，导致分组保留了已失效的
// listId，启动校验会拒绝加载整个数据集。迁移时移除这些孤儿分组，并清空
// 仍引用它们的任务字段；任务本身（包括回收站任务）会被完整保留。
function migrateV8ToV9(data) {
  const listIds = new Set((data.lists || []).map(list => list?.id).filter(Boolean))
  const validTaskGroups = (data.taskGroups || []).filter(group => listIds.has(group?.listId))
  const validTaskGroupIds = new Set(validTaskGroups.map(group => group.id))
  const clearOrphanTaskGroup = (task) => ({
    ...task,
    taskGroupId: validTaskGroupIds.has(task?.taskGroupId) ? task.taskGroupId : null
  })

  return {
    ...data,
    taskGroups: validTaskGroups,
    tasks: (data.tasks || []).map(clearOrphanTaskGroup),
    trash: (data.trash || []).map(clearOrphanTaskGroup)
  }
}

function migrateV9ToV10(data) {
  return {
    ...data,
    clock: data.clock && typeof data.clock === 'object' && !Array.isArray(data.clock)
      ? data.clock
      : { profiles: [], activeSession: null, history: [] }
  }
}

function migrateV10ToV11(data) {
  const clock = data.clock && typeof data.clock === 'object' && !Array.isArray(data.clock) ? data.clock : {}
  return {
    ...data,
    clock: {
      ...clock,
      focusSettings: clock.focusSettings && typeof clock.focusSettings === 'object' && !Array.isArray(clock.focusSettings)
        ? clock.focusSettings
        : { shortBreakSeconds: 300, longBreakSeconds: 900, focusesBeforeLongBreak: 4, autoStartBreaks: false },
      pendingBreak: clock.pendingBreak && typeof clock.pendingBreak === 'object' && !Array.isArray(clock.pendingBreak) ? clock.pendingBreak : null,
      cycleFocusCount: Number.isFinite(Number(clock.cycleFocusCount)) ? Number(clock.cycleFocusCount) : 0,
      activeSession: clock.activeSession && typeof clock.activeSession === 'object'
        ? { ...clock.activeSession, phase: clock.activeSession.phase || 'focus' }
        : null,
      history: Array.isArray(clock.history)
        ? clock.history.map(item => ({ ...item, phase: item?.phase || 'focus' }))
        : []
    }
  }
}

export function validateData(data) {
  const errors = []
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { valid: false, errors: ['数据不是有效的对象'] }
  if (!Number.isInteger(data.schemaVersion)) errors.push('缺少或无效的 schemaVersion 字段')
  for (const field of ['groups', 'lists', 'tasks', 'trash', 'listTrash', 'taskGroups']) {
    if (!Array.isArray(data[field])) errors.push(`缺少数组字段: ${field}`)
  }
  if (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) errors.push('缺少有效的 settings 字段')
  if (!data.profile || typeof data.profile !== 'object' || Array.isArray(data.profile)) errors.push('缺少有效的 profile 字段')
  if (!data.viewOrders || typeof data.viewOrders !== 'object' || Array.isArray(data.viewOrders)) errors.push('缺少有效的 viewOrders 字段')
  if (!data.clock || typeof data.clock !== 'object' || Array.isArray(data.clock)) errors.push('缺少有效的 clock 字段')
  if (errors.length) return { valid: false, errors }

  const listIds = new Set()
  data.lists.forEach(list => {
    if (!list?.id || listIds.has(list.id)) errors.push(`清单 ID 无效或重复: ${list?.id || '(空)'}`)
    listIds.add(list?.id)
    if (!['list', 'group'].includes(list.viewMode || 'list')) errors.push(`清单 ${list.id} 的 viewMode 无效`)
  })
  const groupIds = new Set()
  data.taskGroups.forEach(group => {
    if (!group?.id || groupIds.has(group.id)) errors.push(`任务分组 ID 无效或重复: ${group?.id || '(空)'}`)
    groupIds.add(group?.id)
    if (!listIds.has(group?.listId)) errors.push(`任务分组 ${group?.id || '(空)'} 引用了不存在的清单`)
    if (!TASK_GROUP_COLOR_IDS.includes(group?.color || 'auto')) errors.push(`任务分组 ${group?.id || '(空)'} 的颜色值无效`)
    if (group?.color === 'custom' && !/^#[0-9a-f]{6}$/i.test(group?.customColor || '')) errors.push(`任务分组 ${group?.id || '(空)'} 的自定义颜色无效`)
  })
  ;[...data.tasks, ...data.trash].forEach(task => {
    if (task?.taskGroupId && !groupIds.has(task.taskGroupId)) errors.push(`任务 ${task?.id || '(空)'} 引用了不存在的任务分组`)
    const group = data.taskGroups.find(item => item.id === task?.taskGroupId)
    if (group && group.listId !== task.listId) errors.push(`任务 ${task?.id || '(空)'} 与任务分组不属于同一清单`)
  })
  return { valid: errors.length === 0, errors }
}

export function createBackup(data) {
  return { ...JSON.parse(JSON.stringify(data)), _backup: { createdAt: new Date().toISOString(), schemaVersion: data.schemaVersion || 1 } }
}

export function getCurrentVersion() { return CURRENT_VERSION }
export function getSupportedVersions() { return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
