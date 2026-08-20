<template>
  <span class="achievement-badge-emblem" :class="`achievement-badge-emblem--${motif}`" aria-hidden="true">
    <i class="achievement-badge-emblem__halo"></i>
    <i
      v-for="index in ornamentCount"
      :key="index"
      class="achievement-badge-emblem__ornament"
      :style="{ '--ornament-index': index - 1 }"
    ></i>
    <component :is="icon" class="achievement-badge-emblem__glyph" :size="iconSize" stroke-width="1.8" />
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  achievementId: { type: String, default: '' },
  icon: { type: [Object, Function], required: true },
  iconSize: { type: Number, default: 24 }
})

const motif = computed(() => {
  if (['first-bloom', 'bloom-10', 'bloom-25'].includes(props.achievementId)) return 'bloom'
  if (['focus-600'].includes(props.achievementId)) return 'sun'
  if (['focus-1800', 'focus-3600'].includes(props.achievementId)) return 'grove'
  if (props.achievementId.startsWith('deep-')) return 'deep'
  if (props.achievementId.startsWith('species-') || props.achievementId === 'collections-3') return 'collection'
  if (props.achievementId.startsWith('streak-') || props.achievementId === 'active-days-30') return 'rhythm'
  return 'seed'
})
const ornamentCount = computed(() => ({ seed: 3, bloom: 6, sun: 8, grove: 4, deep: 3, collection: 5, rhythm: 4 }[motif.value] || 3))
</script>

<style scoped>
.achievement-badge-emblem { position: relative; display: grid; width: 100%; height: 100%; place-items: center; color: inherit; }.achievement-badge-emblem__halo { position: absolute; inset: 5px; border: 1px solid color-mix(in srgb, currentColor 25%, transparent); border-radius: inherit; opacity: .75; }.achievement-badge-emblem__glyph { position: relative; z-index: 2; filter: drop-shadow(0 1px 1px color-mix(in srgb, currentColor 22%, transparent)); }.achievement-badge-emblem__ornament { position: absolute; z-index: 1; top: 50%; left: 50%; width: 3px; height: 3px; border-radius: 50%; background: currentColor; opacity: .55; transform: rotate(calc(var(--ornament-index) * 45deg)) translateY(-18px); }.achievement-badge-emblem--bloom .achievement-badge-emblem__halo { inset: 7px; border-style: dashed; }.achievement-badge-emblem--bloom .achievement-badge-emblem__ornament { width: 4px; height: 4px; transform: rotate(calc(var(--ornament-index) * 60deg)) translateY(-17px); }.achievement-badge-emblem--sun .achievement-badge-emblem__ornament { width: 2px; height: 6px; border-radius: 99px; transform: rotate(calc(var(--ornament-index) * 45deg)) translateY(-18px); }.achievement-badge-emblem--grove .achievement-badge-emblem__halo { border-radius: 38% 38% 46% 46%; }.achievement-badge-emblem--deep .achievement-badge-emblem__halo { inset: 6px; border-style: dashed; }.achievement-badge-emblem--deep .achievement-badge-emblem__ornament { width: 2px; height: 2px; box-shadow: 5px -3px 0 currentColor; transform: rotate(calc(var(--ornament-index) * 120deg)) translateY(-16px); }.achievement-badge-emblem--collection .achievement-badge-emblem__halo { border-radius: 38% 62% 46% 54%; }.achievement-badge-emblem--collection .achievement-badge-emblem__ornament { width: 4px; height: 4px; transform: rotate(calc(var(--ornament-index) * 72deg)) translateY(-17px); }.achievement-badge-emblem--rhythm .achievement-badge-emblem__halo { border-radius: 50% 50% 42% 42%; }.achievement-badge-emblem--rhythm .achievement-badge-emblem__ornament { width: 8px; height: 2px; border-radius: 99px; transform: rotate(calc(var(--ornament-index) * 90deg)) translateY(-18px); }
</style>
