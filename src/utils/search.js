export function normalizeSearchQuery(value) {
  return String(value || '').trim().toLocaleLowerCase()
}

export function htmlToSearchText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getTaskSearchMatchKinds(task, queryValue) {
  const query = normalizeSearchQuery(queryValue)
  if (!query) return []
  const includesQuery = (value) => normalizeSearchQuery(value).includes(query)
  const matches = []

  if (includesQuery(task.title)) matches.push('标题')
  if ((task.tags || []).some(includesQuery)) matches.push('标签')
  if (includesQuery(task.description) || includesQuery(htmlToSearchText(task.descriptionHtml))) matches.push('备注')
  if (includesQuery(task.repeatRule)) matches.push('重复')

  return matches
}

export function matchesTaskSearch(task, queryValue) {
  return getTaskSearchMatchKinds(task, queryValue).length > 0
}
