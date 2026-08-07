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
          aria-label="自定义日期范围"
          @click.stop
        >
          <header class="review-range-popover__head">
            <span>选择日期范围</span>
            <button type="button" class="review-range-popover__close" aria-label="关闭" @click="closePopover">
              <X :size="14" />
            </button>
          </header>
          <div class="review-range-popover__shortcuts">
            <button v-for="item in POPOVER_SHORTCUTS" :key="item.id" type="button" @click="applyShortcut(item.days)">
              近 {{ item.days }} 天
            </button>
            <button type="button" @click="applyShortcut(null)">全部</button>
          </div>
          <div class="review-range-popover__body">
            <label>
              <span>开始</span>
              <input type="date" :value="customStart" :max="customEnd || undefined" aria-label="开始日期" @change="onStartChange" />
            </label>
            <span class="review-range-popover__sep" aria-hidden="true">→</span>
            <label>
              <span>结束</span>
              <input type="date" :value="customEnd" :min="customStart || undefined" aria-label="结束日期" @change="onEndChange" />
            </label>
          </div>
          <footer class="review-range-popover__foot">
            <small>日期变化会立刻应用，超过 60 天的范围仅显示最近 60 天的趋势。</small>
            <div>
              <button type="button" class="review-range-popover__reset" :disabled="!customStart && !customEnd" @click="resetCustom">重置</button>
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
import { Calendar, ChevronDown, RotateCcw, X } from 'lucide-vue-next'

// 单一来源：所有页面共享同一份范围选项与提示。
const RANGE_OPTIONS = [
  { id: 'today', label: '今日', hint: '今天 0 点到当前' },
  { id: 'yesterday', label: '昨日', hint: '昨天全天' },
  { id: 'thisWeek', label: '本周', hint: '本周日至今（自然周）' },
  { id: 'thisMonth', label: '本月', hint: '本月 1 日至今' },
  { id: '7d', label: '近 7 天', hint: '包含今天，向前滚动 7 天' },
  { id: '30d', label: '近 30 天', hint: '包含今天，向前滚动 30 天' },
  { id: '90d', label: '近 90 天', hint: '包含今天，向前滚动 90 天' },
  { id: 'all', label: '全部', hint: '所有历史记录' }
]
const POPOVER_SHORTCUTS = [
  { id: '7d', days: 7 },
  { id: '30d', days: 30 },
  { id: '90d', days: 90 }
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
// 触发器位置（视口坐标），用于 popover 定位
const triggerRect = ref({ left: 0, top: 0, width: 0, bottom: 0 })

const customButtonLabel = computed(() => {
  if (props.range !== 'custom') return '自定义'
  if (!props.customStart && !props.customEnd) return '自定义'
  if (!props.customStart) return `至 ${props.customEnd.slice(5)}`
  if (!props.customEnd) return `${props.customStart.slice(5)} 起`
  return `${props.customStart.slice(5)} – ${props.customEnd.slice(5)}`
})

const customHint = computed(() => '选择起止日期查看任意时间段')

// 计算 popover 位置：相对视口（fixed），与触发器左对齐
const popoverStyle = computed(() => {
  if (!triggerRect.value.width) return { visibility: 'hidden' }
  const margin = 8
  const popoverWidth = 320
  const desiredLeft = triggerRect.value.left
  // 防止超出视口右侧
  const maxLeft = (typeof window !== 'undefined' ? window.innerWidth : 1024) - popoverWidth - margin
  const left = Math.max(margin, Math.min(desiredLeft, maxLeft))
  const top = triggerRect.value.bottom + 6
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
  // 进入自定义模式（如果还没在）
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

function onStartChange(event) {
  const value = event.target.value
  if (!value) {
    emit('update:customStart', '')
    return
  }
  // 开始晚于结束：自动交换
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

// 外部点击关闭
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
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--divider-soft);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 16px 40px var(--text-7-fallback), 0 2px 6px var(--text-7-fallback);
}

.review-range-popover__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.review-range-popover__head > span { color: var(--accent-strong); font-size: 11px; font-weight: 700; letter-spacing: .04em; }
.review-range-popover__close {
  display: grid; place-items: center;
  width: 24px; height: 24px;
  border: 0; border-radius: 6px;
  background: transparent; color: var(--text-muted);
  cursor: pointer;
}
.review-range-popover__close:hover { background: var(--surface-muted); color: var(--text); }

.review-range-popover__shortcuts { display: flex; flex-wrap: wrap; gap: 4px; }
.review-range-popover__shortcuts button {
  min-height: 24px;
  padding: 0 10px;
  border: 0; border-radius: 6px;
  background: var(--surface-muted);
  color: var(--text-muted);
  font: inherit; font-size: 10.5px; font-weight: 600;
  cursor: pointer;
}
.review-range-popover__shortcuts button:hover { background: var(--accent-soft); color: var(--accent-strong); }

.review-range-popover__body { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 6px; }
.review-range-popover__body label { display: grid; gap: 3px; color: var(--text-muted); font-size: 10px; }
.review-range-popover__body input[type="date"] {
  min-height: 30px;
  padding: 0 8px;
  border: 1px solid var(--divider-soft);
  border-radius: 7px;
  background: var(--surface-muted);
  color: var(--text);
  font: inherit;
  font-size: 12px;
}
.review-range-popover__body input[type="date"]:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.review-range-popover__sep { color: var(--text-muted); font-size: 12px; }

.review-range-popover__foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.review-range-popover__foot small { color: var(--text-muted); font-size: 10px; line-height: 1.4; }
.review-range-popover__foot > div { display: flex; gap: 4px; flex-shrink: 0; }
.review-range-popover__reset, .review-range-popover__done {
  min-height: 26px;
  padding: 0 10px;
  border: 0; border-radius: 6px;
  font: inherit; font-size: 10.5px; font-weight: 600;
  cursor: pointer;
}
.review-range-popover__reset { background: transparent; color: var(--text-muted); }
.review-range-popover__reset:hover:not(:disabled) { background: var(--surface-muted); color: var(--text); }
.review-range-popover__reset:disabled { opacity: .5; cursor: not-allowed; }
.review-range-popover__done { background: var(--accent); color: #fff; }
.review-range-popover__done:hover { background: var(--accent-strong); }

.review-range-pop-enter-active, .review-range-pop-leave-active { transition: opacity .14s ease, transform .14s ease; }
.review-range-pop-enter-from, .review-range-pop-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
