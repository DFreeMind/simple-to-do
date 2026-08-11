const FALLBACK_UPDATE_NOTE = '本次更新已准备就绪。'

function normalizeInlineMarkdown(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|`)/g, '')
    .trim()
}

/**
 * 将更新源中的 Markdown 说明转换为适合桌面卡片展示的轻量分段。
 * 同时兼容部分更新源把换行错误序列化成字面量 "\\n" 的情况。
 */
export function parseUpdateNotes(rawNotes) {
  const raw = String(rawNotes || '').trim()
  if (!raw || /\uFFFD/.test(raw) || /[\u0080-\u00FF]{4,}/.test(raw)) {
    return [{ type: 'paragraph', text: FALLBACK_UPDATE_NOTE }]
  }

  const blocks = []
  let listItems = []
  const flushList = () => {
    if (!listItems.length) return
    blocks.push({ type: 'list', items: listItems })
    listItems = []
  }

  raw
    .replace(/\r\n?/g, '\n')
    .replace(/\\n/g, '\n')
    .split('\n')
    .forEach((line) => {
      const text = line.trim()
      if (!text || /^([-*_])\1\1+$/.test(text)) {
        flushList()
        return
      }
      const heading = text.match(/^#{1,6}\s+(.+)$/)
      if (heading) {
        flushList()
        blocks.push({ type: 'heading', text: normalizeInlineMarkdown(heading[1]) })
        return
      }
      const item = text.match(/^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/)
      if (item) {
        listItems.push(normalizeInlineMarkdown(item[1]))
        return
      }
      flushList()
      blocks.push({ type: 'paragraph', text: normalizeInlineMarkdown(text) })
    })
  flushList()
  return blocks.filter(block => block.type === 'list' ? block.items.length : block.text)
}

export function updateNotesFallback() {
  return FALLBACK_UPDATE_NOTE
}
