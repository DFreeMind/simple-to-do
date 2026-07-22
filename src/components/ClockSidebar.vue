<template>
  <aside class="clock-sidebar">
    <header class="clock-sidebar__header">
      <h2>时钟</h2>
      <button class="icon-btn sidebar-header-action" type="button" title="收起时钟栏" aria-label="收起时钟栏" @click="store.updateSettings({ sidebarCollapsed: true })">
        <PanelLeft :size="18" />
      </button>
    </header>

    <nav class="clock-sidebar__nav" aria-label="时钟功能">
      <div class="clock-sidebar__nav-item active"><Timer :size="19" /><span>专注工作台</span></div>
    </nav>

    <p class="clock-sidebar__hint">从一个清晰的专注周期开始。节律提醒与回顾会在后续产品任务中逐步完成。</p>

    <div class="clock-sidebar__spacer"></div>
    <button class="clock-sidebar__help" type="button" @click="store.openHelpCenter"><CircleHelp :size="18" />使用指南</button>
  </aside>
</template>

<script setup>
import { CircleHelp, PanelLeft, Timer } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'

const store = useTaskStore()
</script>
