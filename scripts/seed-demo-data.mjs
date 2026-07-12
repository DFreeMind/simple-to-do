#!/usr/bin/env node

/**
 * 演示数据生成脚本
 * 生成丰富的示例数据，用于展示应用功能和截图
 */

import fs from 'node:fs'
import path from 'node:path'

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

const today = localDateKey()
const yesterday = localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))

// 任务分组（list 内部的分组，不同于清单分组）
const taskGroups = []

// 分组
const groups = [
  { id: 'work', name: '工作', collapsed: false, sortOrder: 1000 },
  { id: 'life', name: '生活', collapsed: false, sortOrder: 2000 },
  { id: 'study', name: '学习', collapsed: false, sortOrder: 3000 },
  { id: 'projects', name: '项目', collapsed: false, sortOrder: 4000 }
]

// 清单
const lists = [
  { id: 'inbox', name: '收集箱', groupId: null, color: '#5fb8ad', isSystem: true, pinned: false, sortOrder: 0, viewMode: 'list' },
  { id: 'work-tasks', name: '工作任务', groupId: 'work', color: '#4f8de8', isSystem: false, pinned: false, sortOrder: 1000, viewMode: 'list' },
  { id: 'meetings', name: '会议记录', groupId: 'work', color: '#7c6ee6', isSystem: false, pinned: false, sortOrder: 1500, viewMode: 'list' },
  { id: 'personal', name: '个人备忘', groupId: 'life', color: '#e0a54f', isSystem: false, pinned: false, sortOrder: 2000, viewMode: 'list' },
  { id: 'home', name: '家庭采购', groupId: 'life', color: '#5f9e72', isSystem: false, pinned: false, sortOrder: 2500, viewMode: 'list' },
  { id: 'health', name: '健康管理', groupId: 'life', color: '#e06b6b', isSystem: false, pinned: false, sortOrder: 2800, viewMode: 'list' },
  { id: 'reading', name: '阅读学习', groupId: 'study', color: '#cf6f87', isSystem: false, pinned: false, sortOrder: 3000, viewMode: 'list' },
  { id: 'courses', name: '在线课程', groupId: 'study', color: '#6b8fcf', isSystem: false, pinned: false, sortOrder: 3500, viewMode: 'list' },
  { id: 'project-alpha', name: '项目 Alpha', groupId: 'projects', color: '#7c6ee6', isSystem: false, pinned: false, sortOrder: 4000, viewMode: 'list' },
  { id: 'project-beta', name: '项目 Beta', groupId: 'projects', color: '#cf6f87', isSystem: false, pinned: false, sortOrder: 4500, viewMode: 'list' },
  { id: 'travel', name: '旅行准备', groupId: null, color: '#2f8f86', isSystem: false, pinned: false, sortOrder: 5000, viewMode: 'list' },
  { id: 'someday', name: '灵感收集', groupId: null, color: '#6b7280', isSystem: false, pinned: false, sortOrder: 6000, viewMode: 'list' }
]

// 任务数据
const tasks = [
  // ===== 今日任务 =====
  task('today-1', '10:30 团队站会同步阻塞事项', {
    listId: 'meetings',
    myDayDate: today,
    dueDate: atOffset(0, 10, 30),
    reminderAt: atOffset(0, 10, 0),
    priority: 2,
    tags: ['会议', '今天'],
    descriptionHtml: '<p>检查昨天遗留问题，确认今天需要推进的三个事项：</p><ul><li>API 接口文档更新</li><li>前端组件重构进度</li><li>测试用例补充</li></ul>',
    pinned: true,
    createdAt: daysAgo(4, 9)
  }),
  task('today-2', '完成季度报告初稿', {
    listId: 'work-tasks',
    myDayDate: today,
    dueDate: atOffset(0, 18),
    priority: 3,
    important: true,
    tags: ['报告', '重要'],
    subtasks: [
      sub('sub-report-1', '收集数据', true),
      sub('sub-report-2', '整理图表'),
      sub('sub-report-3', '撰写分析'),
      sub('sub-report-4', '校对排版')
    ],
    descriptionHtml: '<h3>报告大纲</h3><ol><li>业务数据总览</li><li>关键指标分析</li><li>问题与挑战</li><li>下季度计划</li></ol>',
    createdAt: daysAgo(2, 14)
  }),
  task('today-3', '下班后买咖啡豆和洗衣液', {
    listId: 'home',
    myDayDate: today,
    dueDate: atOffset(0, 19),
    tags: ['采购', '生活'],
    subtasks: [
      sub('sub-buy-1', '咖啡豆 - 蓝山风味'),
      sub('sub-buy-2', '洗衣液 - 3kg 装'),
      sub('sub-buy-3', '厨房纸 - 3 包', true),
      sub('sub-buy-4', '鸡蛋 - 1 盒')
    ],
    createdAt: daysAgo(2, 20)
  }),
  task('today-4', '每日 20 分钟英语听力', {
    listId: 'reading',
    myDayDate: today,
    dueDate: atOffset(0, 22),
    repeatRule: 'daily',
    tags: ['学习', '习惯'],
    subtasks: [
      sub('sub-eng-1', '精听 10 分钟'),
      sub('sub-eng-2', '记录 5 个生词')
    ],
    createdAt: daysAgo(12, 7)
  }),

  // ===== 已逾期任务 =====
  task('overdue-1', '补发供应商合同确认邮件', {
    listId: 'project-alpha',
    dueDate: atOffset(-3, 18),
    reminderAt: atOffset(-3, 16),
    important: true,
    priority: 3,
    tags: ['合同', '逾期'],
    descriptionHtml: '<p>需要确认以下条款：</p><ul><li>付款方式：月结 30 天</li><li>交付时间：2026年8月15日</li><li>违约责任：第 8 条</li></ul>',
    createdAt: daysAgo(9, 11)
  }),
  task('overdue-2', '给阳台绿植浇水', {
    listId: 'personal',
    dueDate: atOffset(-1, 8),
    tags: ['生活'],
    createdAt: daysAgo(5, 8)
  }),

  // ===== 明天任务 =====
  task('tomorrow-1', '09:00 发周报初稿', {
    listId: 'work-tasks',
    dueDate: atOffset(1, 9),
    reminderAt: atOffset(1, 8, 30),
    important: true,
    priority: 3,
    tags: ['周报', '写作'],
    descriptionHtml: '<p>周报要点：</p><ul><li>本周完成的工作</li><li>遇到的问题和解决方案</li><li>下周工作计划</li></ul>',
    createdAt: daysAgo(1, 15)
  }),
  task('tomorrow-2', '准备周五项目评审材料', {
    listId: 'project-alpha',
    dueDate: atOffset(1, 15),
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
    descriptionHtml: '<h3>评审维度</h3><ul><li>技术方案可行性</li><li>资源投入评估</li><li>风险识别与应对</li><li>时间计划合理性</li></ul>',
    createdAt: daysAgo(5, 14)
  }),

  // ===== 本周任务 =====
  task('week-1', '本周复盘：整理 7 月目标进展', {
    listId: 'personal',
    dueDate: atOffset(5, 21),
    priority: 1,
    tags: ['复盘'],
    descriptionHtml: '<h3>复盘维度</h3><ul><li>工作推进</li><li>个人计划</li><li>健康习惯</li><li>学习成长</li></ul>',
    createdAt: daysAgo(3, 13)
  }),
  task('week-2', '每周五清理下载目录', {
    listId: 'personal',
    dueDate: atOffset(6, 18),
    repeatRule: 'weekly',
    tags: ['整理'],
    createdAt: daysAgo(20, 9)
  }),
  task('week-3', '预约牙科检查', {
    listId: 'health',
    dueDate: atOffset(4, 11),
    reminderAt: atOffset(3, 20),
    priority: 2,
    tags: ['健康'],
    descriptionHtml: '<p>上次检查是半年前，需要预约洗牙和检查。</p>',
    createdAt: daysAgo(6, 10)
  }),

  // ===== 以后任务 =====
  task('later-1', '检查护照有效期并扫描备份', {
    listId: 'travel',
    dueDate: atOffset(24, 10),
    tags: ['旅行', '证件'],
    createdAt: daysAgo(6, 12)
  }),
  task('later-2', '每月核对信用卡账单', {
    listId: 'personal',
    dueDate: atOffset(12, 20),
    repeatRule: 'monthly',
    priority: 2,
    tags: ['财务'],
    createdAt: daysAgo(18, 9)
  }),
  task('later-3', '准备年度旅行计划', {
    listId: 'travel',
    dueDate: atOffset(30, 10),
    tags: ['旅行', '计划'],
    subtasks: [
      sub('sub-travel-1', '确定目的地'),
      sub('sub-travel-2', '预订机票'),
      sub('sub-travel-3', '预订酒店'),
      sub('sub-travel-4', '办理签证')
    ],
    createdAt: daysAgo(10, 15)
  }),

  // ===== 重要任务 =====
  task('important-1', '确认备份策略', {
    listId: 'work-tasks',
    important: true,
    priority: 3,
    tags: ['重要', '数据'],
    descriptionHtml: '<p>需要确认以下备份方案：</p><ul><li>本地备份频率</li><li>云端备份策略</li><li>恢复测试计划</li></ul>',
    createdAt: daysAgo(7, 10)
  }),
  task('important-2', '考虑增加模板清单功能', {
    listId: 'someday',
    important: true,
    priority: 3,
    tags: ['产品', '灵感'],
    descriptionHtml: '<p>用户反馈希望有模板功能，可以快速创建常用任务列表。</p>',
    createdAt: daysAgo(11, 10)
  }),

  // ===== 置顶任务 =====
  task('pinned-1', '把设置页后续内容拆成分类清单', {
    listId: 'project-alpha',
    pinned: true,
    tags: ['产品', '设置'],
    descriptionHtml: '<p>用于检查置顶任务在默认排序中的位置。</p>',
    createdAt: daysAgo(1, 10)
  }),

  // ===== 收集箱任务 =====
  task('inbox-1', '整理书架上的书籍', {
    listId: 'inbox',
    tags: ['整理'],
    createdAt: daysAgo(1, 8)
  }),
  task('inbox-2', '给朋友回电话', {
    listId: 'inbox',
    tags: ['社交'],
    createdAt: daysAgo(0, 11)
  }),
  task('inbox-3', '研究一下快捷键设计', {
    listId: 'inbox',
    tags: ['灵感'],
    createdAt: daysAgo(15, 10)
  }),

  // ===== 阅读学习任务 =====
  task('reading-1', '阅读《原子习惯》第 3 章', {
    listId: 'reading',
    dueDate: atOffset(2, 20),
    tags: ['阅读', '习惯'],
    descriptionHtml: '<p>本章要点：</p><ul><li>习惯叠加</li><li>环境设计</li><li>两分钟规则</li></ul>',
    createdAt: daysAgo(4, 19)
  }),
  task('reading-2', '完成 Python 课程第 5 单元', {
    listId: 'courses',
    dueDate: atOffset(3, 18),
    tags: ['学习', '编程'],
    subtasks: [
      sub('sub-python-1', '观看视频教程', true),
      sub('sub-python-2', '完成练习题'),
      sub('sub-python-3', '提交作业')
    ],
    createdAt: daysAgo(7, 10)
  }),

  // ===== 项目任务 =====
  task('project-1', 'Alpha 项目需求评审', {
    listId: 'project-alpha',
    dueDate: atOffset(2, 14),
    priority: 3,
    important: true,
    tags: ['项目', '评审'],
    descriptionHtml: '<h3>评审内容</h3><ul><li>用户故事验收标准</li><li>技术方案可行性</li><li>资源分配</li></ul>',
    createdAt: daysAgo(8, 9)
  }),
  task('project-2', 'Beta 项目启动会议', {
    listId: 'project-beta',
    dueDate: atOffset(5, 10),
    priority: 2,
    tags: ['项目', '会议'],
    createdAt: daysAgo(3, 14)
  }),

  // ===== 健康管理任务 =====
  task('health-1', '每天运动 30 分钟', {
    listId: 'health',
    dueDate: atOffset(0, 18),
    repeatRule: 'daily',
    tags: ['健康', '运动'],
    subtasks: [
      sub('sub-exercise-1', '热身 5 分钟'),
      sub('sub-exercise-2', '主要运动 20 分钟'),
      sub('sub-exercise-3', '拉伸 5 分钟')
    ],
    createdAt: daysAgo(30, 7)
  }),
  task('health-2', '预约年度体检', {
    listId: 'health',
    dueDate: atOffset(10, 9),
    tags: ['健康', '体检'],
    createdAt: daysAgo(5, 12)
  }),

  // ===== 已完成任务 =====
  task('completed-1', '整理桌面文件', {
    listId: 'personal',
    completed: true,
    completedAt: atOffset(0, 9, 40),
    myDayDate: today,
    tags: ['完成'],
    createdAt: daysAgo(2, 9)
  }),
  task('completed-2', '归档 6 月票据', {
    listId: 'personal',
    completed: true,
    completedAt: daysAgo(4, 20),
    tags: ['完成', '财务'],
    createdAt: daysAgo(8, 17)
  }),
  task('completed-3', '确认发布清单', {
    listId: 'project-alpha',
    completed: true,
    completedAt: daysAgo(1, 18),
    important: true,
    priority: 3,
    tags: ['发布', '完成'],
    createdAt: daysAgo(5, 12)
  }),
  task('completed-4', '更新项目文档', {
    listId: 'work-tasks',
    completed: true,
    completedAt: daysAgo(2, 16),
    tags: ['文档', '完成'],
    createdAt: daysAgo(6, 10)
  }),
  task('completed-5', '回复客户邮件', {
    listId: 'work-tasks',
    completed: true,
    completedAt: daysAgo(1, 11),
    tags: ['邮件', '完成'],
    createdAt: daysAgo(3, 14)
  }),

  // ===== 垃圾桶任务 =====
  task('deleted-1', '误删的会议记录', {
    listId: 'work-tasks',
    deleted: true,
    deletedAt: daysAgo(1, 17),
    updatedAt: daysAgo(1, 17),
    tags: ['垃圾桶'],
    descriptionHtml: '<p>用于测试恢复任务。</p>',
    createdAt: daysAgo(6, 10)
  }),
  task('deleted-2', '旧版本的需求文档', {
    listId: 'project-alpha',
    deleted: true,
    deletedAt: daysAgo(2, 15),
    updatedAt: daysAgo(2, 15),
    tags: ['垃圾桶', '文档'],
    createdAt: daysAgo(15, 10)
  }),

  // ===== 特殊测试任务 =====
  task('test-1', '这是一个特别长的任务标题，用来检查列表、详情栏和右侧表单在窄宽度下是否会换行、截断或挤压操作按钮', {
    listId: 'inbox',
    myDayDate: today,
    priority: 1,
    tags: ['UI', '长文本'],
    descriptionHtml: '<p>长标题压力测试。检查任务行高度、标签换行、详情标题输入框高度。</p>',
    createdAt: daysAgo(1, 11)
  }),
  task('test-2', '富文本备注测试：标题、列表和引用', {
    listId: 'reading',
    tags: ['富文本'],
    descriptionHtml: '<h2>阅读笔记</h2><p>这条任务用于检查详情页富文本展示。</p><blockquote>引用样式是否清楚。</blockquote><ul><li>第一点</li><li>第二点</li></ul><p><strong>加粗文本</strong>和<em>斜体文本</em>的显示效果。</p>',
    createdAt: daysAgo(3, 19)
  }),
  task('test-3', '带附件的任务：确认图片预览区域', {
    listId: 'inbox',
    tags: ['附件'],
    createdAt: daysAgo(4, 18)
  }),

  // ===== 昨日任务 =====
  task('yesterday-1', '昨天加入今日但未完成的任务', {
    listId: 'inbox',
    myDayDate: yesterday,
    tags: ['今日过期状态'],
    createdAt: daysAgo(1, 7)
  })
]

// 构建数据
const data = {
  schemaVersion: 5,
  groups,
  lists,
  tasks,
  trash: tasks.filter(item => item.deleted).map(item => ({ ...item })),
  listTrash: [],
  taskGroups,
  viewOrders: {},
  settings: {
    theme: 'mint',
    density: 'comfortable',
    detailOpen: true,
    startView: 'today',
    completedVisible: true,
    trashRetentionDays: 30,
    soundEnabled: true,
    reminderNotificationsEnabled: true,
    groupCompletedDisplayMode: 'in-group',
    groupCompletedVisibleByDefault: true
  }
}

// 确保非删除任务的 deleted 字段为 false
data.tasks = data.tasks.map(item => item.deleted ? item : { ...item, deleted: false, deletedAt: null })

// 写入文件
const dataFile = path.join(process.cwd(), 'demo-data.json')
fs.writeFileSync(dataFile, JSON.stringify(data, null, 2))

console.log('✅ 演示数据已生成')
console.log(`📁 文件位置: ${dataFile}`)
console.log('')
console.log('📊 数据统计:')
console.log(`- 任务: ${data.tasks.length} 条`)
console.log(`- 清单: ${data.lists.length} 个`)
console.log(`- 分组: ${data.groups.length} 个`)
console.log(`- 垃圾桶: ${data.trash.length} 条`)
console.log('')
console.log('🎯 任务分布:')
console.log(`- 今日任务: ${tasks.filter(t => t.myDayDate === today && !t.completed).length} 条`)
console.log(`- 已逾期: ${tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && !t.completed).length} 条`)
console.log(`- 重要任务: ${tasks.filter(t => (t.important || t.priority === 3) && !t.completed).length} 条`)
console.log(`- 已完成: ${tasks.filter(t => t.completed).length} 条`)
console.log('')
console.log('💡 提示: 请将此文件导入应用以查看丰富的演示数据。')
