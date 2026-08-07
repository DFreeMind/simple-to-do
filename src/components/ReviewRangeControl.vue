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
          @click.stop
        >
          <header class="review-range-popover__head">
            <div>
              <strong>选择时间范围</strong>
              <small>快捷预设或自定义起止日期</small>
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

            <section class="review-range-popover__custom">
              <h4>自定义日期</h4>
              <div class="review-range-popover__inputs">
                <label>
                  <span>开始</span>
                  <input type="date" :value="customStart" :max="customEnd || undefined" aria-label="开始日期" @change="onStartChange" />
                </label>
                <span class="review-range-popover__arrow" aria-hidden="true">→</span>
                <label>
                  <span>结束</span>
                  <input type="date" :value="customEnd" :min="customStart || undefined" aria-label="结束日期" @change="onEndChange" />
                </label>
              </div>
              <p class="review-range-popover__hint">日期变化会立刻应用；超过 60 天的范围仅显示最近 60 天的趋势。</p>
            </section>
          </div>

          <footer class="review-range-popover__foot">
            <button type="button" class="review-range-popover__reset" :disabled="!customStart && !customEnd" @click="resetCustom">
              <RotateCcw :size="12" />重置为近 7 天
            </button>
            <button type="button" class="review-range-popover__done" @click="closePopover">完成</button>
          </footer>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Calendar, ChevronDown, RotateCcw, X } from 'lucide-vue-next'

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

const customButtonLabel = computed(() => {
  if (props.range !== 'custom') return '自定义'
  if (!props.customStart && !props.customEnd) return '自定义'
  if (!props.customStart) return `至 ${props.customEnd.slice(5)}`
  if (!props.customEnd) return `${props.customStart.slice(5)} 起`
  return `${props.customStart.slice(5)} – ${props.customEnd.slice(5)}`
})

const customHint = computed(() => '点击选择起止日期或快捷预设')

const popoverStyle = computed(() => {
  if (!triggerRect.value.width) return { visibility: 'hidden' }
  const margin = 12
  const popoverWidth = 380
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
  if (popoverOpen.value) {
    closePopover()
  } else {
    openPopover()
  }
}

function openPopover() {
  if (popoverOpen.value) return
  updateTriggerRect()
  popoverOpen.value = true
  if (props.range !== 'custom') emit('update:range', 'custom')
  nextTick(() => {
    const firstInput = popoverRef.value?.querySelector('input[type="date"]')
    firstInput?.focus?.()
  })
}

function closePopover() {
  popoverOpen.value = false
}

function updateTriggerRect() {
  const el = customTriggerRef.value
  if (!el || typeof window === 'undefined') return
  const rect = el.getBoundingClientRect()
  triggerRect.value = { left: rect.left, top: rect.top, width: rect.width, bottom: rect.bottom }
}

// "近 N 天"快捷：自动设置 customStart/customEnd
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

function onStartChange(event) {
  const value = event.target.value
  if (!value) {
    emit('update:customStart', '')
    return
  }
  if (props.customEnd && value > props.customEnd) {
    emit('update:customStart', props.customEnd)
    emit('update:customEnd', value)
  } else {
    emit('update:customStart', value)
  }
  if (props.range !== 'custom') emit('update:range', 'custom')
}

function onEndChange(event) {
  const value = event.target.value
  if (!value) {
    emit('update:customEnd', '')
    return
  }
  if (props.customStart && value < props.customStart) {
    emit('update:customStart', value)
    emit('update:customEnd', props.customStart)
  } else {
    emit('update:customEnd', value)
  }
  if (props.range !== 'custom') emit('update:range', 'custom')
}

function resetCustom() {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 6)
  emit('update:customStart', formatDateKey(weekAgo))
  emit('update:customEnd', formatDateKey(today))
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

/* popover（Teleport 到 body，position: fixed） */
.review-range-popover {
  position: fixed;
  z-index: 50;
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid var(--divider-soft);
  border-radius: 14px;
  background: var(--surface, #fff);
  box-shadow: 0 24px 56px rgba(8, 24, 20, .22), 0 4px 12px rgba(8, 24, 20, .12);
  /* 保证不透明：覆盖可能的半透明变量 */
  opacity: 1;
}

.review-range-popover__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.review-range-popover__head > div { display: grid; gap: 2px; }
.review-range-popover__head strong { color: var(--text); font-size: 13px; font-weight: 700; letter-spacing: -.01em; }
.review-range-popover__head small { color: var(--text-muted); font-size: 11px; }
.review-range-popover__close {
  display: grid; place-items: center;
  width: 24px; height: 24px;
  border: 0; border-radius: 6px;
  background: transparent; color: var(--text-muted);
  cursor: pointer;
}
.review-range-popover__close:hover { background: var(--surface-muted); color: var(--text); }

.review-range-popover__body { display: grid; gap: 14px; }

.review-range-popover__shortcuts h4,
.review-range-popover__custom h4 {
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
  border-radius: 7px;
  background: var(--surface-muted);
  color: var(--text);
  font: inherit; font-size: 11.5px; font-weight: 600;
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

.review-range-popover__inputs { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 6px; }
.review-range-popover__inputs label { display: grid; gap: 4px; color: var(--text-muted); font-size: 10px; }
.review-range-popover__inputs input[type="date"] {
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid var(--divider-soft);
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text);
  font: inherit;
  font-size: 12px;
}
.review-range-popover__inputs input[type="date"]:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.review-range-popover__arrow { color: var(--text-muted); font-size: 14px; padding-bottom: 8px; }

.review-range-popover__hint { margin: 8px 0 0; color: var(--text-muted); font-size: 10.5px; line-height: 1.5; }

.review-range-popover__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 4px;
  border-top: 1px solid var(--divider-soft);
  margin-top: -2px;
  padding-top: 12px;
}
.review-range-popover__reset {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 30px;
  padding: 0 12px;
  border: 0; border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  font: inherit; font-size: 11.5px; font-weight: 600;
  cursor: pointer;
}
.review-range-popover__reset:hover:not(:disabled) { background: var(--surface-muted); color: var(--text); }
.review-range-popover__reset:disabled { opacity: .5; cursor: not-allowed; }
.review-range-popover__done {
  min-height: 30px;
  padding: 0 16px;
  border: 0; border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font: inherit; font-size: 11.5px; font-weight: 650;
  cursor: pointer;
}
.review-range-popover__done:hover { background: var(--accent-strong); }

.review-range-pop-enter-active, .review-range-pop-leave-active { transition: opacity .14s ease, transform .14s ease; }
.review-range-pop-enter-from, .review-range-pop-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
