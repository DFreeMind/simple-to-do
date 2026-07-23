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
          <div class="clock-stage__dial">
            <svg class="clock-stage__ring" viewBox="0 0 220 220" aria-hidden="true">
              <g class="clock-stage__ticks"><line v-for="tick in 60" :key="tick" :class="{ major: tick % 5 === 0 }" x1="110" x2="110" y1="27" :y2="tick % 5 === 0 ? 40 : 35" :transform="`rotate(${tick * 6} 110 110)`" /></g>
              <text class="clock-stage__number" x="110" y="51" text-anchor="middle">12</text><text class="clock-stage__number" x="174" y="115" text-anchor="middle">3</text><text class="clock-stage__number" x="110" y="179" text-anchor="middle">6</text><text class="clock-stage__number" x="46" y="115" text-anchor="middle">9</text>
              <g transform="rotate(-90 110 110)"><circle class="clock-stage__ring-track" cx="110" cy="110" r="101" /><circle class="clock-stage__ring-progress" cx="110" cy="110" r="101" :style="timerRingStyle" /></g>
            </svg>
            <div class="clock-stage__content">
              <span class="clock-stage__status">{{ stageLabel }}</span>
              <strong>{{ formattedTime }}</strong>
              <p>{{ stageDetail }}</p>
            </div>
          </div>

          <div v-if="activeSession" class="clock-stage__actions">
            <button v-if="activeSession.status === 'running'" class="clock-button clock-button--secondary" type="button" @click="store.pauseFocus"><Pause :size="18" fill="currentColor" />暂停</button>
            <button v-else class="clock-button clock-button--primary" type="button" @click="store.resumeFocus"><Play :size="18" fill="currentColor" />继续</button>
            <button class="clock-button clock-button--secondary" type="button" @click="finish(activeSession.phase === 'focus' ? 'completed' : 'completed')"><Check :size="18" />{{ activeSession.phase === 'focus' ? '完成本轮' : '完成休息' }}</button>
            <button v-if="activeSession.phase === 'focus'" class="clock-button clock-button--quiet" type="button" @click="finish('abandoned')">结束</button>
          </div>
          <div v-if="activeSession?.phase === 'focus' && activeSession.durationSeconds !== null" class="clock-stage__time-adjust" aria-label="调整本次专注时长"><button type="button" @click="store.adjustFocusDuration(-5 * 60)"><Minus :size="15" />5 分钟</button><span>可随时调整</span><button type="button" @click="store.adjustFocusDuration(5 * 60)"><Plus :size="15" />5 分钟</button></div>
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
            <label v-if="selectedProfileId === 'custom-focus'" class="clock-custom-duration"><span>本次专注时长</span><div><input v-model.number="customDurationMinutes" type="number" min="1" max="480" step="1" /><small>分钟</small></div></label>
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

  </main>
  <RhythmWorkspace v-else-if="store.settings.clockView === 'rhythm'" />
  <FocusHistoryWorkspace v-else />
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, ChevronDown, Coffee, ListTodo, Minus, Pause, Play, Plus } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import RhythmWorkspace from './RhythmWorkspace.vue'
import FocusHistoryWorkspace from './FocusHistoryWorkspace.vue'

const store = useTaskStore()
const selectedProfileId = ref('pomodoro')
const selectedTaskId = ref(null)
const customDurationMinutes = ref(30)
const finishNote = ref('')
const taskPicker = ref(null)
const taskPickerOpen = ref(false)
const activeSession = computed(() => store.activeFocusSession)
const pendingBreak = computed(() => store.focusPendingBreak)
const selectedProfile = computed(() => store.focusProfiles.find(item => item.id === selectedProfileId.value) || store.focusProfiles[0])
const currentProfile = computed(() => store.currentFocusProfile || selectedProfile.value)
const openTasks = computed(() => store.activeTasks.filter(task => !task.completed))
const taskOptions = computed(() => openTasks.value.slice(0, 8).map(task => ({
  ...task,
  listName: store.lists.find(list => list.id === task.listId)?.name || '收集箱'
})))
const currentTaskTitle = computed(() => openTasks.value.find(task => task.id === activeSession.value?.taskId)?.title || '不关联任务')
const selectedTaskTitle = computed(() => openTasks.value.find(task => task.id === selectedTaskId.value)?.title || '不关联任务')
const remainingSeconds = computed(() => store.focusRemainingSeconds)
const selectedDurationSeconds = computed(() => selectedProfileId.value === 'custom-focus' ? Math.max(60, Math.min(480 * 60, Math.round(Number(customDurationMinutes.value) || 30) * 60)) : selectedProfile.value?.durationSeconds)
const timerDuration = computed(() => activeSession.value?.durationSeconds ?? pendingBreak.value?.durationSeconds ?? selectedDurationSeconds.value ?? null)
const timerProgress = computed(() => {
  if (timerDuration.value === null) return 1
  const seconds = activeSession.value ? remainingSeconds.value : timerDuration.value
  return Math.max(0, Math.min(1, Number(seconds) / timerDuration.value))
})
const timerRingStyle = computed(() => ({ '--ring-offset': String(634.6 * (1 - timerProgress.value)) }))
const formattedTime = computed(() => formatClock(activeSession.value ? (remainingSeconds.value === null ? store.focusElapsedSeconds : remainingSeconds.value) : (selectedDurationSeconds.value || 0)))
const stageLabel = computed(() => activeSession.value ? (activeSession.value.status === 'paused' ? '已暂停' : activeSession.value.phase === 'focus' ? '正在专注' : '正在休息') : pendingBreak.value ? '下一步' : '准备开始')
const stageDetail = computed(() => activeSession.value ? (activeSession.value.phase === 'focus' ? currentTaskTitle.value : '暂时离开屏幕，回来再继续。') : pendingBreak.value ? '刚完成一段专注，给自己一点恢复时间。' : selectedProfile.value?.description || '')
const headline = computed(() => activeSession.value ? (activeSession.value.phase === 'focus' ? '保持在这件事上' : '让大脑真正休息') : pendingBreak.value ? '先恢复，再继续' : '从一件小事开始')
const todayHistory = computed(() => store.focusHistory.filter(item => new Date(item.finishedAt).toDateString() === new Date().toDateString()))
const todaySeconds = computed(() => todayHistory.value.filter(item => item.phase === 'focus').reduce((total, item) => total + item.elapsedSeconds, 0))
const todayCompletedCount = computed(() => todayHistory.value.filter(item => item.phase === 'focus' && item.result === 'completed').length)
function start() { store.startFocus(selectedProfile.value?.id, selectedTaskId.value, selectedProfileId.value === 'custom-focus' ? selectedDurationSeconds.value : undefined) }
function finish(result) { store.finishFocus(result, finishNote.value); finishNote.value = '' }
function chooseTask(taskId) { selectedTaskId.value = taskId; taskPickerOpen.value = false }
function formatClock(seconds) { const value = Math.max(0, Math.floor(seconds || 0)); return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` }
function durationText(seconds) { if (seconds === null || seconds === undefined) return '自由计时'; const minutes = Math.round(seconds / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时` : `${minutes} 分钟` }
function closeTaskPicker(event) { if (!taskPicker.value?.contains(event.target)) taskPickerOpen.value = false }
onMounted(() => window.addEventListener('pointerdown', closeTaskPicker))
onBeforeUnmount(() => window.removeEventListener('pointerdown', closeTaskPicker))
</script>
