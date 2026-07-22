<template>
  <aside class="clock-sidebar">
    <header class="clock-sidebar__header">
      <h2>时钟</h2>
      <button class="icon-btn sidebar-header-action" type="button" title="收起时钟栏" aria-label="收起时钟栏" @click="store.updateSettings({ sidebarCollapsed: true })">
        <PanelLeft :size="18" />
      </button>
    </header>

    <nav class="clock-sidebar__nav" aria-label="时钟功能">
      <button class="clock-sidebar__nav-item active" type="button"><Timer :size="19" /><span>番茄计时</span></button>
      <button class="clock-sidebar__nav-item" type="button" disabled><Bell :size="19" /><span>定时提醒</span></button>
      <button class="clock-sidebar__nav-item" type="button" disabled><ChartNoAxesColumnIncreasing :size="19" /><span>今日记录</span></button>
    </nav>

    <p class="clock-sidebar__hint">更多时钟功能将在后续版本开放。</p>

    <div class="clock-sidebar__spacer"></div>
    <button class="clock-sidebar__help" type="button" @click="store.openHelpCenter"><CircleHelp :size="18" />使用指南</button>
  </aside>
</template>

<script setup>
import { Bell, ChartNoAxesColumnIncreasing, CircleHelp, PanelLeft, Timer } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'

const store = useTaskStore()
</script>
