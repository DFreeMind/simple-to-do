<template>
  <div class="time-picker-compact" @click.stop>
    <div class="tpc-grid" aria-label="常用时间">
      <section v-for="group in timeGroups" :key="group.label" class="tpc-group">
        <div class="tpc-group__label">{{ group.label }}</div>
        <div class="tpc-group__times">
          <button
            v-for="time in group.times"
            :key="time"
            type="button"
            class="tpc-time"
            :class="{ active: draftTime === time }"
            @click="setTime(time)"
          >
            {{ time }}
          </button>
        </div>
      </section>
    </div>

    <div class="tpc-custom">
      <span>自定义</span>
      <input
        class="tpc-unit"
        inputmode="numeric"
        maxlength="2"
        :value="displayHour"
        aria-label="小时"
        @input="setHour($event.target.value)"
        @focus="$event.target.select()"
        @blur="$event.target.value = displayHour"
        @wheel.prevent="adjustHour($event.deltaY < 0 ? 1 : -1)"
      />
      <span class="tpc-separator">:</span>
      <input
        class="tpc-unit"
        inputmode="numeric"
        maxlength="2"
        :value="displayMinute"
        aria-label="分钟"
        @input="setMinute($event.target.value)"
        @focus="$event.target.select()"
        @blur="$event.target.value = displayMinute"
        @wheel.prevent="adjustMinute($event.deltaY < 0 ? 5 : -5)"
      />
      <button type="button" class="tpc-clear" @click="clear">清除</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'clear'])

const timeGroups = [
  { label: '上午', times: ['08:00', '09:00', '10:00'] },
  { label: '下午', times: ['14:00', '15:00', '18:00'] },
  { label: '晚上', times: ['20:00', '21:00', '22:00'] }
]

const draftTime = ref(props.modelValue || '')
const displayHour = computed(() => getParts(draftTime.value).hour)
const displayMinute = computed(() => getParts(draftTime.value).minute)

function getParts(value) {
  const [rawHour = '09', rawMinute = '00'] = String(value || '09:00').split(':')
  const hour = clampNumber(rawHour, 0, 23).toString().padStart(2, '0')
  const minute = clampNumber(rawMinute, 0, 59).toString().padStart(2, '0')
  return { hour, minute }
}

function clampNumber(value, min, max) {
  const parsed = Number.parseInt(String(value).replace(/\D/g, ''), 10)
  if (!Number.isFinite(parsed)) return min
  return Math.max(min, Math.min(max, parsed))
}

function setTime(value) {
  const { hour, minute } = getParts(value)
  draftTime.value = `${hour}:${minute}`
  emit('update:modelValue', draftTime.value)
}

function setHour(value) {
  const hour = clampNumber(value, 0, 23).toString().padStart(2, '0')
  draftTime.value = `${hour}:${displayMinute.value}`
  emit('update:modelValue', draftTime.value)
}

function setMinute(value) {
  const minute = clampNumber(value, 0, 59).toString().padStart(2, '0')
  draftTime.value = `${displayHour.value}:${minute}`
  emit('update:modelValue', draftTime.value)
}

function adjustHour(delta) {
  const next = (Number(displayHour.value) + delta + 24) % 24
  setHour(String(next))
}

function adjustMinute(delta) {
  const next = (Number(displayMinute.value) + delta + 60) % 60
  setMinute(String(next))
}

function clear() {
  draftTime.value = ''
  emit('clear')
  emit('update:modelValue', '')
}

watch(() => props.modelValue, (newVal) => {
  draftTime.value = newVal || ''
})
</script>

<style scoped>
.time-picker-compact {
  display: grid;
  gap: 6px;
  padding: 2px 0 2px;
}

.tpc-grid {
  display: grid;
  gap: 5px;
}

.tpc-group {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
}

.tpc-group__label {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.tpc-group__times {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
}

.tpc-time {
  min-height: 28px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.tpc-time:hover,
.tpc-time.active {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.tpc-time.active {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent);
}

.tpc-custom {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding-left: 40px;
  color: var(--text-muted);
  font-size: 12px;
}

.tpc-unit {
  width: 32px;
  height: 24px;
  padding: 0 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
  outline: none;
  text-align: center;
}

.tpc-unit:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 10%, transparent);
}

.tpc-separator {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.tpc-clear {
  margin-left: auto;
  min-height: 24px;
  padding: 0 7px;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
}

.tpc-clear:hover {
  background: var(--surface);
  color: var(--text);
}
</style>
