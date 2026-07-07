<template>
  <section class="calendar-view">
    <div class="calendar-toolbar">
      <div class="calendar-switcher" aria-label="月历切换">
        <button class="icon-btn" type="button" title="上个月" aria-label="上个月" @click="shiftMonth(-1)">
          <ChevronLeft :size="17" />
        </button>
        <button class="calendar-title-btn" type="button" title="选择年月" @click.stop="monthPickerOpen = !monthPickerOpen">
          {{ store.calendarYear }}年{{ store.calendarMonth + 1 }}月
        </button>
        <YearMonthPicker
          v-if="monthPickerOpen"
          class="calendar-ym-picker"
          :year="store.calendarYear"
          :month-index="store.calendarMonth"
          @select="selectMonth"
          @close="monthPickerOpen = false"
        />
        <button class="icon-btn" type="button" title="下个月" aria-label="下个月" @click="shiftMonth(1)">
          <ChevronRight :size="17" />
        </button>
      </div>

      <div class="calendar-quick-add">
        <Plus :size="16" />
        <input
          ref="quickInput"
          v-model="newTitle"
          type="text"
          placeholder="快速添加任务到选中日期..."
          aria-label="快速添加任务"
          @keydown.enter="addTask"
        />
        <button class="primary-btn" type="button" :disabled="!newTitle.trim()" @click="addTask">添加</button>
      </div>

      <button class="small-btn" type="button" @click="goToday">今天</button>
    </div>

    <div class="calendar-board">
      <div class="calendar-weekdays">
        <span v-for="day in weekdays" :key="day">{{ day }}</span>
      </div>

      <div class="calendar-grid">
        <div
          v-for="day in store.calendarMonthDays"
          :key="day.key"
          class="calendar-day"
          :class="{
            'other-month': !day.current,
            today: isTodayKey(day.key),
            selected: selectedKey === day.key,
            'has-tasks': day.tasks.length > 0
          }"
          role="button"
          tabindex="0"
          @click="selectDate(day.date)"
          @keydown.enter.prevent="selectDate(day.date)"
          @keydown.space.prevent="selectDate(day.date)"
          @dragover.prevent
          @drop="dropTask(day.date, $event)"
        >
          <span class="calendar-day__head">
            <span class="calendar-day__number">{{ day.day }}</span>
            <span v-if="day.tasks.length" class="calendar-count">{{ day.tasks.length }}</span>
          </span>
          <span class="calendar-day__tasks">
            <template v-if="day.tasks.length <= 4">
              <button
                v-for="task in day.tasks"
                :key="task.id"
                class="calendar-task"
                :class="{ completed: task.completed }"
                type="button"
                draggable="true"
                @click.stop="store.selectTask(task.id)"
                @dragstart="startTaskDrag(task.id, $event)"
              >
                <span class="task-color" :style="{ backgroundColor: getTaskColor(task) }"></span>
                <span class="task-title">{{ task.title }}</span>
                <Check v-if="task.completed" :size="10" class="task-check-icon" />
              </button>
            </template>
            <template v-else>
              <div class="task-dots">
                <span
                  v-for="(task, index) in day.tasks.slice(0, 6)"
                  :key="task.id"
                  class="task-dot"
                  :class="{ completed: task.completed }"
                  :style="{ backgroundColor: getTaskColor(task) }"
                  :title="task.title"
                  draggable="true"
                  @click.stop="store.selectTask(task.id)"
                  @dragstart="startTaskDrag(task.id, $event)"
                ></span>
                <span v-if="day.tasks.length > 6" class="task-dot-more">+{{ day.tasks.length - 6 }}</span>
              </div>
              <span class="calendar-more">共{{ day.tasks.length }}项</span>
            </template>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { toDateString } from '@/utils/date'
import YearMonthPicker from './YearMonthPicker.vue'

const store = useTaskStore()
const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const selectedDate = ref(new Date())
const newTitle = ref('')
const quickInput = ref(null)
const monthPickerOpen = ref(false)

const selectedKey = computed(() => toDateString(selectedDate.value))

function selectDate(date) {
  const next = new Date(date)
  selectedDate.value = next
  if (next.getFullYear() !== store.calendarYear || next.getMonth() !== store.calendarMonth) {
    store.setCalendarMonth(next.getFullYear(), next.getMonth())
  }
}

function shiftMonth(delta) {
  const targetYear = new Date(store.calendarYear, store.calendarMonth + delta, 1).getFullYear()
  const targetMonth = new Date(store.calendarYear, store.calendarMonth + delta, 1).getMonth()
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const next = new Date(targetYear, targetMonth, Math.min(selectedDate.value.getDate(), lastDay))
  store.setCalendarMonth(next.getFullYear(), next.getMonth())
  selectedDate.value = next
}

function selectMonth({ year, month }) {
  store.setCalendarMonth(year, month)
  selectedDate.value = new Date(year, month, 1)
  monthPickerOpen.value = false
}

function goToday() {
  const today = new Date()
  store.resetCalendarToday()
  selectedDate.value = today
}

function addTask() {
  const task = store.addTaskOnDate(newTitle.value, selectedDate.value)
  if (task) {
    newTitle.value = ''
    store.showNotice('任务已加入月历', 'success')
  }
}

function startTaskDrag(taskId, event) {
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', taskId)
}

function dropTask(date, event) {
  const taskId = event.dataTransfer.getData('text/plain')
  if (!taskId) return
  store.moveTaskToDate(taskId, date)
  store.showNotice('任务日期已调整', 'success')
}

function isTodayKey(key) {
  return key === toDateString(new Date())
}

function getTaskColor(task) {
  const list = store.lists.find(l => l.id === task.listId)
  return list?.color || '#5fb8ad'
}
</script>
