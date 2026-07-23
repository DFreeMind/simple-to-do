<template>
  <main v-if="store.settings.clockView === 'focus'" class="clock-workspace clock-home">
    <div class="clock-home__body">
      <section class="clock-stage" :class="{ 'clock-stage--break': activeSession?.phase !== 'focus' && activeSession }" aria-live="polite">
          <div class="clock-stage__dial" :title="activeSession ? sessionTimeRange : ''">
            <svg class="clock-stage__ring" viewBox="0 0 220 220" aria-hidden="true">
              <g transform="rotate(-90 110 110)"><circle class="clock-stage__ring-track" cx="110" cy="110" r="101" /><circle class="clock-stage__ring-progress" cx="110" cy="110" r="101" :style="timerRingStyle" /></g>
            </svg>
            <div class="clock-stage__content">
              <span class="clock-stage__status"><i v-if="activeSession?.status === 'running'"></i>{{ stageLabel }}</span>
              <div class="clock-stage__time-row"><button v-if="canSetFreeDuration" class="clock-free-time" type="button" title="点击设定本次自由专注时长" @click="freeDurationEditing = true">{{ formattedTime }}</button><strong v-else>{{ formattedTime }}</strong><div v-if="freeDurationEditing" class="clock-free-time__editor"><p>设定本次倒计时</p><div class="clock-free-time__presets"><button v-for="minutes in [15, 25, 45, 60]" :key="minutes" type="button" @click="setFreeDuration(minutes)">{{ minutes }} 分钟</button></div><label>自定义 <input v-model.number="freeDurationMinutes" type="number" min="1" max="480" /> 分钟</label><div><button class="clock-free-time__confirm" type="button" @click="confirmFreeDuration">使用此时长</button><button type="button" @click="freeDurationEditing = false">取消</button></div></div></div>
              <p>{{ stageDetail }}</p>
            </div>
          </div>

          <div v-if="activeSession" class="clock-stage__actions">
            <button v-if="activeSession.status === 'running'" class="clock-button clock-button--primary" type="button" @click="store.pauseFocus"><Pause :size="18" fill="currentColor" />暂停专注</button>
            <button v-else class="clock-button clock-button--primary" type="button" @click="store.resumeFocus"><Play :size="18" fill="currentColor" />继续</button>
            <button class="clock-button clock-button--secondary" type="button" @click="finish(activeSession.phase === 'focus' ? 'completed' : 'completed')"><Check :size="18" />{{ activeSession.phase === 'focus' ? '完成本轮' : '完成休息' }}</button>
            <template v-if="canAdjustTime"><button class="clock-button clock-button--adjust" type="button" @click.stop="adjustTime(-5)"><Minus :size="16" />缩短 5 分钟</button><button class="clock-button clock-button--adjust" type="button" @click.stop="adjustTime(5)"><Plus :size="16" />延长 5 分钟</button></template>
            <button v-if="activeSession.phase === 'focus'" class="clock-button clock-button--quiet" type="button" @click="finish('abandoned')">结束</button>
          </div>
          <div v-else-if="pendingBreak" class="clock-stage__actions">
            <button class="clock-button clock-button--primary" type="button" @click="store.startPendingBreak"><Coffee :size="18" />开始{{ pendingBreak.phase === 'long-break' ? '长休息' : '短休息' }}</button>
            <button class="clock-button clock-button--quiet" type="button" title="跳过本次休息，回到专注类型选择" @click="store.skipPendingBreak">跳过休息，选择下一轮</button>
          </div>
        <button v-else class="clock-button clock-button--primary clock-button--start" type="button" @click="start"><Play :size="20" fill="currentColor" />开始专注</button>
        <span class="clock-stage__caption">专注即成长</span>
      </section>

      <aside class="clock-side" aria-label="本次专注设置">
        <section class="clock-side-card clock-side-card--modes">
          <header><span class="clock-side-card__icon"><Target :size="19" /></span><h2>专注方式</h2></header>
          <template v-if="!activeSession && !pendingBreak">
            <div class="clock-mode-picker">
              <button v-for="profile in primaryFocusProfiles" :key="profile.id" type="button" :class="{ active: selectedProfileId === profile.id }" @click="selectedProfileId = profile.id">
                <component :is="profile.id === 'pomodoro' ? Timer : profile.id === 'deep-work' ? Focus : Clock3" :size="24" /><strong>{{ profile.name }}</strong><small>{{ durationText(profile.durationSeconds) }}</small>
              </button>
            </div>
          </template>
          <p v-else class="clock-side-card__current-mode">{{ currentProfile?.name || '专注中' }} · {{ durationText(activeSession?.durationSeconds) }}</p>
        </section>

        <section class="clock-side-card">
          <header><span class="clock-side-card__icon"><ListChecks :size="19" /></span><h2>本次专注</h2></header>
          <template v-if="!activeSession && !pendingBreak">
            <div ref="taskPicker" class="clock-task-picker">
              <span>这段时间要推进什么？</span>
              <button class="clock-task-picker__trigger" type="button" :aria-expanded="taskPickerOpen" @click="taskPickerOpen = !taskPickerOpen">
                <span class="clock-task-picker__icon"><ListTodo :size="16" /></span>
                <span class="clock-task-picker__value"><small>{{ selectedTaskId ? '关联任务' : '本次专注' }}</small><strong>{{ selectedTaskTitle }}</strong></span>
                <ChevronDown :size="16" />
              </button>
              <div v-if="taskPickerOpen" class="clock-task-picker__menu">
                <button type="button" :class="{ active: !selectedTaskId }" @click="chooseTask(null)"><span class="clock-task-picker__option-icon"><Minus :size="15" /></span><span><strong>不关联任务</strong><small>只记录这段专注时间</small></span><Check v-if="!selectedTaskId" :size="16" /></button>
                <p v-if="taskOptions.length" class="clock-task-picker__menu-label">未完成任务</p>
                <button v-for="task in taskOptions" :key="task.id" type="button" :class="{ active: selectedTaskId === task.id }" @click="chooseTask(task.id)"><span class="clock-task-picker__option-icon"><ListTodo :size="15" /></span><span><strong>{{ task.title }}</strong><small>{{ task.listName }}</small></span><Check v-if="selectedTaskId === task.id" :size="16" /></button>
                <p v-if="!taskOptions.length" class="clock-task-picker__empty">没有可关联的未完成任务</p>
              </div>
            </div>
          </template>
          <template v-else>
            <p class="clock-setup__task">{{ currentTaskTitle }}</p>
            <label v-if="activeSession?.phase === 'focus'" class="clock-task-picker"><span>结束备注（可选）</span><input v-model="finishNote" maxlength="240" placeholder="例如：已完成初稿" /></label>
          </template>
        </section>

        <section class="clock-side-card clock-side-card--stats">
          <header><span class="clock-side-card__icon"><BarChart3 :size="19" /></span><h2>今日状态</h2><button type="button" @click="store.setClockView('history')">查看回顾</button></header>
          <div class="clock-today">
            <span>今日已专注</span><strong>{{ durationText(todaySeconds) }}</strong>
            <small>{{ todayCompletedCount }} 次完成专注</small>
          </div>
          <div class="clock-stat-grid"><div><span>累计</span><strong>{{ durationText(todaySeconds) }}</strong></div><div><span>专注轮次</span><strong>{{ todayCompletedCount }} 轮</strong></div><div><span>中断</span><strong>{{ todayInterruptedCount }} 次</strong></div></div>
          <p v-if="todayRewards.length" class="clock-reward-strip">今日收获：<span v-for="reward in todayRewards" :key="reward.id"><FocusRewardBadge :reward="reward.id" size="sm" />{{ reward.name }} ×{{ reward.count }}</span></p>
        </section>
      </aside>
    </div>

  </main>
  <RhythmWorkspace v-else-if="store.settings.clockView === 'rhythm'" />
  <FocusHistoryWorkspace v-else />
  <FocusCelebration :celebration="store.focusCelebration" @dismiss="store.dismissFocusCelebration" @start-break="startBreakFromCelebration" />
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { BarChart3, Check, ChevronDown, Clock3, Coffee, Focus, ListChecks, ListTodo, Minus, Pause, Play, Plus, Target, Timer } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import RhythmWorkspace from './RhythmWorkspace.vue'
import FocusHistoryWorkspace from './FocusHistoryWorkspace.vue'
import FocusRewardBadge from './FocusRewardBadge.vue'
import FocusCelebration from './FocusCelebration.vue'

const store = useTaskStore()
const selectedProfileId = ref('pomodoro')
const selectedTaskId = ref(null)
const freeDurationMinutes = ref(25)
const freeDurationEditing = ref(false)
const finishNote = ref('')
const taskPicker = ref(null)
const taskPickerOpen = ref(false)
const activeSession = computed(() => store.activeFocusSession)
const pendingBreak = computed(() => store.focusPendingBreak)
const selectedProfile = computed(() => store.focusProfiles.find(item => item.id === selectedProfileId.value) || store.focusProfiles[0])
const currentProfile = computed(() => store.currentFocusProfile || selectedProfile.value)
const primaryFocusProfiles = computed(() => store.focusProfiles.filter(profile => profile.id !== 'custom-focus'))
const openTasks = computed(() => store.activeTasks.filter(task => !task.completed))
const taskOptions = computed(() => openTasks.value.slice(0, 8).map(task => ({
  ...task,
  listName: store.lists.find(list => list.id === task.listId)?.name || '收集箱'
})))
const currentTaskTitle = computed(() => openTasks.value.find(task => task.id === activeSession.value?.taskId)?.title || '不关联任务')
const selectedTaskTitle = computed(() => openTasks.value.find(task => task.id === selectedTaskId.value)?.title || '不关联任务')
const remainingSeconds = computed(() => store.focusRemainingSeconds)
const selectedDurationSeconds = computed(() => selectedProfileId.value === 'free-focus' ? Math.max(60, Math.min(480 * 60, Math.round(Number(freeDurationMinutes.value) || 25) * 60)) : selectedProfile.value?.durationSeconds)
const timerDuration = computed(() => activeSession.value?.durationSeconds ?? pendingBreak.value?.durationSeconds ?? selectedDurationSeconds.value ?? null)
const timerProgress = computed(() => {
  if (timerDuration.value === null) return 1
  const seconds = activeSession.value ? remainingSeconds.value : timerDuration.value
  return Math.max(0, Math.min(1, Number(seconds) / timerDuration.value))
})
const timerRingStyle = computed(() => ({ '--ring-offset': String(634.6 * (1 - timerProgress.value)) }))
const formattedTime = computed(() => formatClock(activeSession.value ? (remainingSeconds.value === null ? store.focusElapsedSeconds : remainingSeconds.value) : (selectedDurationSeconds.value || 0)))
const canAdjustTime = computed(() => activeSession.value?.phase === 'focus' && activeSession.value.durationSeconds !== null)
const canSetFreeDuration = computed(() => !activeSession.value && !pendingBreak.value && selectedProfileId.value === 'free-focus')
const sessionTimeRange = computed(() => {
  const session = activeSession.value
  if (!session) return ''
  const startedAt = new Date(session.startedAt || session.createdAt)
  const start = formatTime(startedAt)
  if (session.durationSeconds === null) return `开始于 ${start} · 自由计时`
  const end = new Date(startedAt.getTime() + session.durationSeconds * 1000)
  return `${start} — 预计 ${formatTime(end)} 结束`
})
const stageLabel = computed(() => activeSession.value ? (activeSession.value.status === 'paused' ? '已暂停' : activeSession.value.phase === 'focus' ? '正在专注' : '正在休息') : pendingBreak.value ? '下一步' : '准备开始')
const stageDetail = computed(() => activeSession.value ? (activeSession.value.phase === 'focus' ? currentTaskTitle.value : '暂时离开屏幕，回来再继续。') : pendingBreak.value ? '刚完成一段专注，给自己一点恢复时间。' : selectedProfileId.value === 'free-focus' && selectedDurationSeconds.value ? `自由设定 ${durationText(selectedDurationSeconds.value)}，点击时间可修改。` : selectedProfile.value?.description || '')
const headline = computed(() => activeSession.value ? (activeSession.value.phase === 'focus' ? '保持在这件事上' : '让大脑真正休息') : pendingBreak.value ? '先恢复，再继续' : '从一件小事开始')
const todayHistory = computed(() => store.focusHistory.filter(item => new Date(item.finishedAt).toDateString() === new Date().toDateString()))
const todaySeconds = computed(() => todayHistory.value.filter(item => item.phase === 'focus').reduce((total, item) => total + item.elapsedSeconds, 0))
const todayCompletedCount = computed(() => todayHistory.value.filter(item => item.phase === 'focus' && item.result === 'completed').length)
const todayInterruptedCount = computed(() => todayHistory.value.filter(item => item.phase === 'focus' && item.result !== 'completed').length)
const todayRewards = computed(() => {
  const rewards = todayHistory.value.filter(item => item.phase === 'focus' && item.result === 'completed').map(item => item.reward).filter(Boolean)
  const names = { blueberry: '蓝莓', strawberry: '草莓', tomato: '番茄', watermelon: '西瓜', pumpkin: '南瓜' }
  return Object.keys(names).map(id => ({ id, name: names[id], count: rewards.filter(reward => reward === id).length })).filter(item => item.count)
})
function start() { store.startFocus(selectedProfile.value?.id, selectedTaskId.value, selectedProfileId.value === 'free-focus' ? selectedDurationSeconds.value : undefined) }
function finish(result) { store.finishFocus(result, finishNote.value); finishNote.value = '' }
function adjustTime(minutes) { return store.adjustFocusDuration(minutes * 60) }
function setFreeDuration(minutes) { freeDurationMinutes.value = minutes }
function confirmFreeDuration() { freeDurationMinutes.value = Math.max(1, Math.min(480, Math.round(Number(freeDurationMinutes.value) || 25))); freeDurationEditing.value = false }
function chooseTask(taskId) { selectedTaskId.value = taskId; taskPickerOpen.value = false }
function startBreakFromCelebration() { store.dismissFocusCelebration(); store.startPendingBreak() }
function formatClock(seconds) { const value = Math.max(0, Math.floor(seconds || 0)); return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` }
function formatTime(date) { return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
function durationText(seconds) { if (seconds === null || seconds === undefined) return '自由计时'; const minutes = Math.round(seconds / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时` : `${minutes} 分钟` }
function closeTaskPicker(event) { if (!taskPicker.value?.contains(event.target)) taskPickerOpen.value = false }
onMounted(() => window.addEventListener('pointerdown', closeTaskPicker))
onBeforeUnmount(() => window.removeEventListener('pointerdown', closeTaskPicker))
</script>
