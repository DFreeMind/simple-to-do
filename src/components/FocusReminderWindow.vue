<template>
  <main class="focus-reminder-window" @keydown.esc="dismiss">
    <section v-if="reminder" class="focus-reminder-card" role="dialog" aria-modal="true" aria-labelledby="focus-reminder-title" aria-describedby="focus-reminder-description">
      <header class="focus-reminder-titlebar" data-tauri-drag-region>
        <span class="focus-reminder-brand" data-tauri-drag-region>
          <TimerReset :size="16" :stroke-width="1.8" />
          易简清单 · 专注时刻
        </span>
        <button type="button" aria-label="关闭提醒" @click="dismiss">
          <X :size="18" />
        </button>
      </header>

      <div class="focus-reminder-hero" aria-hidden="true">
        <span class="focus-reminder-halo"></span>
        <span class="focus-reminder-check"><CircleCheck :size="48" :stroke-width="1.75" /></span>
        <Sparkles class="focus-reminder-sparkle focus-reminder-sparkle--one" :size="18" />
        <Sparkles class="focus-reminder-sparkle focus-reminder-sparkle--two" :size="13" />
      </div>

      <div class="focus-reminder-copy">
        <p>{{ reminder.phase === 'focus' ? '专注完成' : '休息完成' }}</p>
        <h1 id="focus-reminder-title">{{ headline }}</h1>
        <div v-if="reminder.phase === 'focus'" class="focus-reminder-metric">
          <strong>{{ durationParts.value }}</strong>
          <span>{{ durationParts.unit }}</span>
        </div>
        <p id="focus-reminder-description" class="focus-reminder-description">{{ description }}</p>
      </div>

      <div v-if="reminder.taskTitle" class="focus-reminder-task">
        <span><ListChecks :size="16" />本轮推进</span>
        <strong>{{ reminder.taskTitle }}</strong>
      </div>

      <div v-if="reminder.phase === 'focus'" class="focus-reminder-insight">
        <span class="focus-reminder-reward"><FocusRewardBadge :reward="reward" size="md" /></span>
        <span>
          <small>{{ breakAvailable ? '接下来' : '专注收获' }}</small>
          <strong>{{ breakAvailable ? `休息 ${breakText}` : rewardName }}</strong>
        </span>
        <Coffee v-if="breakAvailable" :size="19" />
      </div>

      <footer class="focus-reminder-actions">
        <button ref="primaryAction" class="focus-reminder-primary" type="button" :disabled="busy" @click="primary">
          <Coffee v-if="breakAvailable && !isTest" :size="18" />
          <ArrowRight v-else-if="reminder.phase !== 'focus' && !isTest" :size="18" />
          {{ primaryLabel }}
        </button>
        <button v-if="!isTest" class="focus-reminder-secondary" type="button" :disabled="busy" @click="dismiss">
          稍后处理
        </button>
      </footer>
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { listen } from '@tauri-apps/api/event'
import { ArrowRight, CircleCheck, Coffee, ListChecks, Sparkles, TimerReset, X } from 'lucide-vue-next'
import FocusRewardBadge from './FocusRewardBadge.vue'
import {
  getFocusReminderPayload,
  handleFocusReminderAction,
  markFocusReminderReady
} from '@/services/platform'
import { playSoundPreview } from '@/utils/sound'

const reminder = ref(null)
const primaryAction = ref(null)
const busy = ref(false)
let unlistenRefresh

const isTest = computed(() => reminder.value?.sessionId === 'focus-notification-test')
const breakAvailable = computed(() => reminder.value?.phase === 'focus' && Number(reminder.value?.breakSeconds) > 0)
const durationParts = computed(() => {
  const minutes = Math.max(1, Math.round((Number(reminder.value?.focusedSeconds) || 0) / 60))
  if (minutes >= 60 && minutes % 60 === 0) return { value: minutes / 60, unit: '小时' }
  return { value: minutes, unit: '分钟' }
})
const reward = computed(() => {
  const minutes = Math.floor((Number(reminder.value?.focusedSeconds) || 0) / 60)
  if (minutes >= 90) return 'pumpkin'
  if (minutes >= 45) return 'watermelon'
  if (minutes >= 25) return 'tomato'
  if (minutes >= 10) return 'strawberry'
  return 'blueberry'
})
const rewardName = computed(() => ({
  blueberry: '蓝莓',
  strawberry: '草莓',
  tomato: '番茄',
  watermelon: '西瓜',
  pumpkin: '南瓜'
}[reward.value]))
const breakText = computed(() => durationText(reminder.value?.breakSeconds))
const headline = computed(() => {
  if (reminder.value?.phase !== 'focus') return '休息好了，准备回来吧'
  return '这一段时间，属于重要的事'
})
const description = computed(() => {
  if (reminder.value?.phase !== 'focus') return '回到清单，选择下一件值得投入的事情。'
  if (breakAvailable.value) return '这一轮已经稳稳记下。起身喝水、看看远处，让注意力重新充电。'
  return '这一轮已经稳稳记下，保持自己的节奏就好。'
})
const primaryLabel = computed(() => {
  if (isTest.value) return '提醒显示正常'
  if (breakAvailable.value) return '开始休息'
  if (reminder.value?.phase !== 'focus') return '回到清单'
  return '收下这次专注'
})

async function loadReminder() {
  const payload = await getFocusReminderPayload()
  if (!payload) return
  reminder.value = payload
  await nextTick()
  const ready = await markFocusReminderReady(payload.revision)
  if (!ready || reminder.value?.revision !== payload.revision) return
  primaryAction.value?.focus()
  if (payload.soundEnabled) playSoundPreview('complete')
}

async function perform(action) {
  if (!reminder.value || busy.value) return
  busy.value = true
  try {
    await handleFocusReminderAction(reminder.value, action)
  } finally {
    busy.value = false
  }
}

function primary() {
  if (isTest.value) return perform('dismiss')
  if (breakAvailable.value) return perform('start-break')
  if (reminder.value?.phase !== 'focus') return perform('open-app')
  return perform('dismiss')
}

function dismiss() {
  return perform('dismiss')
}

function durationText(seconds) {
  const minutes = Math.max(1, Math.round((Number(seconds) || 0) / 60))
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} 小时${minutes % 60 ? ` ${minutes % 60} 分钟` : ''}`
    : `${minutes} 分钟`
}

onMounted(async () => {
  unlistenRefresh = await listen('focus-reminder:refresh', loadReminder)
  await loadReminder()
})

onBeforeUnmount(() => unlistenRefresh?.())
</script>

<style scoped>
.focus-reminder-window {
  min-height: 100vh;
  overflow: hidden;
  color: #1d2b27;
  background: #f7fbfa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
}

.focus-reminder-card {
  position: relative;
  display: flex;
  min-height: 560px;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #d9e9e5;
  background:
    radial-gradient(circle at 12% 4%, rgba(178, 229, 218, .5), transparent 28%),
    radial-gradient(circle at 94% 36%, rgba(221, 244, 237, .76), transparent 34%),
    linear-gradient(160deg, #ffffff 0%, #f7fbfa 62%, #f1f8f6 100%);
  box-shadow: inset 0 1px rgba(255, 255, 255, .9);
}

.focus-reminder-titlebar {
  display: flex;
  height: 52px;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 0 18px;
  color: #63736e;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: .01em;
  user-select: none;
}

.focus-reminder-brand {
  display: flex;
  align-items: center;
  gap: 7px;
}

.focus-reminder-titlebar button {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 0;
  border-radius: 10px;
  color: #64736f;
  background: transparent;
  cursor: pointer;
  transition: color 180ms ease, background 180ms ease;
}

.focus-reminder-titlebar button:hover { color: #25332f; background: rgba(222, 236, 232, .72); }

.focus-reminder-hero {
  position: relative;
  display: grid;
  width: 108px;
  height: 108px;
  margin: 12px auto 0;
  place-items: center;
}

.focus-reminder-halo {
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  background: linear-gradient(145deg, #dff5ee, #eefaf6);
  box-shadow: 0 16px 36px rgba(48, 133, 117, .18), inset 0 0 0 1px rgba(79, 160, 144, .18);
  animation: halo-in 360ms cubic-bezier(.2, .78, .25, 1) both;
}

.focus-reminder-check {
  position: relative;
  display: grid;
  width: 70px;
  height: 70px;
  place-items: center;
  border-radius: 50%;
  color: #238f80;
  background: rgba(255, 255, 255, .9);
  box-shadow: 0 8px 20px rgba(31, 119, 104, .13);
}

.focus-reminder-sparkle { position: absolute; color: #d6a833; }
.focus-reminder-sparkle--one { top: 2px; right: 2px; }
.focus-reminder-sparkle--two { bottom: 13px; left: -1px; color: #5ab9aa; }

.focus-reminder-copy { padding: 10px 34px 0; text-align: center; }
.focus-reminder-copy > p:first-child {
  margin: 0 0 7px;
  color: #238f80;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: .12em;
}
.focus-reminder-copy h1 { margin: 0; color: #17231f; font-size: 23px; line-height: 1.3; letter-spacing: -.02em; }
.focus-reminder-metric { display: flex; align-items: baseline; justify-content: center; gap: 6px; margin-top: 9px; }
.focus-reminder-metric strong { color: #176f64; font-size: 35px; line-height: 1; letter-spacing: -.04em; }
.focus-reminder-metric span { color: #57706a; font-size: 13px; font-weight: 650; }
.focus-reminder-description { max-width: 338px; margin: 10px auto 0; color: #63736f; font-size: 13px; line-height: 1.65; }

.focus-reminder-task,
.focus-reminder-insight {
  margin-right: 28px;
  margin-left: 28px;
  border: 1px solid #dfebe8;
  border-radius: 13px;
  background: rgba(255, 255, 255, .78);
}

.focus-reminder-task { display: grid; gap: 5px; margin-top: 16px; padding: 11px 13px; }
.focus-reminder-task span { display: flex; align-items: center; gap: 6px; color: #75837f; font-size: 11px; }
.focus-reminder-task strong { overflow: hidden; color: #293934; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.focus-reminder-insight { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 13px; }
.focus-reminder-insight > span:nth-child(2) { display: grid; gap: 2px; flex: 1; }
.focus-reminder-insight small { color: #75837f; font-size: 10px; }
.focus-reminder-insight strong { color: #31413c; font-size: 13px; }
.focus-reminder-insight > svg { color: #379d8e; }
.focus-reminder-reward { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 11px; background: #edf7f4; }

.focus-reminder-actions {
  display: grid;
  gap: 9px;
  margin-top: auto;
  padding: 18px 28px 25px;
}
.focus-reminder-actions button {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 11px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: color 180ms ease, background 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}
.focus-reminder-actions button:focus-visible,
.focus-reminder-titlebar button:focus-visible { outline: 3px solid rgba(35, 143, 128, .3); outline-offset: 2px; }
.focus-reminder-actions button:disabled { cursor: default; opacity: .58; }
.focus-reminder-primary { border: 1px solid #238f80; color: #fff; background: #238f80; box-shadow: 0 9px 20px rgba(35, 143, 128, .22); }
.focus-reminder-primary:hover:not(:disabled) { border-color: #1c786c; background: #1c786c; box-shadow: 0 11px 24px rgba(35, 143, 128, .27); }
.focus-reminder-secondary { border: 1px solid #d9e5e2; color: #53635f; background: rgba(255, 255, 255, .74); }
.focus-reminder-secondary:hover:not(:disabled) { border-color: #c8d9d5; color: #283833; background: #fff; }

@keyframes halo-in {
  from { opacity: 0; transform: scale(.78); }
  to { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .focus-reminder-halo { animation: none; }
  .focus-reminder-actions button,
  .focus-reminder-titlebar button { transition: none; }
}
</style>
