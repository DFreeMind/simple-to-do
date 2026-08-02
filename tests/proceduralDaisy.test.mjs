import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DAISY_CURVES,
  GERMINATION_CURVE,
  bezierPoint,
  daisyGrowthState,
  partialBezierPoints
} from '../src/utils/proceduralDaisy.mjs'

test('程序化小雏菊始终使用同一根部锚点', () => {
  const root = bezierPoint(DAISY_CURVES.main, 0)
  assert.deepEqual(root, { x: 256, y: 307 })
  for (const progress of [0, 1, 2.5, 4, 5]) {
    assert.deepEqual(partialBezierPoints(DAISY_CURVES.main, progress / 5)[0], root)
  }
})

test('种子阶段使用弯曲胚轴和合拢子叶', () => {
  const seed = daisyGrowthState(0)
  assert.deepEqual(GERMINATION_CURVE.start, DAISY_CURVES.main.start)
  assert.ok(GERMINATION_CURVE.end.x < GERMINATION_CURVE.start.x)
  assert.ok(GERMINATION_CURVE.end.y < GERMINATION_CURVE.start.y)
  assert.equal(seed.germination.alpha, 1)
  assert.equal(seed.germination.coat, 1)
  assert.equal(seed.germination.cotyledonOpening, 0)
})

test('主茎、侧枝、叶片与花朵随进度单调生长', () => {
  const states = [0, 0.5, 1, 2, 3, 4, 5].map(daisyGrowthState)
  for (let index = 1; index < states.length; index += 1) {
    assert.ok(states[index].mainGrowth >= states[index - 1].mainGrowth)
    assert.ok(states[index].leftGrowth >= states[index - 1].leftGrowth)
    assert.ok(states[index].rightGrowth >= states[index - 1].rightGrowth)
    states[index].leaves.forEach((leaf, leafIndex) => {
      assert.ok(leaf.growth >= states[index - 1].leaves[leafIndex].growth)
    })
    states[index].heads.forEach((head, headIndex) => {
      assert.ok(head.budGrowth >= states[index - 1].heads[headIndex].budGrowth)
      assert.ok(head.opening >= states[index - 1].heads[headIndex].opening)
    })
  }
})

test('破土后先展开子叶且所有枝端都有嫩芽遮住截面', () => {
  const sprout = daisyGrowthState(1)
  assert.equal(sprout.leaves.length, 4)
  assert.ok(sprout.leaves[0].growth > 0.5)
  assert.ok(sprout.leaves[1].growth > 0.5)
  assert.equal(sprout.leaves[2].growth, 0)
  assert.equal(sprout.leaves[3].growth, 0)
  assert.equal(sprout.heads[0].tipGrowth, 0)
  assert.ok(daisyGrowthState(1.35).heads[0].tipGrowth > 0)

  const branched = daisyGrowthState(3)
  assert.ok(branched.heads.every(head => head.tipGrowth > 0))
})

test('连续进度可逆且端点稳定', () => {
  assert.equal(daisyGrowthState(-1).progress, 0)
  assert.equal(daisyGrowthState(6).progress, 1)
  assert.deepEqual(daisyGrowthState(2.375), daisyGrowthState(2.375))
  assert.deepEqual(daisyGrowthState(5).heads[0].point, DAISY_CURVES.main.end)
})
