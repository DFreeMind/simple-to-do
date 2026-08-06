<template>
  <main class="clock-workspace rhythm-workspace">
    <div class="rhythm-shell">
      <header class="rhythm-header">
        <div>
          <p class="eyebrow">日常节律</p>
          <h1>{{ rhythmWelcome.title }}</h1>
          <p>{{ rhythmWelcome.description }}</p>
        </div>
      </header>

      <div class="rhythm-dashboard">
        <section class="rhythm-now" :class="[{ 'rhythm-now--empty': !reminderTimings.length, 'rhythm-now--due': reminderTimings.some(item => item.state === 'due') }, `rhythm-now--count-${reminderTimings.length}`]" aria-live="polite">
          <template v-if="reminderTimings.length">
            <header>
              <span class="rhythm-section-label"><span></span>当前运行的节律</span>
              <div class="rhythm-now__toolbar">
                <span class="rhythm-running-count" :class="{ paused: store.rhythmPaused }"><i></i>{{ store.rhythmPaused ? '已暂停' : `${runningReminderCount} / ${store.rhythmActiveLimit} 项运行中` }}</span>
                <button v-if="store.rhythmPaused" class="rhythm-control-btn rhythm-control-btn--primary" type="button" @click="store.resumeRhythmReminders"><Play :size="15" fill="currentColor" />继续</button>
                <button v-else class="rhythm-control-btn" type="button" @click="pauseAll"><Pause :size="15" />暂停</button>
              </div>
            </header>

            <div class="rhythm-timeline" aria-label="正在运行的提醒计时盘">
              <article
                v-for="item in reminderTimings"
                :key="item.reminder.id"
                class="rhythm-timeline-card"
                :class="[{ due: item.state === 'due', paused: store.rhythmPaused || item.state === 'paused' }, toneClass(item.reminder)]"
              >
                <div class="rhythm-timeline-card__dial" role="img" :aria-label="`${item.reminder.title}，${timingLabel(item)} ${timingValue(item)}`">
                  <svg class="rhythm-timeline-card__ring" viewBox="0 0 220 220" aria-hidden="true">
                    <g transform="rotate(-90 110 110)">
                      <circle class="rhythm-timeline-card__track" cx="110" cy="110" r="101" />
                      <circle v-if="timingUsesProgress(item)" class="rhythm-timeline-card__progress" cx="110" cy="110" r="101" :style="ringStyle(item)" />
                    </g>
                  </svg>
                  <span v-if="item.state === 'due' && !store.rhythmPaused" class="rhythm-timeline-card__due-icon" aria-hidden="true">
                    <BellRing :size="34" />
                    <small>该休息了</small>
                  </span>
                  <span v-else class="rhythm-timeline-card__dial-content">
                    <small class="rhythm-timeline-card__dial-label">{{ timingDialLabel(item) }}</small>
                    <strong :class="{ 'is-status': store.rhythmPaused || item.reminder.pausedIndividually }">{{ timingDialPrimary(item) }}</strong>
                    <small>{{ timingDialSecondary(item) }}</small>
                  </span>
                </div>

                <div class="rhythm-timeline-card__content">
                  <header>
                    <span class="rhythm-timeline-card__title"><span><component :is="reminderIcon(item.reminder)" :size="16" /></span><strong>{{ item.reminder.title }}</strong></span>
                    <button v-if="item.state !== 'due'" class="rhythm-timeline-card__pause" type="button" :aria-label="item.state === 'paused' ? `继续${item.reminder.title}` : `暂停${item.reminder.title}`" @click="toggleReminderPause(item.reminder)"><Play v-if="item.state === 'paused'" :size="14" fill="currentColor" /><Pause v-else :size="14" /></button>
                  </header>
                  <div class="rhythm-timeline-card__meta">
                    <span><TimerReset :size="14" />{{ timingHeadline(item) }}</span>
                    <span><CalendarDays :size="14" />{{ weekdaySummary(item.reminder.weekdays) }} · {{ item.reminder.workStart }}–{{ item.reminder.workEnd }}</span>
                  </div>
                  <section v-if="item.state !== 'due' && supportsQuickAdjustment(item)" class="rhythm-timeline-card__controls" :aria-label="`${item.reminder.title}本轮时间调整`">
                    <div class="rhythm-timeline-card__controls-actions">
                      <button type="button" :aria-label="`${item.reminder.title}本轮提前 5 分钟`" @click="adjustCurrentRound(item, -5)">−5</button>
                      <button type="button" :aria-label="`${item.reminder.title}本轮延后 5 分钟`" @click="adjustCurrentRound(item, 5)">+5</button>
                    </div>
                  </section>
                </div>

                <div v-if="item.state === 'due' && !store.rhythmPaused" class="rhythm-timeline-card__actions">
                  <button class="rhythm-action-primary" type="button" @click="store.completeRhythmReminder(item.reminder.id)"><Check :size="15" />{{ item.reminder.triggerType === 'active-duration' ? '我已活动' : '完成这次' }}</button>
                  <button type="button" @click="store.snoozeRhythmReminder(item.reminder.id, 5)">5 分钟后</button>
                  <button type="button" @click="store.skipRhythmReminderToday(item.reminder.id)">今天跳过</button>
                </div>
                <div v-else-if="canStartNow(item)" class="rhythm-timeline-card__actions rhythm-timeline-card__actions--resume">
                  <button class="rhythm-action-primary" type="button" @click="store.startRhythmReminderNow(item.reminder.id)"><Play :size="15" fill="currentColor" />现在开始本轮</button>
                </div>
              </article>
            </div>

            <p class="rhythm-now__hint"><Bell :size="15" />到点后会发送系统通知，并在这里保留待处理卡片；处理一项不会遮住其他节律。</p>
          </template>

          <template v-else>
            <span class="rhythm-empty-icon"><BellRing :size="28" /></span>
            <p class="eyebrow">还没有运行中的节律</p>
            <h2>先从一件最需要的事开始</h2>
            <p>从右侧选择最多三项节律。每一项都会在这里显示自己的计时方式和下一次提醒。</p>
          </template>
        </section>

        <section class="rhythm-library" aria-labelledby="rhythm-library-title">
          <header>
            <div>
              <h2 id="rhythm-library-title">常用节律</h2>
            </div>
            <span>最多同时开启 {{ store.rhythmActiveLimit }} 项</span>
          </header>

          <div class="rhythm-preset-grid">
            <article
              v-for="reminder in builtInReminders"
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
                  <small>{{ isUnavailable(reminder) ? '当前系统暂不支持' : reminder.enabled ? cardStatus(reminder) : triggerLabel(reminder) }}</small>
                </span>
                <span class="rhythm-preset__switch" aria-hidden="true"><i></i></span>
              </button>
              <button class="rhythm-preset__edit" type="button" :aria-label="`调整${reminder.title}`" @click="openEditor(reminder.id)">
                <SlidersHorizontal :size="14" />
              </button>
            </article>
          </div>

          <section class="rhythm-custom-entry" aria-labelledby="rhythm-custom-title">
            <span class="rhythm-custom-entry__icon"><Plus :size="18" /></span>
            <div>
              <strong id="rhythm-custom-title">自定义你的节奏</strong>
              <p>为吃药、午餐、会议准备，或任何你在意的事情创建提醒。</p>
            </div>
            <button type="button" @click="addCustomReminder">新建提醒</button>
          </section>

          <section v-if="customReminders.length" class="rhythm-custom-list" aria-labelledby="rhythm-custom-list-title">
            <header><h3 id="rhythm-custom-list-title">我的自定义提醒</h3><span>{{ customReminders.length }} 项</span></header>
            <div class="rhythm-preset-grid">
              <article
                v-for="reminder in customReminders"
                :key="reminder.id"
                class="rhythm-preset"
                :class="[{ active: reminder.enabled && !isUnavailable(reminder), unavailable: isUnavailable(reminder) }, toneClass(reminder)]"
              >
                <button class="rhythm-preset__toggle" type="button" :aria-pressed="reminder.enabled && !isUnavailable(reminder)" :disabled="isUnavailable(reminder)" @click="store.toggleRhythmReminder(reminder.id)">
                  <span class="rhythm-preset__icon"><component :is="reminderIcon(reminder)" :size="21" :stroke-width="1.8" /></span>
                  <span class="rhythm-preset__copy"><strong>{{ reminder.title }}</strong><small>{{ reminder.message }}</small><em>{{ cardStatus(reminder) }}</em></span>
                  <span class="rhythm-preset__switch" aria-hidden="true"><i></i></span>
                </button>
                <button class="rhythm-preset__edit" type="button" :aria-label="`调整${reminder.title}`" @click="openEditor(reminder.id)"><SlidersHorizontal :size="14" /></button>
              </article>
            </div>
          </section>
        </section>
      </div>

      <Teleport to=".app">
        <Transition name="rhythm-editor">
          <div v-if="editingReminder" ref="editorDialog" class="rhythm-editor-layer" role="dialog" aria-modal="true" aria-labelledby="rhythm-editor-title" tabindex="-1" @click.self="requestCloseEditor" @keydown.esc.stop="requestCloseEditor">
            <section class="rhythm-editor-sheet">
              <header>
                <span class="rhythm-editor-sheet__icon" :class="toneClass(editingReminder)">
                  <component :is="reminderIcon(editingReminder)" :size="21" />
                </span>
                <div><small>{{ editorSummary }}</small><h2 id="rhythm-editor-title">{{ editingReminder.title }}</h2></div>
                <button class="rhythm-editor-sheet__close" type="button" aria-label="关闭提醒设置" @click="requestCloseEditor"><X :size="19" /></button>
              </header>

              <div class="rhythm-editor-sheet__body">
                <div class="rhythm-editor-form">
                  <section class="rhythm-editor-section rhythm-editor-section--rule">
                    <div><p class="rhythm-editor-section__eyebrow">提醒频率</p><h3>{{ ruleDetailTitle }}</h3></div>
                    <label v-if="editingReminder.triggerType === 'fixed-time'" class="rhythm-setting-field">
                      <span>每天提醒时刻</span>
                      <input type="time" :value="editingReminder.time" @change="updateEditing({ time: $event.target.value })" />
                    </label>
                    <p v-if="editingReminder.triggerType === 'fixed-time'" class="rhythm-trigger-help"><Clock3 :size="14" />会在选定日期与运行时段内，于这个时刻提醒。</p>
                    <div v-else class="rhythm-interval-field">
                      <span>{{ editingReminder.triggerType === 'active-duration' ? '连续使用多久后提醒' : '提醒间隔' }}</span>
                      <div class="rhythm-interval-options" role="group" aria-label="常用提醒间隔">
                        <button v-for="minutes in intervalOptions" :key="minutes" type="button" :class="{ active: !customIntervalEnabled && editingReminder.intervalSeconds === minutes * 60 }" @click="setPresetInterval(minutes)">{{ intervalLabel(minutes) }}</button>
                        <button type="button" :class="{ active: customIntervalEnabled }" @click="enableCustomInterval">自定义</button>
                      </div>
                      <div class="rhythm-custom-interval" :class="{ 'is-active': customIntervalEnabled }">
                        <template v-if="customIntervalEnabled">
                          <input v-model.number="customIntervalValue" type="number" min="1" max="1440" aria-label="自定义提醒间隔" @change="applyCustomInterval" />
                          <div role="group" aria-label="自定义间隔单位">
                            <button type="button" :class="{ active: customIntervalUnit === 'minutes' }" @click="setCustomIntervalUnit('minutes')">分钟</button>
                            <button type="button" :class="{ active: customIntervalUnit === 'hours' }" @click="setCustomIntervalUnit('hours')">小时</button>
                          </div>
                        </template>
                        <span v-else>需要更精确的节奏？可选择“自定义”输入间隔。</span>
                      </div>
                    </div>
                  </section>

                  <section class="rhythm-editor-section rhythm-editor-section--schedule">
                    <div><p class="rhythm-editor-section__eyebrow">运行时间</p><h3>什么时候运行</h3></div>
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

                  <section class="rhythm-editor-section rhythm-editor-sheet__message">
                    <div class="rhythm-editor-section__heading">
                      <div><p class="rhythm-editor-section__eyebrow">提醒文案</p><h3>出现时对你说</h3></div>
                      <button class="rhythm-copy-randomize" type="button" @click="randomizeReminderCopy"><Sparkles :size="14" />换一条</button>
                    </div>
                    <p class="rhythm-copy-help">标题保持不变；可直接修改正文，或从{{ rhythmCopyOptionCount }}条同类内置文案中随机选一条。</p>
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

                <aside class="rhythm-editor-preview" aria-label="提醒效果预览">
                  <section class="rhythm-editor-mode-picker" aria-label="提醒方式">
                    <p class="rhythm-editor-section__eyebrow">提醒方式</p>
                    <div class="rhythm-trigger-picker">
                      <button
                        v-for="trigger in availableTriggers"
                        :key="trigger.value"
                        type="button"
                        :class="{ active: editingReminder.triggerType === trigger.value }"
                        :disabled="trigger.available === false"
                        @click="updateEditing({ triggerType: trigger.value })"
                      >
                        <component :is="trigger.icon" :size="16" /><span><strong>{{ trigger.label }}</strong><small>{{ trigger.detail }}</small></span>
                      </button>
                    </div>
                    <div class="rhythm-editor-mode-picker__detail">
                      <component :is="selectedTrigger.icon" :size="16" />
                      <div><strong>{{ selectedTriggerDetail }}</strong><p>{{ selectedTrigger.explanation }}</p></div>
                    </div>
                  </section>
                  <p class="rhythm-editor-section__eyebrow">提醒预览</p>
                  <div class="rhythm-editor-preview__card" :class="toneClass(editingReminder)">
                    <span class="rhythm-editor-preview__icon"><component :is="reminderIcon(editingReminder)" :size="28" /></span>
                    <div><small>{{ editorScheduleLabel }}</small><strong>{{ editingReminder.title }}</strong></div>
                    <p>{{ editingReminder.message }}</p>
                  </div>
                  <div class="rhythm-editor-preview__summary">
                    <span><CalendarDays :size="16" /><b>{{ weekdaySummary(editingReminder.weekdays) }}</b><small>运行日期</small></span>
                    <span><Clock3 :size="16" /><b>{{ editingReminder.workStart }}–{{ editingReminder.workEnd }}</b><small>提醒时段</small></span>
                    <span :class="{ muted: !editingReminder.enabled }"><Bell :size="16" /><b>{{ editorNextReminderText }}</b><small>下一次提醒</small></span>
                  </div>
                  <p class="rhythm-editor-preview__hint"><Check :size="15" />这是预览。点击“保存并关闭”后，提醒才会按这里的规则运行。</p>
                </aside>
              </div>

              <footer>
                <button v-if="!isNewReminder && !isBuiltIn(editingReminder)" class="rhythm-delete-btn" type="button" @click="requestDelete"><Trash2 :size="15" />删除这个提醒</button>
                <span><Check :size="14" />{{ editorDirty ? '保存后才会生效' : '当前没有未保存修改' }}</span>
                <button class="rhythm-cancel-btn" type="button" @click="requestCloseEditor">取消修改</button>
                <button class="rhythm-done-btn" type="button" @click="saveEditor"><Check :size="16" />保存并关闭</button>
              </footer>
            </section>
          </div>
        </Transition>
      </Teleport>
      <ConfirmDialog
        :visible="deleteConfirmOpen"
        title="删除这个提醒？"
        message="删除后将无法恢复该提醒及其当前设置。"
        :tag="editingReminder?.title || ''"
        confirm-text="删除提醒"
        cancel-text="保留提醒"
        type="danger"
        @confirm="confirmDelete"
        @cancel="deleteConfirmOpen = false"
      />
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
  Clock3,
  Droplets,
  Eye,
  Leaf,
  MonitorUp,
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
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { getRhythmCopyCategory, getRhythmCopyOptions, pickRhythmCopy } from '@/utils/rhythmCopy'

const store = useTaskStore()
const now = ref(Date.now())
const editingId = ref(null)
const editingDraft = ref(null)
const editingOriginal = ref(null)
const isNewReminder = ref(false)
const editorDialog = ref(null)
const editorTrigger = ref(null)
const deleteConfirmOpen = ref(false)
const customIntervalEnabled = ref(false)
const customIntervalValue = ref(60)
const customIntervalUnit = ref('minutes')
const recentCopyKeys = ref({})
let clockTimer

const builtInIds = new Set(['eyes', 'hydration', 'sedentary', 'shoulders', 'breathe', 'wrap-up'])
const intervalOptions = [10, 15, 20, 30, 45, 60, 90, 120]
const RING_CIRCUMFERENCE = 634.602
const weekdayOptions = [
  { value: 1, label: '一' }, { value: 2, label: '二' }, { value: 3, label: '三' },
  { value: 4, label: '四' }, { value: 5, label: '五' }, { value: 6, label: '六' },
  { value: 0, label: '日' }
]

const visibleReminders = computed(() => store.rhythmReminders)
const builtInReminders = computed(() => visibleReminders.value.filter(isBuiltIn))
const customReminders = computed(() => visibleReminders.value.filter(reminder => !isBuiltIn(reminder)))
const enabledReminders = computed(() => visibleReminders.value.filter(item => item.enabled && !isUnavailable(item)))
const runningReminderCount = computed(() => enabledReminders.value.filter(item => !item.pausedIndividually).length)
const editingReminder = computed(() => editingDraft.value)
const editorDirty = computed(() => Boolean(editingDraft.value) && (isNewReminder.value || JSON.stringify(editingDraft.value) !== JSON.stringify(editingOriginal.value)))
const editorSchedule = computed(() => editingReminder.value ? triggerLabel(editingReminder.value) : '')
const editorScheduleLabel = computed(() => customIntervalEnabled.value && editingReminder.value?.triggerType !== 'fixed-time'
  ? `自定义 · ${editorSchedule.value}`
  : editorSchedule.value)
const editorSummary = computed(() => editingReminder.value
  ? `${editorScheduleLabel.value} · ${weekdaySummary(editingReminder.value.weekdays)} · ${editingReminder.value.workStart}–${editingReminder.value.workEnd}`
  : '')
const rhythmCopyOptionCount = computed(() => editingReminder.value ? getRhythmCopyOptions(editingReminder.value).length : 0)
const editorNextReminderText = computed(() => {
  const reminder = editingReminder.value
  if (!reminder?.enabled) return '未启用'
  const date = new Date(getNextReminderAt(reminder))
  const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  if (localDateKey(date) === localDateKey(new Date(now.value))) return `今天 ${time}`
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${time}`
})
const ruleDetailTitle = computed(() => {
  if (editingReminder.value?.triggerType === 'fixed-time') return '设置提醒时刻'
  return editingReminder.value?.triggerType === 'active-duration' ? '设置活跃时长' : '设置提醒间隔'
})
const availableTriggers = computed(() => [
  { value: 'interval', label: '按间隔', detail: '每隔一段时间提醒一次', explanation: '保存后会从当前时刻开始倒计时；处理本次提醒后，才开始下一轮。', icon: TimerReset, available: true },
  { value: 'fixed-time', label: '固定时刻', detail: '在选定时刻提醒一次', explanation: '只在选定日期和时刻提醒，不会重复倒计时；时刻不在运行时段内时，会等到下一个可运行时段。', icon: Clock3, available: true },
  {
    value: 'active-duration',
    label: '连续使用',
    detail: store.activityMonitoringAvailable ? '累计使用电脑的时间' : '当前系统暂不支持',
    explanation: '只累计连续使用电脑的时长，不读取键盘内容或鼠标轨迹；连续离开电脑 3 分钟后会自动从零开始。',
    icon: MonitorUp,
    available: store.activityMonitoringAvailable
  }
])
const selectedTrigger = computed(() => availableTriggers.value.find(item => item.value === editingReminder.value?.triggerType) || availableTriggers.value[0])
const selectedTriggerDetail = computed(() => selectedTrigger.value?.detail || '')
const reminderTimings = computed(() => enabledReminders.value.map((reminder) => {
  const dueAt = getNextReminderAt(reminder)
  return { reminder, dueAt, state: reminder.pausedIndividually ? 'paused' : (reminder.pendingSince || dueAt <= now.value ? 'due' : 'running') }
}).sort((a, b) => {
  if (a.state === 'paused' || b.state === 'paused') return a.state === b.state ? 0 : (a.state === 'paused' ? 1 : -1)
  if (a.state !== b.state) return a.state === 'due' ? -1 : 1
  return a.dueAt - b.dueAt
}))
const primaryTiming = computed(() => reminderTimings.value[0] || null)
const primaryReminder = computed(() => primaryTiming.value?.reminder || null)
const primaryState = computed(() => primaryTiming.value?.state || 'empty')
const primaryDueAt = computed(() => primaryTiming.value?.dueAt || null)
const primaryRemainingSeconds = computed(() => Math.max(0, Math.ceil(((primaryDueAt.value || now.value) - now.value) / 1000)))
const primaryUsesProgress = computed(() => {
  const reminder = primaryReminder.value
  if (!reminder || primaryState.value === 'due' || reminder.triggerType === 'fixed-time') return false
  return reminder.triggerType === 'active-duration' || isWithinSchedule(reminder)
})
const primaryProgressPercent = computed(() => {
  const reminder = primaryReminder.value
  if (!reminder) return 0
  const total = Math.max(60, Number(reminder.intervalSeconds) || 60)
  if (reminder.triggerType === 'active-duration') return Math.max(3, Math.min(100, ((Number(reminder.activitySeconds) || 0) / total) * 100))
  return Math.max(3, Math.min(100, (1 - primaryRemainingSeconds.value / total) * 100))
})
const primaryStateLabel = computed(() => {
  if (store.rhythmPaused) return '提醒已暂停'
  if (primaryState.value === 'due') return '现在该做这件事'
  return '下一项节律'
})
const primaryTimeLabel = computed(() => {
  const reminder = primaryReminder.value
  if (store.rhythmPaused) return '暂停中'
  if (primaryState.value === 'due') return '待处理'
  if (reminder?.triggerType === 'active-duration') return '连续使用'
  if (reminder?.triggerType === 'fixed-time') return '下一次'
  if (reminder && !isWithinSchedule(reminder)) return '下一工作时段'
  return '还有'
})
const primaryTimeValue = computed(() => {
  const reminder = primaryReminder.value
  if (store.rhythmPaused) return '—'
  if (primaryState.value === 'due') return '该休息了'
  if (reminder?.triggerType === 'active-duration') return `${formatRemaining(Number(reminder.activitySeconds) || 0)} / ${formatRemaining(reminder.intervalSeconds)}`
  if (reminder?.triggerType === 'fixed-time') return formatCalendarTime(primaryDueAt.value)
  if (reminder && !isWithinSchedule(reminder)) return formatCalendarTime(primaryDueAt.value)
  return formatRemaining(primaryRemainingSeconds.value)
})
const primaryTimeDetail = computed(() => {
  const reminder = primaryReminder.value
  if (!reminder || store.rhythmPaused) return '继续后会从当前进度接着运行'
  if (primaryState.value === 'due') return '处理后才会开始下一轮，不会连续弹出。'
  if (reminder.triggerType === 'active-duration') return `达到 ${formatRemaining(reminder.intervalSeconds)} 后提醒；连续离席 ${formatRemaining(reminder.breakThresholdSeconds || 180)} 会自动重置。`
  if (reminder.triggerType === 'fixed-time') return `固定在 ${reminder.time} 提醒。`
  if (!isWithinSchedule(reminder)) return `不在提醒时段内；会在 ${formatCalendarTime(primaryDueAt.value)} 开始本轮倒计时。`
  return `本轮已过 ${formatRemaining(Math.max(0, reminder.intervalSeconds - primaryRemainingSeconds.value))} / ${formatRemaining(reminder.intervalSeconds)} · 预计 ${formatClock(primaryDueAt.value)}`
})
const primaryHint = computed(() => {
  const reminder = primaryReminder.value
  if (!reminder) return ''
  if (store.rhythmPaused) return '继续后，间隔提醒会从当前剩余时间继续倒计时。'
  if (reminder.triggerType === 'active-duration') return '这是连续电脑使用时长，不会判断你是否真的坐着。'
  if (reminder.triggerType === 'fixed-time') return '固定时刻提醒不会使用模糊的进度条。'
  return '倒计时结束后，你可以完成、延后或跳过今天。'
})
const upcomingReminders = computed(() => reminderTimings.value.slice(1, 3).map((item) => ({
  ...item,
  summary: reminderTimingSummary(item)
})))
const rhythmWelcome = computed(() => {
  const hour = new Date(now.value).getHours()
  if (!enabledReminders.value.length) return { title: '先留下一段照顾自己的时间', description: '从右侧选一个节律开始；需要时再慢慢增加。' }
  if (store.rhythmPaused) return { title: '让提醒安静一会儿', description: '提醒已暂停，需要时可以继续运行。' }
  if (hour < 11) return { title: '让今天的节奏从容一点', description: '把需要的停顿交给提醒，专注时就不必一直惦记。' }
  if (hour < 18) return { title: '忙着，也别忘了照顾自己', description: '正在运行的每一项节律，都在按自己的时间前进。' }
  return { title: '把今天的节奏收一收', description: '还在继续的提醒会保留到下个合适时段；也可以现在重新开始一轮。' }
})

function getNextReminderAt(reminder) {
  if (reminder.pendingSince) return now.value
  if (reminder.snoozedUntil) return alignToSchedule(reminder, new Date(reminder.snoozedUntil).getTime())
  if (reminder.triggerType === 'active-duration') {
    const dueAt = now.value + Math.max(0, roundDurationSeconds(reminder) - (Number(reminder.activitySeconds) || 0)) * 1000
    return alignToSchedule(reminder, dueAt)
  }
  if (reminder.triggerType === 'fixed-time') {
    return nextFixedTime(reminder)
  }
  const scheduled = new Date(reminder.nextDueAt || now.value).getTime()
  return alignToSchedule(reminder, Math.max(now.value, scheduled))
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
  if (reminder.manualCycleStartedAt && reminder.triggerType !== 'fixed-time') return timestamp
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

function isWithinSchedule(reminder, timestamp = now.value) {
  if (reminder.manualCycleStartedAt && reminder.triggerType !== 'fixed-time') return true
  const date = new Date(timestamp)
  if (!reminder.weekdays.includes(date.getDay())) return false
  if (reminder.skippedDate === localDateKey(date)) return false
  const [startHour, startMinute] = reminder.workStart.split(':').map(Number)
  const [endHour, endMinute] = reminder.workEnd.split(':').map(Number)
  const currentMinutes = date.getHours() * 60 + date.getMinutes()
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute
  if (startMinutes === endMinutes) return true
  if (startMinutes < endMinutes) return currentMinutes >= startMinutes && currentMinutes < endMinutes
  return currentMinutes >= startMinutes || currentMinutes < endMinutes
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
    check: Check,
    bell: Bell
  }[reminder?.icon] || Bell
}

function toneClass(reminder) {
  return `rhythm-tone--${reminder?.color || 'cyan'}`
}

function triggerLabel(reminder) {
  if (reminder.triggerType === 'fixed-time') return `每天 ${reminder.time}`
  if (reminder.triggerType === 'active-duration') return `连续使用 ${intervalLabel(reminder.intervalSeconds / 60)}`
  return `每 ${intervalLabel(reminder.intervalSeconds / 60)}`
}

function scheduleShort(reminder) {
  return `${triggerLabel(reminder)} · ${weekdaySummary(reminder.weekdays)}`
}

function cardStatus(reminder) {
  if (!reminder.enabled) return scheduleShort(reminder)
  if (reminder.pendingSince) return '待处理 · 需要你决定下一步'
  if (reminder.snoozedUntil && new Date(reminder.snoozedUntil).getTime() > now.value) return `已延后至 ${formatClock(new Date(reminder.snoozedUntil).getTime())}`
  if (reminder.skippedDate === localDateKey()) return '今天已跳过'
  const dueAt = getNextReminderAt(reminder)
  if (reminder.triggerType === 'interval' && !isWithinSchedule(reminder)) return `下一工作时段 ${formatCalendarTime(dueAt)}`
  return `下次 ${formatClock(dueAt)} · ${formatRemaining(Math.max(0, Math.ceil((dueAt - now.value) / 1000)))}`
}

function timingKind(reminder) {
  if (reminder.triggerType === 'active-duration') return '连续使用 · 累计计时'
  if (reminder.triggerType === 'fixed-time') return '固定时刻 · 时间点'
  return '按间隔 · 倒计时'
}

function timingDialLabel(item) {
  if (store.rhythmPaused) return '已暂停'
  if (item.reminder.pausedIndividually) return '已暂停'
  if (item.state === 'due') return '现在需要处理'
  if (item.reminder.triggerType === 'active-duration') return '距提醒'
  if (item.reminder.triggerType === 'fixed-time') return '下一次提醒'
  if (!isWithinSchedule(item.reminder)) return '下一工作时段'
  return '倒计时'
}

function timingDialPrimary(item) {
  const { reminder, state, dueAt } = item
  if (store.rhythmPaused) return '暂停中'
  if (reminder.pausedIndividually) return '暂停中'
  if (state === 'due') return '该休息了'
  if (reminder.triggerType === 'active-duration') return formatDialCountdown(Math.max(0, roundDurationSeconds(reminder) - (Number(reminder.activitySeconds) || 0)))
  if (reminder.triggerType === 'fixed-time') return reminder.time
  if (!isWithinSchedule(reminder)) return dialScheduleDay(dueAt)
  return formatDialCountdown(Math.max(0, Math.ceil((dueAt - now.value) / 1000)))
}

function timingDialSecondary(item) {
  const { reminder, state, dueAt } = item
  const remaining = reminder.triggerType === 'active-duration'
    ? Math.max(0, roundDurationSeconds(reminder) - (Number(reminder.activitySeconds) || 0))
    : reminder.pausedRemainingSeconds
  if (store.rhythmPaused || reminder.pausedIndividually) return `剩余 ${formatRemaining(remaining)}`
  if (state === 'due') return '处理后开始新一轮'
  if (reminder.triggerType === 'active-duration') return `已连续使用 ${formatRemaining(Number(reminder.activitySeconds) || 0)}`
  if (reminder.triggerType === 'fixed-time') return weekdaySummary(reminder.weekdays)
  if (!isWithinSchedule(reminder)) return formatClock(dueAt)
  return '后提醒'
}

function dialScheduleDay(timestamp) {
  const date = new Date(timestamp)
  const today = new Date(now.value)
  const tomorrow = new Date(now.value)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (localDateKey(date) === localDateKey(today)) return '今天'
  if (localDateKey(date) === localDateKey(tomorrow)) return '明天'
  return `周${weekdayOptions.find(day => day.value === date.getDay())?.label || ''}`
}

function cycleOriginLabel(reminder) {
  if (reminder.triggerType === 'active-duration') return `连续使用达到 ${formatRemaining(reminder.intervalSeconds)} 后提醒`
  if (reminder.triggerType === 'fixed-time') return `固定在 ${reminder.time} 提醒`
  const startedAt = reminder.cycleStartedAt || reminder.lastCompletedAt
  return startedAt ? `本轮从 ${formatClock(new Date(startedAt).getTime())} 开始` : `每 ${intervalLabel(reminder.intervalSeconds / 60)} 提醒一次`
}

function timingLabel(item) {
  const { reminder, state } = item
  if (store.rhythmPaused) return '已暂停'
  if (state === 'due') return '现在需要处理'
  if (reminder.snoozedUntil && new Date(reminder.snoozedUntil).getTime() > now.value) return '已延后至'
  if (reminder.skippedDate === localDateKey()) return '今天已跳过'
  if (reminder.triggerType === 'active-duration') return '已连续使用'
  if (reminder.triggerType === 'fixed-time') return '下一次提醒'
  if (!isWithinSchedule(reminder)) return '下一工作时段'
  return '倒计时'
}

function timingValue(item) {
  const { reminder, state, dueAt } = item
  if (store.rhythmPaused) return '—'
  if (state === 'due') return '该停一下了'
  if (reminder.snoozedUntil && new Date(reminder.snoozedUntil).getTime() > now.value) return formatClock(new Date(reminder.snoozedUntil).getTime())
  if (reminder.skippedDate === localDateKey()) return '今天不再提醒'
  if (reminder.triggerType === 'active-duration') return `还需 ${formatRemaining(Math.max(0, roundDurationSeconds(reminder) - (Number(reminder.activitySeconds) || 0)))}，本轮结束后提醒`
  if (reminder.triggerType === 'fixed-time' || !isWithinSchedule(reminder)) return formatCalendarTime(dueAt)
  return formatCountdown(Math.max(0, Math.ceil((dueAt - now.value) / 1000)))
}

function timingDetail(item) {
  const { reminder, dueAt } = item
  if (store.rhythmPaused) return '继续后会从当前进度接着运行'
  if (reminder.triggerType === 'active-duration') return `达到 ${formatRemaining(reminder.intervalSeconds)} 时提醒`
  if (reminder.triggerType === 'fixed-time') return `${weekdaySummary(reminder.weekdays)} · ${reminder.time}`
  if (!isWithinSchedule(reminder)) return `运行时段 ${reminder.workStart}–${reminder.workEnd}`
  return `下次 ${formatClock(dueAt)} · 每 ${intervalLabel(reminder.intervalSeconds / 60)}`
}

function timingHeadline(item) {
  const { reminder, state } = item
  if (store.rhythmPaused) return '提醒已暂停，继续后会从当前进度接着运行'
  if (reminder.pausedIndividually) return '本轮已暂停，继续后会从当前进度接着运行'
  if (state === 'due') return '现在该给自己一点调整时间了'
  if (reminder.triggerType === 'active-duration') return `已累计 ${formatRemaining(Number(reminder.activitySeconds) || 0)}，达到 ${formatRemaining(reminder.intervalSeconds)} 后提醒`
  if (reminder.triggerType === 'fixed-time') return `会在 ${formatCalendarTime(item.dueAt)} 提醒`
  if (!isWithinSchedule(reminder)) return `下个常规时段从 ${formatCalendarTime(item.dueAt)} 开始`
  return `还有 ${formatRemaining(Math.max(0, Math.ceil((item.dueAt - now.value) / 1000)))}，本轮结束后提醒`
}

function canStartNow(item) {
  return !store.rhythmPaused
    && !item.reminder.pausedIndividually
    && item.state !== 'due'
    && item.reminder.triggerType !== 'fixed-time'
    && !isWithinSchedule(item.reminder)
}

function supportsQuickAdjustment(item) {
  return item.reminder.triggerType !== 'fixed-time'
}

function adjustCurrentRound(item, minutes) {
  store.adjustRhythmReminderTiming(item.reminder.id, minutes)
}

function toggleReminderPause(reminder) {
  if (reminder.pausedIndividually) store.resumeRhythmReminder(reminder.id)
  else store.pauseRhythmReminder(reminder.id)
}

function timingUsesProgress(item) {
  return !store.rhythmPaused && item.state === 'running'
}

function timingProgress(item) {
  const total = roundDurationSeconds(item.reminder)
  if (item.reminder.triggerType === 'active-duration') return Math.max(3, Math.min(100, ((Number(item.reminder.activitySeconds) || 0) / total) * 100))
  return Math.max(3, Math.min(100, (1 - Math.max(0, item.dueAt - now.value) / 1000 / total) * 100))
}

function ringProgress(item) {
  if (item.reminder.triggerType === 'fixed-time' || !isWithinSchedule(item.reminder)) return 100
  const elapsed = timingProgress(item)
  return item.reminder.triggerType === 'interval' ? 100 - elapsed : elapsed
}

function ringStyle(item) {
  const progress = ringProgress(item)
  return {
    strokeDasharray: RING_CIRCUMFERENCE,
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress / 100)
  }
}

function reminderTimingSummary(item) {
  if (item.state === 'due') return item.reminder.pendingSince ? '待处理' : '等待当前提醒'
  const seconds = Math.max(0, Math.ceil((item.dueAt - now.value) / 1000))
  if (item.reminder.triggerType === 'fixed-time') return formatCalendarTime(item.dueAt)
  if (item.reminder.triggerType === 'interval' && !isWithinSchedule(item.reminder)) return `下一工作时段 ${formatCalendarTime(item.dueAt)}`
  return `还有 ${formatRemaining(seconds)}`
}

function formatClock(timestamp) {
  if (!timestamp) return '稍后'
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(timestamp))
}

function formatCalendarTime(timestamp) {
  if (!timestamp) return '稍后'
  const date = new Date(timestamp)
  if (localDateKey(date) === localDateKey(new Date(now.value))) return `今天 ${formatClock(timestamp)}`
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${formatClock(timestamp)}`
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
    const totalMinutes = Math.ceil(value / 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return minutes ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`
  }
  if (value >= 60) return `${Math.ceil(value / 60)} 分钟`
  return `${value} 秒`
}

function formatCountdown(seconds) {
  const value = Math.max(0, Math.ceil(Number(seconds) || 0))
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const remainingSeconds = value % 60
  const clock = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  return hours ? `${hours}:${clock}` : clock
}

function roundDurationSeconds(reminder) {
  return Math.max(60, Math.min(8 * 60 * 60, (Number(reminder?.intervalSeconds) || 60) + (Number(reminder?.roundAdjustmentSeconds) || 0)))
}

function formatDialCountdown(seconds) {
  const value = Math.max(0, Math.ceil(Number(seconds) || 0))
  if (value < 3600) return formatCountdown(value)
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  return `${hours}:${String(minutes).padStart(2, '0')}`
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
  const reminder = visibleReminders.value.find(item => item.id === id)
  if (!reminder) return
  editorTrigger.value = document.activeElement
  editingId.value = id
  isNewReminder.value = false
  editingOriginal.value = cloneReminder(reminder)
  editingDraft.value = cloneReminder(reminder)
  prepareIntervalEditor()
  await nextTick()
  editorDialog.value?.focus()
}

function cloneReminder(reminder) {
  return { ...reminder, weekdays: [...(reminder?.weekdays || [])] }
}

function prepareIntervalEditor() {
  const minutes = Math.max(1, Math.round((editingReminder.value?.intervalSeconds || 3600) / 60))
  customIntervalEnabled.value = !intervalOptions.includes(minutes)
  customIntervalUnit.value = minutes >= 60 && minutes % 60 === 0 ? 'hours' : 'minutes'
  customIntervalValue.value = customIntervalUnit.value === 'hours' ? minutes / 60 : minutes
}

async function closeEditor() {
  editingId.value = null
  editingDraft.value = null
  editingOriginal.value = null
  isNewReminder.value = false
  await nextTick()
  editorTrigger.value?.focus?.()
  editorTrigger.value = null
}

function requestCloseEditor() {
  void closeEditor()
}

function addCustomReminder() {
  editorTrigger.value = document.activeElement
  editingId.value = null
  isNewReminder.value = true
  editingOriginal.value = null
  editingDraft.value = {
    title: '我的提醒',
    message: '停一下，给自己一个短暂的转换。',
    icon: 'bell',
    color: 'cyan',
    enabled: enabledReminders.value.length < store.rhythmActiveLimit,
    triggerType: 'interval',
    intervalSeconds: 60 * 60,
    time: '09:00',
    weekdays: [1, 2, 3, 4, 5],
    workStart: '09:00',
    workEnd: '18:00'
  }
  prepareIntervalEditor()
  void nextTick(() => editorDialog.value?.focus())
}

function updateEditing(updates) {
  if (!editingReminder.value) return
  editingDraft.value = { ...editingReminder.value, ...updates }
}

function randomizeReminderCopy() {
  if (!editingReminder.value) return
  const reminder = editingReminder.value
  const category = getRhythmCopyCategory(reminder)
  const options = getRhythmCopyOptions(reminder)
  const currentKey = options.find(option => option.message === reminder.message)?.key
  const recent = recentCopyKeys.value[category] || []
  const copy = pickRhythmCopy(reminder, [...recent, currentKey].filter(Boolean))
  if (!copy) return
  recentCopyKeys.value = {
    ...recentCopyKeys.value,
    [category]: [...recent, copy.key].slice(-6)
  }
  updateEditing({ message: copy.message })
}

async function saveEditor() {
  if (!editingReminder.value) return
  const draft = cloneReminder(editingReminder.value)
  if (isNewReminder.value) {
    store.addRhythmReminder(draft)
  } else {
    store.updateRhythmReminder(editingId.value, draft)
  }
  await closeEditor()
}

function setPresetInterval(minutes) {
  customIntervalEnabled.value = false
  updateEditing({ intervalSeconds: minutes * 60 })
}

function enableCustomInterval() {
  const minutes = Math.max(1, Math.round((editingReminder.value?.intervalSeconds || 3600) / 60))
  customIntervalEnabled.value = true
  customIntervalUnit.value = minutes >= 60 && minutes % 60 === 0 ? 'hours' : 'minutes'
  customIntervalValue.value = customIntervalUnit.value === 'hours' ? minutes / 60 : minutes
}

function setCustomIntervalUnit(unit) {
  const currentMinutes = Math.max(1, Number(customIntervalValue.value) || 1) * (customIntervalUnit.value === 'hours' ? 60 : 1)
  customIntervalUnit.value = unit
  customIntervalValue.value = unit === 'hours' ? Math.max(1, currentMinutes / 60) : Math.round(currentMinutes)
  applyCustomInterval()
}

function applyCustomInterval() {
  const value = Math.max(1, Math.min(1440, Number(customIntervalValue.value) || 1))
  customIntervalValue.value = value
  updateEditing({ intervalSeconds: Math.round(value * (customIntervalUnit.value === 'hours' ? 60 : 1)) * 60 })
}

function toggleWeekday(day) {
  if (!editingReminder.value) return
  const days = editingReminder.value.weekdays.includes(day)
    ? editingReminder.value.weekdays.filter(value => value !== day)
    : [...editingReminder.value.weekdays, day]
  if (!days.length) return
  updateEditing({ weekdays: days })
}

async function deleteEditing() {
  if (!editingReminder.value || isNewReminder.value) return
  store.deleteRhythmReminder(editingId.value)
  await closeEditor()
}

function requestDelete() {
  deleteConfirmOpen.value = true
}

function confirmDelete() {
  deleteConfirmOpen.value = false
  void deleteEditing()
}

function pauseAll() {
  store.pauseRhythmReminders()
}

onMounted(() => {
  clockTimer = window.setInterval(() => { now.value = Date.now() }, 1000)
})

onBeforeUnmount(() => {
  window.clearInterval(clockTimer)
})
</script>
