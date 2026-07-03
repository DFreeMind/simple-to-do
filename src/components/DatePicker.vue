<template>
  <div class="datepicker-popup" @click.stop>
    <div class="dp-tabs">
      <button class="dp-tab" :class="{ active: tab === 'date' }" @click="tab = 'date'">日期</button>
      <button class="dp-tab" :class="{ active: tab === 'range' }" @click="tab = 'range'">时间段</button>
    </div>

    <!-- 快捷按钮 -->
    <div class="dp-shortcuts">
      <button class="dp-shortcut" @click="setToday">☀️ 今天</button>
      <button class="dp-shortcut" @click="setTomorrow">🌤️ 明天</button>
      <button class="dp-shortcut" @click="setNextWeek">📅 下周</button>
      <button class="dp-shortcut" @click="clearDate">🌙 无日期</button>
    </div>

    <!-- 日历 -->
    <div class="dp-calendar">
      <div class="dp-cal-header">
        <button class="dp-nav" @click="prevMonth">‹</button>
        <span class="dp-month">{{ calYear }}年{{ calMonth + 1 }}月</span>
        <button class="dp-nav" @click="nextMonth">›</button>
      </div>
      <div class="dp-weekdays">
        <span v-for="d in weekdays" :key="d">{{ d }}</span>
      </div>
      <div class="dp-days">
        <button
          v-for="(d, i) in calendarDays"
          :key="i"
          class="dp-day"
          :class="{
            'other-month': !d.current,
            'is-today': isToday(d.date),
            'is-selected': isSelected(d.date)
          }"
          @click="selectDate(d.date)"
        >
          {{ d.day }}
        </button>
      </div>
    </div>

    <!-- 时间设置 -->
    <div class="dp-time-section">
      <button class="dp-row" @click="showTimePicker = !showTimePicker">
        <span>🕐 时间</span>
        <span class="dp-arrow">›</span>
      </button>
      <div v-if="showTimePicker" class="dp-time-picker">
        <input type="time" :value="selectedTime" @change="setTime" class="time-input" />
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="dp-footer">
      <button class="dp-btn dp-btn--confirm" @click="confirm">确定</button>
      <button class="dp-btn dp-btn--clear" @click="clearDate">清除</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/task'
import { getMonthDays, toDateString } from '@/utils/date'

const props = defineProps({ task: Object })
const emit = defineEmits(['close'])
const store = useTaskStore()

const tab = ref('date')
const calYear = ref(new Date().getFullYear())
const calMonth = ref(new Date().getMonth())
const selectedDate = ref(props.task.dueDate ? new Date(props.task.dueDate) : new Date())
const selectedTime = ref(props.task.dueDate ? new Date(props.task.dueDate).toTimeString().slice(0, 5) : '09:00')
const showTimePicker = ref(false)
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const calendarDays = computed(() => getMonthDays(calYear.value, calMonth.value))

function prevMonth() {
  if (calMonth.value === 0) { calMonth.value = 11; calYear.value-- }
  else calMonth.value--
}

function nextMonth() {
  if (calMonth.value === 11) { calMonth.value = 0; calYear.value++ }
  else calMonth.value++
}

function isToday(d) {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isSelected(d) {
  return toDateString(d) === toDateString(selectedDate.value)
}

function selectDate(d) {
  selectedDate.value = new Date(d)
}

function setTime(e) {
  selectedTime.value = e.target.value
}

function setToday() { setSelected(new Date()) }
function setTomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); setSelected(d) }
function setNextWeek() { const d = new Date(); d.setDate(d.getDate() + 7); setSelected(d) }

function setSelected(d) {
  selectedDate.value = d
  calYear.value = d.getFullYear()
  calMonth.value = d.getMonth()
  confirm()
}

function clearDate() {
  store.updateTask(props.task.id, { dueDate: null })
  emit('close')
}

function confirm() {
  const [h, m] = selectedTime.value.split(':').map(Number)
  const d = new Date(selectedDate.value)
  d.setHours(h, m, 0, 0)
  store.updateTask(props.task.id, { dueDate: d.toISOString() })
  emit('close')
}
</script>
