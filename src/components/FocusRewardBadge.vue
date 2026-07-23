<template>
  <span class="focus-reward-badge" :class="[`focus-reward-badge--${reward}`, `focus-reward-badge--${size}`]" :title="name">
    <img :src="iconSrc" alt="" aria-hidden="true" />
    <span v-if="label">{{ name }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import blueberryIcon from '@/assets/rewards/blueberry.png'
import pumpkinIcon from '@/assets/rewards/pumpkin.png'
import strawberryIcon from '@/assets/rewards/strawberry.png'
import tomatoIcon from '@/assets/rewards/tomato.png'
import watermelonIcon from '@/assets/rewards/watermelon.png'

const props = defineProps({
  reward: { type: String, default: 'blueberry' },
  size: { type: String, default: 'sm' },
  label: { type: Boolean, default: false }
})

const name = computed(() => ({
  blueberry: '蓝莓', sesame: '蓝莓', strawberry: '草莓', tomato: '番茄', watermelon: '西瓜', pumpkin: '南瓜'
}[props.reward] || '蓝莓'))

const iconSrc = computed(() => ({
  blueberry: blueberryIcon,
  sesame: blueberryIcon,
  strawberry: strawberryIcon,
  tomato: tomatoIcon,
  watermelon: watermelonIcon,
  pumpkin: pumpkinIcon
}[props.reward] || blueberryIcon))
</script>
