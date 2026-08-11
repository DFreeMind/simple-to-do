import assert from 'node:assert/strict'
import test from 'node:test'
import { parseUpdateNotes } from '../src/utils/updateNotes.mjs'

test('更新说明会保留 Markdown 的标题、列表与段落层级', () => {
  assert.deepEqual(parseUpdateNotes('# 主要更新\n- 支持多行更新内容\n- 优化更新源\n\n修复已知问题。'), [
    { type: 'heading', text: '主要更新' },
    { type: 'list', items: ['支持多行更新内容', '优化更新源'] },
    { type: 'paragraph', text: '修复已知问题。' }
  ])
})

test('更新说明兼容字面量换行并在无内容时回退', () => {
  assert.deepEqual(parseUpdateNotes('更新说明\\n- 第一项\\n- 第二项'), [
    { type: 'paragraph', text: '更新说明' },
    { type: 'list', items: ['第一项', '第二项'] }
  ])
  assert.deepEqual(parseUpdateNotes(''), [{ type: 'paragraph', text: '本次更新已准备就绪。' }])
})
