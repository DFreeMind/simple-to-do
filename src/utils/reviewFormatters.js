// 专注回顾页面专用的格式化函数集中点。
// 目的：把时长 / 日期 / 响应时间 / 相对日期 / 紧凑标签等文案统一到一份实现里，
// 避免页面内多处定义导致格式不一致（例如 36 小时 51 分钟 vs 36小时51分）。

const LOCALE = 'zh-CN'
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

/**
 * 把秒数格式化为"X 小时 Y 分钟"形式的完整时长。
 * - < 60s：显示秒
 * - < 60min：显示分钟
 * - >= 60min：显示"X 小时 Y 分钟"，分钟为 0 时省略
 * - 输入为 null/undefined/非数：返回 "0 分钟"
 */
export function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0))
  if (value > 0 && value < 60) return `${value} 秒`
  const minutes = Math.round(value / 60)
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  return restMinutes ? `${hours} 小时 ${restMinutes} 分钟` : `${hours} 小时`
}

/**
 * 紧凑版：用于标题区、柱状图数值。省略"分钟"等单位以节省横向空间。
 * 例：90 分钟 → "1小时30分"；25 分钟 → "25分"
 */
export function formatCompactDuration(seconds) {
  const minutes = Math.max(0, Math.round((Number(seconds) || 0) / 60))
  if (minutes < 60) return `${minutes}分`
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  return restMinutes ? `${hours}小时${restMinutes}分` : `${hours}小时`
}

/**
 * 超紧凑：把秒数四舍五入到分钟再渲染成"X小时Y分"或"X分"。柱状图上方用。
 * 与 formatCompactDuration 区别：本函数会做向上取整，便于显示至少 1 分钟的投入。
 */
export function formatChartLabel(seconds) {
  const value = Math.max(0, Number(seconds) || 0)
  if (value === 0) return ''
  if (value < 60) return '<1分'
  return formatCompactDuration(value)
}

/**
 * 短日期：例如 "1月15日 周三"。超过 7 天不变；当年和跨年会加上年份。
 */
export function formatShortDate(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = WEEKDAY_LABELS[date.getDay()]
  return sameYear
    ? `${month}月${day}日 周${weekday}`
    : `${date.getFullYear()}年${month}月${day}日`
}

/**
 * 完整日期时间：例 "2026年1月15日 周三 14:30:25"
 */
export function formatFullDateTime(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(LOCALE, {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(date)
}

/**
 * 时钟时间：例 "14:30"
 */
export function formatClock(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' }).format(date)
}

/**
 * 时间范围：例 "14:30–15:25"
 */
export function formatTimeRange(start, end) {
  if (!start || !end) return ''
  return `${formatClock(start)}–${formatClock(end)}`
}

/**
 * 响应时间：例 "30 秒" / "3 分钟"
 */
export function formatResponseTime(seconds) {
  const value = Math.max(0, Number(seconds) || 0)
  if (value < 60) return `${Math.round(value)} 秒`
  return `${Math.round(value / 60)} 分钟`
}

/**
 * 数字千分位：例 1234 → "1,234"
 */
export function formatCount(value) {
  return new Intl.NumberFormat(LOCALE).format(Math.max(0, Math.round(Number(value) || 0)))
}

/**
 * 把"今日 / 昨日 / X 天前"等相对信息组合进短日期。用于最近记录。
 * - 今日：今日 HH:MM
 * - 昨日：昨日 HH:MM
 * - 跨年：YYYY年M月D日；当年：M月D日
 */
export function formatRelativeDateTime(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const isToday = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  if (isToday) return `今日 ${formatClock(date)}`
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const isYesterday = date.getFullYear() === yesterday.getFullYear() && date.getMonth() === yesterday.getMonth() && date.getDate() === yesterday.getDate()
  if (isYesterday) return `昨日 ${formatClock(date)}`
  return formatShortDate(date)
}

/**
 * 数字带正负号和单位：用于"比上周↑20%"对比标。
 * - value > 0：↑N
 * - value < 0：↓N
 * - value === 0：持平
 */
export function formatDelta(value, formatter = (v) => Math.abs(v).toString(), unit = '') {
  if (!Number.isFinite(value) || value === 0) return { symbol: '持平', text: '持平', raw: 0 }
  const symbol = value > 0 ? '↑' : '↓'
  return {
    symbol,
    text: `${symbol}${formatter(Math.abs(value))}${unit}`,
    raw: value
  }
}

/**
 * 友好的 0 兜底文案：用于统计卡片 / 列表，避免出现赤裸的"0"。
 */
export function formatFriendlyZero(value, empty = '—') {
  if (!value) return empty
  return String(value)
}
