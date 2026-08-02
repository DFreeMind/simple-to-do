export const FOCUS_GARDEN_COLLECTIONS = [
  { id: 'morning', name: '晨光花圃', description: '清晨与暖阳下轻盈舒展的花。', scene: '#f7f3d9' },
  { id: 'breeze', name: '微风花圃', description: '在风里摇曳、适合长时间陪伴的花。', scene: '#e2f0e8' },
  { id: 'twilight', name: '暮色花圃', description: '色彩沉静，在夜色来临前慢慢盛放。', scene: '#e9e5f5' }
]

export const FOCUS_GARDEN_SPECIES = [
  { id: 'daisy', name: '小雏菊', unlockMinutes: 0, collectionId: 'morning', description: '清爽而坚定，从第一段专注开始陪伴。', accent: '#e8bb45', tone: '#fffdf2', scene: '#fff9dc', horizon: '#e4efc9', ground: '#cbdcaf', sun: '#ffe78f', motionDuration: 4.4 },
  { id: 'tulip', name: '郁金香', unlockMinutes: 60, collectionId: 'morning', description: '叶片环抱花茎，花苞会沿着晨光舒展。', accent: '#e98882', tone: '#fff3f1', scene: '#fff0e9', horizon: '#f3d9cb', ground: '#d8dcb5', sun: '#ffd1a8', motionDuration: 4.8 },
  { id: 'cosmos', name: '波斯菊', unlockMinutes: 180, collectionId: 'morning', description: '纤细花茎与轻盈花瓣，微风一来便点头。', accent: '#e78fac', tone: '#fff2f7', scene: '#fff1f6', horizon: '#efd7e5', ground: '#cfe0c3', sun: '#ffd8df', motionDuration: 3.8 },
  { id: 'sunflower', name: '向日葵', unlockMinutes: 360, collectionId: 'morning', description: '追随光线抬头，用完整盛放回应投入。', accent: '#e3ad3f', tone: '#fff9e8', scene: '#fff1bd', horizon: '#ead69a', ground: '#b9cc8d', sun: '#ffd44f', motionDuration: 5.1 },
  { id: 'poppy', name: '虞美人', unlockMinutes: 600, collectionId: 'breeze', description: '薄软花瓣像纸一样舒展，动作轻而有弹性。', accent: '#e36f62', tone: '#fff0ec', scene: '#fff0e6', horizon: '#efd0bf', ground: '#bcd7b6', sun: '#ffc8a6', motionDuration: 3.6 },
  { id: 'lavender', name: '薰衣草', unlockMinutes: 900, collectionId: 'breeze', description: '细密花穗沿着茎干逐段点亮。', accent: '#8d83bd', tone: '#f6f3ff', scene: '#eeeaff', horizon: '#d7d0ee', ground: '#b8cdb4', sun: '#d8ccff', motionDuration: 4.2 },
  { id: 'iris', name: '鸢尾花', unlockMinutes: 1200, collectionId: 'breeze', description: '剑形叶托起层叠花瓣，线条挺拔而舒展。', accent: '#7c79be', tone: '#f2f1ff', scene: '#e8f1ff', horizon: '#cbdceb', ground: '#accabf', sun: '#d4ddff', motionDuration: 4.7 },
  { id: 'hydrangea', name: '绣球花', unlockMinutes: 1800, collectionId: 'twilight', description: '许多小花共同聚成一团温柔的云。', accent: '#759dc9', tone: '#f0f7ff', scene: '#e7f1f7', horizon: '#c8dce7', ground: '#adc9bd', sun: '#d8e8f1', motionDuration: 5.2 },
  { id: 'lily', name: '百合', unlockMinutes: 2700, collectionId: 'breeze', description: '修长花瓣向外展开，盛放时舒展而从容。', accent: '#e8a990', tone: '#fff5ef', scene: '#fff4e9', horizon: '#eadfd2', ground: '#c8d7b8', sun: '#ffe2c3', motionDuration: 5 },
  { id: 'camellia', name: '山茶花', unlockMinutes: 3900, collectionId: 'twilight', description: '厚实叶片围住层层花瓣，安静而饱满。', accent: '#cf7181', tone: '#fff1f4', scene: '#f6e8ea', horizon: '#ddcdd1', ground: '#aebfa9', sun: '#f2c7cd', motionDuration: 5.4 },
  { id: 'peony', name: '牡丹', unlockMinutes: 5400, collectionId: 'twilight', description: '花瓣逐层打开，积累越久越显丰盛。', accent: '#d77a9c', tone: '#fff0f6', scene: '#fae6ef', horizon: '#e5c8d6', ground: '#b8c6aa', sun: '#f4bfd3', motionDuration: 5.6 },
  { id: 'moonflower', name: '月光花', unlockMinutes: 7200, collectionId: 'twilight', description: '在暮色中发出柔和微光，记录长久投入。', accent: '#8e91d2', tone: '#f1f2ff', scene: '#252b52', horizon: '#3f4875', ground: '#5b6b72', sun: '#e7e9ff', night: true, motionDuration: 6 }
]

const LEGACY_FOCUS_GARDEN_UNLOCK_MINUTES = {
  daisy: 0, tulip: 0, cosmos: 60, sunflower: 180, poppy: 360, lavender: 600,
  iris: 900, hydrangea: 1200, lily: 1500, camellia: 2100, peony: 3000, moonflower: 6000
}

export const FOCUS_GARDEN_STAGES = [
  { id: 'seed', name: '种子', threshold: 0 },
  { id: 'sprout', name: '破土', threshold: 0.01 },
  { id: 'leaves', name: '舒叶', threshold: 0.2 },
  { id: 'bud', name: '花苞', threshold: 0.5 },
  { id: 'opening', name: '初绽', threshold: 0.8 },
  { id: 'bloom', name: '盛放', threshold: 1 }
]

export const FOCUS_GARDEN_ACHIEVEMENT_REWARDS = {
  start: { label: '新芽徽记', hint: '为开始刻下的第一枚印章', points: 1 },
  streak: { label: '相伴花环', hint: '把连续投入编成温柔的节奏', points: 2 },
  accumulate: { label: '丰收花冠', hint: '让时间慢慢聚成自己的花田', points: 3 },
  deep: { label: '深潜月桂', hint: '为沉浸而专注的一段时间加冕', points: 3 },
  variety: { label: '花谱印章', hint: '收藏不同花种留下的色彩', points: 2 }
}

export const FOCUS_GARDEN_ACHIEVEMENTS = [
  { id: 'first-growth', name: '专注新芽', description: '完成第一分钟有效专注', kind: 'start', metric: 'totalMinutes', target: 1 },
  { id: 'first-bloom', name: '第一朵花', description: '让一株今日花完整盛放', kind: 'start', metric: 'bloomCount', target: 1 },
  { id: 'active-days-3', name: '三日发芽', description: '在 3 个不同的日子留下专注记录', kind: 'start', metric: 'activeDays', target: 3 },
  { id: 'goal-days-3', name: '三日达标', description: '有 3 天完成当天设定的专注目标', kind: 'start', metric: 'goalDays', target: 3 },
  { id: 'focus-600', name: '十小时光', description: '累计完成 10 小时有效专注', kind: 'accumulate', metric: 'totalMinutes', target: 600 },
  { id: 'focus-1800', name: '三十小时花田', description: '累计完成 30 小时有效专注', kind: 'accumulate', metric: 'totalMinutes', target: 1800 },
  { id: 'focus-3600', name: '六十小时长青', description: '累计完成 60 小时有效专注', kind: 'accumulate', metric: 'totalMinutes', target: 3600 },
  { id: 'bloom-10', name: '十朵成田', description: '累计收获 10 株盛放花朵', kind: 'accumulate', metric: 'bloomCount', target: 10 },
  { id: 'bloom-25', name: '繁花成簇', description: '累计收获 25 株盛放花朵', kind: 'accumulate', metric: 'bloomCount', target: 25 },
  { id: 'deep-90', name: '深潜时刻', description: '完成一次 90 分钟专注', kind: 'deep', metric: 'longestSessionMinutes', target: 90 },
  { id: 'deep-120', name: '静水深流', description: '完成一次 120 分钟专注', kind: 'deep', metric: 'longestSessionMinutes', target: 120 },
  { id: 'deep-180', name: '长夜有光', description: '完成一次 180 分钟专注', kind: 'deep', metric: 'longestSessionMinutes', target: 180 },
  { id: 'species-3', name: '三色花圃', description: '实际培养过 3 种花', kind: 'variety', metric: 'speciesCount', target: 3 },
  { id: 'species-6', name: '半园花色', description: '实际培养过 6 种花', kind: 'variety', metric: 'speciesCount', target: 6 },
  { id: 'species-9', name: '九色花境', description: '实际培养过 9 种花', kind: 'variety', metric: 'speciesCount', target: 9 },
  { id: 'species-12', name: '十二花境', description: '实际培养全部 12 种花', kind: 'variety', metric: 'speciesCount', target: 12 },
  { id: 'collections-3', name: '三境相逢', description: '在晨光、微风、暮色三座花圃都留下成长', kind: 'variety', metric: 'collectionCount', target: 3 },
  { id: 'streak-3', name: '三日相伴', description: '连续 3 天留下专注成长', kind: 'streak', metric: 'longestStreak', target: 3 },
  { id: 'streak-7', name: '一周花事', description: '连续 7 天留下专注成长', kind: 'streak', metric: 'longestStreak', target: 7 },
  { id: 'streak-14', name: '半月常青', description: '连续 14 天留下专注成长', kind: 'streak', metric: 'longestStreak', target: 14 },
  { id: 'active-days-30', name: '三十日花历', description: '在 30 个不同的日子留下专注记录', kind: 'streak', metric: 'activeDays', target: 30 }
]

const DAY_MS = 86_400_000

export function localGardenDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function gardenStageFor(growthMinutes, goalMinutes = 50) {
  const goal = Math.max(10, Math.min(240, Math.round(Number(goalMinutes) || 50)))
  const ratio = Math.max(0, Number(growthMinutes) || 0) / goal
  return [...FOCUS_GARDEN_STAGES].reverse().find(stage => ratio >= stage.threshold) || FOCUS_GARDEN_STAGES[0]
}

export function createDefaultFocusGarden(now = new Date()) {
  return {
    startedAt: new Date(now).toISOString(),
    unlockLadderVersion: 2,
    dailyGoalMinutes: 50,
    selectedSpeciesId: 'daisy',
    nextSpeciesId: null,
    longestSessionMinutes: 0,
    days: [],
    achievements: []
  }
}

export function normalizeFocusGarden(rawGarden, now = new Date()) {
  const fallback = createDefaultFocusGarden(now)
  const raw = rawGarden && typeof rawGarden === 'object' && !Array.isArray(rawGarden) ? rawGarden : {}
  const speciesIds = new Set(FOCUS_GARDEN_SPECIES.map(item => item.id))
  const days = Array.isArray(raw.days)
    ? raw.days.map(normalizeGardenDay).filter(Boolean)
    : []
  const uniqueDays = [...new Map(days.map(day => [day.date, day])).values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-3660)
  const achievementIds = new Set(FOCUS_GARDEN_ACHIEVEMENTS.map(item => item.id))
  const achievements = Array.isArray(raw.achievements)
    ? raw.achievements
      .filter(item => item && achievementIds.has(item.id) && Number.isFinite(new Date(item.unlockedAt).getTime()))
      .map(item => ({ id: item.id, unlockedAt: item.unlockedAt, progressValue: Math.max(0, Number(item.progressValue) || 0) }))
      .filter((item, index, items) => items.findIndex(candidate => candidate.id === item.id) === index)
    : []

  const result = {
    startedAt: Number.isFinite(new Date(raw.startedAt).getTime()) ? raw.startedAt : fallback.startedAt,
    unlockLadderVersion: Number(raw.unlockLadderVersion) >= 2 ? 2 : 1,
    dailyGoalMinutes: Math.max(10, Math.min(240, Math.round(Number(raw.dailyGoalMinutes) || fallback.dailyGoalMinutes))),
    selectedSpeciesId: speciesIds.has(raw.selectedSpeciesId) ? raw.selectedSpeciesId : fallback.selectedSpeciesId,
    nextSpeciesId: speciesIds.has(raw.nextSpeciesId) ? raw.nextSpeciesId : null,
    longestSessionMinutes: Math.max(0, Math.min(480, Math.round(Number(raw.longestSessionMinutes) || 0))),
    days: uniqueDays,
    achievements
  }
  result.achievements = backfillFocusGardenAchievements(result, now)
  return prepareFocusGardenForDate(result, now)
}

function backfillFocusGardenAchievements(garden, now) {
  const totals = focusGardenTotals(garden)
  const existingIds = new Set(garden.achievements.map(item => item.id))
  const inferred = FOCUS_GARDEN_ACHIEVEMENTS
    .filter(item => !existingIds.has(item.id) && Number(totals[item.metric] || 0) >= item.target)
    .map(item => ({
      id: item.id,
      unlockedAt: inferAchievementDate(item, garden, now),
      progressValue: Number(totals[item.metric] || 0)
    }))
  return [...garden.achievements, ...inferred]
}

function inferAchievementDate(achievement, garden, now) {
  if (achievement.metric === 'longestSessionMinutes') return garden.startedAt || new Date(now).toISOString()
  const days = [...(garden.days || [])].filter(day => day.growthMinutes > 0).sort((a, b) => a.date.localeCompare(b.date))
  const speciesIds = new Set()
  const collectionIds = new Set()
  let totalMinutes = 0
  let bloomCount = 0
  let activeDays = 0
  let goalDays = 0
  let longestStreak = 0
  let streak = 0
  for (let index = 0; index < days.length; index += 1) {
    const day = days[index]
    const previous = days[index - 1]
    totalMinutes += Math.max(0, Number(day.growthMinutes) || 0)
    activeDays += 1
    if (gardenStageFor(day.growthMinutes, day.goalMinutes).id === 'bloom') bloomCount += 1
    if (Number(day.growthMinutes) >= Math.max(1, Number(day.goalMinutes) || 50)) goalDays += 1
    speciesIds.add(day.speciesId)
    const collectionId = FOCUS_GARDEN_SPECIES.find(species => species.id === day.speciesId)?.collectionId
    if (collectionId) collectionIds.add(collectionId)
    streak = previous && dateDifference(day.date, previous.date) === 1 ? streak + 1 : 1
    longestStreak = Math.max(longestStreak, streak)
    const progress = { totalMinutes, bloomCount, activeDays, goalDays, speciesCount: speciesIds.size, collectionCount: collectionIds.size, longestStreak }
    if (Number(progress[achievement.metric] || 0) >= achievement.target) return new Date(`${day.date}T23:59:59`).toISOString()
  }
  return garden.startedAt || new Date(now).toISOString()
}

function normalizeGardenDay(rawDay) {
  if (!rawDay || typeof rawDay !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(rawDay.date || '')) return null
  const species = FOCUS_GARDEN_SPECIES.find(item => item.id === rawDay.speciesId) || FOCUS_GARDEN_SPECIES[0]
  const goalMinutes = Math.max(10, Math.min(240, Math.round(Number(rawDay.goalMinutes) || 50)))
  const growthMinutes = Math.max(0, Math.min(24 * 60, Math.round(Number(rawDay.growthMinutes) || 0)))
  return {
    date: rawDay.date,
    speciesId: species.id,
    goalMinutes,
    goalAdjustments: Math.max(0, Math.min(1, Math.round(Number(rawDay.goalAdjustments) || 0))),
    growthMinutes,
    stage: gardenStageFor(growthMinutes, goalMinutes).id,
    finalizedAt: Number.isFinite(new Date(rawDay.finalizedAt).getTime()) ? rawDay.finalizedAt : null
  }
}

export function prepareFocusGardenForDate(garden, now = new Date()) {
  const today = localGardenDateKey(now)
  const prepared = {
    ...garden,
    days: (garden.days || []).map(day => (
      day.date < today && !day.finalizedAt
        ? { ...day, finalizedAt: new Date(now).toISOString() }
        : day
    ))
  }
  const hasToday = prepared.days.some(day => day.date === today)
  if (!hasToday && prepared.nextSpeciesId) {
    prepared.selectedSpeciesId = prepared.nextSpeciesId
    prepared.nextSpeciesId = null
  }
  return prepared
}

export function focusGardenTotals(garden) {
  const days = Array.isArray(garden?.days) ? garden.days : []
  const totalMinutes = days.reduce((sum, day) => sum + Math.max(0, Number(day.growthMinutes) || 0), 0)
  const bloomCount = days.filter(day => gardenStageFor(day.growthMinutes, day.goalMinutes).id === 'bloom').length
  const activeDates = [...new Set(days.filter(day => day.growthMinutes > 0).map(day => day.date))].sort()
  const speciesCount = new Set(days.filter(day => day.growthMinutes > 0).map(day => day.speciesId)).size
  const goalDays = days.filter(day => Number(day.growthMinutes) >= Math.max(1, Number(day.goalMinutes) || 50)).length
  const collectionCount = new Set(days
    .filter(day => day.growthMinutes > 0)
    .map(day => FOCUS_GARDEN_SPECIES.find(species => species.id === day.speciesId)?.collectionId)
    .filter(Boolean)).size
  let longestStreak = 0
  let streak = 0
  activeDates.forEach((date, index) => {
    const previous = activeDates[index - 1]
    if (previous && dateDifference(date, previous) === 1) streak += 1
    else streak = 1
    longestStreak = Math.max(longestStreak, streak)
  })
  return {
    totalMinutes,
    bloomCount,
    speciesCount,
    activeDays: activeDates.length,
    goalDays,
    collectionCount,
    longestStreak,
    longestSessionMinutes: Math.max(0, Number(garden?.longestSessionMinutes) || 0)
  }
}

function dateDifference(later, earlier) {
  const parse = value => {
    const [year, month, day] = String(value).split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }
  return Math.round((parse(later) - parse(earlier)) / DAY_MS)
}

export function unlockedFocusGardenSpecies(garden) {
  const { totalMinutes } = focusGardenTotals(garden)
  const isLegacyGarden = Number(garden?.unlockLadderVersion) < 2
  return FOCUS_GARDEN_SPECIES.filter(species => {
    const threshold = isLegacyGarden ? LEGACY_FOCUS_GARDEN_UNLOCK_MINUTES[species.id] : species.unlockMinutes
    return totalMinutes >= threshold
  })
}

export function recordFocusGardenGrowth(garden, session, now = new Date()) {
  const originalAchievementIds = new Set(Array.isArray(garden?.achievements) ? garden.achievements.map(item => item.id) : [])
  const prepared = prepareFocusGardenForDate(normalizeFocusGarden(garden, now), now)
  const elapsedMinutes = Math.max(0, Math.floor((Number(session?.elapsedSeconds) || 0) / 60))
  if (!elapsedMinutes) return { garden: prepared, unlockedAchievementIds: [], unlockedSpeciesIds: [] }
  const unlockedBefore = new Set(unlockedFocusGardenSpecies(prepared).map(item => item.id))
  const date = localGardenDateKey(session?.finishedAt || now)
  const existingIndex = prepared.days.findIndex(day => day.date === date)
  const existing = existingIndex >= 0 ? prepared.days[existingIndex] : null
  const speciesId = existing?.speciesId || prepared.selectedSpeciesId
  const goalMinutes = existing?.goalMinutes || prepared.dailyGoalMinutes
  const growthMinutes = (existing?.growthMinutes || 0) + elapsedMinutes
  const day = {
    date,
    speciesId,
    goalMinutes,
    goalAdjustments: existing?.goalAdjustments || 0,
    growthMinutes,
    stage: gardenStageFor(growthMinutes, goalMinutes).id,
    finalizedAt: date < localGardenDateKey(now) ? new Date(now).toISOString() : null
  }
  const days = [...prepared.days]
  if (existingIndex >= 0) days.splice(existingIndex, 1, day)
  else days.push(day)
  days.sort((a, b) => a.date.localeCompare(b.date))

  const updated = {
    ...prepared,
    longestSessionMinutes: Math.max(prepared.longestSessionMinutes || 0, elapsedMinutes),
    days: days.slice(-3660)
  }
  const totals = focusGardenTotals(updated)
  const alreadyUnlocked = originalAchievementIds
  const newlyUnlocked = FOCUS_GARDEN_ACHIEVEMENTS.filter(item => (
    !alreadyUnlocked.has(item.id) && Number(totals[item.metric] || 0) >= item.target
  ))
  updated.achievements = [
    ...updated.achievements,
    ...newlyUnlocked.filter(item => !updated.achievements.some(achievement => achievement.id === item.id)).map(item => ({
      id: item.id,
      unlockedAt: new Date(now).toISOString(),
      progressValue: Number(totals[item.metric] || 0)
    }))
  ]
  const unlockedSpeciesIds = unlockedFocusGardenSpecies(updated)
    .filter(item => !unlockedBefore.has(item.id))
    .map(item => item.id)
  return {
    garden: updated,
    unlockedAchievementIds: newlyUnlocked.map(item => item.id),
    unlockedSpeciesIds
  }
}

export function updateFocusGardenPreference(garden, updates, now = new Date()) {
  const prepared = prepareFocusGardenForDate(normalizeFocusGarden(garden, now), now)
  const unlockedIds = new Set(unlockedFocusGardenSpecies(prepared).map(item => item.id))
  const today = localGardenDateKey(now)
  const todayDay = prepared.days.find(day => day.date === today)
  const next = { ...prepared }
  if (updates.dailyGoalMinutes !== undefined) {
    const goalMinutes = Math.max(10, Math.min(240, Math.round(Number(updates.dailyGoalMinutes) || 50)))
    if (!todayDay || todayDay.growthMinutes === 0) {
      next.dailyGoalMinutes = goalMinutes
    } else if ((todayDay.goalAdjustments || 0) < 1 && goalMinutes !== todayDay.goalMinutes) {
      next.days = prepared.days.map(day => day.date === today
        ? {
            ...day,
            goalMinutes,
            goalAdjustments: 1,
            stage: gardenStageFor(day.growthMinutes, goalMinutes).id
          }
        : day)
    }
  }
  if (updates.speciesId && unlockedIds.has(updates.speciesId)) {
    if (!todayDay || todayDay.growthMinutes === 0) {
      next.selectedSpeciesId = updates.speciesId
      next.nextSpeciesId = null
    } else if (updates.speciesId !== todayDay.speciesId) {
      next.nextSpeciesId = updates.speciesId
    }
  }
  next.achievements = backfillFocusGardenAchievements(next, now)
  return next
}

export function monthGardenCells(year, monthIndex, days) {
  const totalDays = new Date(year, monthIndex + 1, 0).getDate()
  const byDate = new Map((days || []).map(day => [day.date, day]))
  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(year, monthIndex, index + 1)
    const key = localGardenDateKey(date)
    return { date: key, day: index + 1, entry: byDate.get(key) || null }
  })
}
