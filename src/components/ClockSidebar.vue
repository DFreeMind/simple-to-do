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
      <button class="clock-sidebar__nav-item" :class="{ active: store.settings.clockView === 'history' }" type="button" @click="store.setClockView('history')"><ChartNoAxesColumnIncreasing :size="19" /><span>专注回顾</span></button>
      <button class="clock-sidebar__nav-item" :class="{ active: store.settings.clockView === 'achievement' }" type="button" @click="store.setClockView('achievement')"><Trophy :size="19" /><span>专注成就</span></button>
    </nav>

    <div class="clock-sidebar__note">
      <span class="clock-sidebar__note-dot"></span>
      <p>专注当下，也看见长期投入留下的成长。</p>
    </div>
  </aside>
</template>

<script setup>
import { Bell, ChartNoAxesColumnIncreasing, PanelLeft, Timer, Trophy } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'

const store = useTaskStore()
</script>
