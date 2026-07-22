<template>
  <main class="clock-workspace">
    <section class="focus-panel" aria-labelledby="focus-title">
      <header class="focus-panel__header">
        <div>
          <p class="eyebrow">专注工作台</p>
          <h1 id="focus-title">{{ activeSession ? phaseTitle : pendingBreak ? '专注已完成' : '开始一段专注' }}</h1>
        </div>
        <span v-if="activeSession" class="focus-status" :class="`focus-status--${activeSession.status}`">
          {{ activeSession.status === 'paused' ? '已暂停' : phaseTitle }}
        </span>
      </header>

      <div class="focus-timer" :class="{ 'focus-timer--free': remainingSeconds === null }" aria-live="polite">
        <span class="focus-timer__label">{{ remainingSeconds === null ? '已专注' : activeSession?.phase === 'focus' ? '剩余时间' : '休息剩余时间' }}</span>
        <strong>{{ formattedTime }}</strong>
        <span class="focus-timer__detail">{{ activeSession ? sessionTaskTitle : currentProfile.description }}</span>
      </div>

      <section v-if="pendingBreak && !activeSession" class="focus-break-ready" aria-live="polite">
        <strong>{{ pendingBreak.phase === 'long-break' ? '该休息一下了' : '完成得很好，休息一下' }}</strong>
        <span>{{ formatDuration(pendingBreak.durationSeconds) }}{{ pendingBreak.phase === 'long-break' ? '长休息' : '短休息' }}</span>
        <div class="focus-actions">
          <button class="focus-primary-action" type="button" @click="store.startPendingBreak"><Play :size="18" fill="currentColor" />开始休息</button>
          <button class="focus-secondary-action" type="button" @click="store.skipPendingBreak">跳过</button>
        </div>
      </section>

      <template v-else-if="!activeSession">
        <div class="focus-profile-grid" aria-label="选择专注模式">
          <button
            v-for="profile in store.focusProfiles"
            :key="profile.id"
            class="focus-profile"
            :class="{ active: selectedProfileId === profile.id }"
            type="button"
            @click="selectedProfileId = profile.id"
          >
            <strong>{{ profile.name }}</strong>
            <span>{{ formatDuration(profile.durationSeconds) }}</span>
          </button>
        </div>

        <label class="focus-field">
          <span>关联任务（可选）</span>
          <select v-model="selectedTaskId">
            <option :value="null">不关联任务</option>
            <option v-for="task in store.activeTasks.filter(item => !item.completed)" :key="task.id" :value="task.id">
              {{ task.title }}
            </option>
          </select>
        </label>

        <button class="focus-primary-action" type="button" @click="start">
          <Play :size="19" fill="currentColor" />开始{{ selectedProfile.name }}
        </button>
      </template>

      <template v-else>
        <label class="focus-field">
          <span>关联任务</span>
          <select :value="activeSession.taskId" @change="store.updateFocusTask($event.target.value || null)">
            <option :value="null">不关联任务</option>
            <option v-for="task in store.activeTasks.filter(item => !item.completed)" :key="task.id" :value="task.id">
              {{ task.title }}
            </option>
          </select>
        </label>

        <div class="focus-actions">
          <button v-if="activeSession.status === 'running'" class="focus-secondary-action" type="button" @click="store.pauseFocus">
            <Pause :size="18" fill="currentColor" />暂停
          </button>
          <button v-else class="focus-primary-action" type="button" @click="store.resumeFocus">
            <Play :size="18" fill="currentColor" />继续
          </button>
          <button class="focus-secondary-action" type="button" @click="finishActiveSession('completed')">
            <Check :size="17" />{{ activeSession.phase === 'focus' ? '完成本轮' : '完成休息' }}
          </button>
          <button v-if="activeSession.phase === 'focus'" class="focus-secondary-action" type="button" @click="finishActiveSession('abandoned')">
            <Square :size="17" />结束并记录
          </button>
        </div>
        <label v-if="activeSession.phase === 'focus'" class="focus-field focus-field--note">
          <span>结束备注（可选）</span>
          <input v-model="finishNote" maxlength="240" placeholder="记录这段专注的结果或中断原因" />
        </label>
      </template>

      <details v-if="!activeSession" class="focus-settings">
        <summary>专注与休息设置</summary>
        <div class="focus-settings__grid">
          <label class="focus-field"><span>短休息（分钟）</span><input type="number" min="1" max="120" :value="store.clock.focusSettings.shortBreakSeconds / 60" @change="store.updateFocusSettings({ shortBreakSeconds: Number($event.target.value) * 60 })" /></label>
          <label class="focus-field"><span>长休息（分钟）</span><input type="number" min="1" max="120" :value="store.clock.focusSettings.longBreakSeconds / 60" @change="store.updateFocusSettings({ longBreakSeconds: Number($event.target.value) * 60 })" /></label>
          <label class="focus-field"><span>几轮后长休息</span><input type="number" min="2" max="12" :value="store.clock.focusSettings.focusesBeforeLongBreak" @change="store.updateFocusSettings({ focusesBeforeLongBreak: Number($event.target.value) })" /></label>
        </div>
        <label class="focus-checkbox"><input type="checkbox" :checked="store.clock.focusSettings.autoStartBreaks" @change="store.updateFocusSettings({ autoStartBreaks: $event.target.checked })" />专注结束后自动开始休息</label>
        <div class="focus-settings__profiles">
          <label v-for="profile in store.focusProfiles" :key="profile.id" class="focus-profile-edit">
            <span>{{ profile.name }}</span>
            <input :value="profile.durationSeconds === null ? '' : profile.durationSeconds / 60" :placeholder="profile.durationSeconds === null ? '自由计时' : ''" :disabled="profile.durationSeconds === null" type="number" min="1" max="480" @change="store.updateFocusProfile(profile.id, { durationSeconds: Number($event.target.value) * 60 })" />
            <small>{{ profile.durationSeconds === null ? '自由计时不设结束时间' : '分钟' }}</small>
          </label>
        </div>
      </details>
    </section>

    <section class="focus-summary" aria-label="今日专注摘要">
      <div>
        <span>今日已专注</span>
        <strong>{{ formatDuration(todaySeconds) }}</strong>
      </div>
      <div>
        <span>完成次数</span>
        <strong>{{ todayCompletedCount }}</strong>
      </div>
      <p>节律提醒和完整回顾将在后续任务中加入；当前专注记录已安全保存在本机。</p>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Check, Pause, Play, Square } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'

const store = useTaskStore()
const selectedProfileId = ref('pomodoro')
const selectedTaskId = ref(null)
const finishNote = ref('')

const activeSession = computed(() => store.activeFocusSession)
const currentProfile = computed(() => store.currentFocusProfile || store.focusProfiles[0])
const selectedProfile = computed(() => store.focusProfiles.find(item => item.id === selectedProfileId.value) || store.focusProfiles[0])
const remainingSeconds = computed(() => store.focusRemainingSeconds)
const pendingBreak = computed(() => store.focusPendingBreak)
const phaseTitle = computed(() => ({ focus: currentProfile.value?.name || '专注', 'short-break': '短休息', 'long-break': '长休息' })[activeSession.value?.phase] || '专注')
const formattedTime = computed(() => formatClock(remainingSeconds.value === null ? store.focusElapsedSeconds : remainingSeconds.value))
const sessionTaskTitle = computed(() => {
  const task = store.activeTasks.find(item => item.id === activeSession.value?.taskId)
  return task ? `正在推进：${task.title}` : '正在专注，不关联任务'
})
const todayHistory = computed(() => {
  const today = new Date().toDateString()
  return store.clock.history.filter(item => new Date(item.finishedAt).toDateString() === today)
})
const todaySeconds = computed(() => todayHistory.value.reduce((total, item) => total + item.elapsedSeconds, 0))
const todayCompletedCount = computed(() => todayHistory.value.filter(item => item.result === 'completed').length)

function start() {
  store.startFocus(selectedProfile.value?.id, selectedTaskId.value)
}

function finishActiveSession(result) {
  store.finishFocus(result, finishNote.value)
  finishNote.value = ''
}

function formatClock(seconds = 0) {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remainder = safe % 60
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '自由计时'
  const minutes = Math.round(seconds / 60)
  return `${minutes} 分钟`
}
</script>
