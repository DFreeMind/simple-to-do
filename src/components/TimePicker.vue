<template>
  <div class="time-picker-compact" @click.stop>
    <div v-if="showHeading" class="tpc-heading">
      <span><Clock3 :size="15" /> 时间</span>
      <strong>{{ draftTime || '未设具体时间' }}</strong>
    </div>

    <div class="tpc-presets" aria-label="快捷选择任务时间">
      <button v-for="time in presetTimes" :key="time" type="button" class="tpc-time" :class="{ active: draftTime === time }" @click="setTime(time)">{{ time }}</button>
    </div>

    <div class="tpc-custom-row">
      <label for="custom-task-time">自定义</label>
      <input
        id="custom-task-time"
        v-model="customTime"
        class="tpc-custom-input"
        type="text"
        inputmode="numeric"
        maxlength="5"
        placeholder="09:30"
        aria-describedby="custom-task-time-hint"
        @blur="commitCustomTime"
        @keydown.enter.prevent="commitCustomTime"
        @keydown.esc.prevent="resetCustomTime"
      />
      <span id="custom-task-time-hint" class="sr-only">可输入 930 或 09:30；使用减号和加号按钮每次微调 15 分钟</span>
      <button v-if="draftTime" class="tpc-clear" type="button" @click="clear">清除</button>
      <div class="tpc-stepper" aria-label="按十五分钟微调时间">
        <button type="button" title="减少 15 分钟" aria-label="减少 15 分钟" @click="adjustTime(-15)"><Minus :size="14" /></button>
        <button type="button" title="增加 15 分钟" aria-label="增加 15 分钟" @click="adjustTime(15)"><Plus :size="14" /></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Clock3, Minus, Plus } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' },
  showHeading: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'clear'])
const presetTimes = ['08:00', '09:00', '10:00', '12:00', '14:00', '18:00', '20:00']
const draftTime = ref(props.modelValue || '')
const customTime = ref(props.modelValue || '')

function parseTime(value) {
  const source = String(value || '').trim()
  if (!source) return ''
  let hour
  let minute

  const colonMatch = source.match(/^(\d{1,2}):(\d{1,2})$/)
  if (colonMatch) {
    hour = Number(colonMatch[1])
    minute = Number(colonMatch[2])
  } else {
    const digits = source.replace(/\D/g, '')
    if (digits.length <= 2) {
      hour = Number(digits)
      minute = 0
    } else if (digits.length === 3) {
      hour = Number(digits.slice(0, 1))
      minute = Number(digits.slice(1))
    } else if (digits.length === 4) {
      hour = Number(digits.slice(0, 2))
      minute = Number(digits.slice(2))
    } else {
      return ''
    }
  }

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return ''
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function setTime(value) {
  draftTime.value = value
  customTime.value = value
  emit('update:modelValue', value)
}

function clear() {
  draftTime.value = ''
  customTime.value = ''
  emit('clear')
  emit('update:modelValue', '')
}

function commitCustomTime() {
  if (!customTime.value.trim()) {
    customTime.value = draftTime.value
    return
  }
  const normalized = parseTime(customTime.value)
  if (!normalized) {
    customTime.value = draftTime.value
    return
  }
  setTime(normalized)
}

function resetCustomTime() {
  customTime.value = draftTime.value
}

function adjustTime(delta) {
  const base = parseTime(customTime.value) || draftTime.value || '09:00'
  const [hour, minute] = base.split(':').map(Number)
  const totalMinutes = (hour * 60 + minute + delta + 24 * 60) % (24 * 60)
  setTime(`${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`)
}

watch(() => props.modelValue, (newVal) => {
  draftTime.value = newVal || ''
  customTime.value = newVal || ''
})
</script>

<style scoped>
.time-picker-compact {
  display: grid;
  gap: 7px;
}

.tpc-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tpc-heading > span,
.tpc-heading strong {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 22px;
  font-size: 12px;
  font-weight: 700;
}

.tpc-heading > span { color: var(--text); }
.tpc-heading > span svg { color: var(--accent-strong); }
.tpc-heading strong { padding: 3px 7px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-strong); font-size: 11px; font-variant-numeric: tabular-nums; }

.tpc-presets {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 5px;
}

.tpc-time {
  min-width: 0;
  min-height: 32px;
  padding: 0 4px;
  border: 1px solid var(--divider-soft);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
  transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
}

.tpc-time:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--divider-soft));
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.tpc-time.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 24%, transparent);
  color: var(--accent-strong);
}

.tpc-custom-row {
  display: grid;
  grid-template-columns: 54px minmax(72px, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 3px 4px 3px 9px;
  border: 1px solid var(--divider-soft);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 2px 5px rgba(15, 23, 42, 0.04);
}

.tpc-custom-row label {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
}

.tpc-clear {
  padding: 0 4px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
}

.tpc-clear:hover { color: var(--accent-strong); }

.tpc-clear:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 52%, transparent);
  outline-offset: 2px;
}

.tpc-custom-row:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 10%, transparent);
}

.tpc-custom-input {
  width: 100%;
  min-width: 0;
  height: 28px;
  padding: 0 6px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-align: left;
}

.tpc-custom-input::placeholder {
  color: var(--text-subtle);
  font-family: inherit;
  font-weight: 500;
}

.tpc-stepper {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 1px;
  border: 1px solid color-mix(in srgb, var(--accent) 15%, var(--border));
  border-radius: 6px;
  background: var(--accent-soft);
}

.tpc-stepper button {
  display: grid;
  width: 30px;
  height: 28px;
  place-items: center;
  padding: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--accent-strong);
  font-size: 10px;
  font-weight: 700;
}

.tpc-stepper button:hover {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
}

.tpc-stepper button:focus-visible,
.tpc-time:focus-visible,
.tpc-custom-input:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 52%, transparent);
  outline-offset: 2px;
}

</style>
