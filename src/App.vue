<template>
  <div class="app" :data-theme="store.settings.theme" :data-mode="store.settings.darkMode ? 'dark' : null" :data-density="store.settings.density">
    <div
      class="app-shell"
      :class="{ 'app-shell--detail-closed': !store.settings.detailOpen }"
      :style="{ '--detail-w': detailWidth + 'px' }"
    >
      <Sidebar />
      <TaskList />
      <div
        v-if="store.settings.detailOpen"
        class="col-resizer"
        @pointerdown="onResizeStart"
      />
      <TaskDetail v-if="store.settings.detailOpen" />
    </div>

    <SettingsPanel />

    <div
      v-if="store.notice"
      class="app-toast"
      :class="`app-toast--${store.notice.type}`"
      role="status"
      aria-live="polite"
    >
      {{ store.notice.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import Sidebar from './components/Sidebar.vue'
import TaskList from './components/TaskList.vue'
import TaskDetail from './components/TaskDetail.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { useTaskStore } from './stores/task'

const store = useTaskStore()
const DETAIL_WIDTH_MIN = 320
const DETAIL_WIDTH_MAX = 800

const detailWidth = ref(store.settings.detailWidth || 380)

watch(() => store.settings.detailWidth, (v) => {
  if (typeof v === 'number') detailWidth.value = clampDetailWidth(v)
})

function onResizeStart(e) {
  const startX = e.clientX
  const startWidth = detailWidth.value
  const shellWidth = e.target.parentElement.offsetWidth
  const maxDetail = Math.max(DETAIL_WIDTH_MIN, Math.min(DETAIL_WIDTH_MAX, shellWidth - 286 - 420))
  const target = e.currentTarget

  document.body.classList.add('is-resizing')
  target.setPointerCapture(e.pointerId)

  function onMove(ev) {
    const delta = startX - ev.clientX
    const newWidth = clampDetailWidth(startWidth + delta, maxDetail)
    detailWidth.value = newWidth
  }

  function cleanup(saveWidth = false) {
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
    target.removeEventListener('pointercancel', onCancel)
    target.removeEventListener('lostpointercapture', onCancel)
    if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId)
    document.body.classList.remove('is-resizing')
    if (saveWidth) store.settings.detailWidth = detailWidth.value
  }

  function onUp() {
    cleanup(true)
  }

  function onCancel() {
    cleanup()
  }

  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
  target.addEventListener('pointercancel', onCancel)
  target.addEventListener('lostpointercapture', onCancel)
}

function clampDetailWidth(value, max = DETAIL_WIDTH_MAX) {
  return Math.max(DETAIL_WIDTH_MIN, Math.min(max, value))
}

onMounted(() => {
  syncBodyTheme()
  store.loadData()
})

watch(
  () => [store.settings.theme, store.settings.darkMode, store.settings.density],
  syncBodyTheme,
  { immediate: true }
)

function syncBodyTheme() {
  document.body.dataset.theme = store.settings.theme || 'mint'
  document.body.dataset.density = store.settings.density || 'comfortable'
  document.body.style.colorScheme = store.settings.darkMode ? 'dark' : 'light'
  if (store.settings.darkMode) {
    document.body.dataset.mode = 'dark'
  } else {
    delete document.body.dataset.mode
  }
}

watch(() => store.notice?.id, (id) => {
  if (!id) return
  window.setTimeout(() => {
    if (store.notice?.id === id) store.clearNotice()
  }, 3200)
})
</script>
