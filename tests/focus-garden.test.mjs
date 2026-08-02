import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FOCUS_GARDEN_ACHIEVEMENTS,
  FOCUS_GARDEN_COLLECTIONS,
  FOCUS_GARDEN_ACHIEVEMENT_REWARDS,
  FOCUS_GARDEN_SPECIES,
  createDefaultFocusGarden,
  gardenStageFor,
  focusGardenTotals,
  normalizeFocusGarden,
  recordFocusGardenGrowth,
  unlockedFocusGardenSpecies,
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
  const collectionIds = new Set(FOCUS_GARDEN_COLLECTIONS.map(item => item.id))
  assert.ok(FOCUS_GARDEN_SPECIES.every(item => collectionIds.has(item.collectionId)))
  assert.deepEqual(
    Object.fromEntries(FOCUS_GARDEN_SPECIES.filter(item => ['daisy', 'tulip', 'sunflower', 'lavender', 'hydrangea'].includes(item.id)).map(item => [item.id, item.unlockMinutes])),
    { daisy: 0, tulip: 60, sunflower: 360, lavender: 900, hydrangea: 1800 }
  )
  const thresholds = FOCUS_GARDEN_SPECIES.map(item => item.unlockMinutes)
  assert.deepEqual(thresholds, [...thresholds].sort((a, b) => a - b))
  assert.deepEqual(thresholds, [0, 60, 180, 360, 600, 900, 1200, 1800, 2700, 3900, 5400, 7200])
  assert.ok(thresholds.slice(1).every((value, index, values) => index === 0 || value > values[index - 1]))
  assert.equal(FOCUS_GARDEN_SPECIES[1].unlockMinutes > FOCUS_GARDEN_SPECIES[0].unlockMinutes, true)
})

test('生长阶段按每日目标比例推进', () => {
  assert.equal(gardenStageFor(0, 50).id, 'seed')
  assert.equal(gardenStageFor(1, 50).id, 'sprout')
  assert.equal(gardenStageFor(10, 50).id, 'leaves')
  assert.equal(gardenStageFor(25, 50).id, 'bud')
  assert.equal(gardenStageFor(40, 50).id, 'opening')
  assert.equal(gardenStageFor(50, 50).id, 'bloom')
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
      growthMinutes: 175,
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
  const grown = recordFocusGardenGrowth(createDefaultFocusGarden(now), { elapsedSeconds: 60 * 60, finishedAt: now.toISOString() }, now).garden
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
