<template>
  <main class="clock-workspace rhythm-workspace">
    <div class="rhythm-shell">
      <header class="rhythm-header">
        <div>
          <p class="eyebrow">日常节律</p>
          <h1>让提醒顺着工作发生</h1>
          <p>组合需要的提醒，照顾眼睛、身体和注意力，不必打断正在做的事。</p>
        </div>
        <div class="rhythm-header__actions">
          <span class="rhythm-running-count" :class="{ paused: store.rhythmPaused }">
            <i></i>{{ store.rhythmPaused ? '全部已暂停' : `${enabledReminders.length} 项运行中` }}
          </span>
          <button v-if="store.rhythmPaused" class="rhythm-control-btn rhythm-control-btn--primary" type="button" @click="store.resumeRhythmReminders">
            <Play :size="16" fill="currentColor" />恢复提醒
          </button>
          <div v-else ref="pauseMenu" class="rhythm-pause-menu">
            <button class="rhythm-control-btn" type="button" :aria-expanded="pauseMenuOpen" @click="pauseMenuOpen = !pauseMenuOpen">
              <Pause :size="16" />暂停
              <ChevronDown :size="14" />
            </button>
            <div v-if="pauseMenuOpen" class="rhythm-pause-menu__popover">
              <p>暂时安静一会儿</p>
              <button v-for="option in pauseOptions" :key="option.minutes" type="button" @click="pauseAll(option.minutes)">
                <Clock3 :size="15" /><span><strong>{{ option.label }}</strong><small>{{ option.detail }}</small></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <section v-if="store.rhythmPaused" class="rhythm-paused-banner" role="status">
        <span><MoonStar :size="18" /></span>
        <div><strong>提醒正在休息</strong><small>{{ pausedUntilText }} 自动恢复，你也可以随时提前恢复。</small></div>
        <button type="button" @click="store.resumeRhythmReminders">现在恢复</button>
      </section>

      <div class="rhythm-dashboard">
        <section class="rhythm-now" :class="{ 'rhythm-now--empty': !nextReminder }" aria-live="polite">
          <template v-if="nextReminder">
            <header>
              <span class="rhythm-section-label"><span></span>{{ isDue ? '现在该动一动了' : '下一次提醒' }}</span>
              <button type="button" @click="openEditor(nextReminder.id)"><SlidersHorizontal :size="15" />调整规则</button>
            </header>

            <div class="rhythm-now__identity">
              <span class="rhythm-now__icon" :class="toneClass(nextReminder)">
                <component :is="reminderIcon(nextReminder)" :size="26" :stroke-width="1.8" />
              </span>
              <div><small>{{ triggerLabel(nextReminder) }}</small><h2>{{ nextReminder.title }}</h2></div>
            </div>

            <p class="rhythm-now__message">{{ nextReminder.message }}</p>

            <div class="rhythm-now__time">
              <span>{{ store.rhythmPaused ? '暂停中' : (isDue ? '现在' : '还有') }}</span>
              <strong>{{ store.rhythmPaused ? '—' : (isDue ? '该休息了' : formatRemaining(remainingSeconds)) }}</strong>
              <small v-if="!store.rhythmPaused && !isDue">{{ nextClockText }}</small>
            </div>

            <div class="rhythm-progress" aria-hidden="true">
              <span :style="{ width: `${progressPercent}%` }"></span>
            </div>

            <div class="rhythm-now__meta">
              <span><CalendarDays :size="14" />{{ weekdaySummary(nextReminder.weekdays) }}</span>
              <span><Clock3 :size="14" />{{ nextReminder.workStart }}–{{ nextReminder.workEnd }}</span>
            </div>

            <div v-if="isDue && !store.rhythmPaused" class="rhythm-now__actions">
              <button class="rhythm-action-primary" type="button" @click="store.completeRhythmReminder(nextReminder.id)"><Check :size="17" />完成这次提醒</button>
              <button type="button" @click="store.snoozeRhythmReminder(nextReminder.id, 5)">5 分钟后再提醒</button>
              <button type="button" @click="store.skipRhythmReminderToday(nextReminder.id)">今天不再提醒</button>
            </div>
            <p v-else class="rhythm-now__hint"><Leaf :size="15" />到点后可以完成、延后，或只跳过今天。</p>
          </template>

          <template v-else>
            <span class="rhythm-empty-icon"><BellRing :size="28" /></span>
            <p class="eyebrow">还没有运行中的节律</p>
            <h2>先从一件最需要的事开始</h2>
            <p>在右侧开启护眼、补水或站立提醒。它们可以一起运行，随时调整。</p>
          </template>
        </section>

        <section class="rhythm-library" aria-labelledby="rhythm-library-title">
          <header>
            <div><p class="eyebrow">我的节律</p><h2 id="rhythm-library-title">选择要保留的提醒</h2></div>
            <span>可同时开启多个</span>
          </header>

          <div class="rhythm-preset-grid">
            <article
              v-for="reminder in visibleReminders"
              :key="reminder.id"
              class="rhythm-preset"
              :class="[{ active: reminder.enabled && !isUnavailable(reminder), unavailable: isUnavailable(reminder) }, toneClass(reminder)]"
            >
              <button
                class="rhythm-preset__toggle"
                type="button"
                :aria-pressed="reminder.enabled && !isUnavailable(reminder)"
                :disabled="isUnavailable(reminder)"
                @click="store.toggleRhythmReminder(reminder.id)"
              >
                <span class="rhythm-preset__icon"><component :is="reminderIcon(reminder)" :size="21" :stroke-width="1.8" /></span>
                <span class="rhythm-preset__copy">
                  <strong>{{ reminder.title }}</strong>
                  <small>{{ isUnavailable(reminder) ? '当前系统暂不支持' : scheduleShort(reminder) }}</small>
                </span>
                <span class="rhythm-preset__switch" aria-hidden="true"><i></i></span>
              </button>
              <button class="rhythm-preset__edit" type="button" :aria-label="`调整${reminder.title}`" @click="openEditor(reminder.id)">
                <SlidersHorizontal :size="14" />
              </button>
            </article>

            <button class="rhythm-preset rhythm-preset--add" type="button" @click="addCustomReminder">
              <span><Plus :size="20" /></span>
              <strong>自定义提醒</strong>
              <small>写下你自己的节奏</small>
            </button>
          </div>
        </section>
      </div>

      <Transition name="rhythm-editor">
        <section v-if="editingReminder" class="rhythm-editor-sheet" aria-labelledby="rhythm-editor-title">
          <header>
            <span class="rhythm-editor-sheet__icon" :class="toneClass(editingReminder)">
              <component :is="reminderIcon(editingReminder)" :size="21" />
            </span>
            <div><small>提醒设置</small><h2 id="rhythm-editor-title">{{ editingReminder.title }}</h2></div>
            <button class="rhythm-editor-sheet__close" type="button" aria-label="关闭提醒设置" @click="editingId = null"><X :size="19" /></button>
          </header>

          <div class="rhythm-editor-sheet__body">
            <section>
              <h3>怎么提醒</h3>
              <div class="rhythm-trigger-picker">
                <button
                  v-for="trigger in availableTriggers"
                  :key="trigger.value"
                  type="button"
                  :class="{ active: editingReminder.triggerType === trigger.value }"
                  @click="updateEditing({ triggerType: trigger.value })"
                >
                  <component :is="trigger.icon" :size="17" /><span><strong>{{ trigger.label }}</strong><small>{{ trigger.detail }}</small></span>
                </button>
              </div>
              <label v-if="editingReminder.triggerType === 'fixed-time'" class="rhythm-setting-field">
                <span>每天提醒时刻</span>
                <input type="time" :value="editingReminder.time" @change="updateEditing({ time: $event.target.value })" />
              </label>
              <label v-else class="rhythm-setting-field">
                <span>{{ editingReminder.triggerType === 'active-duration' ? '连续活跃多久后提醒' : '提醒间隔' }}</span>
                <select :value="editingReminder.intervalSeconds / 60" @change="updateEditing({ intervalSeconds: Number($event.target.value) * 60 })">
                  <option v-for="minutes in intervalOptions" :key="minutes" :value="minutes">{{ intervalLabel(minutes) }}</option>
                </select>
              </label>
            </section>

            <section>
              <h3>什么时候运行</h3>
              <div class="rhythm-weekdays" role="group" aria-label="运行日期">
                <button
                  v-for="day in weekdayOptions"
                  :key="day.value"
                  type="button"
                  :class="{ active: editingReminder.weekdays.includes(day.value) }"
                  :aria-pressed="editingReminder.weekdays.includes(day.value)"
                  @click="toggleWeekday(day.value)"
                >{{ day.label }}</button>
              </div>
              <div class="rhythm-time-window">
                <label><span>开始</span><input type="time" :value="editingReminder.workStart" @change="updateEditing({ workStart: $event.target.value })" /></label>
                <span>至</span>
                <label><span>结束</span><input type="time" :value="editingReminder.workEnd" @change="updateEditing({ workEnd: $event.target.value })" /></label>
              </div>
            </section>

            <section class="rhythm-editor-sheet__message">
              <h3>提醒内容</h3>
              <label class="rhythm-setting-field">
                <span>标题</span>
                <input :value="editingReminder.title" maxlength="32" @change="updateEditing({ title: $event.target.value })" />
              </label>
              <label class="rhythm-setting-field">
                <span>出现时对你说</span>
                <textarea :value="editingReminder.message" maxlength="160" rows="3" @change="updateEditing({ message: $event.target.value })"></textarea>
              </label>
            </section>
          </div>

          <footer>
            <button v-if="!isBuiltIn(editingReminder)" class="rhythm-delete-btn" type="button" @click="deleteEditing"><Trash2 :size="15" />删除这个提醒</button>
            <span>修改会自动保存</span>
            <button class="rhythm-done-btn" type="button" @click="editingId = null"><Check :size="16" />完成</button>
          </footer>
        </section>
      </Transition>
    </div>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Accessibility,
  Armchair,
  Bell,
  BellRing,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Droplets,
  Eye,
  Leaf,
  MoonStar,
  Pause,
  Play,
  Plus,
  SlidersHorizontal,
  Sparkles,
  TimerReset,
  Trash2,
  Wind,
  X
} from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'

const store = useTaskStore()
const now = ref(Date.now())
const editingId = ref(null)
const pauseMenuOpen = ref(false)
const pauseMenu = ref(null)
let clockTimer

const builtInIds = new Set(['eyes', 'hydration', 'stand', 'blink', 'breathe', 'sedentary'])
const intervalOptions = [10, 15, 20, 30, 45, 60, 90, 120]
const weekdayOptions = [
  { value: 1, label: '一' }, { value: 2, label: '二' }, { value: 3, label: '三' },
  { value: 4, label: '四' }, { value: 5, label: '五' }, { value: 6, label: '六' },
  { value: 0, label: '日' }
]
const pauseOptions = [
  { minutes: 30, label: '暂停 30 分钟', detail: '适合开会或短暂离开' },
  { minutes: 60, label: '暂停 1 小时', detail: '留出一段不被打扰的时间' },
  { minutes: 120, label: '暂停 2 小时', detail: '今天先安静一阵' }
]

const visibleReminders = computed(() => store.rhythmReminders)
const enabledReminders = computed(() => visibleReminders.value.filter(item => item.enabled && !isUnavailable(item)))
const editingReminder = computed(() => visibleReminders.value.find(item => item.id === editingId.value) || null)
const availableTriggers = computed(() => [
  { value: 'interval', label: '按间隔', detail: '从上次完成后重新计时', icon: TimerReset },
  { value: 'fixed-time', label: '固定时刻', detail: '每天在指定时间提醒', icon: Clock3 },
  ...(store.activityMonitoringAvailable
    ? [{ value: 'active-duration', label: '连续活跃', detail: '持续使用电脑后提醒', icon: Accessibility }]
    : [])
])
const reminderTimings = computed(() => enabledReminders.value.map(reminder => ({
  reminder,
  dueAt: getNextReminderAt(reminder)
})).sort((a, b) => a.dueAt - b.dueAt))
const nextReminder = computed(() => reminderTimings.value[0]?.reminder || null)
const nextReminderAt = computed(() => reminderTimings.value[0]?.dueAt || null)
const remainingSeconds = computed(() => Math.max(0, Math.ceil(((nextReminderAt.value || now.value) - now.value) / 1000)))
const isDue = computed(() => Boolean(nextReminder.value) && remainingSeconds.value === 0)
const progressPercent = computed(() => {
  const reminder = nextReminder.value
  if (!reminder || reminder.triggerType === 'fixed-time') return isDue.value ? 100 : 18
  const total = Math.max(60, Number(reminder.intervalSeconds) || 60)
  return Math.max(4, Math.min(100, (1 - remainingSeconds.value / total) * 100))
})
const nextClockText = computed(() => {
  if (!nextReminderAt.value) return ''
  return `预计 ${new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(nextReminderAt.value))}`
})
const pausedUntilText = computed(() => {
  const value = store.clock?.rhythm?.pausedUntil
  if (!value) return '稍后'
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
})

function getNextReminderAt(reminder) {
  if (reminder.snoozedUntil) return alignToSchedule(reminder, new Date(reminder.snoozedUntil).getTime())
  if (reminder.triggerType === 'active-duration') {
    const dueAt = now.value + Math.max(0, reminder.intervalSeconds - (Number(reminder.activitySeconds) || 0)) * 1000
    return alignToSchedule(reminder, dueAt)
  }
  if (reminder.triggerType === 'fixed-time') {
    return nextFixedTime(reminder)
  }
  const baseline = new Date(reminder.lastCompletedAt || reminder.createdAt).getTime()
  return alignToSchedule(reminder, Math.max(now.value, baseline + reminder.intervalSeconds * 1000))
}

function nextFixedTime(reminder) {
  const [hours, minutes] = reminder.time.split(':').map(Number)
  const lastNotified = reminder.lastNotifiedAt ? new Date(reminder.lastNotifiedAt).getTime() : 0
  for (let offset = 0; offset < 8; offset += 1) {
    const due = new Date(now.value)
    due.setDate(due.getDate() + offset)
    due.setHours(hours, minutes, 0, 0)
    if (!reminder.weekdays.includes(due.getDay())) continue
    if (offset === 0 && reminder.skippedDate === localDateKey(due)) continue
    const scheduledAt = fixedTimeInWindow(reminder, due)
    if (scheduledAt && scheduledAt >= now.value && due.getTime() > lastNotified) return scheduledAt
  }
  return now.value + 7 * 24 * 60 * 60 * 1000
}

function fixedTimeInWindow(reminder, due) {
  const dueMinutes = due.getHours() * 60 + due.getMinutes()
  const [startHour, startMinute] = reminder.workStart.split(':').map(Number)
  const [endHour, endMinute] = reminder.workEnd.split(':').map(Number)
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute
  if (startMinutes === endMinutes) return due.getTime()
  if (startMinutes < endMinutes) {
    if (dueMinutes >= endMinutes) return null
    if (dueMinutes >= startMinutes) return due.getTime()
    const workStart = new Date(due)
    workStart.setHours(startHour, startMinute, 0, 0)
    return workStart.getTime()
  }
  if (dueMinutes < endMinutes || dueMinutes >= startMinutes) return due.getTime()
  const workStart = new Date(due)
  workStart.setHours(startHour, startMinute, 0, 0)
  return workStart.getTime()
}

function alignToSchedule(reminder, timestamp) {
  const [startHour, startMinute] = reminder.workStart.split(':').map(Number)
  const [endHour, endMinute] = reminder.workEnd.split(':').map(Number)
  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = new Date(timestamp)
    candidate.setDate(candidate.getDate() + offset)
    if (!reminder.weekdays.includes(candidate.getDay())) {
      candidate.setHours(startHour, startMinute, 0, 0)
      continue
    }
    if (offset === 0 && reminder.skippedDate === localDateKey(candidate)) continue
    const start = new Date(candidate)
    start.setHours(startHour, startMinute, 0, 0)
    const end = new Date(candidate)
    end.setHours(endHour, endMinute, 0, 0)
    if (end.getTime() <= start.getTime()) {
      const currentMinutes = candidate.getHours() * 60 + candidate.getMinutes()
      const startMinutes = startHour * 60 + startMinute
      const endMinutes = endHour * 60 + endMinute
      if (currentMinutes >= startMinutes || currentMinutes < endMinutes) return candidate.getTime()
      return start.getTime()
    }
    if (candidate.getTime() < start.getTime()) return start.getTime()
    if (candidate.getTime() < end.getTime()) return candidate.getTime()
    timestamp = new Date(candidate).setDate(candidate.getDate() + 1)
    const next = new Date(timestamp)
    next.setHours(startHour, startMinute, 0, 0)
    timestamp = next.getTime()
    offset = -1
  }
  return timestamp
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function reminderIcon(reminder) {
  return {
    eye: Eye,
    droplets: Droplets,
    accessibility: Accessibility,
    sparkles: Sparkles,
    wind: Wind,
    armchair: Armchair,
    bell: Bell
  }[reminder?.icon] || Bell
}

function toneClass(reminder) {
  return `rhythm-tone--${reminder?.color || 'cyan'}`
}

function triggerLabel(reminder) {
  if (reminder.triggerType === 'fixed-time') return `每天 ${reminder.time}`
  if (reminder.triggerType === 'active-duration') return `连续活跃 ${intervalLabel(reminder.intervalSeconds / 60)}`
  return `每 ${intervalLabel(reminder.intervalSeconds / 60)}`
}

function scheduleShort(reminder) {
  return `${triggerLabel(reminder)} · ${weekdaySummary(reminder.weekdays)}`
}

function weekdaySummary(days = []) {
  if (days.length === 7) return '每天'
  if (days.length === 5 && [1, 2, 3, 4, 5].every(day => days.includes(day))) return '工作日'
  if (days.length === 2 && days.includes(0) && days.includes(6)) return '周末'
  return weekdayOptions.filter(day => days.includes(day.value)).map(day => `周${day.label}`).join('、') || '未选择日期'
}

function formatRemaining(seconds) {
  const value = Math.max(0, Number(seconds) || 0)
  if (value >= 3600) {
    const hours = Math.floor(value / 3600)
    const minutes = Math.ceil((value % 3600) / 60)
    return minutes ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`
  }
  if (value >= 60) return `${Math.ceil(value / 60)} 分钟`
  return `${value} 秒`
}

function intervalLabel(minutes) {
  const value = Math.max(1, Math.round(Number(minutes) || 1))
  if (value >= 60 && value % 60 === 0) return `${value / 60} 小时`
  return `${value} 分钟`
}

function isUnavailable(reminder) {
  return reminder.triggerType === 'active-duration' && !store.activityMonitoringAvailable
}

function isBuiltIn(reminder) {
  return builtInIds.has(reminder?.id)
}

async function openEditor(id) {
  editingId.value = id
  await nextTick()
  document.querySelector('.rhythm-editor-sheet')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function addCustomReminder() {
  const id = store.addRhythmReminder({
    title: '我的提醒',
    message: '停一下，给自己一个短暂的转换。',
    icon: 'bell',
    color: 'cyan'
  })
  void openEditor(id)
}

function updateEditing(updates) {
  if (!editingReminder.value) return
  store.updateRhythmReminder(editingReminder.value.id, updates)
}

function toggleWeekday(day) {
  if (!editingReminder.value) return
  const days = editingReminder.value.weekdays.includes(day)
    ? editingReminder.value.weekdays.filter(value => value !== day)
    : [...editingReminder.value.weekdays, day]
  if (!days.length) return
  updateEditing({ weekdays: days })
}

function deleteEditing() {
  if (!editingReminder.value) return
  store.deleteRhythmReminder(editingReminder.value.id)
  editingId.value = null
}

function pauseAll(minutes) {
  store.pauseRhythmReminders(minutes)
  pauseMenuOpen.value = false
}

function closePauseMenu(event) {
  if (!pauseMenu.value?.contains(event.target)) pauseMenuOpen.value = false
}

onMounted(() => {
  clockTimer = window.setInterval(() => { now.value = Date.now() }, 1000)
  document.addEventListener('pointerdown', closePauseMenu)
})

onBeforeUnmount(() => {
  window.clearInterval(clockTimer)
  document.removeEventListener('pointerdown', closePauseMenu)
})
</script>
