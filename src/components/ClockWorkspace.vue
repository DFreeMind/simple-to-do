<template>
  <main class="clock-workspace">
    <section class="clock-workspace__empty">
      <AlarmClock :size="42" />
      <p class="eyebrow">时钟</p>
      <h1>时钟功能准备中</h1>
      <p>番茄计时、定时提醒与记录将作为独立模块逐步加入。</p>
    </section>
  </main>
</template>

<script setup>
import { AlarmClock } from 'lucide-vue-next'
</script>
