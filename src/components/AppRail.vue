<template>
  <aside class="app-rail">
    <button class="rail-avatar" title="个人">
      <span>🧑</span>
    </button>
    <button
      class="rail-btn"
      :class="{ active: store.currentView !== 'search' }"
      title="任务"
      @click="store.setView('inbox')"
    >
      ✓
    </button>
    <button
      class="rail-btn"
      :class="{ active: store.currentView === 'search' }"
      title="搜索"
      @click="store.setSearch(store.searchQuery)"
    >
      🔍
    </button>
    <div class="rail-spacer"></div>
    <button class="rail-btn muted" title="同步状态">↻</button>
    <button class="rail-btn muted" title="提醒">🔔</button>
    <button class="rail-btn muted" title="帮助">?</button>
  </aside>
</template>

<script setup>
import { useTaskStore } from '@/stores/task'

const store = useTaskStore()
</script>
