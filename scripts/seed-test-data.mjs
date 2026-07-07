import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dataFile = process.env.SIMPLE_TODO_DATA_FILE || path.join(process.cwd(), 'seed-test-data.json')
const dataDir = path.dirname(dataFile)

const now = new Date()

function localDateKey(date = now) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function atOffset(days, hour, minute = 0) {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

function daysAgo(days, hour = 10, minute = 0) {
  return atOffset(-days, hour, minute)
}

function task(id, title, overrides = {}) {
  const createdAt = overrides.createdAt || daysAgo(8, 9)
  return {
    id,
    title,
    description: overrides.description || '',
    descriptionHtml: overrides.descriptionHtml || '',
    completed: false,
    completedAt: null,
    deleted: false,
    deletedAt: null,
    pinned: false,
    important: false,
    myDayDate: null,
    listId: 'inbox',
    dueDate: null,
    reminderAt: null,
    repeatRule: null,
    priority: 0,
    tags: [],
    subtasks: [],
    attachments: [],
    comments: [],
    editorMode: 'detail',
    createdAt,
    updatedAt: overrides.updatedAt || createdAt,
    ...overrides
  }
}

function sub(id, title, completed = false) {
  return { id, title, completed }
}

function attachment(id, name, createdAt = daysAgo(2)) {
  return {
    id,
    path: path.join(os.homedir(), 'Pictures', 'test-data', name),
    url: '',
    createdAt
  }
}

const groups = [
  { id: 'life', name: '生活', collapsed: false },
  { id: 'work', name: '工作', collapsed: false },
  { id: 'study', name: '学习', collapsed: false },
  { id: 'later', name: '以后再说', collapsed: true }
]

const lists = [
  { id: 'inbox', name: '收集箱', groupId: null, color: '#5fb8ad', isSystem: true },
  { id: 'work', name: '工作任务', groupId: 'work', color: '#4f8de8', isSystem: false },
  { id: 'personal', name: '个人备忘', groupId: 'life', color: '#e0a54f', isSystem: false },
  { id: 'home', name: '家庭采购', groupId: 'life', color: '#5f9e72', isSystem: false },
  { id: 'project-alpha', name: '项目 Alpha', groupId: 'work', color: '#7c6ee6', isSystem: false },
  { id: 'reading', name: '阅读学习', groupId: 'study', color: '#cf6f87', isSystem: false },
  { id: 'travel', name: '旅行准备', groupId: null, color: '#2f8f86', isSystem: false },
  { id: 'someday', name: '灵感收集', groupId: 'later', color: '#6b7280', isSystem: false }
]

const today = localDateKey()
const yesterday = localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
const deletedAt = daysAgo(1, 17)

const tasks = [
  task('task-today-standup', '10:30 团队站会同步阻塞事项', {
    listId: 'work',
    myDayDate: today,
    dueDate: atOffset(0, 10, 30),
    reminderAt: atOffset(0, 10, 0),
    priority: 2,
    tags: ['会议', '今天'],
    descriptionHtml: '<p>检查昨天遗留问题，确认今天需要推进的三个事项。</p>',
    pinned: true,
    createdAt: daysAgo(4, 9)
  }),
  task('task-today-buy', '下班后买咖啡豆和洗衣液', {
    listId: 'home',
    myDayDate: today,
    dueDate: atOffset(0, 19),
    tags: ['采购', '生活'],
    subtasks: [sub('sub-buy-1', '咖啡豆'), sub('sub-buy-2', '洗衣液'), sub('sub-buy-3', '厨房纸', true)],
    createdAt: daysAgo(2, 20)
  }),
  task('task-overdue-contract', '补发供应商合同确认邮件', {
    listId: 'project-alpha',
    dueDate: atOffset(-3, 18),
    reminderAt: atOffset(-3, 16),
    important: true,
    priority: 3,
    tags: ['合同', '逾期'],
    descriptionHtml: '<p>逾期任务，用来检查计划视图的已逾期分组和重要标记。</p>',
    createdAt: daysAgo(9, 11)
  }),
  task('task-overdue-water', '给阳台绿植浇水', {
    listId: 'personal',
    dueDate: atOffset(-1, 8),
    tags: ['生活'],
    createdAt: daysAgo(5, 8)
  }),
  task('task-tomorrow-report', '明天 09:00 发周报初稿', {
    listId: 'work',
    dueDate: atOffset(1, 9),
    reminderAt: atOffset(1, 8, 30),
    important: true,
    priority: 3,
    tags: ['周报', '写作'],
    createdAt: daysAgo(1, 15)
  }),
  task('task-week-review', '本周复盘：整理 7 月目标进展', {
    listId: 'personal',
    dueDate: atOffset(5, 21),
    priority: 1,
    tags: ['复盘'],
    descriptionHtml: '<h3>复盘维度</h3><ul><li>工作推进</li><li>个人计划</li><li>健康习惯</li></ul>',
    createdAt: daysAgo(3, 13)
  }),
  task('task-later-passport', '检查护照有效期并扫描备份', {
    listId: 'travel',
    dueDate: atOffset(24, 10),
    tags: ['旅行', '证件'],
    attachments: [attachment('att-passport-note', 'passport-note.png')],
    createdAt: daysAgo(6, 12)
  }),
  task('task-daily-english', '每日 20 分钟英语听力', {
    listId: 'reading',
    dueDate: atOffset(0, 22),
    repeatRule: 'daily',
    myDayDate: today,
    tags: ['学习', '习惯'],
    subtasks: [sub('sub-eng-1', '精听 10 分钟'), sub('sub-eng-2', '记录 5 个生词')],
    createdAt: daysAgo(12, 7)
  }),
  task('task-weekly-cleanup', '每周五清理下载目录', {
    listId: 'personal',
    dueDate: atOffset(6, 18),
    repeatRule: 'weekly',
    tags: ['整理'],
    createdAt: daysAgo(20, 9)
  }),
  task('task-monthly-bills', '每月核对信用卡账单', {
    listId: 'personal',
    dueDate: atOffset(12, 20),
    repeatRule: 'monthly',
    priority: 2,
    tags: ['财务'],
    createdAt: daysAgo(18, 9)
  }),
  task('task-pinned-idea', '把设置页后续内容拆成分类清单', {
    listId: 'project-alpha',
    pinned: true,
    tags: ['产品', '设置'],
    descriptionHtml: '<p>用于检查置顶任务在默认排序中的位置。</p>',
    createdAt: daysAgo(1, 10)
  }),
  task('task-important-no-date', '重要但没有日期：确认备份策略', {
    listId: 'work',
    important: true,
    priority: 3,
    tags: ['重要', '数据'],
    createdAt: daysAgo(7, 10)
  }),
  task('task-long-title', '这是一个特别长的任务标题，用来检查列表、详情栏和右侧表单在窄宽度下是否会换行、截断或挤压操作按钮', {
    listId: 'inbox',
    myDayDate: today,
    priority: 1,
    tags: ['UI', '长文本'],
    descriptionHtml: '<p>长标题压力测试。检查任务行高度、标签换行、详情标题输入框高度。</p>',
    createdAt: daysAgo(1, 11)
  }),
  task('task-tags-search', '搜索测试：包含多个标签和备注关键字', {
    listId: 'inbox',
    tags: ['工作', '重要', '搜索测试', 'alpha'],
    description: '这是纯文本备注，包含 keyword-search-case。',
    descriptionHtml: '<p>富文本备注里也包含 <strong>keyword-search-case</strong>。</p>',
    createdAt: daysAgo(2, 16)
  }),
  task('task-subtasks-many', '准备项目评审材料', {
    listId: 'project-alpha',
    dueDate: atOffset(2, 15),
    important: true,
    priority: 3,
    tags: ['项目', '评审'],
    subtasks: [
      sub('sub-review-1', '整理目标和范围', true),
      sub('sub-review-2', '补充风险列表', true),
      sub('sub-review-3', '确认里程碑'),
      sub('sub-review-4', '准备截图'),
      sub('sub-review-5', '发给相关同事')
    ],
    createdAt: daysAgo(5, 14)
  }),
  task('task-attachment', '带附件的任务：确认图片预览区域', {
    listId: 'inbox',
    tags: ['附件'],
    attachments: [attachment('att-1', 'receipt-1.png'), attachment('att-2', 'whiteboard-export.jpg')],
    createdAt: daysAgo(4, 18)
  }),
  task('task-rich-note', '富文本备注测试：标题、列表和引用', {
    listId: 'reading',
    tags: ['富文本'],
    descriptionHtml: '<h2>阅读笔记</h2><p>这条任务用于检查详情页富文本展示。</p><blockquote>引用样式是否清楚。</blockquote><ul><li>第一点</li><li>第二点</li></ul>',
    createdAt: daysAgo(3, 19)
  }),
  task('task-low-priority', '低优先级：整理旧书架', {
    listId: 'personal',
    priority: 1,
    tags: ['低优先级'],
    createdAt: daysAgo(10, 9)
  }),
  task('task-medium-priority', '中优先级：预约牙科检查', {
    listId: 'personal',
    dueDate: atOffset(9, 11),
    reminderAt: atOffset(8, 20),
    priority: 2,
    tags: ['健康'],
    createdAt: daysAgo(6, 10)
  }),
  task('task-no-meta', '无日期无标签的普通收集箱任务', {
    listId: 'inbox',
    createdAt: daysAgo(1, 8)
  }),
  task('task-someday-1', '有空研究一下快捷键设计', {
    listId: 'someday',
    tags: ['灵感'],
    createdAt: daysAgo(15, 10)
  }),
  task('task-someday-2', '考虑增加模板清单', {
    listId: 'someday',
    important: true,
    priority: 3,
    tags: ['产品', '灵感'],
    createdAt: daysAgo(11, 10)
  }),
  task('task-completed-today', '已完成：整理桌面文件', {
    listId: 'personal',
    completed: true,
    completedAt: atOffset(0, 9, 40),
    myDayDate: today,
    tags: ['完成'],
    createdAt: daysAgo(2, 9)
  }),
  task('task-completed-old', '已完成：归档 6 月票据', {
    listId: 'personal',
    completed: true,
    completedAt: daysAgo(4, 20),
    tags: ['完成', '财务'],
    createdAt: daysAgo(8, 17)
  }),
  task('task-completed-important', '已完成但仍重要：确认发布清单', {
    listId: 'project-alpha',
    completed: true,
    completedAt: daysAgo(1, 18),
    important: true,
    priority: 3,
    tags: ['发布', '完成'],
    createdAt: daysAgo(5, 12)
  }),
  task('task-deleted-restore', '垃圾桶：误删的会议记录', {
    listId: 'work',
    deleted: true,
    deletedAt,
    updatedAt: deletedAt,
    tags: ['垃圾桶'],
    descriptionHtml: '<p>用于测试恢复任务。</p>',
    createdAt: daysAgo(6, 10)
  }),
  task('task-deleted-long', '垃圾桶：很长标题任务，用于确认删除列表和恢复菜单不会遮挡内容或溢出', {
    listId: 'inbox',
    deleted: true,
    deletedAt,
    updatedAt: deletedAt,
    important: true,
    priority: 3,
    tags: ['垃圾桶', '长文本'],
    createdAt: daysAgo(9, 10)
  }),
  task('task-yesterday-myday', '昨天加入今日但未完成的任务', {
    listId: 'inbox',
    myDayDate: yesterday,
    tags: ['今日过期状态'],
    createdAt: daysAgo(1, 7)
  })
]

const data = {
  schemaVersion: 2,
  groups,
  lists,
  tasks,
  trash: tasks.filter(item => item.deleted).map(item => ({ ...item })),
  listTrash: [],
  settings: {
    theme: 'mint',
    density: 'comfortable',
    detailOpen: true,
    startView: 'today',
    completedVisible: true,
    trashRetentionDays: 30
  }
}

data.tasks = data.tasks.map(item => item.deleted ? item : { ...item, deleted: false, deletedAt: null })

fs.mkdirSync(dataDir, { recursive: true })

if (fs.existsSync(dataFile)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = `${dataFile}.backup-${stamp}`
  fs.copyFileSync(dataFile, backupFile)
  console.log(`已备份现有数据: ${backupFile}`)
}

fs.writeFileSync(dataFile, `${JSON.stringify(data, null, 2)}\n`)
console.log(`已写入 JSON 测试样例: ${dataFile}`)
console.log('当前运行时主存储为 SQLite simpletodo.db；该文件仅作为样例数据，不会被应用自动读取。')
console.log(`任务: ${data.tasks.length} 条，垃圾桶: ${data.trash.length} 条，清单: ${data.lists.length} 个，分组: ${data.groups.length} 个`)
