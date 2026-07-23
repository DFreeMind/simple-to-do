<template>
  <main class="focus-reminder-window" @keydown.esc="dismiss">
    <section v-if="reminder" class="focus-reminder-card" role="dialog" aria-modal="true" aria-labelledby="focus-reminder-title" aria-describedby="focus-reminder-description">
      <header class="focus-reminder-titlebar" data-tauri-drag-region>
        <span class="focus-reminder-brand" data-tauri-drag-region>
          <span class="focus-reminder-brand-icon" data-tauri-drag-region><TimerReset :size="16" :stroke-width="1.9" /></span>
          <span class="focus-reminder-brand-copy" data-tauri-drag-region>
            <strong data-tauri-drag-region>易简清单</strong>
            <small data-tauri-drag-region>专注时刻</small>
          </span>
        </span>
        <button type="button" aria-label="关闭提醒" @click="dismiss">
          <X :size="18" />
        </button>
      </header>

      <div class="focus-reminder-hero" aria-hidden="true">
        <span class="focus-reminder-halo"></span>
        <span class="focus-reminder-orbit"></span>
        <span class="focus-reminder-check"><CircleCheck :size="48" :stroke-width="1.75" /></span>
        <Sparkles class="focus-reminder-sparkle focus-reminder-sparkle--one" :size="18" />
        <Sparkles class="focus-reminder-sparkle focus-reminder-sparkle--two" :size="13" />
      </div>

      <div class="focus-reminder-copy">
        <div class="focus-reminder-kicker">
          <p><span></span>{{ reminder.phase === 'focus' ? '专注完成' : '休息完成' }}</p>
          <span><Check :size="12" :stroke-width="2.2" />已记录</span>
        </div>
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
          <small>{{ breakAvailable ? '给注意力充充电' : '专注收获' }}</small>
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
import { ArrowRight, Check, CircleCheck, Coffee, ListChecks, Sparkles, TimerReset, X } from 'lucide-vue-next'
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
  return '重要的事，又向前了一步'
})
const description = computed(() => {
  if (reminder.value?.phase !== 'focus') return '回到清单，选择下一件值得投入的事情。'
  if (breakAvailable.value) return '这一轮已经稳稳记下。现在离开屏幕一会儿，让节奏自然续上。'
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
  --reminder-accent: #238f80;
  --reminder-accent-strong: #176f64;
  --reminder-gold: #d3a747;
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
  border: 1px solid #d2e5e0;
  background:
    radial-gradient(circle at 10% 2%, rgba(176, 228, 216, .58), transparent 29%),
    radial-gradient(circle at 97% 40%, rgba(225, 246, 239, .82), transparent 36%),
    linear-gradient(160deg, #ffffff 0%, #f8fcfb 58%, #eff7f5 100%);
  box-shadow: inset 0 1px rgba(255, 255, 255, .9);
}

.focus-reminder-card::before {
  position: absolute;
  z-index: 2;
  top: 0;
  right: 74px;
  left: 74px;
  height: 3px;
  border-radius: 0 0 999px 999px;
  background: linear-gradient(90deg, transparent, #4caf9c 24%, #d9ae50 76%, transparent);
  content: '';
  opacity: .86;
}

.focus-reminder-titlebar {
  display: flex;
  height: 58px;
  align-items: center;
  justify-content: space-between;
  padding: 0 13px 0 17px;
  color: #63736e;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: .01em;
  user-select: none;
}

.focus-reminder-brand {
  display: flex;
  align-items: center;
  gap: 9px;
}

.focus-reminder-brand-icon {
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border: 1px solid rgba(35, 143, 128, .16);
  border-radius: 10px;
  color: var(--reminder-accent);
  background: rgba(255, 255, 255, .72);
  box-shadow: 0 4px 12px rgba(38, 108, 96, .08);
}

.focus-reminder-brand-copy {
  display: grid;
  gap: 1px;
}

.focus-reminder-brand-copy strong {
  color: #344641;
  font-size: 11px;
  font-weight: 720;
}

.focus-reminder-brand-copy small {
  color: #899691;
  font-size: 9px;
  font-weight: 560;
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
  width: 116px;
  height: 116px;
  margin: 7px auto 0;
  place-items: center;
}

.focus-reminder-halo {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: linear-gradient(145deg, #dff5ee, #eefaf6);
  box-shadow: 0 18px 40px rgba(48, 133, 117, .2), inset 0 0 0 8px rgba(255, 255, 255, .42);
  animation: halo-in 360ms cubic-bezier(.2, .78, .25, 1) both;
}

.focus-reminder-orbit {
  position: absolute;
  inset: 0;
  border: 1px dashed rgba(35, 143, 128, .3);
  border-radius: 50%;
  transform: rotate(18deg);
  animation: orbit-in 420ms 40ms ease-out both;
}

.focus-reminder-orbit::before,
.focus-reminder-orbit::after {
  position: absolute;
  width: 7px;
  height: 7px;
  border: 2px solid #f8fcfb;
  border-radius: 50%;
  background: var(--reminder-gold);
  box-shadow: 0 2px 6px rgba(108, 78, 18, .16);
  content: '';
}

.focus-reminder-orbit::before { top: 7px; left: 20px; }
.focus-reminder-orbit::after { right: 7px; bottom: 21px; background: #4caf9c; }

.focus-reminder-check {
  position: relative;
  display: grid;
  width: 74px;
  height: 74px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(145deg, #2f9c89, #19786a);
  box-shadow: 0 10px 23px rgba(31, 119, 104, .27), inset 0 1px rgba(255, 255, 255, .22);
}

.focus-reminder-sparkle { position: absolute; color: #d6a833; }
.focus-reminder-sparkle--one { top: 2px; right: 2px; }
.focus-reminder-sparkle--two { bottom: 13px; left: -1px; color: #5ab9aa; }

.focus-reminder-copy { padding: 7px 34px 0; text-align: center; }
.focus-reminder-kicker {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 7px;
}
.focus-reminder-kicker p {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--reminder-accent);
  font-size: 11px;
  font-weight: 760;
  letter-spacing: .1em;
}
.focus-reminder-kicker p span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3da48f;
  box-shadow: 0 0 0 4px rgba(61, 164, 143, .1);
}
.focus-reminder-kicker > span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  border: 1px solid #dbe8e4;
  border-radius: 999px;
  color: #788782;
  background: rgba(255, 255, 255, .7);
  font-size: 9px;
  font-weight: 650;
}
.focus-reminder-copy h1 { margin: 0; color: #17231f; font-size: 24px; line-height: 1.3; letter-spacing: -.035em; }
.focus-reminder-metric { display: flex; align-items: baseline; justify-content: center; gap: 6px; margin-top: 9px; }
.focus-reminder-metric strong { color: var(--reminder-accent-strong); font-size: 38px; line-height: 1; letter-spacing: -.055em; font-variant-numeric: tabular-nums; }
.focus-reminder-metric span { color: #57706a; font-size: 13px; font-weight: 650; }
.focus-reminder-description { max-width: 338px; margin: 10px auto 0; color: #63736f; font-size: 13px; line-height: 1.65; }

.focus-reminder-task,
.focus-reminder-insight {
  margin-right: 28px;
  margin-left: 28px;
  border: 1px solid #d9e9e5;
  border-radius: 14px;
  background: rgba(255, 255, 255, .82);
  box-shadow: 0 5px 16px rgba(31, 99, 87, .045);
}

.focus-reminder-task { display: grid; gap: 5px; margin-top: 15px; padding: 11px 13px; }
.focus-reminder-task span { display: flex; align-items: center; gap: 6px; color: #75837f; font-size: 11px; }
.focus-reminder-task strong { overflow: hidden; color: #293934; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.focus-reminder-insight { display: flex; align-items: center; gap: 10px; margin-top: 10px; padding: 10px 13px; background: linear-gradient(100deg, rgba(239, 249, 246, .95), rgba(255, 253, 247, .86)); }
.focus-reminder-insight > span:nth-child(2) { display: grid; gap: 2px; flex: 1; }
.focus-reminder-insight small { color: #75837f; font-size: 10px; }
.focus-reminder-insight strong { color: #31413c; font-size: 13px; }
.focus-reminder-insight > svg { color: #379d8e; }
.focus-reminder-reward { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid rgba(216, 178, 91, .2); border-radius: 11px; background: #fff; box-shadow: 0 3px 9px rgba(95, 70, 20, .07); }

.focus-reminder-actions {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 10px;
  margin-top: auto;
  padding: 17px 28px 25px;
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
.focus-reminder-primary { border: 1px solid #238f80; color: #fff; background: linear-gradient(135deg, #2d9b88, #19786a); box-shadow: 0 10px 22px rgba(35, 143, 128, .25); }
.focus-reminder-primary:only-child { grid-column: 1 / -1; }
.focus-reminder-primary:hover:not(:disabled) { border-color: #1c786c; background: linear-gradient(135deg, #278d7c, #146d60); box-shadow: 0 12px 26px rgba(35, 143, 128, .3); }
.focus-reminder-secondary { border: 1px solid #d9e5e2; color: #53635f; background: rgba(255, 255, 255, .74); }
.focus-reminder-secondary:hover:not(:disabled) { border-color: #c8d9d5; color: #283833; background: #fff; }

@keyframes halo-in {
  from { opacity: 0; transform: scale(.78); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes orbit-in {
  from { opacity: 0; transform: rotate(-8deg) scale(.82); }
  to { opacity: 1; transform: rotate(18deg) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .focus-reminder-halo,
  .focus-reminder-orbit { animation: none; }
  .focus-reminder-actions button,
  .focus-reminder-titlebar button { transition: none; }
}
</style>
