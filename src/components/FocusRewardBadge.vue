<template>
  <span class="focus-reward-badge" :class="[`focus-reward-badge--${reward}`, `focus-reward-badge--${size}`]" :title="name">
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <template v-if="reward === 'sesame'"><ellipse cx="16" cy="17" rx="8" ry="10" fill="#d8b678" /><ellipse cx="13" cy="13" rx="2.5" ry="3" fill="#f3ddb0" opacity=".82" /></template>
      <template v-else-if="reward === 'strawberry'"><path d="M16 10c5.4 0 9 3.1 9 7.1C25 23.3 19.7 27 16 29c-3.7-2-9-5.7-9-11.9C7 13.1 10.6 10 16 10Z" fill="#ef6674" /><path d="M16 10 11 7.6M16 10l5-2.4M16 10V5" stroke="#65a560" stroke-linecap="round" stroke-width="2.2" /><g fill="#ffe7bc"><circle cx="12" cy="17" r=".8" /><circle cx="17" cy="15" r=".8" /><circle cx="20" cy="20" r=".8" /><circle cx="14" cy="22" r=".8" /></g></template>
      <template v-else-if="reward === 'tomato'"><circle cx="16" cy="17" r="10" fill="#e85d50" /><path d="m16 8-4-3m4 3 4-3m-4 3V4m0 4-5 1.5m5-1.5 5 1.5" stroke="#5b975b" stroke-linecap="round" stroke-width="2.3" /><circle cx="12.5" cy="14" r="2" fill="#ff9a82" opacity=".7" /></template>
      <template v-else-if="reward === 'watermelon'"><path d="M5 23a12 12 0 0 1 22 0Z" fill="#58a76d" /><path d="M7 22a10 10 0 0 1 18 0Z" fill="#fff0e7" /><path d="M9 21a8 8 0 0 1 14 0Z" fill="#ec6d68" /><g fill="#60464a"><ellipse cx="13" cy="19" rx=".8" ry="1.4" /><ellipse cx="17" cy="16.8" rx=".8" ry="1.4" /><ellipse cx="20" cy="20" rx=".8" ry="1.4" /></g></template>
      <template v-else><path d="M7 16c0-6 4-9 9-9s9 3 9 9-4 10-9 10-9-4-9-10Z" fill="#e99a42" /><path d="M12 8c-2 4-2 11 0 16m8-16c2 4 2 11 0 16M16 7v19" fill="none" stroke="#c77835" stroke-width="1.4" opacity=".7" /><path d="M16 7V3m0 1 3-1.5" stroke="#5e9457" stroke-linecap="round" stroke-width="2.4" /></template>
    </svg>
    <span v-if="label">{{ name }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  reward: { type: String, default: 'sesame' },
  size: { type: String, default: 'sm' },
  label: { type: Boolean, default: false }
})

const name = computed(() => ({
  sesame: '芝麻', strawberry: '草莓', tomato: '番茄', watermelon: '西瓜', pumpkin: '南瓜'
}[props.reward] || '芝麻'))
</script>
