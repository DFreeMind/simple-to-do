<template>
  <div class="review-range-control">
    <div class="review-range-control__row" role="group" aria-label="时间范围">
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
        type="button"
        class="review-range-control__chip review-range-control__chip--custom"
        :class="{ active: range === 'custom' }"
        :aria-expanded="range === 'custom'"
        :title="customHint"
        @click="toggleCustom"
      >
        <Calendar :size="13" />
        <span>{{ customButtonLabel }}</span>
      </button>
    </div>
    <Transition name="review-range-fade">
      <div v-if="range === 'custom'" class="review-range-control__custom" role="group" aria-label="自定义日期范围">
        <label>
          <span>开始</span>
          <input type="date" :value="customStart" :max="customEnd || undefined" aria-label="开始日期" @change="onStartChange" />
        </label>
        <span class="review-range-control__sep" aria-hidden="true">至</span>
        <label>
          <span>结束</span>
          <input type="date" :value="customEnd" :min="customStart || undefined" aria-label="结束日期" @change="onEndChange" />
        </label>
        <button type="button" class="review-range-control__reset" :disabled="!customStart && !customEnd" @click="resetCustom">
          <RotateCcw :size="12" />
          重置
        </button>
        <p class="review-range-control__hint">日期变化会立刻应用，无需额外确认；超过 60 天的范围仅显示最近 60 天的趋势。</p>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Calendar, RotateCcw } from 'lucide-vue-next'

// 单一来源：所有页面共享同一份范围选项与提示。
// - shortcut：自然起讫（今日/昨日/本周/本月）
// - window：滚动 N 天（近 7/30/90 天）+ 全部
// 自定义（custom）作为独立选项，不参与快捷/窗口分组
const RANGE_OPTIONS = [
  { id: 'today', label: '今日', kind: 'shortcut', hint: '今天 0 点到当前' },
  { id: 'yesterday', label: '昨日', kind: 'shortcut', hint: '昨天全天' },
  { id: 'thisWeek', label: '本周', kind: 'shortcut', hint: '本周日至今（自然周）' },
  { id: 'thisMonth', label: '本月', kind: 'shortcut', hint: '本月 1 日至今' },
  { id: '7d', label: '近 7 天', kind: 'window', hint: '包含今天，向前滚动 7 天' },
  { id: '30d', label: '近 30 天', kind: 'window', hint: '包含今天，向前滚动 30 天' },
  { id: '90d', label: '近 90 天', kind: 'window', hint: '包含今天，向前滚动 90 天' },
  { id: 'all', label: '全部', kind: 'window', hint: '所有历史记录' }
]

const props = defineProps({
  range: { type: String, required: true },
  customStart: { type: String, default: '' },
  customEnd: { type: String, default: '' }
})
const emit = defineEmits(['update:range', 'update:customStart', 'update:customEnd'])

const presetOptions = RANGE_OPTIONS

const customButtonLabel = computed(() => {
  if (props.range !== 'custom') return '自定义'
  if (!props.customStart && !props.customEnd) return '自定义'
  if (!props.customStart) return `至 ${props.customEnd}`
  if (!props.customEnd) return `${props.customStart} 起`
  return `${props.customStart} 至 ${props.customEnd}`
})

const customHint = computed(() => '选择起止日期查看任意时间段')

function selectRange(id) {
  if (id === props.range) return
  emit('update:range', id)
}

function toggleCustom() {
  if (props.range === 'custom') {
    // 再次点击：回到默认近 7 天
    emit('update:range', '7d')
    return
  }
  emit('update:range', 'custom')
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
</script>

<style scoped>
.review-range-control {
  display: grid;
  gap: 8px;
}

.review-range-control__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--divider-soft);
  border-radius: 11px;
  background: var(--surface-muted);
}

.review-range-control__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 30px;
  padding: 0 11px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 11.5px;
  font-weight: 650;
  cursor: pointer;
  transition: color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
}

.review-range-control__chip:hover { color: var(--text); }
.review-range-control__chip:focus-visible {
  outline: 3px solid var(--accent-20-border-fallback);
  outline-offset: 2px;
}
.review-range-control__chip.active {
  background: var(--surface);
  box-shadow: 0 2px 7px var(--text-7-fallback);
  color: var(--accent-strong);
}

.review-range-control__chip--custom svg { color: currentColor; }

.review-range-control__custom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--divider-soft);
  border-radius: 11px;
  background: var(--surface);
}

.review-range-control__custom label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 11px;
}

.review-range-control__custom input[type="date"] {
  min-height: 32px;
  padding: 0 8px;
  border: 1px solid var(--divider-soft);
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text);
  font: inherit;
  font-size: 12px;
}

.review-range-control__custom input[type="date"]:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.review-range-control__sep {
  color: var(--text-muted);
  font-size: 11px;
}

.review-range-control__reset {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text-muted);
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.review-range-control__reset:hover:not(:disabled) {
  background: var(--accent-soft);
  color: var(--accent-strong);
}
.review-range-control__reset:disabled { opacity: .5; cursor: not-allowed; }

.review-range-control__hint {
  flex-basis: 100%;
  margin: 0;
  color: var(--text-muted);
  font-size: 10.5px;
  line-height: 1.4;
}

.review-range-fade-enter-active,
.review-range-fade-leave-active {
  transition: opacity .18s ease, transform .18s ease;
}
.review-range-fade-enter-from,
.review-range-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
