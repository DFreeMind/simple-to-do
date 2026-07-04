<template>
  <aside class="app-rail">
    <button class="rail-avatar" title="易简清单" aria-label="易简清单">
      <span>易</span>
    </button>
    <button
      class="rail-btn"
      :class="{ active: store.currentView !== 'search' }"
      title="任务"
      aria-label="任务"
      @click="store.setView('inbox')"
    >
      ✓
    </button>
    <button
      class="rail-btn"
      :class="{ active: store.currentView === 'search' }"
      title="搜索"
      aria-label="搜索"
      @click="store.setSearch(store.searchQuery)"
    >
      ⌕
    </button>
    <div class="rail-spacer"></div>
  </aside>
</template>

<script setup>
import { useTaskStore } from '@/stores/task'

const store = useTaskStore()
</script>
