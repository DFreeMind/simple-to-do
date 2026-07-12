/** 前端状态结构迁移。数据库表结构迁移由 Rust 侧负责。 */
const CURRENT_VERSION = 5
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
  4: migrateV4ToV5
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

export function validateData(data) {
  const errors = []
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { valid: false, errors: ['数据不是有效的对象'] }
  if (!Number.isInteger(data.schemaVersion)) errors.push('缺少或无效的 schemaVersion 字段')
  for (const field of ['groups', 'lists', 'tasks', 'trash', 'listTrash', 'taskGroups']) {
    if (!Array.isArray(data[field])) errors.push(`缺少数组字段: ${field}`)
  }
  if (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) errors.push('缺少有效的 settings 字段')
  if (!data.viewOrders || typeof data.viewOrders !== 'object' || Array.isArray(data.viewOrders)) errors.push('缺少有效的 viewOrders 字段')
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
export function getSupportedVersions() { return [1, 2, 3, 4, 5] }
