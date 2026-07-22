<template>
  <aside class="clock-sidebar">
    <header class="clock-sidebar__header">
      <h2>时钟</h2>
      <button class="icon-btn sidebar-header-action" type="button" title="收起时钟栏" aria-label="收起时钟栏" @click="store.updateSettings({ sidebarCollapsed: true })">
        <PanelLeft :size="18" />
      </button>
    </header>

    <nav class="clock-sidebar__nav" aria-label="时钟功能">
      <button class="clock-sidebar__nav-item" :class="{ active: store.settings.clockView === 'focus' }" type="button" @click="store.setClockView('focus')"><Timer :size="19" /><span>专注工作台</span></button>
      <button class="clock-sidebar__nav-item" :class="{ active: store.settings.clockView === 'rhythm' }" type="button" @click="store.setClockView('rhythm')"><Bell :size="19" /><span>节律提醒</span></button>
    </nav>

    <p class="clock-sidebar__hint">把专注和日常提醒放进同一个节奏里，提醒可以按你的工作时间调整。</p>

    <div class="clock-sidebar__spacer"></div>
    <button class="clock-sidebar__help" type="button" @click="store.openHelpCenter"><CircleHelp :size="18" />使用指南</button>
  </aside>
</template>

<script setup>
import { Bell, CircleHelp, PanelLeft, Timer } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'

const store = useTaskStore()
</script>
