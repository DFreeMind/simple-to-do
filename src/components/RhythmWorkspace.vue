<template>
  <main class="clock-workspace rhythm-workspace rhythm-redesign">
    <section class="rhythm-panel" aria-labelledby="rhythm-title">
      <header class="rhythm-panel__header">
        <div><p class="eyebrow">日常提醒</p><h1 id="rhythm-title">把提醒留在恰当的时刻</h1><p>一次只运行一项提醒；到点后可完成、延后或跳过。</p></div>
        <button v-if="store.rhythmPaused" class="small-btn" type="button" @click="store.resumeRhythmReminders">恢复提醒</button>
        <button v-else class="small-btn" type="button" @click="store.pauseRhythmReminders(60)">暂停 1 小时</button>
      </header>

      <section class="rhythm-timer" :class="{ 'rhythm-timer--idle': !activeReminder }" aria-label="当前节律提醒时钟">
        <div class="rhythm-timer__dial">
          <svg viewBox="0 0 180 180" aria-hidden="true"><circle class="rhythm-timer__track" cx="90" cy="90" r="76" /><circle class="rhythm-timer__progress" cx="90" cy="90" r="76" :style="rhythmRingStyle" /></svg>
          <div><Clock3 :size="18" /><strong>{{ activeReminder ? formatDuration(remainingSeconds) : '未启用' }}</strong><span>{{ activeReminder ? (isDue ? '现在该提醒了' : '距离下一次提醒') : '选择一种提醒开始' }}</span></div>
        </div>
        <div class="rhythm-timer__content">
          <template v-if="activeReminder"><span class="eyebrow">当前提醒</span><h2>{{ activeReminder.title }}</h2><p>{{ activeReminder.message }}</p><div class="rhythm-timer__actions"><button class="clock-button clock-button--primary" type="button" :disabled="!isDue" @click="store.completeRhythmReminder(activeReminder.id)"><Check :size="16" />完成这次提醒</button><button class="clock-button clock-button--secondary" type="button" :disabled="!isDue" @click="store.snoozeRhythmReminder(activeReminder.id, 5)">延后 5 分钟</button><button class="clock-button clock-button--quiet" type="button" :disabled="!isDue" @click="store.skipRhythmReminderToday(activeReminder.id)">跳过今天</button></div></template>
          <template v-else><span class="eyebrow">尚未设置</span><h2>选择一项提醒</h2><p>下方启用任意一项后，它会成为唯一运行中的节律提醒。</p></template>
        </div>
      </section>

      <div class="rhythm-redesign__list">
        <article v-for="reminder in visibleReminders" :key="reminder.id" :class="{ off: !reminder.enabled }">
          <div class="rhythm-redesign__title"><strong>{{ reminder.title }}</strong><span>{{ reminder.message }}</span></div>
          <label class="rhythm-frequency"><span>{{ reminder.triggerType === 'fixed-time' ? '提醒时刻' : '提醒频率' }}</span><input v-if="reminder.triggerType === 'fixed-time'" type="time" :value="reminder.time" @change="store.updateRhythmReminder(reminder.id, { time: $event.target.value })" /><select v-else :value="reminder.intervalSeconds / 60" @change="store.updateRhythmReminder(reminder.id, { intervalSeconds: Number($event.target.value) * 60 })"><option :value="20">20 分钟</option><option :value="30">30 分钟</option><option :value="45">45 分钟</option><option :value="60">1 小时</option><option :value="90">90 分钟</option><option :value="120">2 小时</option></select></label>
          <label class="rhythm-switch" :title="`${reminder.enabled ? '关闭' : '启用'}${reminder.title}`"><input type="radio" name="active-rhythm-reminder" :checked="reminder.enabled" @change="store.toggleRhythmReminder(reminder.id, $event.target.checked)" /><i></i></label>
          <details class="rhythm-redesign__more"><summary>更多</summary><div><label><span>工作开始</span><input type="time" :value="reminder.workStart" @change="store.updateRhythmReminder(reminder.id, { workStart: $event.target.value })" /></label><label><span>工作结束</span><input type="time" :value="reminder.workEnd" @change="store.updateRhythmReminder(reminder.id, { workEnd: $event.target.value })" /></label><label><span>提示内容</span><input :value="reminder.message" maxlength="160" @change="store.updateRhythmReminder(reminder.id, { message: $event.target.value })" /></label><button type="button" @click="store.deleteRhythmReminder(reminder.id)">删除</button></div></details>
        </article>
      </div>
      <button class="rhythm-add" type="button" @click="store.addRhythmReminder()">添加自定义提醒</button>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, Clock3 } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
const store = useTaskStore()
const visibleReminders = computed(() => store.rhythmReminders.filter(item => item.triggerType !== 'active-duration' || store.activityMonitoringAvailable))
const now = ref(Date.now())
const activeReminder = computed(() => visibleReminders.value.find(item => item.enabled) || null)
const nextReminderAt = computed(() => {
  const reminder = activeReminder.value
  if (!reminder) return null
  if (reminder.snoozedUntil) return new Date(reminder.snoozedUntil).getTime()
  if (reminder.triggerType === 'fixed-time') {
    const due = new Date(now.value)
    const [hours, minutes] = reminder.time.split(':').map(Number)
    due.setHours(hours, minutes, 0, 0)
    if (due.getTime() < now.value && reminder.lastNotifiedAt) due.setDate(due.getDate() + 1)
    return due.getTime()
  }
  const baseline = new Date(reminder.lastCompletedAt || reminder.createdAt).getTime()
  return baseline + reminder.intervalSeconds * 1000
})
const remainingSeconds = computed(() => Math.max(0, Math.ceil(((nextReminderAt.value || now.value) - now.value) / 1000)))
const isDue = computed(() => Boolean(activeReminder.value) && remainingSeconds.value === 0)
const rhythmProgress = computed(() => {
  if (!activeReminder.value || !activeReminder.value.intervalSeconds) return 0
  return Math.max(0, Math.min(1, remainingSeconds.value / activeReminder.value.intervalSeconds))
})
const rhythmRingStyle = computed(() => ({ '--rhythm-ring-offset': String(477.52 * (1 - rhythmProgress.value)) }))
function formatDuration(seconds) { const value = Math.max(0, seconds || 0); const minutes = Math.floor(value / 60); return `${String(minutes).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` }
let clockTimer
onMounted(() => { clockTimer = window.setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => window.clearInterval(clockTimer))
</script>
