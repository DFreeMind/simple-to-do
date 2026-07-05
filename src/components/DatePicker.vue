<template>
  <div class="datepicker-popup" @click.stop>
    <div class="dp-header">
      <button class="dp-nav" type="button" :aria-label="`上个月，${title}`" @click="prevMonth">‹</button>
      <button class="dp-month" type="button" @click.stop="monthPickerOpen = !monthPickerOpen">
        {{ calYear }}年{{ calMonth + 1 }}月
      </button>
      <YearMonthPicker
        v-if="monthPickerOpen"
        class="dp-ym-picker"
        :year="calYear"
        :month-index="calMonth"
        @select="selectMonth"
        @close="monthPickerOpen = false"
      />
      <button class="dp-nav" type="button" :aria-label="`下个月，${title}`" @click="nextMonth">›</button>
    </div>

    <div class="dp-toolbar">
      <input class="dp-time-input" type="time" :value="selectedTime" aria-label="时间" @change="setTime" />
      <button class="dp-clear" type="button" @click="clearDate">清除</button>
    </div>

    <div class="dp-shortcuts">
      <button class="dp-shortcut" type="button" @click="setToday">今天</button>
      <button class="dp-shortcut" type="button" @click="setTomorrow">明天</button>
      <button class="dp-shortcut" type="button" @click="setNextWeek">下周</button>
    </div>

    <div class="dp-calendar">
      <div class="dp-weekdays">
        <span v-for="d in weekdays" :key="d">{{ d }}</span>
      </div>
      <div class="dp-days">
        <button
          v-for="(d, i) in calendarDays"
          :key="i"
          class="dp-day"
          type="button"
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/task'
import { getMonthDays, toDateString } from '@/utils/date'
import YearMonthPicker from './YearMonthPicker.vue'

const props = defineProps({
  task: { type: Object, required: true },
  field: { type: String, default: 'dueDate' },
  title: { type: String, default: '选择日期' }
})
const emit = defineEmits(['close'])
const store = useTaskStore()

const initialValue = computed(() => props.task?.[props.field])
const initialDate = initialValue.value ? new Date(initialValue.value) : new Date()
const calYear = ref(initialDate.getFullYear())
const calMonth = ref(initialDate.getMonth())
const selectedDate = ref(initialDate)
const selectedTime = ref(initialValue.value ? initialDate.toTimeString().slice(0, 5) : '09:00')
const monthPickerOpen = ref(false)
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

function selectMonth({ year, month }) {
  calYear.value = year
  calMonth.value = month
  monthPickerOpen.value = false
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
  confirm()
}

function setTime(e) {
  selectedTime.value = e.target.value
  if (initialValue.value) applyValue(false)
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
  store.updateTask(props.task.id, { [props.field]: null })
  emit('close')
}

function confirm() {
  applyValue()
}

function applyValue(shouldClose = true) {
  const [h, m] = selectedTime.value.split(':').map(Number)
  const d = new Date(selectedDate.value)
  d.setHours(h, m, 0, 0)
  store.updateTask(props.task.id, { [props.field]: d.toISOString() })
  if (shouldClose) emit('close')
}
</script>
