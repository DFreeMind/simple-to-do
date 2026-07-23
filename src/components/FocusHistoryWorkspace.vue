<template>
  <main class="clock-workspace history-workspace">
    <section class="history-panel" aria-labelledby="history-title">
      <header class="history-panel__header">
        <div>
          <p class="eyebrow">专注回顾</p>
          <h1 id="history-title">看见真实投入，而不是追逐打卡</h1>
        </div>
        <button v-if="store.focusHistory.length" class="small-btn" type="button" @click="clearToday">清除今天记录</button>
      </header>

      <div class="history-summary">
        <div><span>今天专注</span><strong>{{ formatDuration(todaySeconds) }}</strong></div>
        <div><span>本周专注</span><strong>{{ formatDuration(weekSeconds) }}</strong></div>
        <div><span>今日完成轮次</span><strong>{{ completedToday }}</strong></div>
      </div>

      <section class="history-section">
        <h2>最近记录</h2>
        <p v-if="!recentHistory.length" class="history-empty">开始一次专注后，记录会保存在本机，并可随时清理。</p>
        <ul v-else class="history-list">
          <li v-for="item in recentHistory" :key="item.id">
            <div>
              <strong><FocusRewardBadge v-if="item.reward" :reward="item.reward" size="sm" />{{ phaseLabel(item.phase) }} · {{ formatDuration(item.elapsedSeconds) }}</strong>
              <span>{{ formatFinishedAt(item.finishedAt) }}{{ taskTitle(item) ? ` · ${taskTitle(item)}` : '' }}</span>
              <small v-if="item.note">{{ item.note }}</small>
            </div>
            <button type="button" :aria-label="`删除${phaseLabel(item.phase)}记录`" @click="store.deleteFocusHistory(item.id)">删除</button>
          </li>
        </ul>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useTaskStore } from '@/stores/task'
import FocusRewardBadge from './FocusRewardBadge.vue'

const store = useTaskStore()
const todayStart = computed(() => { const date = new Date(); date.setHours(0, 0, 0, 0); return date })
const weekStart = computed(() => { const date = new Date(todayStart.value); const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1); return date })
const todayHistory = computed(() => store.focusHistory.filter(item => new Date(item.finishedAt) >= todayStart.value))
const recentHistory = computed(() => [...store.focusHistory].sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt)).slice(0, 30))
const todaySeconds = computed(() => todayHistory.value.filter(item => item.phase === 'focus').reduce((total, item) => total + item.elapsedSeconds, 0))
const weekSeconds = computed(() => store.focusHistory.filter(item => item.phase === 'focus' && new Date(item.finishedAt) >= weekStart.value).reduce((total, item) => total + item.elapsedSeconds, 0))
const completedToday = computed(() => todayHistory.value.filter(item => item.phase === 'focus' && item.result === 'completed').length)

function formatDuration(seconds) { const minutes = Math.round(seconds / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟` : `${minutes} 分钟` }
function phaseLabel(phase) { return phase === 'long-break' ? '长休息' : phase === 'short-break' ? '短休息' : '专注' }
function formatFinishedAt(value) { return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
function taskTitle(item) { return store.activeTasks.find(task => task.id === item.taskId)?.title || '' }
function clearToday() {
  if (window.confirm('确定清除今天的专注记录吗？此操作不会影响任务。')) store.clearFocusHistoryForDay()
}
</script>
