<template>
  <div class="time-picker-compact" @click.stop>
    <div class="tpc-shortcut-row">
      <span class="tpc-row-label">常用</span>
      <div class="tpc-presets" aria-label="常用时间">
        <button type="button" class="tpc-time" :class="{ active: !draftTime }" @click="clear">不设置</button>
        <button v-for="time in presetTimes" :key="time" type="button" class="tpc-time" :class="{ active: draftTime === time }" @click="setTime(time)">{{ time }}</button>
      </div>
    </div>

    <div class="tpc-custom-row">
      <label for="custom-task-time">自定义时间</label>
      <input
        id="custom-task-time"
        v-model="customTime"
        class="tpc-custom-input"
        type="time"
        step="60"
        aria-label="自定义时间，格式为 09:30"
        @blur="commitCustomTime"
        @keydown.enter.prevent="commitCustomTime"
      />
      <div class="tpc-stepper" aria-label="微调时间">
        <button type="button" title="减少 15 分钟" aria-label="减少 15 分钟" @click="adjustTime(-15)">−15</button>
        <button type="button" title="增加 15 分钟" aria-label="增加 15 分钟" @click="adjustTime(15)">+15</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'clear'])
const presetTimes = ['09:00', '14:00', '18:00', '20:00']
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
  gap: 8px;
  padding: 2px 0;
}

.tpc-shortcut-row,
.tpc-custom-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.tpc-row-label,
.tpc-custom-row label {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding-left: 2px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
}

.tpc-presets {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  padding: 2px;
  border: 1px solid var(--divider-soft);
  border-radius: 8px;
  background: var(--surface);
}

.tpc-time {
  min-width: 0;
  min-height: 29px;
  padding: 0 2px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 650;
  white-space: nowrap;
}

.tpc-time:hover {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.tpc-time.active {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
  color: var(--accent-strong);
}

.tpc-custom-row {
  grid-template-columns: 68px minmax(72px, 1fr) auto;
  min-height: 38px;
  padding: 3px 4px 3px 8px;
  border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border));
  border-radius: 9px;
  background: var(--surface);
  box-shadow: 0 2px 5px rgba(15, 23, 42, 0.04);
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
  text-align: right;
}

.tpc-custom-input::-webkit-calendar-picker-indicator {
  margin-left: 3px;
  cursor: pointer;
  opacity: 0.62;
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
  min-width: 29px;
  height: 24px;
  padding: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--accent-strong);
  font-size: 10px;
  font-weight: 700;
}

.tpc-stepper button:hover {
  background: var(--accent-soft);
}

</style>
