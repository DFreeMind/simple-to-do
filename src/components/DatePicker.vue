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

    <!-- 原始工具栏：时间输入 + 清除 -->
    <div v-if="!showExtras" class="dp-toolbar">
      <input class="dp-time-input" type="time" :value="selectedTime" aria-label="时间" @change="setTime" />
      <button class="dp-clear" type="button" @click="clearDate">清除</button>
    </div>

    <div class="dp-shortcuts">
      <button class="dp-shortcut" type="button" @click="setToday">今天</button>
      <button class="dp-shortcut" type="button" @click="setTomorrow">明天</button>
      <button class="dp-shortcut" type="button" @click="setNextWeek">下周</button>
      <button v-if="showExtras" class="dp-shortcut dp-shortcut--clear" type="button" @click="clearDate">清除</button>
    </div>

    <div class="dp-calendar">
      <div class="dp-weekdays">
        <span v-for="d in calendarWeekdays" :key="d">{{ d }}</span>
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

    <!-- 额外行：时间、提醒、重复（手风琴，同时只展开一个） -->
    <template v-if="showExtras">
      <div class="dp-extras">
        <!-- 时间行 -->
        <section class="dp-extra-block" :class="{ 'is-expanded': expandedSection === 'time' }">
          <button class="dp-extra-row" type="button" @click.stop="toggleExtra('time')">
            <span class="dp-extra-row__icon"><Clock3 :size="15" /></span>
            <span class="dp-extra-row__label">时间</span>
            <span class="dp-extra-row__value">{{ selectedTime || '未设置' }}</span>
            <ChevronDown :size="14" :class="{ rotated: expandedSection === 'time' }" />
          </button>
          <div v-if="expandedSection === 'time'" class="dp-extra-options dp-time-picker-container">
            <TimePicker v-model="selectedTime" @clear="handleTimeClear" />
          </div>
        </section>

        <!-- 提醒行 -->
        <section class="dp-extra-block" :class="{ 'is-expanded': expandedSection === 'reminder' }">
          <button class="dp-extra-row" type="button" @click.stop="toggleExtra('reminder')">
            <span class="dp-extra-row__icon"><Bell :size="15" /></span>
            <span class="dp-extra-row__label">提醒</span>
            <span class="dp-extra-row__value">{{ reminderLabel }}</span>
            <ChevronDown :size="14" :class="{ rotated: expandedSection === 'reminder' }" />
          </button>
          <div v-if="expandedSection === 'reminder'" class="dp-extra-options">
            <button
              v-for="option in reminderOptions"
              :key="option.value"
              class="dp-extra-option"
              :class="{ active: option.value === currentReminderValue }"
              type="button"
              @click="chooseReminder(option.value)"
            >
              <span>{{ option.label }}</span>
              <Check v-if="option.value === currentReminderValue" :size="14" />
            </button>
          </div>
        </section>

        <!-- 重复行 -->
        <section class="dp-extra-block" :class="{ 'is-expanded': expandedSection === 'repeat' }">
          <button class="dp-extra-row" type="button" @click.stop="toggleExtra('repeat')">
            <span class="dp-extra-row__icon"><Repeat2 :size="15" /></span>
            <span class="dp-extra-row__label">重复</span>
            <span class="dp-extra-row__value">{{ repeatLabel }}</span>
            <ChevronDown :size="14" :class="{ rotated: expandedSection === 'repeat' }" />
          </button>
          <div v-if="expandedSection === 'repeat'" class="dp-extra-options">
            <button
              v-for="option in repeatOptions"
              :key="option.value || 'none'"
              class="dp-extra-option"
              :class="{ active: option.value === (task.repeatRule || '') }"
              type="button"
              @click="chooseRepeat(option.value)"
            >
              <span>{{ option.label }}</span>
              <Check v-if="option.value === (task.repeatRule || '')" :size="14" />
            </button>
          </div>
        </section>
      </div>
      <button class="dp-done" type="button" @click="emit('close')">完成</button>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useTaskStore } from '@/stores/task'
import { getMonthDays, toDateString } from '@/utils/date'
import { Bell, Check, ChevronDown, Clock3, Repeat2 } from 'lucide-vue-next'
import YearMonthPicker from './YearMonthPicker.vue'
import TimePicker from './TimePicker.vue'

const props = defineProps({
  task: { type: Object, required: true },
  field: { type: String, default: 'dueDate' },
  title: { type: String, default: '选择日期' },
  showExtras: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])
const store = useTaskStore()

const initialValue = computed(() => props.task?.[props.field])
const initialDate = initialValue.value ? new Date(initialValue.value) : new Date()
const calYear = ref(initialDate.getFullYear())
const calMonth = ref(initialDate.getMonth())
const selectedDate = ref(initialDate)
const selectedTime = ref(initialValue.value ? initialDate.toTimeString().slice(0, 5) : '')
const monthPickerOpen = ref(false)
const calendarWeekdays = ['日', '一', '二', '三', '四', '五', '六']

// 额外行展开状态（手风琴模式，同时只展开一个）
const expandedSection = ref('')
function toggleExtra(name) {
  expandedSection.value = expandedSection.value === name ? '' : name
}

// 重复选项
const repeatOptions = [
  { value: '', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekdays', label: '工作日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' }
]
const repeatLabel = computed(() =>
  repeatOptions.find(o => o.value === (props.task?.repeatRule || ''))?.label || '不重复'
)

// 提醒选项
const reminderOptions = [
  { value: '', label: '无' },
  { value: 'at-time', label: '提醒我当天' },
  { value: '15m', label: '提前 15 分钟' },
  { value: '1h', label: '提前 1 小时' },
  { value: '1d', label: '提前 1 天' },
  { value: '1w', label: '提前 1 周' }
]
const currentReminderValue = computed(() => {
  if (!props.task?.reminderAt) return ''
  const diff = new Date(props.task.reminderAt).getTime() - new Date(props.task.dueDate || props.task.reminderAt).getTime()
  const match = reminderOptions.find(option => {
    if (!option.value) return false
    if (option.value === 'at-time') return Math.abs(diff) < 60000
    if (option.value === '15m') return Math.abs(diff + 15 * 60000) < 60000
    if (option.value === '1h') return Math.abs(diff + 3600000) < 60000
    if (option.value === '1d') return Math.abs(diff + 86400000) < 60000
    if (option.value === '1w') return Math.abs(diff + 604800000) < 60000
    return false
  })
  return match?.value || ''
})
const reminderLabel = computed(() => {
  if (!props.task?.reminderAt) return '未设置'
  // 尝试匹配快捷标签
  const diff = new Date(props.task.reminderAt).getTime() - new Date(props.task.dueDate || props.task.reminderAt).getTime()
  const match = reminderOptions.find(o => {
    if (!o.value || o.value === '') return false
    if (o.value === 'at-time') return Math.abs(diff) < 60000
    if (o.value === '15m') return Math.abs(diff + 15 * 60000) < 60000
    if (o.value === '1h') return Math.abs(diff + 3600000) < 60000
    if (o.value === '1d') return Math.abs(diff + 86400000) < 60000
    if (o.value === '1w') return Math.abs(diff + 604800000) < 60000
    return false
  })
  if (match) return match.label
  return formatReminderDate(props.task.reminderAt)
})

function formatReminderDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

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
  applyValue(false)
}

function setTime(e) {
  selectedTime.value = e.target.value
  if (initialValue.value) applyValue(false)
}

function handleTimeClear() {
  selectedTime.value = ''
  if (initialValue.value) applyValue(false)
}

// 监听 selectedTime 变化，自动保存
watch(selectedTime, (newTime) => {
  if (initialValue.value && newTime) {
    applyValue(false)
  }
})

function setToday() { setSelected(new Date()) }
function setTomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); setSelected(d) }
function setNextWeek() { const d = new Date(); d.setDate(d.getDate() + 7); setSelected(d) }

function setSelected(d) {
  selectedDate.value = d
  calYear.value = d.getFullYear()
  calMonth.value = d.getMonth()
  applyValue(false)
}

function clearDate() {
  const updates = { [props.field]: null }
  if (props.field === 'dueDate') updates.reminderAt = null
  store.updateTask(props.task.id, updates)
  emit('close')
}

function applyValue(shouldClose = false) {
  const d = new Date(selectedDate.value)
  if (selectedTime.value) {
    const [h, m] = selectedTime.value.split(':').map(Number)
    d.setHours(h, m, 0, 0)
  } else {
    d.setHours(0, 0, 0, 0)
  }
  store.updateTask(props.task.id, { [props.field]: d.toISOString() })
  if (shouldClose) emit('close')
}

function chooseRepeat(value) {
  store.updateTask(props.task.id, { repeatRule: value || null })
  expandedSection.value = ''
}

function chooseReminder(value) {
  if (!value) {
    store.updateTask(props.task.id, { reminderAt: null, reminderDisabled: true })
    expandedSection.value = ''
    return
  }
  const base = new Date(selectedDate.value)
  const [h, m] = selectedTime.value.split(':').map(Number)
  base.setHours(h, m, 0, 0)
  let reminderDate
  switch (value) {
    case 'at-time':
      reminderDate = new Date(base)
      break
    case '15m':
      reminderDate = new Date(base.getTime() - 15 * 60000)
      break
    case '1h':
      reminderDate = new Date(base.getTime() - 3600000)
      break
    case '1d':
      reminderDate = new Date(base.getTime() - 86400000)
      break
    case '1w':
      reminderDate = new Date(base.getTime() - 604800000)
      break
  }
  const updates = { reminderAt: reminderDate.toISOString(), reminderDisabled: false }
  if (props.field === 'dueDate') updates.dueDate = base.toISOString()
  store.updateTask(props.task.id, updates)
  expandedSection.value = ''
}
</script>
