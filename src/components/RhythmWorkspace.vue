<template>
  <main class="clock-workspace rhythm-workspace">
    <section class="rhythm-panel" aria-labelledby="rhythm-title">
      <header class="rhythm-panel__header">
        <div>
          <p class="eyebrow">节律提醒</p>
          <h1 id="rhythm-title">让提醒适应你的工作节奏</h1>
        </div>
        <button v-if="store.rhythmPaused" class="small-btn" type="button" @click="store.resumeRhythmReminders">恢复提醒</button>
        <button v-else class="small-btn" type="button" @click="store.pauseRhythmReminders(60)">暂停 1 小时</button>
      </header>

      <p class="rhythm-panel__intro">护眼、补水和活动提醒默认只在工作日 09:00–18:00 运行。你可以修改每一条的频率、时间和文案。</p>

      <div class="rhythm-list">
        <article v-for="reminder in visibleReminders" :key="reminder.id" class="rhythm-card" :class="{ 'rhythm-card--disabled': !reminder.enabled }">
          <div class="rhythm-card__heading">
            <div>
              <strong>{{ reminder.title }}</strong>
              <span>{{ triggerSummary(reminder) }}</span>
            </div>
            <label class="rhythm-switch" :title="reminder.triggerType === 'active-duration' && !store.activityMonitoringAvailable ? '当前平台不支持原生活跃度检测' : `${reminder.enabled ? '关闭' : '启用'}${reminder.title}`">
              <input type="checkbox" :checked="reminder.enabled" :disabled="reminder.triggerType === 'active-duration' && !store.activityMonitoringAvailable" @change="store.toggleRhythmReminder(reminder.id, $event.target.checked)" />
              <i></i>
            </label>
          </div>
          <p>{{ reminder.message }}</p>
          <p v-if="reminder.triggerType === 'active-duration' && !store.activityMonitoringAvailable" class="rhythm-card__pending">当前平台不支持原生活跃时长检测，因此该提醒不会投递。</p>
          <div v-else class="rhythm-card__actions">
            <button type="button" @click="store.completeRhythmReminder(reminder.id)">完成</button>
            <button type="button" @click="store.snoozeRhythmReminder(reminder.id, 5)">延后 5 分钟</button>
            <button type="button" @click="store.skipRhythmReminderToday(reminder.id)">今天跳过</button>
          </div>
          <details class="rhythm-editor">
            <summary>编辑</summary>
            <div class="rhythm-editor__grid">
              <label><span>名称</span><input :value="reminder.title" maxlength="32" @change="store.updateRhythmReminder(reminder.id, { title: $event.target.value })" /></label>
              <label><span>触发方式</span><select :value="reminder.triggerType" @change="store.updateRhythmReminder(reminder.id, { triggerType: $event.target.value })"><option value="interval">按间隔</option><option value="fixed-time">固定时刻</option><option value="active-duration">连续活跃时长</option></select></label>
              <label v-if="reminder.triggerType === 'fixed-time'"><span>提醒时刻</span><input type="time" :value="reminder.time" @change="store.updateRhythmReminder(reminder.id, { time: $event.target.value })" /></label>
              <label v-else><span>{{ reminder.triggerType === 'active-duration' ? '活跃分钟' : '间隔分钟' }}</span><input type="number" min="1" max="480" :value="reminder.intervalSeconds / 60" @change="store.updateRhythmReminder(reminder.id, { intervalSeconds: Number($event.target.value) * 60 })" /></label>
              <label><span>工作开始</span><input type="time" :value="reminder.workStart" @change="store.updateRhythmReminder(reminder.id, { workStart: $event.target.value })" /></label>
              <label><span>工作结束</span><input type="time" :value="reminder.workEnd" @change="store.updateRhythmReminder(reminder.id, { workEnd: $event.target.value })" /></label>
            </div>
            <label class="rhythm-editor__message"><span>提示内容</span><input :value="reminder.message" maxlength="160" @change="store.updateRhythmReminder(reminder.id, { message: $event.target.value })" /></label>
            <button class="rhythm-editor__delete" type="button" @click="store.deleteRhythmReminder(reminder.id)">删除提醒</button>
          </details>
        </article>
      </div>

      <button class="rhythm-add" type="button" @click="store.addRhythmReminder()">+ 新建自定义提醒</button>
    </section>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useTaskStore } from '@/stores/task'

const store = useTaskStore()
const visibleReminders = computed(() => store.rhythmReminders.filter(item => item.triggerType !== 'active-duration' || store.activityMonitoringAvailable))

function triggerSummary(reminder) {
  if (reminder.triggerType === 'fixed-time') return `每天 ${reminder.time}`
  if (reminder.triggerType === 'active-duration') return `连续活跃 ${Math.round(reminder.intervalSeconds / 60)} 分钟`
  return `每隔 ${Math.round(reminder.intervalSeconds / 60)} 分钟`
}
</script>
