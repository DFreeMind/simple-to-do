<template>
  <div class="review-range-control">
    <div ref="rowRef" class="review-range-control__row" role="group" aria-label="时间范围">
      <button
        v-for="option in presetOptions"
        :key="option.id"
        type="button"
        class="review-range-control__chip"
        :class="{ active: range === option.id }"
        :title="option.hint"
        @click="selectRange(option.id)"
      >
        {{ option.label }}
      </button>
      <button
        ref="customTriggerRef"
        type="button"
        class="review-range-control__chip review-range-control__chip--custom"
        :class="{ active: range === 'custom', open: popoverOpen }"
        :aria-expanded="popoverOpen"
        :aria-haspopup="true"
        :title="customHint"
        @click="toggleCustom"
      >
        <Calendar :size="12" />
        <span>{{ customButtonLabel }}</span>
        <ChevronDown :size="11" :class="{ 'is-open': popoverOpen }" />
      </button>
    </div>

    <Teleport to="body">
      <Transition name="review-range-pop">
        <div
          v-if="popoverOpen"
          ref="popoverRef"
          class="review-range-popover"
          :style="popoverStyle"
          role="dialog"
          aria-label="选择时间范围"
          tabindex="-1"
          @click.stop
        >
          <header class="review-range-popover__head">
            <div class="review-range-popover__title">
              <span class="review-range-popover__badge"><Calendar :size="13" /></span>
              <div>
                <strong>选择时间范围</strong>
                <small>先选开始日期，再选结束日期</small>
              </div>
            </div>
            <button type="button" class="review-range-popover__close" aria-label="关闭" @click="closePopover">
              <X :size="14" />
            </button>
          </header>

          <div class="review-range-popover__body">
            <section class="review-range-popover__shortcuts">
              <h4>快捷</h4>
              <div class="review-range-popover__chips">
                <button
                  v-for="item in POPOVER_SHORTCUTS"
                  :key="item.id"
                  type="button"
                  :class="{ active: isShortcutActive(item) }"
                  @click="applyShortcut(item.days)"
                >
                  {{ item.label }}
                </button>
                <button
                  type="button"
                  :class="{ active: range === 'all' }"
                  @click="applyShortcut(null)"
                >
                  全部
                </button>
              </div>
            </section>

            <section class="review-range-popover__dates" aria-label="已选范围">
              <div class="review-range-popover__date-slot" :class="{ picking: picking === 'start', filled: !!customStart }">
                <span class="review-range-popover__date-slot-label">
                  开始日期
                  <em v-if="picking === 'start'">选择中</em>
                </span>
                <span class="review-range-popover__date-slot-value" :class="{ placeholder: !customStart }">{{ startDisplay }}</span>
              </div>
              <span class="review-range-popover__date-arrow" aria-hidden="true">→</span>
              <div class="review-range-popover__date-slot" :class="{ picking: picking === 'end', filled: !!customEnd }">
                <span class="review-range-popover__date-slot-label">
                  结束日期
                  <em v-if="picking === 'end'">选择中</em>
                </span>
                <span class="review-range-popover__date-slot-value" :class="{ placeholder: !customEnd }">{{ endDisplay }}</span>
              </div>
            </section>

            <section class="review-range-popover__calendar">
              <div class="review-range-popover__cal-head">
                <button type="button" class="review-range-popover__cal-nav" aria-label="上个月" @click="moveMonth(-1)">
                  <ChevronLeft :size="14" />
                </button>
                <strong>{{ viewTitle }}</strong>
                <button type="button" class="review-range-popover__cal-nav" aria-label="下个月" @click="moveMonth(1)">
                  <ChevronRight :size="14" />
                </button>
              </div>
              <div class="review-range-popover__cal-grid" role="grid" aria-label="日期选择">
                <span v-for="w in WEEK_DAYS" :key="w" class="review-range-popover__cal-weekday">{{ w }}</span>
                <button
                  v-for="(cell, i) in calendarCells"
                  :key="i"
                  type="button"
                  role="gridcell"
                  class="review-range-popover__cal-day"
                  :class="dayClass(cell)"
                  :aria-label="ariaDay(cell)"
                  :aria-selected="isEndpoint(formatDateKey(cell.date))"
                  @mouseenter="hoverDate = cell.date"
                  @mouseleave="hoverDate = null"
                  @click="onDateClick(cell.date)"
                >
                  {{ cell.date.getDate() }}
                </button>
              </div>
              <p class="review-range-popover__cal-hint" :class="{ show: !!picking }">
                {{ picking === 'start' ? '在日历中选择开始日期' : '在日历中选择结束日期' }}
              </p>
            </section>
          </div>

          <footer class="review-range-popover__foot">
            <span class="review-range-popover__selection" :class="{ empty: !customStart && !customEnd }">
              <span class="review-range-popover__selection-dot" />
              {{ selectionLabel }}
            </span>
            <div class="review-range-popover__actions">
              <button type="button" class="review-range-popover__reset" :disabled="!customStart && !customEnd" title="重置为近 7 天" @click="resetCustom">
                <RotateCcw :size="12" />重置
              </button>
              <button type="button" class="review-range-popover__done" @click="closePopover">完成</button>
            </div>
          </footer>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-vue-next'

// 顶部只展示最常用的 5 个预设，剩余放进 popover 的快捷区
// 选 5 个的依据：进入概览/管理页后用户最常切的"日 / 周 / 月 / 全部"
// 加上"近 7 天"作为对照（与本周并列存在，让用户能区分自然周 vs 滚动 7 天）
const RANGE_OPTIONS = [
  { id: 'today', label: '今日', hint: '今天 0 点到当前' },
  { id: 'thisWeek', label: '本周', hint: '本周日至今（自然周）' },
  { id: '7d', label: '近 7 天', hint: '包含今天，向前滚动 7 天' },
  { id: 'thisMonth', label: '本月', hint: '本月 1 日至今' },
  { id: 'all', label: '全部', hint: '所有历史记录' }
]
const POPOVER_SHORTCUTS = [
  { id: 'today', days: 1, label: '今日' },
  { id: 'yesterday', days: 2, label: '昨日' },
  { id: '7d', days: 7, label: '近 7 天' },
  { id: '30d', days: 30, label: '近 30 天' },
  { id: '90d', days: 90, label: '近 90 天' }
]
const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日']

const props = defineProps({
  range: { type: String, required: true },
  customStart: { type: String, default: '' },
  customEnd: { type: String, default: '' }
})
const emit = defineEmits(['update:range', 'update:customStart', 'update:customEnd'])

const presetOptions = RANGE_OPTIONS
const rowRef = ref(null)
const customTriggerRef = ref(null)
const popoverRef = ref(null)
const popoverOpen = ref(false)
const triggerRect = ref({ left: 0, top: 0, width: 0, bottom: 0 })
const viewDate = ref(new Date())
const hoverDate = ref(null)
// 当前在选哪个端点：'start' | 'end' | null（null 表示两端已选，再点即重选）
const picking = ref('start')

const customButtonLabel = computed(() => {
  if (props.range !== 'custom') return '自定义'
  if (!props.customStart && !props.customEnd) return '自定义'
  if (!props.customStart) return `至 ${props.customEnd.slice(5)}`
  if (!props.customEnd) return `${props.customStart.slice(5)} 起`
  return `${props.customStart.slice(5)} – ${props.customEnd.slice(5)}`
})

const customHint = computed(() => '点击选择起止日期或快捷预设')

const startDisplay = computed(() => props.customStart || '点选日期')
const endDisplay = computed(() => props.customEnd || '点选日期')

const selectionLabel = computed(() => {
  const s = props.customStart
  const e = props.customEnd
  if (s && e) return `${s} – ${e}`
  if (s) return `${s} 起`
  if (e) return `至 ${e}`
  return '未选择范围'
})

const viewTitle = computed(() => `${viewDate.value.getFullYear()}年${viewDate.value.getMonth() + 1}月`)

// 生成 6 行 × 7 列的月历网格（周一起始，含上下月补位）
const calendarCells = computed(() => {
  const y = viewDate.value.getFullYear()
  const m = viewDate.value.getMonth()
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const prevDays = new Date(y, m, 0).getDate()
  const cells = []
  for (let i = offset - 1; i >= 0; i--) cells.push({ date: new Date(y, m - 1, prevDays - i), inMonth: false })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(y, m, d), inMonth: true })
  const rest = 42 - cells.length
  for (let d = 1; d <= rest; d++) cells.push({ date: new Date(y, m + 1, d), inMonth: false })
  return cells
})

const popoverStyle = computed(() => {
  if (!triggerRect.value.width) return { visibility: 'hidden' }
  const margin = 12
  const popoverWidth = 400
  const desiredLeft = triggerRect.value.left + triggerRect.value.width - popoverWidth
  const maxLeft = (typeof window !== 'undefined' ? window.innerWidth : 1024) - popoverWidth - margin
  const minLeft = margin
  const left = Math.max(minLeft, Math.min(desiredLeft, maxLeft))
  const top = triggerRect.value.bottom + 8
  return { left: `${left}px`, top: `${top}px`, width: `${popoverWidth}px` }
})

function selectRange(id) {
  if (id === props.range) return
  if (popoverOpen.value) closePopover()
  emit('update:range', id)
}

function toggleCustom() {
  if (popoverOpen.value) closePopover()
  else openPopover()
}

function openPopover() {
  if (popoverOpen.value) return
  // 已有自定义范围时，日历定位到开始日所在月；同时恢复"继续选"的状态
  if (props.customStart) {
    const d = parseKey(props.customStart)
    if (d) viewDate.value = new Date(d.getFullYear(), d.getMonth(), 1)
  }
  picking.value = !props.customStart ? 'start' : (!props.customEnd ? 'end' : null)
  updateTriggerRect()
  popoverOpen.value = true
  if (props.range !== 'custom') emit('update:range', 'custom')
  nextTick(() => popoverRef.value?.focus?.())
}

function closePopover() {
  popoverOpen.value = false
  hoverDate.value = null
}

function updateTriggerRect() {
  const el = customTriggerRef.value
  if (!el || typeof window === 'undefined') return
  const rect = el.getBoundingClientRect()
  triggerRect.value = { left: rect.left, top: rect.top, width: rect.width, bottom: rect.bottom }
}

// "近 N 天"快捷：自动设置 customStart/customEnd，范围完整，语义不变
function applyShortcut(days) {
  if (days === null) {
    emit('update:range', 'all')
    closePopover()
    return
  }
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - (days - 1))
  emit('update:customStart', formatDateKey(start))
  emit('update:customEnd', formatDateKey(today))
  emit('update:range', 'custom')
  closePopover()
}

// 判断当前 custom 范围是否对应某个"近 N 天"快捷，用于高亮
function isShortcutActive(item) {
  if (props.range !== 'custom') return false
  if (!props.customStart || !props.customEnd) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(props.customStart + 'T00:00:00')
  const diffDays = Math.round((today - start) / 86400000) + 1
  return diffDays === item.days
}

// 点选始终围绕"范围"：选开始 → 选结束（早于开始自动交换）→ 再点重选
function onDateClick(date) {
  const key = formatDateKey(date)
  if (props.range !== 'custom') emit('update:range', 'custom')
  // 点击补位日期时跟随切换月份，方便连续选择
  viewDate.value = new Date(date.getFullYear(), date.getMonth(), 1)

  if (picking.value === 'end' && props.customStart) {
    if (key < props.customStart) {
      // 结束早于开始：交换两端，保持范围语义
      emit('update:customStart', key)
      emit('update:customEnd', props.customStart)
    } else {
      emit('update:customEnd', key)
    }
    picking.value = null
    return
  }

  // 选开始（含两端已选后重新开始）：清掉旧结束，重新进入"选结束"
  emit('update:customStart', key)
  emit('update:customEnd', '')
  picking.value = 'end'
}

function moveMonth(delta) {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + delta, 1)
}

function resetCustom() {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 6)
  emit('update:customStart', formatDateKey(weekAgo))
  emit('update:customEnd', formatDateKey(today))
  viewDate.value = new Date(weekAgo.getFullYear(), weekAgo.getMonth(), 1)
  picking.value = null
}

function dayClass(cell) {
  const key = formatDateKey(cell.date)
  const cls = []
  if (!cell.inMonth) cls.push('is-outside')
  if (isToday(key)) cls.push('is-today')
  if (isEndpoint(key)) cls.push('is-selected')
  else if (inSelectedRange(key)) cls.push('is-range')
  else if (inPreviewRange(key)) cls.push('is-preview')
  return cls
}

function isEndpoint(key) {
  return !!key && (key === props.customStart || key === props.customEnd)
}

function inSelectedRange(key) {
  if (!props.customStart || !props.customEnd) return false
  return key > props.customStart && key < props.customEnd
}

// 已选开始、正在选结束时，hover 悬停日期之间的范围预览
function inPreviewRange(key) {
  if (picking.value !== 'end' || !props.customStart || props.customEnd || !hoverDate.value) return false
  const hoverKey = formatDateKey(hoverDate.value)
  if (hoverKey < props.customStart) return key >= hoverKey && key <= props.customStart
  return key >= props.customStart && key <= hoverKey
}

function isToday(key) {
  return key === formatDateKey(new Date())
}

function ariaDay(cell) {
  const d = cell.date
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function handleDocClick(event) {
  if (!popoverOpen.value) return
  const trigger = customTriggerRef.value
  const popover = popoverRef.value
  if (trigger?.contains(event.target)) return
  if (popover?.contains(event.target)) return
  closePopover()
}
function handleKeydown(event) {
  if (event.key === 'Escape' && popoverOpen.value) {
    event.stopPropagation()
    closePopover()
  }
}
function handleScroll() {
  if (popoverOpen.value) updateTriggerRect()
}
function handleResize() {
  if (popoverOpen.value) updateTriggerRect()
}

watch(popoverOpen, (open) => {
  if (typeof window === 'undefined') return
  if (open) {
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
  } else {
    window.removeEventListener('scroll', handleScroll, true)
    window.removeEventListener('resize', handleResize)
  }
})

onMounted(() => {
  document.addEventListener('click', handleDocClick)
  document.addEventListener('keydown', handleKeydown, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocClick)
  document.removeEventListener('keydown', handleKeydown, true)
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', handleScroll, true)
    window.removeEventListener('resize', handleResize)
  }
})
</script>

<style scoped>
.review-range-control {
  position: relative;
  display: inline-block;
  max-width: 100%;
}

.review-range-control__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--divider-soft);
  border-radius: 10px;
  background: var(--surface-muted);
}

.review-range-control__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 11.5px;
  font-weight: 650;
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
}

.review-range-control__chip:hover { color: var(--text); }
.review-range-control__chip:focus-visible {
  outline: 3px solid var(--accent-20-border-fallback);
  outline-offset: 2px;
}
.review-range-control__chip.active {
  background: var(--surface);
  box-shadow: 0 2px 6px var(--text-7-fallback);
  color: var(--accent-strong);
}
.review-range-control__chip--custom.open {
  background: var(--surface);
  box-shadow: 0 2px 6px var(--text-7-fallback);
  color: var(--accent-strong);
}
.review-range-control__chip--custom svg { color: currentColor; transition: transform var(--transition-fast); }
.review-range-control__chip--custom .is-open { transform: rotate(180deg); }

/* popover（Teleport 到 body，position: fixed，不透明白底） */
.review-range-popover {
  position: fixed;
  z-index: 50;
  display: grid;
  width: 400px;
  overflow: hidden;
  border: 1px solid var(--divider-soft);
  border-radius: 16px;
  background: var(--surface, #fff);
  box-shadow: 0 24px 56px rgba(8, 24, 20, .22), 0 4px 12px rgba(8, 24, 20, .12);
  opacity: 1;
}

/* 头部：淡 accent 渐变底 + 图标徽章 */
.review-range-popover__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 12px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--surface)), var(--surface) 70%);
  border-bottom: 1px solid var(--divider-soft);
}
.review-range-popover__title { display: flex; align-items: center; gap: 10px; }
.review-range-popover__badge {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  color: var(--accent-strong);
}
.review-range-popover__title > div { display: grid; gap: 1px; }
.review-range-popover__title strong { color: var(--text); font-size: 13px; font-weight: 700; letter-spacing: -.01em; }
.review-range-popover__title small { color: var(--text-muted); font-size: 10.5px; }
.review-range-popover__close {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}
.review-range-popover__close:hover { background: var(--surface-muted); color: var(--text); }

.review-range-popover__body { display: grid; gap: 13px; padding: 14px 16px 4px; }

.review-range-popover__shortcuts h4 {
  margin: 0 0 7px;
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .04em;
}

.review-range-popover__chips { display: flex; flex-wrap: wrap; gap: 5px; }
.review-range-popover__chips button {
  min-height: 28px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text);
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}
.review-range-popover__chips button:hover {
  background: var(--accent-soft);
  color: var(--accent-strong);
}
.review-range-popover__chips button.active {
  background: var(--accent-soft);
  color: var(--accent-strong);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}

/* 开始 / 结束 双日期槽：始终以"范围"呈现 */
.review-range-popover__dates {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: center;
}
.review-range-popover__date-slot {
  display: grid;
  gap: 3px;
  padding: 7px 10px;
  border: 1px solid var(--divider-soft);
  border-radius: 10px;
  background: var(--surface-muted);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
}
.review-range-popover__date-slot.filled { background: var(--surface); }
.review-range-popover__date-slot.picking {
  border-color: var(--accent);
  background: var(--surface);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.review-range-popover__date-slot-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: .04em;
  color: var(--text-muted);
}
.review-range-popover__date-slot.picking .review-range-popover__date-slot-label { color: var(--accent-strong); }
.review-range-popover__date-slot-label em {
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--accent);
  color: #fff;
  font-size: 8.5px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: .03em;
}
.review-range-popover__date-slot-value {
  font-size: 12.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.review-range-popover__date-slot-value.placeholder {
  color: var(--text-muted);
  font-weight: 500;
  font-size: 11.5px;
}
.review-range-popover__date-arrow { color: var(--text-muted); padding-bottom: 10px; }

/* 自绘迷你日历 */
.review-range-popover__calendar { display: grid; gap: 8px; padding-bottom: 13px; }
.review-range-popover__cal-head { display: flex; align-items: center; justify-content: space-between; }
.review-range-popover__cal-head strong { color: var(--text); font-size: 12.5px; font-weight: 700; letter-spacing: -.01em; }
.review-range-popover__cal-nav {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.review-range-popover__cal-nav:hover { background: var(--surface-muted); color: var(--text); }

.review-range-popover__cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.review-range-popover__cal-weekday {
  display: grid;
  place-items: center;
  height: 22px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .02em;
}
.review-range-popover__cal-day {
  position: relative;
  display: grid;
  place-items: center;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.review-range-popover__cal-day:hover {
  background: var(--accent-soft);
  color: var(--accent-strong);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(23, 33, 31, .08);
}
.review-range-popover__cal-day.is-outside { color: var(--text-muted); opacity: .4; }

/* 今天：accent 内描边 + 深色文字，保证可辨识 */
.review-range-popover__cal-day.is-today {
  color: var(--accent-strong);
  box-shadow: inset 0 0 0 1.5px var(--accent);
}
.review-range-popover__cal-day.is-today:hover { box-shadow: inset 0 0 0 1.5px var(--accent), 0 2px 6px rgba(23, 33, 31, .08); }

/* 中间范围 / hover 预览：淡青绿填充 */
.review-range-popover__cal-day.is-range,
.review-range-popover__cal-day.is-preview {
  background: var(--accent-soft);
  color: var(--accent-strong);
}
.review-range-popover__cal-day.is-range.is-today,
.review-range-popover__cal-day.is-preview.is-today {
  box-shadow: inset 0 0 0 1.5px var(--accent);
}

/* 选中端点：深青绿实底白字，对比度足够 */
.review-range-popover__cal-day.is-selected {
  background: var(--accent-strong);
  color: #fff;
  box-shadow: 0 2px 6px rgba(31, 111, 104, .35);
}
.review-range-popover__cal-day.is-selected:hover {
  background: var(--accent-strong);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(31, 111, 104, .4);
}
.review-range-popover__cal-day.is-selected.is-outside { opacity: 1; }

.review-range-popover__cal-hint {
  margin: 0;
  min-height: 15px;
  color: var(--text-muted);
  font-size: 10.5px;
  text-align: center;
}

/* 底部操作条 */
.review-range-popover__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--divider-soft);
  background: var(--surface-muted);
}
.review-range-popover__selection {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--divider-soft);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 11px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.review-range-popover__selection.empty { color: var(--text-muted); font-weight: 500; }
.review-range-popover__selection-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-strong);
  flex-shrink: 0;
}
.review-range-popover__selection.empty .review-range-popover__selection-dot { background: var(--text-7-fallback); }
.review-range-popover__actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.review-range-popover__reset {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}
.review-range-popover__reset:hover:not(:disabled) { background: var(--surface); color: var(--text); }
.review-range-popover__reset:disabled { opacity: .5; cursor: not-allowed; }
.review-range-popover__done {
  min-height: 30px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: var(--accent-strong);
  color: #fff;
  font: inherit;
  font-size: 11.5px;
  font-weight: 650;
  cursor: pointer;
}
.review-range-popover__done:hover { background: var(--accent); }

.review-range-pop-enter-active, .review-range-pop-leave-active { transition: opacity .14s ease, transform .14s ease; }
.review-range-pop-enter-from, .review-range-pop-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
