import test from 'node:test'
import assert from 'node:assert/strict'
import { getFocusRemainingRatio } from '../src/utils/focusController.mjs'

test('专注进度环从完整倒计时到空', () => {
  assert.equal(getFocusRemainingRatio(25 * 60, 25 * 60), 1)
  assert.equal(getFocusRemainingRatio(25 * 60, 23 * 60 + 45), 0.95)
  assert.equal(getFocusRemainingRatio(25 * 60, 0), 0)
})

test('专注进度环会限制异常剩余时间并兼容自由计时', () => {
  assert.equal(getFocusRemainingRatio(25 * 60, 30 * 60), 1)
  assert.equal(getFocusRemainingRatio(25 * 60, -1), 0)
  assert.equal(getFocusRemainingRatio(null, 300), 0)
})
