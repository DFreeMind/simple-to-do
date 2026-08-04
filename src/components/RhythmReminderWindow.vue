<template>
  <NativeReminderWindowShell v-slot="{ startWindowDrag }" class="rhythm-reminder-window" @dismiss="hide">
    <section v-if="reminder" class="rhythm-reminder-card" role="dialog" aria-modal="true" aria-labelledby="rhythm-reminder-title">
      <header @pointerdown="startWindowDrag"><span><BellRing :size="17" /> 易简清单 · 节律提醒</span><button type="button" aria-label="稍后在应用内处理" @pointerdown.stop @click="hide"><X :size="19" /></button></header>
      <div class="rhythm-reminder-icon"><BellRing :size="48" /></div><p class="rhythm-reminder-kicker">该停一下了</p>
      <h1 id="rhythm-reminder-title">{{ reminder.title }}</h1><p class="rhythm-reminder-message">{{ reminder.message }}</p><p class="rhythm-reminder-rule"><Clock3 :size="15" />{{ reminder.triggerLabel }}</p>
      <footer><button class="rhythm-reminder-primary" :disabled="busy" @click="perform('complete')"><Check :size="18" />完成这次</button><button :disabled="busy" @click="perform('snooze')">5 分钟后</button><button :disabled="busy" @click="perform('skip')">今天跳过</button></footer>
    </section>
  </NativeReminderWindowShell>
</template>
<script setup>
import { onMounted, ref } from 'vue'
import { BellRing, Check, Clock3, X } from 'lucide-vue-next'
import { getRhythmReminderPayload, handleRhythmReminderAction } from '@/services/platform'
import NativeReminderWindowShell from './NativeReminderWindowShell.vue'
const reminder = ref(null); const busy = ref(false)
onMounted(async () => { reminder.value = await getRhythmReminderPayload() })
async function perform(action) { if (!reminder.value || busy.value) return; busy.value = true; try { await handleRhythmReminderAction(reminder.value, action) } finally { busy.value = false } }
function hide() { return perform('hide') }
</script>
<style scoped>
.rhythm-reminder-window { min-height:100vh; overflow:hidden; color:#19302b; background:#f5fbf9; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif }.rhythm-reminder-card { display:flex; min-height:500px; flex-direction:column; align-items:center; padding:0 32px 27px; border:1px solid #cfe4df; background:radial-gradient(circle at 12% 0,#d7f2eb,transparent 31%),linear-gradient(150deg,#fff,#f0f9f6); text-align:center }.rhythm-reminder-card>header { display:flex; width:calc(100% + 64px); min-height:58px; align-items:center; justify-content:space-between; padding:0 18px 0 22px; border-bottom:1px solid rgba(42,112,99,.12); color:#52736b; font-size:12px; font-weight:700 }.rhythm-reminder-card>header span,.rhythm-reminder-rule { display:inline-flex; align-items:center; gap:7px }.rhythm-reminder-card>header button { display:grid; width:32px; height:32px; place-items:center; border:0; border-radius:9px; color:#52736b; background:transparent }.rhythm-reminder-icon { display:grid; width:92px; height:92px; place-items:center; margin-top:35px; border-radius:50%; color:#238f80; background:#e0f4ef; box-shadow:0 0 0 11px rgba(224,244,239,.6) }.rhythm-reminder-kicker { margin:27px 0 7px; color:#238f80; font-size:13px; font-weight:750 }.rhythm-reminder-card h1 { margin:0; font-size:27px }.rhythm-reminder-message { max-width:330px; margin:13px 0 0; color:#61756f; line-height:1.65 }.rhythm-reminder-rule { margin:17px 0 0; padding:8px 11px; border-radius:999px; color:#287d72; background:#e8f6f2; font-size:12px; font-weight:680 }.rhythm-reminder-card footer { display:grid; grid-template-columns:1fr 1fr; gap:8px; width:100%; margin-top:auto; padding-top:28px }.rhythm-reminder-card footer button { min-height:43px; border:1px solid #d5e5e1; border-radius:11px; color:#4a625c; background:#fff; font-weight:700 }.rhythm-reminder-card footer button:last-child { grid-column:1/-1; min-height:30px; border:0; color:#7a8b87; background:transparent }.rhythm-reminder-primary { display:inline-flex; align-items:center; justify-content:center; gap:6px; border-color:#238f80!important; color:#fff!important; background:#238f80!important }
</style>
