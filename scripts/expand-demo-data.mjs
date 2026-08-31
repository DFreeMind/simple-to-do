#!/usr/bin/env node
/**
 * 扩充 demo-data.json：增加任务、专注记录、节律提醒与历史、花田数据、已删除清单等。
 * 运行：node scripts/expand-demo-data.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dataPath = path.join(root, 'demo-data.json')
const raw = await fs.readFile(dataPath, 'utf8')
const d = JSON.parse(raw)

// 基准日期：让演示数据围绕 2026-08-12（周三）展开，与现有数据一致
const BASE = new Date('2026-08-12T12:00:00+08:00')
function iso(offsetDays, hour = 10, minute = 0) {
  const d = new Date(BASE)
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}
function dateKey(offsetDays) {
  const d = new Date(BASE)
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

let idCounter = 1000
function nid(prefix) { return `${prefix}-${++idCounter}` }

// ============================================================
// 1. 扩充已完成任务（从 5 条增加到 ~18 条，覆盖近 30 天）
// ============================================================
const completedTemplates = [
  { title: '整理上周会议纪要', list: 'meetings', tags: ['会议', '整理'], offset: -1, dur: '1小时' },
  { title: '提交季度预算申请', list: 'work-tasks', tags: ['财务', '重要'], offset: -2, dur: '2小时' },
  { title: '修复登录页样式问题', list: 'work-tasks', tags: ['开发', 'Bug'], offset: -3, dur: '45分钟' },
  { title: '与设计师对齐首页改版', list: 'meetings', tags: ['会议', '设计'], offset: -4, dur: '1.5小时' },
  { title: '更新 API 接口文档', list: 'work-tasks', tags: ['文档', '开发'], offset: -5, dur: '2小时' },
  { title: '完成用户调研报告', list: 'work-tasks', tags: ['调研', '产品'], offset: -6, dur: '3小时' },
  { title: '缴纳本月水电费', list: 'personal', tags: ['生活', '缴费'], offset: -7, dur: '15分钟' },
  { title: '预约牙医检查', list: 'health', tags: ['健康', '预约'], offset: -8, dur: '10分钟' },
  { title: '读完《深度工作》第三章', list: 'reading', tags: ['阅读', '学习'], offset: -10, dur: '40分钟' },
  { title: '整理电脑桌面文件', list: 'personal', tags: ['整理', '效率'], offset: -12, dur: '30分钟' },
  { title: '完成 Python 课程第 4 单元', list: 'courses', tags: ['学习', '编程'], offset: -14, dur: '1小时' },
  { title: '家庭大扫除', list: 'home', tags: ['家务', '周末'], offset: -16, dur: '2小时' },
  { title: '项目 Alpha 周会同步', list: 'meetings', tags: ['会议', '项目'], offset: -18, dur: '1小时' },
  { title: '备份重要文件到移动硬盘', list: 'personal', tags: ['备份', '安全'], offset: -20, dur: '30分钟' },
  { title: '跑步 5 公里', list: 'health', tags: ['运动', '健康'], offset: -22, dur: '35分钟' },
  { title: '整理读书笔记', list: 'reading', tags: ['阅读', '整理'], offset: -25, dur: '1小时' },
]

for (const tpl of completedTemplates) {
  const completedAt = iso(tpl.offset, 16, 30)
  d.tasks.push({
    id: nid('done'),
    title: tpl.title,
    description: '',
    descriptionHtml: `<p>用时约 ${tpl.dur}。</p>`,
    completed: true,
    completedAt,
    deleted: false,
    deletedAt: null,
    pinned: false,
    important: false,
    myDayDate: null,
    listId: tpl.list,
    dueDate: iso(tpl.offset, 18, 0),
    reminderAt: null,
    repeatRule: null,
    priority: 1,
    tags: tpl.tags,
    subtasks: [],
    attachments: [],
    comments: [],
    editorMode: 'detail',
    createdAt: iso(tpl.offset - 1, 9, 0),
    updatedAt: completedAt,
  })
}

// ============================================================
// 2. 扩充垃圾桶任务（从 2 条增加到 6 条）
// ============================================================
const trashTemplates = [
  { title: '过期的活动策划方案', list: 'work-tasks', tags: ['垃圾桶', '文档'], offset: -3 },
  { title: '重复的购物清单', list: 'home', tags: ['垃圾桶', '重复'], offset: -5 },
  { title: '已取消的预约', list: 'health', tags: ['垃圾桶', '取消'], offset: -8 },
  { title: '测试用临时任务', list: 'inbox', tags: ['垃圾桶', '测试'], offset: -12 },
]
for (const tpl of trashTemplates) {
  const deletedAt = iso(tpl.offset, 14, 0)
  d.trash.push({
    id: nid('trash'),
    title: tpl.title,
    description: '',
    descriptionHtml: '',
    completed: false,
    completedAt: null,
    deleted: true,
    deletedAt,
    pinned: false,
    important: false,
    myDayDate: null,
    listId: tpl.list,
    dueDate: null,
    reminderAt: null,
    repeatRule: null,
    priority: 0,
    tags: tpl.tags,
    subtasks: [],
    attachments: [],
    comments: [],
    editorMode: 'detail',
    createdAt: iso(tpl.offset - 2, 10, 0),
    updatedAt: deletedAt,
  })
}

// ============================================================
// 3. 增加已删除清单（listTrash）
// ============================================================
d.listTrash = [
  {
    id: 'deleted-list-1',
    name: '临时项目',
    groupId: 'projects',
    color: '#9ca3af',
    isSystem: false,
    sortOrder: 5000,
    viewMode: 'list',
    deleted: true,
    deletedAt: iso(-5, 10, 0),
    taskCount: 3,
  },
  {
    id: 'deleted-list-2',
    name: '旧版需求池',
    groupId: null,
    color: '#6b7280',
    isSystem: false,
    sortOrder: 6000,
    viewMode: 'list',
    deleted: true,
    deletedAt: iso(-15, 9, 0),
    taskCount: 8,
  },
]

// ============================================================
// 4. 扩充专注记录（从 4 条增加到 ~20 条，覆盖近 14 天）
// ============================================================
const focusTemplates = [
  { task: 'today-1', taskTitle: '10:30 团队站会同步阻塞事项', profile: 'pomodoro', profileName: '番茄专注', offset: 0, startH: 9, startM: 0, mins: 25, result: 'completed', note: '站会同步与阻塞梳理。' },
  { task: 'today-2', taskTitle: '完成季度报告初稿', profile: 'deep-work', profileName: '深度专注', offset: 0, startH: 14, startM: 0, mins: 50, result: 'completed', note: '报告数据整理与初稿撰写。' },
  { task: 'today-4', taskTitle: '每日 20 分钟英语听力', profile: 'free-focus', profileName: '自由时长', offset: 0, startH: 20, startM: 0, mins: 20, result: 'completed', note: '精听与生词整理。' },
  { task: 'tomorrow-2', taskTitle: '准备周五项目评审材料', profile: 'deep-work', profileName: '深度专注', offset: -1, startH: 14, startM: 0, mins: 50, result: 'completed', note: '评审材料梳理。' },
  { task: 'week-1', taskTitle: '本周复盘：整理 7 月目标进展', profile: 'pomodoro', profileName: '番茄专注', offset: -1, startH: 10, startM: 0, mins: 22, result: 'interrupted', note: '临时会议打断。' },
  { task: 'today-3', taskTitle: '下班后买咖啡豆和洗衣液', profile: 'pomodoro', profileName: '番茄专注', offset: -2, startH: 9, startM: 0, mins: 25, result: 'completed', note: '采购清单核对。' },
  { task: 'important-1', taskTitle: '确认备份策略', profile: 'deep-work', profileName: '深度专注', offset: -2, startH: 15, startM: 0, mins: 45, result: 'completed', note: '备份方案确认。' },
  { task: 'reading-1', taskTitle: '阅读《原子习惯》第 3 章', profile: 'free-focus', profileName: '自由时长', offset: -3, startH: 21, startM: 0, mins: 30, result: 'completed', note: '阅读与笔记。' },
  { task: 'project-1', taskTitle: 'Alpha 项目需求评审', profile: 'pomodoro', profileName: '番茄专注', offset: -3, startH: 10, startM: 0, mins: 25, result: 'completed', note: '需求评审准备。' },
  { task: 'today-2', taskTitle: '完成季度报告初稿', profile: 'pomodoro', profileName: '番茄专注', offset: -4, startH: 14, startM: 0, mins: 25, result: 'completed', note: '报告大纲梳理。' },
  { task: 'health-1', taskTitle: '每天运动 30 分钟', profile: 'free-focus', profileName: '自由时长', offset: -4, startH: 18, startM: 0, mins: 30, result: 'completed', note: '慢跑与拉伸。' },
  { task: 'courses-1', taskTitle: '完成 Python 课程第 5 单元', profile: 'deep-work', profileName: '深度专注', offset: -5, startH: 20, startM: 0, mins: 50, result: 'completed', note: '课程学习与练习。' },
  { task: 'tomorrow-1', taskTitle: '09:00 发周报初稿', profile: 'pomodoro', profileName: '番茄专注', offset: -5, startH: 16, startM: 0, mins: 25, result: 'completed', note: '周报撰写。' },
  { task: 'today-1', taskTitle: '10:30 团队站会同步阻塞事项', profile: 'pomodoro', profileName: '番茄专注', offset: -6, startH: 10, startM: 30, mins: 25, result: 'completed', note: '站会记录整理。' },
  { task: 'project-2', taskTitle: 'Beta 项目启动会议', profile: 'deep-work', profileName: '深度专注', offset: -7, startH: 14, startM: 0, mins: 50, result: 'completed', note: '启动会议准备。' },
  { task: 'reading-1', taskTitle: '阅读《原子习惯》第 3 章', profile: 'pomodoro', profileName: '番茄专注', offset: -8, startH: 21, startM: 0, mins: 25, result: 'completed', note: '阅读笔记。' },
  { task: 'important-1', taskTitle: '确认备份策略', profile: 'pomodoro', profileName: '番茄专注', offset: -9, startH: 11, startM: 0, mins: 20, result: 'interrupted', note: '被紧急消息打断。' },
  { task: 'today-4', taskTitle: '每日 20 分钟英语听力', profile: 'free-focus', profileName: '自由时长', offset: -10, startH: 20, startM: 0, mins: 20, result: 'completed', note: '听力练习。' },
]

for (const tpl of focusTemplates) {
  const startedAt = iso(tpl.offset, tpl.startH, tpl.startM)
  const finishedAt = iso(tpl.offset, tpl.startH, tpl.startM + tpl.mins)
  d.clock.history.push({
    id: nid('focus'),
    profileId: tpl.profile,
    profileName: tpl.profileName,
    taskId: tpl.task,
    taskTitle: tpl.taskTitle,
    startedAt,
    finishedAt,
    elapsedSeconds: tpl.mins * 60,
    phase: 'focus',
    result: tpl.result,
    note: tpl.note,
  })
}

// ============================================================
// 5. 增加节律提醒（3 个启用 + 3 个模板参考）
// ============================================================
d.clock.rhythm.reminders = [
  {
    id: 'rhythm-eye',
    title: '护眼远望',
    enabled: true,
    triggerType: 'interval',
    intervalSeconds: 20 * 60,
    weekdays: [1, 2, 3, 4, 5],
    workStart: '09:00',
    workEnd: '18:00',
    quietStart: '12:00',
    quietEnd: '13:30',
    emoji: '👁️',
    color: '#4f8de8',
    messages: ['看看远处，让眼睛休息一下', '20 分钟到了，远望 20 秒', '眼睛累了吗？看看窗外的绿色'],
    cycleStartedAt: iso(0, 9, 0),
    nextDueAt: iso(0, 14, 20),
    pendingSince: null,
    snoozedUntil: null,
    lastCompletedAt: iso(0, 14, 0),
    lastNotifiedAt: iso(0, 14, 0),
    lastResolvedAt: iso(0, 14, 0),
    sortOrder: 1000,
    createdAt: iso(-10, 9, 0),
    updatedAt: iso(0, 14, 0),
  },
  {
    id: 'rhythm-water',
    title: '补水提醒',
    enabled: true,
    triggerType: 'interval',
    intervalSeconds: 60 * 60,
    weekdays: [1, 2, 3, 4, 5, 6, 0],
    workStart: '08:00',
    workEnd: '22:00',
    quietStart: null,
    quietEnd: null,
    emoji: '💧',
    color: '#5fb8ad',
    messages: ['该喝水啦，保持身体水分', '一杯水，让大脑更清醒', '别忘了补水哦'],
    cycleStartedAt: iso(0, 9, 0),
    nextDueAt: iso(0, 15, 0),
    pendingSince: null,
    snoozedUntil: null,
    lastCompletedAt: iso(0, 14, 0),
    lastNotifiedAt: iso(0, 14, 0),
    lastResolvedAt: iso(0, 14, 0),
    sortOrder: 2000,
    createdAt: iso(-10, 9, 0),
    updatedAt: iso(0, 14, 0),
  },
  {
    id: 'rhythm-stretch',
    title: '起身活动',
    enabled: true,
    triggerType: 'active-duration',
    intervalSeconds: 45 * 60,
    weekdays: [1, 2, 3, 4, 5],
    workStart: '09:00',
    workEnd: '18:00',
    quietStart: '12:00',
    quietEnd: '13:30',
    emoji: '🧘',
    color: '#e0a54f',
    messages: ['坐久了，起来活动一下', '伸个懒腰，放松肩颈', '45 分钟到了，走动走动'],
    activitySeconds: 1800,
    lastActivitySampleAt: iso(0, 14, 0),
    pendingSince: null,
    snoozedUntil: null,
    lastCompletedAt: iso(0, 11, 30),
    lastNotifiedAt: iso(0, 11, 30),
    lastResolvedAt: iso(0, 11, 30),
    sortOrder: 3000,
    createdAt: iso(-8, 9, 0),
    updatedAt: iso(0, 14, 0),
  },
  {
    id: 'rhythm-shoulder',
    title: '肩颈舒展',
    enabled: false,
    triggerType: 'active-duration',
    intervalSeconds: 90 * 60,
    weekdays: [1, 2, 3, 4, 5],
    workStart: '09:00',
    workEnd: '18:00',
    emoji: '💆',
    color: '#7c6ee6',
    messages: ['肩颈僵硬了吗？做几组舒展', '放松肩膀，转转脖子'],
    sortOrder: 4000,
    createdAt: iso(-5, 9, 0),
    updatedAt: iso(-5, 9, 0),
  },
  {
    id: 'rhythm-breath',
    title: '呼吸放松',
    enabled: false,
    triggerType: 'interval',
    intervalSeconds: 120 * 60,
    weekdays: [1, 2, 3, 4, 5],
    workStart: '09:00',
    workEnd: '18:00',
    emoji: '🌬️',
    color: '#cf6f87',
    messages: ['深呼吸三次，让自己平静下来', '花一分钟专注呼吸'],
    sortOrder: 5000,
    createdAt: iso(-5, 9, 0),
    updatedAt: iso(-5, 9, 0),
  },
  {
    id: 'rhythm-wrapup',
    title: '今日收尾',
    enabled: false,
    triggerType: 'fixed-time',
    fixedTime: '17:45',
    weekdays: [1, 2, 3, 4, 5],
    emoji: '📋',
    color: '#5f9e72',
    messages: ['快下班了，整理今天的任务', '花 5 分钟回顾今天，规划明天'],
    sortOrder: 6000,
    createdAt: iso(-3, 9, 0),
    updatedAt: iso(-3, 9, 0),
  },
]

// ============================================================
// 6. 增加节律历史记录（12 条，覆盖近 7 天）
// ============================================================
d.clock.rhythm.history = []
const rhythmHistoryTemplates = [
  { rid: 'rhythm-eye', rtitle: '护眼远望', type: 'interval', offset: 0, trigH: 14, trigM: 0, resH: 14, resM: 1, action: 'completed', resp: 60 },
  { rid: 'rhythm-water', rtitle: '补水提醒', type: 'interval', offset: 0, trigH: 14, trigM: 0, resH: 14, resM: 5, action: 'completed', resp: 300 },
  { rid: 'rhythm-stretch', rtitle: '起身活动', type: 'active-duration', offset: 0, trigH: 11, trigM: 30, resH: 11, resM: 35, action: 'snoozed', resp: 300, snooze: 5 },
  { rid: 'rhythm-eye', rtitle: '护眼远望', type: 'interval', offset: -1, trigH: 16, trigM: 0, resH: 16, resM: 2, action: 'completed', resp: 120 },
  { rid: 'rhythm-water', rtitle: '补水提醒', type: 'interval', offset: -1, trigH: 15, trigM: 0, resH: 15, resM: 1, action: 'completed', resp: 60 },
  { rid: 'rhythm-stretch', rtitle: '起身活动', type: 'active-duration', offset: -1, trigH: 10, trigM: 30, resH: 10, resM: 32, action: 'completed', resp: 120 },
  { rid: 'rhythm-eye', rtitle: '护眼远望', type: 'interval', offset: -2, trigH: 15, trigM: 0, resH: 15, resM: 10, action: 'dismissed', resp: 600 },
  { rid: 'rhythm-water', rtitle: '补水提醒', type: 'interval', offset: -2, trigH: 14, trigM: 0, resH: 14, resM: 2, action: 'completed', resp: 120 },
  { rid: 'rhythm-eye', rtitle: '护眼远望', type: 'interval', offset: -3, trigH: 11, trigM: 0, resH: 11, resM: 1, action: 'completed', resp: 60 },
  { rid: 'rhythm-stretch', rtitle: '起身活动', type: 'active-duration', offset: -3, trigH: 14, trigM: 0, resH: 14, resM: 8, action: 'skipped', resp: 480 },
  { rid: 'rhythm-water', rtitle: '补水提醒', type: 'interval', offset: -4, trigH: 16, trigM: 0, resH: 16, resM: 3, action: 'completed', resp: 180 },
  { rid: 'rhythm-eye', rtitle: '护眼远望', type: 'interval', offset: -5, trigH: 10, trigM: 0, resH: 10, resM: 2, action: 'completed', resp: 120 },
]

for (const tpl of rhythmHistoryTemplates) {
  const triggeredAt = iso(tpl.offset, tpl.trigH, tpl.trigM)
  const resolvedAt = iso(tpl.offset, tpl.resH, tpl.resM)
  const timeline = [
    { type: 'triggered', at: triggeredAt, snoozeMinutes: null, responseSeconds: 0 },
  ]
  if (tpl.action === 'snoozed') {
    timeline.push({ type: 'snoozed', at: resolvedAt, snoozeMinutes: tpl.snooze, responseSeconds: 0 })
  }
  timeline.push({ type: tpl.action === 'skipped' ? 'skipped' : tpl.action, at: resolvedAt, snoozeMinutes: null, responseSeconds: tpl.resp })
  d.clock.rhythm.history.push({
    id: nid('rhythm-hist'),
    reminderId: tpl.rid,
    reminderTitle: tpl.rtitle,
    triggerType: tpl.type,
    triggerLabel: tpl.type === 'interval' ? '间隔提醒' : tpl.type === 'active-duration' ? '连续活跃' : '固定时刻',
    triggeredAt,
    resolvedAt,
    action: tpl.action,
    responseSeconds: tpl.resp,
    snoozeMinutes: tpl.action === 'snoozed' ? (tpl.snooze || 5) : null,
    timeline,
  })
}

// ============================================================
// 7. 增加花田数据（garden days、sessionDays、achievements）
// ============================================================
const speciesByDay = [
  { offset: -13, species: 'daisy', growth: 25, goal: 50 },
  { offset: -12, species: 'daisy', growth: 50, goal: 50 },
  { offset: -11, species: 'daisy', growth: 75, goal: 50 },
  { offset: -10, species: 'tulip', growth: 30, goal: 50 },
  { offset: -9, species: 'tulip', growth: 55, goal: 50 },
  { offset: -8, species: 'tulip', growth: 50, goal: 50 },
  { offset: -7, species: 'cosmos', growth: 25, goal: 50 },
  { offset: -6, species: 'cosmos', growth: 70, goal: 50 },
  { offset: -5, species: 'cosmos', growth: 45, goal: 50 },
  { offset: -4, species: 'daisy', growth: 50, goal: 50 },
  { offset: -3, species: 'tulip', growth: 55, goal: 50 },
  { offset: -2, species: 'cosmos', growth: 95, goal: 50 },
  { offset: -1, species: 'daisy', growth: 72, goal: 50 },
  { offset: 0, species: 'daisy', growth: 95, goal: 50 },
]

function gardenStage(growth, goal) {
  const ratio = growth / goal
  if (ratio >= 1) return 'bloom'
  if (ratio >= 0.8) return 'opening'
  if (ratio >= 0.5) return 'bud'
  if (ratio >= 0.2) return 'leaves'
  if (ratio > 0) return 'sprout'
  return 'seed'
}

d.clock.garden = {
  startedAt: iso(-14, 8, 0),
  unlockLadderVersion: 2,
  dailyGoalMinutes: 50,
  selectedSpeciesId: 'daisy',
  nextSpeciesId: null,
  trackedAchievementId: null,
  longestSessionMinutes: 50,
  days: speciesByDay.map(d => ({
    date: dateKey(d.offset),
    speciesId: d.species,
    goalMinutes: d.goal,
    goalAdjustments: 0,
    growthMinutes: d.growth,
    stage: gardenStage(d.growth, d.goal),
    finalizedAt: d.offset < 0 ? iso(d.offset, 23, 59) : null,
  })),
  sessionDays: speciesByDay.map(d => ({
    date: dateKey(d.offset),
    focusMinutes: d.growth,
    goalMinutes: d.goal,
  })),
  achievements: [
    { id: 'first-growth', unlockedAt: iso(-13, 9, 0), progressValue: 957 },
    { id: 'first-bloom', unlockedAt: iso(-12, 18, 0), progressValue: 8 },
    { id: 'active-days-3', unlockedAt: iso(-11, 20, 0), progressValue: 12 },
    { id: 'goal-days-3', unlockedAt: iso(-10, 20, 0), progressValue: 8 },
    { id: 'focus-600', unlockedAt: iso(-5, 20, 0), progressValue: 957 },
    { id: 'bloom-10', unlockedAt: iso(-2, 20, 0), progressValue: 8 },
    { id: 'species-3', unlockedAt: iso(-7, 20, 0), progressValue: 3 },
    { id: 'streak-3', unlockedAt: iso(-11, 20, 0), progressValue: 5 },
    { id: 'streak-7', unlockedAt: iso(-7, 20, 0), progressValue: 7 },
    { id: 'deep-90', unlockedAt: iso(-2, 16, 0), progressValue: 95 },
  ],
}

// ============================================================
// 8. 增加更多未完成任务（丰富各清单数据）
// ============================================================
const moreTasks = [
  { title: '整理客户反馈清单', list: 'work-tasks', tags: ['客户', '整理'], priority: 2, due: 2 },
  { title: '更新产品路线图', list: 'work-tasks', tags: ['产品', '规划'], priority: 2, due: 5 },
  { title: '与运维确认部署流程', list: 'meetings', tags: ['会议', '运维'], priority: 1, due: 1 },
  { title: '写一篇技术博客', list: 'someday', tags: ['写作', '技术'], priority: 0, due: null },
  { title: '研究新框架可行性', list: 'someday', tags: ['调研', '技术'], priority: 0, due: null },
  { title: '买生日礼物', list: 'personal', tags: ['购物', '家庭'], priority: 2, due: 7 },
  { title: '整理手机相册', list: 'personal', tags: ['整理', '照片'], priority: 0, due: null },
  { title: '学做一道新菜', list: 'home', tags: ['烹饪', '生活'], priority: 0, due: null },
  { title: '更换净水器滤芯', list: 'home', tags: ['家务', '维护'], priority: 1, due: 3 },
  { title: '体检报告解读', list: 'health', tags: ['健康', '体检'], priority: 2, due: 4 },
  { title: '买运动鞋', list: 'health', tags: ['购物', '运动'], priority: 1, due: 6 },
  { title: '读完《设计心理学》', list: 'reading', tags: ['阅读', '设计'], priority: 1, due: 10 },
  { title: '整理英语生词本', list: 'reading', tags: ['英语', '整理'], priority: 0, due: null },
  { title: '完成 React 进阶课程', list: 'courses', tags: ['学习', '前端'], priority: 2, due: 14 },
  { title: '准备旅行攻略', list: 'travel', tags: ['旅行', '规划'], priority: 1, due: 20 },
  { title: '检查护照有效期', list: 'travel', tags: ['证件', '旅行'], priority: 2, due: 15 },
]

for (const tpl of moreTasks) {
  d.tasks.push({
    id: nid('task'),
    title: tpl.title,
    description: '',
    descriptionHtml: '',
    completed: false,
    completedAt: null,
    deleted: false,
    deletedAt: null,
    pinned: false,
    important: tpl.priority >= 3,
    myDayDate: null,
    listId: tpl.list,
    dueDate: tpl.due ? iso(tpl.due, 10, 0) : null,
    reminderAt: null,
    repeatRule: null,
    priority: tpl.priority,
    tags: tpl.tags,
    subtasks: [],
    attachments: [],
    comments: [],
    editorMode: 'detail',
    createdAt: iso(-3, 9, 0),
    updatedAt: iso(-1, 10, 0),
  })
}

// ============================================================
// 9. 给"带附件的任务"增加真实的 data URL 图片附件（用于 image-preview 截图）
// ============================================================
const attachTask = d.tasks.find(t => t.title && t.title.includes('带附件'))
if (attachTask) {
  // 1x1 透明 PNG 的 data URL（占位，浏览器环境下可正常显示）
  const placeholderPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  attachTask.attachments = [
    { id: 'att-1', kind: 'image', mime: 'image/png', originalName: '界面设计稿.png', path: '', relativePath: '', sha256: '', sizeBytes: 24500, width: 800, height: 600, url: placeholderPng, createdAt: iso(-2, 10, 0), lastReferencedAt: iso(-2, 10, 0) },
    { id: 'att-2', kind: 'image', mime: 'image/png', originalName: '流程图.png', path: '', relativePath: '', sha256: '', sizeBytes: 18200, width: 600, height: 400, url: placeholderPng, createdAt: iso(-2, 10, 5), lastReferencedAt: iso(-2, 10, 5) },
  ]
  attachTask.descriptionHtml = '<p>这是一个带附件的任务，用于测试图片预览区域。</p><p>附件包含两张设计稿图片：</p><ul><li>界面设计稿.png</li><li>流程图.png</li></ul>'
}

// ============================================================
// 写回文件
// ============================================================
await fs.writeFile(dataPath, JSON.stringify(d, null, 2), 'utf8')

// 统计
const totalTasks = d.tasks.length
const completed = d.tasks.filter(t => t.completed).length
const deleted = d.trash.length
const focusCount = d.clock.history.length
const rhythmCount = d.clock.rhythm.reminders.length
const rhythmHist = d.clock.rhythm.history.length
const gardenDays = d.clock.garden.days.length

console.log('演示数据扩充完成！')
console.log(`  任务总数: ${totalTasks}（未完成 ${totalTasks - completed}，已完成 ${completed}）`)
console.log(`  垃圾桶任务: ${deleted}`)
console.log(`  已删除清单: ${d.listTrash.length}`)
console.log(`  专注记录: ${focusCount}`)
console.log(`  节律提醒: ${rhythmCount}（启用 ${d.clock.rhythm.reminders.filter(r => r.enabled).length}）`)
console.log(`  节律历史: ${rhythmHist}`)
console.log(`  花田成长天数: ${gardenDays}`)
console.log(`  有附件的任务: ${d.tasks.filter(t => t.attachments && t.attachments.length > 0).length}`)
