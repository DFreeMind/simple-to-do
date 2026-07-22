<template>
  <main class="clock-workspace rhythm-workspace rhythm-redesign">
    <section class="rhythm-panel" aria-labelledby="rhythm-title">
      <header class="rhythm-panel__header">
        <div><p class="eyebrow">日常提醒</p><h1 id="rhythm-title">把提醒留在恰当的时刻</h1><p>提醒只在工作时段出现；到点后可完成、延后或跳过。</p></div>
        <button v-if="store.rhythmPaused" class="small-btn" type="button" @click="store.resumeRhythmReminders">恢复提醒</button>
        <button v-else class="small-btn" type="button" @click="store.pauseRhythmReminders(60)">暂停 1 小时</button>
      </header>

      <div class="rhythm-redesign__list">
        <article v-for="reminder in visibleReminders" :key="reminder.id" :class="{ off: !reminder.enabled }">
          <div class="rhythm-redesign__title"><strong>{{ reminder.title }}</strong><span>{{ reminder.message }}</span></div>
          <label class="rhythm-frequency"><span>{{ reminder.triggerType === 'fixed-time' ? '提醒时刻' : '提醒频率' }}</span><input v-if="reminder.triggerType === 'fixed-time'" type="time" :value="reminder.time" @change="store.updateRhythmReminder(reminder.id, { time: $event.target.value })" /><select v-else :value="reminder.intervalSeconds / 60" @change="store.updateRhythmReminder(reminder.id, { intervalSeconds: Number($event.target.value) * 60 })"><option :value="20">20 分钟</option><option :value="30">30 分钟</option><option :value="45">45 分钟</option><option :value="60">1 小时</option><option :value="90">90 分钟</option><option :value="120">2 小时</option></select></label>
          <label class="rhythm-switch" :title="`${reminder.enabled ? '关闭' : '启用'}${reminder.title}`"><input type="checkbox" :checked="reminder.enabled" @change="store.toggleRhythmReminder(reminder.id, $event.target.checked)" /><i></i></label>
          <details class="rhythm-redesign__more"><summary>更多</summary><div><label><span>工作开始</span><input type="time" :value="reminder.workStart" @change="store.updateRhythmReminder(reminder.id, { workStart: $event.target.value })" /></label><label><span>工作结束</span><input type="time" :value="reminder.workEnd" @change="store.updateRhythmReminder(reminder.id, { workEnd: $event.target.value })" /></label><label><span>提示内容</span><input :value="reminder.message" maxlength="160" @change="store.updateRhythmReminder(reminder.id, { message: $event.target.value })" /></label><button type="button" @click="store.deleteRhythmReminder(reminder.id)">删除</button></div></details>
        </article>
      </div>
      <button class="rhythm-add" type="button" @click="store.addRhythmReminder()">添加自定义提醒</button>
    </section>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useTaskStore } from '@/stores/task'
const store = useTaskStore()
const visibleReminders = computed(() => store.rhythmReminders.filter(item => item.triggerType !== 'active-duration' || store.activityMonitoringAvailable))
</script>
