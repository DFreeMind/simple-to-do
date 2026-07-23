<template>
  <span class="focus-reward-badge" :class="[`focus-reward-badge--${reward}`, `focus-reward-badge--${size}`]" :title="name">
    <img :src="iconSrc" alt="" aria-hidden="true" />
    <span v-if="label">{{ name }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import pumpkinIcon from '@/assets/rewards/pumpkin.png'
import sesameIcon from '@/assets/rewards/sesame.png'
import strawberryIcon from '@/assets/rewards/strawberry.png'
import tomatoIcon from '@/assets/rewards/tomato.png'
import watermelonIcon from '@/assets/rewards/watermelon.png'

const props = defineProps({
  reward: { type: String, default: 'sesame' },
  size: { type: String, default: 'sm' },
  label: { type: Boolean, default: false }
})

const name = computed(() => ({
  sesame: '芝麻', strawberry: '草莓', tomato: '番茄', watermelon: '西瓜', pumpkin: '南瓜'
}[props.reward] || '芝麻'))

const iconSrc = computed(() => ({
  sesame: sesameIcon,
  strawberry: strawberryIcon,
  tomato: tomatoIcon,
  watermelon: watermelonIcon,
  pumpkin: pumpkinIcon
}[props.reward] || sesameIcon))
</script>
