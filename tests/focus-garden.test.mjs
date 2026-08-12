import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FOCUS_GARDEN_ACHIEVEMENTS,
  FOCUS_GARDEN_COLLECTIONS,
  FOCUS_GARDEN_ACHIEVEMENT_REWARDS,
  FOCUS_GARDEN_RANKS,
  FOCUS_GARDEN_SPECIES,
  FOCUS_SPECIES_COMPANION_LEVELS,
  createDefaultFocusGarden,
  focusGardenCollectionCompletionDate,
  focusGardenStageMilestones,
  gardenStageFor,
  focusGardenTotals,
  focusSpeciesCompanionLevel,
  normalizeFocusGarden,
  recordFocusGardenGrowth,
  unlockedFocusGardenSpecies,
  updateTrackedFocusGardenAchievement,
  updateFocusGardenPreference
} from '../src/utils/focusGarden.mjs'

test('成长徽章覆盖多种维度并提供分类奖励', () => {
  assert.ok(FOCUS_GARDEN_ACHIEVEMENTS.length >= 20)
  const kinds = new Set(FOCUS_GARDEN_ACHIEVEMENTS.map(item => item.kind))
  assert.deepEqual([...kinds].sort(), ['accumulate', 'deep', 'start', 'streak', 'variety'])
  kinds.forEach(kind => assert.ok(FOCUS_GARDEN_ACHIEVEMENT_REWARDS[kind]?.label))
})

test('花种目录包含 12 种且解锁门槛形成递增阶梯', () => {
  assert.equal(FOCUS_GARDEN_SPECIES.length, 12)
  assert.equal(new Set(FOCUS_GARDEN_SPECIES.map(item => item.id)).size, 12)
  assert.ok(FOCUS_GARDEN_SPECIES.every(item => typeof item.flowerLanguage === 'string' && item.flowerLanguage.length >= 4))
  assert.ok(FOCUS_GARDEN_SPECIES.every(item => typeof item.gardenMessage === 'string' && item.gardenMessage.length >= 8))
  assert.deepEqual(Object.fromEntries(FOCUS_GARDEN_SPECIES.map(item => [item.id, item.flowerLanguage])), {
    daisy: '天真、和平与希望', tulip: '爱的表白、荣誉与永恒', cosmos: '纯真、自由与永远快乐', sunflower: '信念、光辉与忠诚',
    poppy: '生离死别与悲歌', lavender: '等待爱情', iris: '好消息、希望与勇气', hydrangea: '感谢、希望与团聚',
    lily: '顺利、心想事成与祝福', camellia: '理想的爱与谦让', peony: '富贵、圆满与吉祥', moonflower: '梦想常在'
  })
  const collectionIds = new Set(FOCUS_GARDEN_COLLECTIONS.map(item => item.id))
  assert.ok(FOCUS_GARDEN_SPECIES.every(item => collectionIds.has(item.collectionId)))
  assert.deepEqual(
    Object.fromEntries(FOCUS_GARDEN_SPECIES.filter(item => ['daisy', 'tulip', 'sunflower', 'lavender', 'hydrangea'].includes(item.id)).map(item => [item.id, item.unlockMinutes])),
    { daisy: 0, tulip: 150, sunflower: 900, lavender: 2250, hydrangea: 4800 }
  )
  const thresholds = FOCUS_GARDEN_SPECIES.map(item => item.unlockMinutes)
  assert.deepEqual(thresholds, [...thresholds].sort((a, b) => a - b))
  assert.deepEqual(thresholds, [0, 150, 450, 900, 1500, 2250, 3300, 4800, 6600, 8700, 11400, 15000])
  assert.ok(thresholds.slice(1).every((value, index, values) => index === 0 || value > values[index - 1]))
  assert.equal(FOCUS_GARDEN_SPECIES[1].unlockMinutes > FOCUS_GARDEN_SPECIES[0].unlockMinutes, true)
})

test('花田长期等级覆盖第一册完成与多年成长', () => {
  assert.deepEqual(FOCUS_GARDEN_RANKS.map(item => item.threshold), [0, 60, 180, 600, 1800, 5400, 9000, 15000, 24000, 36000])
  assert.equal(FOCUS_GARDEN_RANKS.find(item => item.threshold === 15000)?.name, '花境守望者')
})

test('单花陪伴等级同时要求培养分钟与盛放次数', () => {
  assert.deepEqual(FOCUS_SPECIES_COMPANION_LEVELS.map(item => item.name), ['初识', '初绽', '相伴', '熟稔', '共生'])
  assert.equal(focusSpeciesCompanionLevel(300, 4).name, '初绽')
  const companion = focusSpeciesCompanionLevel(300, 5)
  assert.equal(companion.name, '相伴')
  assert.equal(companion.next.name, '熟稔')
  assert.equal(companion.remainingMinutes, 600)
  assert.equal(companion.remainingBlooms, 7)
  assert.equal(focusSpeciesCompanionLevel(1800, 30).name, '共生')
  assert.equal(focusSpeciesCompanionLevel(1800, 30, false), null)
})

test('第一册完成日期由累计分钟首次跨过最终门槛的花田日派生', () => {
  const garden = {
    ...createDefaultFocusGarden(new Date('2026-01-01T08:00:00+08:00')),
    days: [
      { date: '2026-01-01', speciesId: 'daisy', goalMinutes: 50, growthMinutes: 8000 },
      { date: '2026-01-02', speciesId: 'tulip', goalMinutes: 50, growthMinutes: 6999 },
      { date: '2026-01-03', speciesId: 'cosmos', goalMinutes: 50, growthMinutes: 1 }
    ]
  }
  assert.equal(focusGardenCollectionCompletionDate(garden), '2026-01-03')
  assert.equal(focusGardenCollectionCompletionDate({ ...garden, days: garden.days.slice(0, 2) }), null)
})

test('生长阶段按每日目标比例推进', () => {
  assert.equal(gardenStageFor(0, 50).id, 'seed')
  assert.equal(gardenStageFor(1, 50).id, 'sprout')
  assert.equal(gardenStageFor(10, 50).id, 'leaves')
  assert.equal(gardenStageFor(25, 50).id, 'bud')
  assert.equal(gardenStageFor(40, 50).id, 'opening')
  assert.equal(gardenStageFor(50, 50).id, 'bloom')
})

test('阶段门槛会随今日目标换算为可预期的专注分钟', () => {
  assert.deepEqual(focusGardenStageMilestones(50).map(item => item.minutes), [0, 1, 10, 25, 40, 50])
  assert.deepEqual(focusGardenStageMilestones(25).map(item => item.minutes), [0, 1, 5, 13, 20, 25])
  assert.deepEqual(focusGardenStageMilestones(90).map(item => item.minutes), [0, 1, 18, 45, 72, 90])
})

test('旧花园继续按旧门槛保持已解锁状态', () => {
  const legacy = {
    dailyGoalMinutes: 50,
    selectedSpeciesId: 'daisy',
    days: [{ date: '2026-07-28', speciesId: 'daisy', goalMinutes: 50, growthMinutes: 60 }]
  }
  const ids = unlockedFocusGardenSpecies(normalizeFocusGarden(legacy, new Date('2026-07-28T10:00:00+08:00'))).map(item => item.id)
  assert.deepEqual(ids, ['daisy', 'tulip', 'cosmos'])
})

test('完成专注累计今日花并解锁首个成长徽章', () => {
  const now = new Date('2026-07-28T10:00:00+08:00')
  const garden = createDefaultFocusGarden(now)
  const first = recordFocusGardenGrowth(garden, { elapsedSeconds: 25 * 60, finishedAt: now.toISOString() }, now)
  const second = recordFocusGardenGrowth(first.garden, { elapsedSeconds: 25 * 60, finishedAt: now.toISOString() }, now)
  assert.equal(second.garden.days.length, 1)
  assert.equal(second.garden.days[0].growthMinutes, 50)
  assert.equal(second.garden.days[0].stage, 'bloom')
  assert.deepEqual(new Set(second.garden.achievements.map(item => item.id)), new Set(['first-growth', 'first-bloom']))
})

test('跨过累计门槛时只报告本轮新解锁花种', () => {
  const now = new Date('2026-07-28T10:00:00+08:00')
  const garden = {
    ...createDefaultFocusGarden(now),
    days: [{
      date: '2026-07-28',
      speciesId: 'daisy',
      goalMinutes: 50,
      growthMinutes: 445,
      stage: 'bloom',
      finalizedAt: null
    }]
  }
  const result = recordFocusGardenGrowth(garden, { elapsedSeconds: 5 * 60, finishedAt: now.toISOString() }, now)
  assert.deepEqual(result.unlockedSpeciesIds, ['cosmos'])
  const next = recordFocusGardenGrowth(result.garden, { elapsedSeconds: 5 * 60, finishedAt: now.toISOString() }, now)
  assert.deepEqual(next.unlockedSpeciesIds, [])
})

test('培养 6 种与 12 种花会解锁收藏徽章', () => {
  const now = new Date('2026-07-28T10:00:00+08:00')
  const speciesIds = FOCUS_GARDEN_SPECIES.map(item => item.id)
  const days = speciesIds.slice(0, 11).map((speciesId, index) => ({
    date: `2026-07-${String(index + 1).padStart(2, '0')}`,
    speciesId,
    goalMinutes: 50,
    growthMinutes: 600,
    stage: 'bloom',
    finalizedAt: now.toISOString()
  }))
  const garden = {
    ...createDefaultFocusGarden(now),
    selectedSpeciesId: speciesIds[11],
    days
  }
  const result = recordFocusGardenGrowth(garden, { elapsedSeconds: 60, finishedAt: now.toISOString() }, now)
  const achievementIds = new Set(result.unlockedAchievementIds)
  assert.ok(achievementIds.has('species-6'))
  assert.ok(achievementIds.has('species-12'))
})

test('已有成长后切换花种只影响明日', () => {
  const now = new Date('2026-07-28T10:00:00+08:00')
  const grown = recordFocusGardenGrowth(createDefaultFocusGarden(now), { elapsedSeconds: 150 * 60, finishedAt: now.toISOString() }, now).garden
  const updated = updateFocusGardenPreference(grown, { speciesId: 'tulip' }, now)
  assert.equal(updated.selectedSpeciesId, 'daisy')
  assert.equal(updated.nextSpeciesId, 'tulip')
  const tomorrow = normalizeFocusGarden(updated, new Date('2026-07-29T08:00:00+08:00'))
  assert.equal(tomorrow.selectedSpeciesId, 'tulip')
  assert.equal(tomorrow.nextSpeciesId, null)
})

test('当天已有成长后允许修正一次今日目标', () => {
  const now = new Date('2026-07-28T10:00:00+08:00')
  const grown = recordFocusGardenGrowth(createDefaultFocusGarden(now), { elapsedSeconds: 25 * 60, finishedAt: now.toISOString() }, now).garden
  const adjusted = updateFocusGardenPreference(grown, { dailyGoalMinutes: 90 }, now)
  const day = adjusted.days[0]
  assert.equal(day.goalMinutes, 90)
  assert.equal(day.goalAdjustments, 1)
  assert.equal(day.stage, 'leaves')

  const locked = updateFocusGardenPreference(adjusted, { dailyGoalMinutes: 120 }, now)
  assert.equal(locked.days[0].goalMinutes, 90)
  assert.equal(locked.days[0].goalAdjustments, 1)
})

test('旧状态迁移不根据旧专注历史反推花园天数', () => {
  const garden = normalizeFocusGarden(null, new Date('2026-07-28T10:00:00+08:00'))
  assert.equal(garden.days.length, 0)
  assert.equal(garden.dailyGoalMinutes, 50)
})

test('花田统计能够记录有效天数和最长连续成长', () => {
  const totals = focusGardenTotals({
    days: [
      { date: '2026-07-01', speciesId: 'daisy', goalMinutes: 50, growthMinutes: 20 },
      { date: '2026-07-02', speciesId: 'daisy', goalMinutes: 50, growthMinutes: 50 },
      { date: '2026-07-04', speciesId: 'tulip', goalMinutes: 50, growthMinutes: 50 },
      { date: '2026-07-05', speciesId: 'tulip', goalMinutes: 50, growthMinutes: 0 }
    ],
    longestSessionMinutes: 45
  })
  assert.equal(totals.activeDays, 3)
  assert.equal(totals.goalDays, 2)
  assert.equal(totals.collectionCount, 1)
  assert.equal(totals.longestStreak, 2)
  assert.equal(totals.longestSessionMinutes, 45)
})

test('连续三天成长会解锁坚持类徽章', () => {
  let garden = createDefaultFocusGarden(new Date('2026-07-01T10:00:00+08:00'))
  let result
  for (let index = 0; index < 3; index += 1) {
    const now = new Date(`2026-07-0${index + 1}T10:00:00+08:00`)
    result = recordFocusGardenGrowth(garden, { elapsedSeconds: 10 * 60, finishedAt: now.toISOString() }, now)
    garden = result.garden
  }
  assert.ok(result.unlockedAchievementIds.includes('active-days-3'))
  assert.ok(result.unlockedAchievementIds.includes('streak-3'))
})

test('已有花田记录会补齐达到门槛的新成就', () => {
  const now = new Date('2026-07-10T10:00:00+08:00')
  const garden = normalizeFocusGarden({
    ...createDefaultFocusGarden(now),
    days: Array.from({ length: 3 }, (_, index) => ({
      date: `2026-07-0${index + 1}`,
      speciesId: 'daisy',
      goalMinutes: 50,
      growthMinutes: 600,
      stage: 'bloom',
      finalizedAt: now.toISOString()
    }))
  }, now)
  const ids = new Set(garden.achievements.map(item => item.id))
  assert.ok(ids.has('focus-600'))
  assert.ok(ids.has('active-days-3'))
  assert.ok(ids.has('goal-days-3'))
})

test('成长徽章只允许追踪一个未获得目标并兼容旧数据', () => {
  const now = new Date('2026-07-10T10:00:00+08:00')
  const garden = createDefaultFocusGarden(now)
  const first = updateTrackedFocusGardenAchievement(garden, 'focus-600')
  assert.equal(first.trackedAchievementId, 'focus-600')
  const replaced = updateTrackedFocusGardenAchievement(first, 'species-3')
  assert.equal(replaced.trackedAchievementId, 'species-3')
  assert.equal(updateTrackedFocusGardenAchievement(replaced, 'unknown').trackedAchievementId, null)
  assert.equal(normalizeFocusGarden({ ...garden, trackedAchievementId: 'focus-600' }, now).trackedAchievementId, 'focus-600')
})

test('追踪中的徽章获得后自动取消追踪', () => {
  const now = new Date('2026-07-10T10:00:00+08:00')
  const garden = updateTrackedFocusGardenAchievement(createDefaultFocusGarden(now), 'deep-90')
  const result = recordFocusGardenGrowth(garden, { elapsedSeconds: 90 * 60, finishedAt: now.toISOString() }, now)
  assert.ok(result.unlockedAchievementIds.includes('deep-90'))
  assert.equal(result.garden.trackedAchievementId, null)
  assert.equal(updateTrackedFocusGardenAchievement(result.garden, 'deep-90').trackedAchievementId, null)
})
