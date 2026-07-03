<template>
  <div class="app">
    <div class="app-body">
      <AppRail />
      <Sidebar />
      <TaskList />
      <TaskDetail v-if="store.selectedTask" />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import AppRail from './components/AppRail.vue'
import Sidebar from './components/Sidebar.vue'
import TaskList from './components/TaskList.vue'
import TaskDetail from './components/TaskDetail.vue'
import { useTaskStore } from './stores/task'

const store = useTaskStore()

onMounted(() => {
  store.loadData()
})
</script>
