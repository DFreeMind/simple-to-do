<template>
  <img
    v-if="source"
    class="focus-species-preview"
    :src="source"
    :alt="alt"
    draggable="false"
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  speciesId: { type: String, required: true },
  alt: { type: String, default: '' }
})

const previewModules = import.meta.glob(
  '/src/assets/focus-garden/species-previews/*.webp',
  { eager: true, query: '?url', import: 'default' }
)

const source = computed(() => (
  previewModules[`/src/assets/focus-garden/species-previews/${props.speciesId}.webp`]
  || previewModules['/src/assets/focus-garden/species-previews/daisy.webp']
))
</script>

<style scoped>
.focus-species-preview {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: contain;
  user-select: none;
}
</style>
