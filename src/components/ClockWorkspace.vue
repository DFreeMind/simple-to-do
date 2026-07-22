<template>
  <main v-if="store.settings.clockView === 'focus'" class="clock-workspace clock-home">
    <section class="clock-home__hero" aria-labelledby="clock-home-title">
      <header class="clock-home__header">
        <div>
          <p class="eyebrow">今天的节奏</p>
          <h1 id="clock-home-title">{{ headline }}</h1>
        </div>
        <button class="clock-home__link" type="button" @click="store.setClockView('history')">查看回顾</button>
      </header>

      <div class="clock-home__body">
        <section class="clock-stage" :class="{ 'clock-stage--break': activeSession?.phase !== 'focus' && activeSession }" aria-live="polite">
          <span class="clock-stage__status">{{ stageLabel }}</span>
          <strong>{{ formattedTime }}</strong>
          <p>{{ stageDetail }}</p>

          <div v-if="activeSession" class="clock-stage__actions">
            <button v-if="activeSession.status === 'running'" class="clock-button clock-button--secondary" type="button" @click="store.pauseFocus"><Pause :size="18" fill="currentColor" />暂停</button>
            <button v-else class="clock-button clock-button--primary" type="button" @click="store.resumeFocus"><Play :size="18" fill="currentColor" />继续</button>
            <button class="clock-button clock-button--secondary" type="button" @click="finish(activeSession.phase === 'focus' ? 'completed' : 'completed')"><Check :size="18" />{{ activeSession.phase === 'focus' ? '完成本轮' : '完成休息' }}</button>
            <button v-if="activeSession.phase === 'focus'" class="clock-button clock-button--quiet" type="button" @click="finish('abandoned')">结束</button>
          </div>
          <div v-else-if="pendingBreak" class="clock-stage__actions">
            <button class="clock-button clock-button--primary" type="button" @click="store.startPendingBreak"><Coffee :size="18" />开始{{ pendingBreak.phase === 'long-break' ? '长休息' : '短休息' }}</button>
            <button class="clock-button clock-button--quiet" type="button" @click="store.skipPendingBreak">暂不休息</button>
          </div>
          <button v-else class="clock-button clock-button--primary clock-button--start" type="button" @click="start"><Play :size="19" fill="currentColor" />开始专注</button>
        </section>

        <aside class="clock-setup" aria-label="本次专注设置">
          <template v-if="!activeSession && !pendingBreak">
            <span class="clock-setup__label">专注方式</span>
            <div class="clock-mode-picker">
              <button v-for="profile in store.focusProfiles" :key="profile.id" type="button" :class="{ active: selectedProfileId === profile.id }" @click="selectedProfileId = profile.id">
                <strong>{{ profile.name }}</strong><small>{{ durationText(profile.durationSeconds) }}</small>
              </button>
            </div>
            <label class="clock-task-picker"><span>这段时间要推进什么？</span><select v-model="selectedTaskId"><option :value="null">不关联任务</option><option v-for="task in openTasks" :key="task.id" :value="task.id">{{ task.title }}</option></select></label>
          </template>
          <template v-else>
            <span class="clock-setup__label">当前事项</span>
            <p class="clock-setup__task">{{ currentTaskTitle }}</p>
            <label v-if="activeSession?.phase === 'focus'" class="clock-task-picker"><span>结束备注（可选）</span><input v-model="finishNote" maxlength="240" placeholder="例如：已完成初稿" /></label>
          </template>
          <div class="clock-today">
            <span>今日已专注</span><strong>{{ durationText(todaySeconds) }}</strong>
            <small>{{ todayCompletedCount }} 次完成专注</small>
          </div>
        </aside>
      </div>
    </section>

    <section class="clock-home__rhythms" aria-label="今日提醒">
      <header><div><p class="eyebrow">日常提醒</p><h2>保持好节奏</h2></div><button type="button" @click="store.setClockView('rhythm')">管理提醒</button></header>
      <div class="clock-rhythm-list">
        <article v-for="reminder in enabledReminders" :key="reminder.id"><strong>{{ reminder.title }}</strong><span>{{ rhythmLabel(reminder) }}</span><button type="button" @click="store.snoozeRhythmReminder(reminder.id, 5)">延后 5 分钟</button></article>
        <p v-if="!enabledReminders.length">还没有启用提醒。你可以按自己的工作节奏添加。</p>
      </div>
    </section>
  </main>
  <RhythmWorkspace v-else-if="store.settings.clockView === 'rhythm'" />
  <FocusHistoryWorkspace v-else />
</template>

<script setup>
import { computed, ref } from 'vue'
import { Check, Coffee, Pause, Play } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import RhythmWorkspace from './RhythmWorkspace.vue'
import FocusHistoryWorkspace from './FocusHistoryWorkspace.vue'

const store = useTaskStore()
const selectedProfileId = ref('pomodoro')
const selectedTaskId = ref(null)
const finishNote = ref('')
const activeSession = computed(() => store.activeFocusSession)
const pendingBreak = computed(() => store.focusPendingBreak)
const selectedProfile = computed(() => store.focusProfiles.find(item => item.id === selectedProfileId.value) || store.focusProfiles[0])
const currentProfile = computed(() => store.currentFocusProfile || selectedProfile.value)
const openTasks = computed(() => store.activeTasks.filter(task => !task.completed))
const currentTaskTitle = computed(() => openTasks.value.find(task => task.id === activeSession.value?.taskId)?.title || '不关联任务')
const remainingSeconds = computed(() => store.focusRemainingSeconds)
const formattedTime = computed(() => formatClock(activeSession.value ? (remainingSeconds.value === null ? store.focusElapsedSeconds : remainingSeconds.value) : (selectedProfile.value?.durationSeconds || 0)))
const stageLabel = computed(() => activeSession.value ? (activeSession.value.status === 'paused' ? '已暂停' : activeSession.value.phase === 'focus' ? '正在专注' : '正在休息') : pendingBreak.value ? '下一步' : '准备开始')
const stageDetail = computed(() => activeSession.value ? (activeSession.value.phase === 'focus' ? currentTaskTitle.value : '暂时离开屏幕，回来再继续。') : pendingBreak.value ? '刚完成一段专注，给自己一点恢复时间。' : selectedProfile.value?.description || '')
const headline = computed(() => activeSession.value ? (activeSession.value.phase === 'focus' ? '保持在这件事上' : '让大脑真正休息') : pendingBreak.value ? '先恢复，再继续' : '从一件小事开始')
const todayHistory = computed(() => store.focusHistory.filter(item => new Date(item.finishedAt).toDateString() === new Date().toDateString()))
const todaySeconds = computed(() => todayHistory.value.filter(item => item.phase === 'focus').reduce((total, item) => total + item.elapsedSeconds, 0))
const todayCompletedCount = computed(() => todayHistory.value.filter(item => item.phase === 'focus' && item.result === 'completed').length)
const enabledReminders = computed(() => store.rhythmReminders.filter(item => item.enabled).slice(0, 4))

function start() { store.startFocus(selectedProfile.value?.id, selectedTaskId.value) }
function finish(result) { store.finishFocus(result, finishNote.value); finishNote.value = '' }
function formatClock(seconds) { const value = Math.max(0, Math.floor(seconds || 0)); return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` }
function durationText(seconds) { if (seconds === null || seconds === undefined) return '自由计时'; const minutes = Math.round(seconds / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时` : `${minutes} 分钟` }
function rhythmLabel(reminder) { return reminder.triggerType === 'fixed-time' ? `每天 ${reminder.time}` : `每 ${Math.round(reminder.intervalSeconds / 60)} 分钟` }
</script>
