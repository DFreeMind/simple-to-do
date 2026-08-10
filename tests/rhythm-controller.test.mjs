import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatRhythmCountdown,
  formatRhythmControllerTime,
  getRhythmControllerLiveSeconds,
  rhythmControllerProgress,
  sortRhythmControllerItems
} from '../src/utils/rhythmController.mjs'

test('节律控制器按待处理、运行、等待和暂停排序', () => {
  const items = sortRhythmControllerItems([
    { id: 'paused', state: 'paused', remainingSeconds: 30 },
    { id: 'later', state: 'running', remainingSeconds: 600 },
    { id: 'waiting', state: 'waiting', remainingSeconds: 0 },
    { id: 'due-later', state: 'due', pendingSince: 200 },
    { id: 'soon', state: 'running', remainingSeconds: 60 },
    { id: 'due-first', state: 'due', pendingSince: 100 }
  ])
  assert.deepEqual(items.map(item => item.id), ['due-first', 'due-later', 'soon', 'later', 'waiting', 'paused'])
})

test('只有正在计数的运行项会在控制器本地递减', () => {
  const syncedAt = 1_000_000
  assert.equal(getRhythmControllerLiveSeconds({ state: 'running', counting: true, remainingSeconds: 120 }, syncedAt + 30_000, syncedAt), 90)
  assert.equal(getRhythmControllerLiveSeconds({ state: 'paused', counting: false, remainingSeconds: 120 }, syncedAt + 30_000, syncedAt), 120)
  assert.equal(getRhythmControllerLiveSeconds({ state: 'outside-schedule', counting: false, remainingSeconds: 120 }, syncedAt + 30_000, syncedAt), 120)
})

test('控制器时间格式兼容一小时以上的节律', () => {
  assert.equal(formatRhythmControllerTime(59 * 60 + 8), '59:08')
  assert.equal(formatRhythmControllerTime(2 * 3600 + 5 * 60 + 9), '02:05:09')
  assert.equal(formatRhythmCountdown(18 * 60 + 42), '18:42')
  assert.equal(formatRhythmCountdown(30 * 60), '30:00')
  assert.equal(formatRhythmCountdown(2 * 3600 + 5 * 60 + 9), '02:05:09')
})

test('间隔提醒与连续使用提醒采用各自的进度方向', () => {
  assert.equal(rhythmControllerProgress({ triggerType: 'interval', durationSeconds: 100 }, 25), 0.25)
  assert.equal(rhythmControllerProgress({ triggerType: 'active-duration', durationSeconds: 100 }, 25), 0.75)
})
