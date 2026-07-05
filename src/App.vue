<template>
  <div class="app" :data-theme="store.settings.theme" :data-density="store.settings.density">
    <div class="app-shell" :class="{ 'app-shell--detail-closed': !store.settings.detailOpen }">
      <Sidebar />
      <TaskList />
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
import { onMounted, watch } from 'vue'
import Sidebar from './components/Sidebar.vue'
import TaskList from './components/TaskList.vue'
import TaskDetail from './components/TaskDetail.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { useTaskStore } from './stores/task'

const store = useTaskStore()

onMounted(() => {
  store.loadData()
})

watch(() => store.notice?.id, (id) => {
  if (!id) return
  window.setTimeout(() => {
    if (store.notice?.id === id) store.clearNotice()
  }, 3200)
})
</script>
