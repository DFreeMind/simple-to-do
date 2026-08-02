import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { FOCUS_GARDEN_SPECIES } from '../src/utils/focusGarden.mjs'
import {
  PROCEDURAL_PLANT_IDS,
  PROCEDURAL_PLANT_RIGS,
  proceduralPlantState
} from '../src/utils/proceduralPlants.mjs'

test('12 种花都有独立程序化骨架与场景', () => {
  assert.deepEqual(
    [...PROCEDURAL_PLANT_IDS].sort(),
    FOCUS_GARDEN_SPECIES.map(item => item.id).sort()
  )
  assert.equal(new Set(FOCUS_GARDEN_SPECIES.map(item => item.scene)).size, 12)
  assert.ok(FOCUS_GARDEN_SPECIES.every(item => item.horizon && item.ground && item.sun))
  assert.ok(PROCEDURAL_PLANT_IDS.every(id => {
    const rig = PROCEDURAL_PLANT_RIGS[id]
    return rig.curves.length > 0 && rig.leaves.length >= 2 && rig.flower.petalCount >= 5
  }))
})

test('除小雏菊外每种花都有六件独立手绘部件', () => {
  const root = fileURLToPath(new URL('../src/assets/focus-garden/species-rigs/', import.meta.url))
  const previewRoot = fileURLToPath(new URL('../src/assets/focus-garden/species-previews/', import.meta.url))
  const parts = ['pot', 'leaf', 'bud', 'petal', 'center', 'sepal']
  for (const id of PROCEDURAL_PLANT_IDS) {
    assert.ok(existsSync(`${previewRoot}${id}.webp`), `${id} 静态预览缺失`)
    if (id !== 'daisy') {
      for (const part of parts) {
        assert.ok(existsSync(`${root}${id}/${part}.webp`), `${id}/${part} 缺失`)
      }
    }
  }
})

test('每种花盆的造型或材质组合均不同', () => {
  const signatures = PROCEDURAL_PLANT_IDS.map(id => {
    const pot = PROCEDURAL_PLANT_RIGS[id].pot
    return [pot.style, pot.top, pot.bottom, pot.width, pot.height].join(':')
  })
  assert.equal(new Set(signatures).size, 12)
})

test('向日葵使用可扩展细节部件与交互叶序', () => {
  const root = fileURLToPath(new URL('../src/assets/focus-garden/species-rigs/sunflower/detail/', import.meta.url))
  const detailParts = [
    'leaf-mature-left',
    'leaf-mature-right',
    'leaf-young-left',
    'leaf-young-right',
    'bud-half',
    'petal-rear'
  ]
  for (const part of detailParts) {
    assert.ok(existsSync(`${root}${part}.webp`), `sunflower/detail/${part} 缺失`)
  }

  const leaves = PROCEDURAL_PLANT_RIGS.sunflower.leaves
  assert.equal(leaves.length, 5)
  assert.deepEqual(
    leaves.map(item => item.artPart),
    [
      'leaf-mature-left',
      'leaf-mature-right',
      'leaf-mature-left',
      'leaf-young-right',
      'leaf-young-left'
    ]
  )
  assert.ok(leaves.every((item, index) => index === 0 || item.t > leaves[index - 1].t))
  assert.ok(leaves.every(item => item.petioleLength > 0 && item.petioleWidth > 0))
  assert.ok(leaves.some(item => item.layer === 'back'))
  assert.ok(leaves.some(item => item.layer === 'front'))
})

test('所有花种的根点固定且成长状态可正反向计算', () => {
  for (const id of PROCEDURAL_PLANT_IDS) {
    const start = proceduralPlantState(id, 0)
    const middle = proceduralPlantState(id, 2.5)
    const end = proceduralPlantState(id, 5)
    assert.deepEqual(start.curves[0].curve.start, { x: 256, y: 307 })
    assert.ok(end.curves[0].growth >= middle.curves[0].growth)
    assert.ok(middle.curves[0].growth >= start.curves[0].growth)
    assert.ok(end.heads.every(head => head.opening === 1))
    assert.deepEqual(proceduralPlantState(id, 2.5), middle)
  }
})

test('花型、株高、叶序与花头数量形成物种差异', () => {
  const signatures = PROCEDURAL_PLANT_IDS.map(id => {
    const rig = PROCEDURAL_PLANT_RIGS[id]
    return [
      rig.flower.type,
      rig.flower.petalCount,
      rig.curves[0].curve.end.y,
      rig.curves.length,
      rig.leaves.length,
      rig.leaves.map(item => `${item.t}:${item.angle}:${item.scaleY}`).join(',')
    ].join('|')
  })
  assert.equal(new Set(signatures).size, 12)
})
