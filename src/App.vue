<template>
  <div class="app">
    <div class="app-body">
      <AppRail />
      <Sidebar />
      <TaskList />
      <TaskDetail v-if="store.selectedTask" />
    </div>
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
import AppRail from './components/AppRail.vue'
import Sidebar from './components/Sidebar.vue'
import TaskList from './components/TaskList.vue'
import TaskDetail from './components/TaskDetail.vue'
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
