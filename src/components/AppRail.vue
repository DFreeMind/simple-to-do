<template>
  <aside class="app-rail">
    <button class="rail-avatar" title="易简清单" aria-label="易简清单">
      <span>易</span>
    </button>
    <button
      class="rail-btn active"
      title="任务"
      aria-label="任务"
      @click="store.setView('inbox')"
    >
      ✓
    </button>
    <div class="rail-spacer"></div>
  </aside>
</template>

<script setup>
import { useTaskStore } from '@/stores/task'

const store = useTaskStore()
</script>
