<template>
  <span class="focus-reward-badge" :class="[`focus-reward-badge--${reward}`, `focus-reward-badge--${size}`]" :title="name">
    <i aria-hidden="true"><b></b></i>
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
