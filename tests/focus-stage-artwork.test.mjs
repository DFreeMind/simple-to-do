import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  FOCUS_GARDEN_SPECIES,
  FOCUS_GARDEN_STAGES
} from '../src/utils/focusGarden.mjs'
const stageRoot = fileURLToPath(
  new URL('../src/assets/focus-garden/species-stages/', import.meta.url)
)
const previewRoot = fileURLToPath(
  new URL('../src/assets/focus-garden/species-previews/', import.meta.url)
)
const artworkComponentPath = fileURLToPath(
  new URL('../src/components/FocusStageArtwork.vue', import.meta.url)
)

test('非正方形缩略图不会继承默认的一比一画布', () => {
  const source = readFileSync(artworkComponentPath, 'utf8')
  const thumbnailRule = source.match(/\.focus-stage-artwork\.is-thumbnail\s*\{([^}]*)\}/)?.[1] || ''
  assert.match(thumbnailRule, /aspect-ratio:\s*auto/, '缩略图应取消默认的一比一宽高比')
  assert.match(thumbnailRule, /min-width:\s*0/, '缩略图应允许收缩到外层卡片宽度')
  assert.match(thumbnailRule, /height:\s*100%/, '缩略图应沿用外层卡片高度')
})

test('12 种花均提供六张完整阶段原画', () => {
  const paths = []
  for (const species of FOCUS_GARDEN_SPECIES) {
    for (const stage of FOCUS_GARDEN_STAGES) {
      const path = `${stageRoot}${species.id}/${stage.id}.webp`
      assert.ok(existsSync(path), `${species.id}/${stage.id} 阶段原画缺失`)
      assert.ok(statSync(path).size > 8_000, `${species.id}/${stage.id} 原画体积异常`)
      paths.push(path)
    }
    assert.ok(
      existsSync(`${previewRoot}${species.id}.webp`),
      `${species.id} 盛放预览缺失`
    )
  }
  assert.equal(paths.length, 72)
})

test('每种花的六个阶段均为独立画面', () => {
  for (const species of FOCUS_GARDEN_SPECIES) {
    const hashes = FOCUS_GARDEN_STAGES.map(stage => {
      const bytes = readFileSync(`${stageRoot}${species.id}/${stage.id}.webp`)
      return createHash('sha256').update(bytes).digest('hex')
    })
    assert.equal(new Set(hashes).size, 6, `${species.id} 存在重复阶段原画`)
  }
})

test('所有种子与盛放原画均按花种独立绘制', () => {
  for (const stageId of ['seed', 'bloom']) {
    const hashes = FOCUS_GARDEN_SPECIES.map(species => {
      const bytes = readFileSync(`${stageRoot}${species.id}/${stageId}.webp`)
      return createHash('sha256').update(bytes).digest('hex')
    })
    assert.equal(new Set(hashes).size, 12, `${stageId} 阶段存在跨花种复用`)
  }
})

test('阶段原画与图鉴预览均为透明前景素材', () => {
  const alphaChunk = Buffer.from('ALPH')
  for (const species of FOCUS_GARDEN_SPECIES) {
    for (const stage of FOCUS_GARDEN_STAGES) {
      const bytes = readFileSync(`${stageRoot}${species.id}/${stage.id}.webp`)
      assert.ok(
        bytes.includes(alphaChunk),
        `${species.id}/${stage.id} 应包含透明通道，不能自带矩形背景`
      )
    }
    const preview = readFileSync(`${previewRoot}${species.id}.webp`)
    assert.ok(
      preview.includes(alphaChunk),
      `${species.id} 图鉴预览应包含透明通道`
    )
  }
})
