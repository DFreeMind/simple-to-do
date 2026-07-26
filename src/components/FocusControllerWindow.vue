<template>
  <NativeReminderWindowShell v-slot="{ startWindowDrag }" class="focus-controller-window" @dismiss="close">
    <section v-if="controller" class="focus-controller-card" aria-labelledby="focus-controller-title">
      <header class="focus-controller-titlebar" @pointerdown="startWindowDrag">
        <span class="focus-controller-brand">
          <span><TimerReset :size="16" /></span>
          <strong>专注控制器</strong>
        </span>
        <span class="focus-controller-window-actions">
          <button
            type="button"
            :class="{ active: controller.alwaysOnTop }"
            :aria-pressed="controller.alwaysOnTop"
            :aria-label="controller.alwaysOnTop ? '取消窗口置顶' : '置顶窗口'"
            :title="controller.alwaysOnTop ? '取消置顶' : '置顶'"
            @pointerdown.stop
            @click="toggleAlwaysOnTop"
          >
            <Pin v-if="controller.alwaysOnTop" :size="17" fill="currentColor" />
            <PinOff v-else :size="17" />
          </button>
          <button type="button" aria-label="关闭专注控制器" title="关闭小窗" @pointerdown.stop @click="close">
            <X :size="18" />
          </button>
        </span>
      </header>

      <div class="focus-controller-summary">
        <span class="focus-controller-status" :class="{ paused: controller.status === 'paused' }">
          <i></i>{{ controller.status === 'paused' ? '已暂停' : controller.phase === 'focus' ? '正在专注' : '正在休息' }}
        </span>
        <h1 id="focus-controller-title">{{ formattedTime }}</h1>
        <p>{{ controller.taskTitle || (controller.phase === 'focus' ? '保持在当前这件事上' : '暂时离开屏幕，恢复一下') }}</p>
      </div>

      <div class="focus-controller-actions">
        <button
          class="focus-controller-primary"
          type="button"
          :disabled="busy"
          @click="perform(controller.status === 'paused' ? 'resume' : 'pause')"
        >
          <Play v-if="controller.status === 'paused'" :size="18" fill="currentColor" />
          <Pause v-else :size="18" fill="currentColor" />
          {{ controller.status === 'paused' ? '继续' : '暂停' }}
        </button>
        <button type="button" :disabled="busy || !canAdjust" aria-label="缩短五分钟" @click="perform('subtract-five')">
          <Minus :size="17" />5 分钟
        </button>
        <button type="button" :disabled="busy || !canAdjust" aria-label="延长五分钟" @click="perform('add-five')">
          <Plus :size="17" />5 分钟
        </button>
        <button class="focus-controller-finish" type="button" :disabled="busy" @click="perform('finish')">
          <Check :size="17" />完成
        </button>
      </div>
    </section>
  </NativeReminderWindowShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { listen } from '@tauri-apps/api/event'
import { Check, Minus, Pause, Pin, PinOff, Play, Plus, TimerReset, X } from 'lucide-vue-next'
import NativeReminderWindowShell from './NativeReminderWindowShell.vue'
import {
  getFocusControllerPayload,
  handleFocusControllerAction,
  markFocusControllerReady,
  setFocusControllerAlwaysOnTop
} from '@/services/platform'

const controller = ref(null)
const busy = ref(false)
const now = ref(Date.now())
let unlistenRefresh
let timer

const liveSeconds = computed(() => {
  if (!controller.value) return 0
  const elapsedSinceSync = controller.value.status === 'running'
    ? Math.max(0, Math.floor((now.value - Number(controller.value.syncedAt || now.value)) / 1000))
    : 0
  if (controller.value.remainingSeconds === null) {
    return Math.max(0, Number(controller.value.elapsedSeconds || 0) + elapsedSinceSync)
  }
  return Math.max(0, Number(controller.value.remainingSeconds || 0) - elapsedSinceSync)
})
const formattedTime = computed(() => {
  const seconds = Math.floor(liveSeconds.value)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
})
const canAdjust = computed(() => controller.value?.phase === 'focus' && controller.value?.remainingSeconds !== null)

async function loadController() {
  const payload = await getFocusControllerPayload()
  if (!payload) return
  controller.value = payload
  busy.value = false
  await markFocusControllerReady(payload.revision)
}

async function perform(action) {
  if (!controller.value || busy.value) return
  busy.value = true
  try {
    const handled = await handleFocusControllerAction(controller.value, action)
    if (!handled) busy.value = false
  } catch (error) {
    console.error('[FocusControllerWindow] 执行专注操作失败:', error)
    busy.value = false
  }
  window.setTimeout(() => { busy.value = false }, 1200)
}

function close() {
  return perform('close')
}

async function toggleAlwaysOnTop() {
  if (!controller.value) return
  const next = !controller.value.alwaysOnTop
  await setFocusControllerAlwaysOnTop(next)
  controller.value = { ...controller.value, alwaysOnTop: next }
}

onMounted(async () => {
  unlistenRefresh = await listen('focus-controller:refresh', loadController)
  timer = window.setInterval(() => { now.value = Date.now() }, 250)
  await loadController()
})

onBeforeUnmount(() => {
  unlistenRefresh?.()
  if (timer) window.clearInterval(timer)
})
</script>

<style scoped>
.focus-controller-window {
  min-height: 100vh;
  overflow: hidden;
  color: #1d2b27;
  background: #f4faf8;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
}
.focus-controller-card {
  min-height: 286px;
  overflow: hidden;
  border: 1px solid #cae1dc;
  background: radial-gradient(circle at 8% 0, rgba(208, 239, 231, .78), transparent 36%), linear-gradient(150deg, #fff, #f1f8f6);
}
.focus-controller-titlebar {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px 0 17px;
  border-bottom: 1px solid rgba(42, 112, 99, .12);
  color: #4c6a63;
  user-select: none;
}
.focus-controller-brand, .focus-controller-brand > span, .focus-controller-window-actions { display: inline-flex; align-items: center; }
.focus-controller-brand { gap: 9px; font-size: 12px; }
.focus-controller-brand > span { justify-content: center; width: 28px; height: 28px; border-radius: 9px; color: #207f72; background: #e1f3ee; }
.focus-controller-window-actions { gap: 4px; }
.focus-controller-window-actions button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  border-radius: 10px;
  color: #61756f;
  background: transparent;
}
.focus-controller-window-actions button:hover { color: #176f64; background: #e6f1ee; }
.focus-controller-window-actions button.active { color: #176f64; background: #d9eee8; }
.focus-controller-summary { padding: 18px 28px 14px; text-align: center; }
.focus-controller-status { display: inline-flex; align-items: center; gap: 7px; color: #238f80; font-size: 12px; font-weight: 750; }
.focus-controller-status i { width: 7px; height: 7px; border-radius: 50%; background: #2da18f; box-shadow: 0 0 0 4px rgba(45, 161, 143, .12); }
.focus-controller-status.paused { color: #8b7040; }
.focus-controller-status.paused i { background: #c0923f; box-shadow: 0 0 0 4px rgba(192, 146, 63, .13); }
.focus-controller-summary h1 {
  margin: 5px 0 3px;
  color: #172722;
  font-size: 43px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -.055em;
  line-height: 1;
}
.focus-controller-summary p { overflow: hidden; margin: 8px 0 0; color: #667a74; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.focus-controller-actions { display: grid; grid-template-columns: 1.15fr 1fr 1fr 1fr; gap: 7px; padding: 0 15px 17px; }
.focus-controller-actions button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid #d1e2de;
  border-radius: 11px;
  color: #49615b;
  background: rgba(255, 255, 255, .86);
  font-size: 12px;
  font-weight: 700;
}
.focus-controller-actions button:hover:not(:disabled) { border-color: #9fcfc5; color: #176f64; background: #fff; }
.focus-controller-actions .focus-controller-primary { border-color: #238f80; color: #fff; background: #238f80; }
.focus-controller-actions .focus-controller-primary:hover:not(:disabled) { color: #fff; background: #176f64; }
.focus-controller-actions .focus-controller-finish { color: #63736f; }
.focus-controller-actions button:disabled { cursor: default; opacity: .42; }
.focus-controller-actions button:focus-visible, .focus-controller-window-actions button:focus-visible { outline: 3px solid rgba(35, 143, 128, .28); outline-offset: 2px; }
</style>
