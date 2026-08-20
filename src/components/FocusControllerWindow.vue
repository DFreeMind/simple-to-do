<template>
  <NativeReminderWindowShell v-slot="{ startWindowDrag }" class="focus-controller-window" :class="`focus-controller-window--${controller?.style || 'classic'}`" @dismiss="close">
    <component
      :is="activeComponent"
      v-if="controller"
      :controller="controller"
      :formatted-time="formattedTime"
      :live-seconds="liveSeconds"
      :paused-seconds="pausedSeconds"
      :can-adjust="canAdjust"
      :busy="busy"
      :progress-ratio="progressRatio"
      :expanded="islandExpanded"
      @action="perform"
      @toggle-top="toggleAlwaysOnTop"
      @close="close"
      @select-style="selectStyle"
      @toggle-expanded="toggleIslandExpanded"
      @drag="startWindowDrag"
    />
  </NativeReminderWindowShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { listen } from '@tauri-apps/api/event'
import NativeReminderWindowShell from './NativeReminderWindowShell.vue'
import FocusControllerClassic from './focus-controller/FocusControllerClassic.vue'
import FocusControllerIsland from './focus-controller/FocusControllerIsland.vue'
import FocusControllerOrbit from './focus-controller/FocusControllerOrbit.vue'
import { getFocusControllerPayload, handleFocusControllerAction, markFocusControllerReady, setFocusControllerAlwaysOnTop, setFocusControllerIslandExpanded, setFocusControllerStyle } from '@/services/platform'
import { getFocusRemainingRatio } from '@/utils/focusController.mjs'

const controller = ref(null)
const busy = ref(false)
const now = ref(Date.now())
const islandExpanded = ref(false)
let unlistenRefresh
let timer

const components = { orbit: FocusControllerOrbit, island: FocusControllerIsland, classic: FocusControllerClassic }
const activeComponent = computed(() => components[controller.value?.style] || FocusControllerClassic)
const liveSeconds = computed(() => {
  if (!controller.value) return 0
  const elapsedSinceSync = controller.value.status === 'running' ? Math.max(0, Math.floor((now.value - Number(controller.value.syncedAt || now.value)) / 1000)) : 0
  if (controller.value.remainingSeconds === null) return Math.max(0, Number(controller.value.elapsedSeconds || 0) + elapsedSinceSync)
  return Math.max(0, Number(controller.value.remainingSeconds || 0) - elapsedSinceSync)
})
const pausedSeconds = computed(() => {
  if (controller.value?.status !== 'paused' || !controller.value.pausedAt) return 0
  const pausedAt = new Date(controller.value.pausedAt).getTime()
  return Number.isFinite(pausedAt) ? Math.max(0, Math.floor((now.value - pausedAt) / 1000)) : 0
})
const formattedTime = computed(() => {
  const seconds = Math.floor(liveSeconds.value)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return hours > 0 ? `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}` : `${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`
})
const canAdjust = computed(() => controller.value?.phase === 'focus' && controller.value?.remainingSeconds !== null)
const progressRatio = computed(() => {
  if (controller.value?.remainingSeconds === null) return 0
  return getFocusRemainingRatio(controller.value?.durationSeconds, liveSeconds.value)
})

async function loadController() {
  const payload = await getFocusControllerPayload()
  if (!payload) return
  if (controller.value?.style !== payload.style || controller.value?.sessionId !== payload.sessionId) islandExpanded.value = false
  controller.value = payload
  busy.value = false
  await markFocusControllerReady(payload.revision)
}
async function perform(action) {
  if (!controller.value || busy.value) return
  busy.value = true
  try { const handled = await handleFocusControllerAction(controller.value, action); if (!handled) busy.value = false }
  catch (error) { console.error('[FocusControllerWindow] 执行专注操作失败:', error); busy.value = false }
  window.setTimeout(() => { busy.value = false }, 1200)
}
function close() { islandExpanded.value = false; return perform('close') }
async function toggleAlwaysOnTop() {
  if (!controller.value) return
  const next = !controller.value.alwaysOnTop
  await setFocusControllerAlwaysOnTop(next)
  controller.value = { ...controller.value, alwaysOnTop: next }
}
async function selectStyle(style) {
  if (!controller.value || style === controller.value.style) return
  islandExpanded.value = false
  await setFocusControllerStyle(style)
  controller.value = { ...controller.value, style }
}
async function toggleIslandExpanded() {
  const next = !islandExpanded.value
  if (await setFocusControllerIslandExpanded(next)) islandExpanded.value = next
}
onMounted(async () => {
  document.documentElement.classList.add('focus-controller-native')
  document.body.classList.add('focus-controller-native')
  unlistenRefresh = await listen('focus-controller:refresh', loadController)
  timer = window.setInterval(() => { now.value = Date.now() }, 250)
  await loadController()
})
onBeforeUnmount(() => {
  document.documentElement.classList.remove('focus-controller-native')
  document.body.classList.remove('focus-controller-native')
  unlistenRefresh?.()
  if (timer) window.clearInterval(timer)
})
</script>

<style scoped>
:global(html.focus-controller-native),:global(body.focus-controller-native),:global(body.focus-controller-native #app),:global(body.focus-controller-native #app>main){background:transparent!important;box-shadow:none!important}.focus-controller-window{display:grid;width:100vw;height:100vh;min-height:0;place-items:center;overflow:hidden;color:#1d2b27;background:transparent;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}.focus-controller-window--classic{padding:0 4px}.focus-controller-window--island{align-items:center;justify-items:center}
</style>
