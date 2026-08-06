<template>
  <div
    class="focus-stage-artwork"
    :class="{
      'is-ready': ready,
      'is-scrubbing': scrubbing,
      'is-static': motion === 'static'
    }"
    aria-hidden="true"
  >
    <img
      :key="activeArtwork.source"
      class="focus-stage-artwork__layer active"
      :src="activeArtwork.source"
      alt=""
      draggable="false"
      @load="handleLoad"
      @error="handleError"
    />
    <span class="focus-stage-artwork__light" aria-hidden="true"></span>
    <span
      v-for="index in reaction ? 8 : 0"
      :key="`${reaction}-${index}`"
      class="focus-stage-artwork__particle"
      :style="{ '--particle-index': index }"
      aria-hidden="true"
    ></span>
    <span v-if="!ready && !failed" class="focus-stage-artwork__loading"></span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  speciesId: { type: String, default: 'daisy' },
  stage: { type: String, default: 'seed' },
  progress: { type: Number, default: null },
  scrubbing: { type: Boolean, default: false },
  motion: {
    type: String,
    default: 'interactive',
    validator: value => ['static', 'idle', 'interactive'].includes(value)
  },
  reaction: { type: Number, default: 0 }
})

const emit = defineEmits(['ready', 'error'])
const stageIds = ['seed', 'sprout', 'leaves', 'bud', 'opening', 'bloom']
const stageModules = import.meta.glob(
  '/src/assets/focus-garden/species-stages/**/*.{webp,png}',
  { eager: true, query: '?url', import: 'default' }
)
const ready = ref(false)
const failed = ref(false)

function sourceForStage(speciesId, stageId) {
  return stageModules[
    `/src/assets/focus-garden/species-stages/${speciesId}-v2/${stageId}.png`
  ] || stageModules[
    `/src/assets/focus-garden/species-stages/${speciesId}/${stageId}.webp`
  ] || stageModules[`/src/assets/focus-garden/species-stages/daisy/${stageId}.webp`]
}

const artwork = computed(() => stageIds.map(id => ({ id, source: sourceForStage(props.speciesId, id) })))

const normalizedProgress = computed(() => {
  const stageIndex = stageIds.indexOf(props.stage)
  const value = Number.isFinite(props.progress)
    ? props.progress
    : Math.max(0, stageIndex)
  return Math.max(0, Math.min(stageIds.length - 1, value))
})

const activeArtwork = computed(() => artwork.value[Math.round(normalizedProgress.value)] || artwork.value[0])

function handleLoad() {
  if (ready.value) return
  ready.value = true
  emit('ready')
}

function handleError(error) {
  if (failed.value) return
  failed.value = true
  emit('error', error)
}

watch(() => activeArtwork.value.source, () => {
  ready.value = false
  failed.value = false
})
</script>

<style scoped>
.focus-stage-artwork {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  overflow: visible;
  background: transparent;
  isolation: isolate;
}

.focus-stage-artwork__layer {
  position: absolute;
  z-index: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: auto;
  object-fit: contain;
  opacity: 1;
  transition: opacity 220ms ease-out;
  user-select: none;
  will-change: opacity;
}

.focus-stage-artwork.is-scrubbing .focus-stage-artwork__layer,
.focus-stage-artwork.is-static .focus-stage-artwork__layer {
  transition: none;
}

.focus-stage-artwork__light {
  position: absolute;
  z-index: 2;
  inset: -24%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, .18), transparent 62%);
  opacity: .58;
  pointer-events: none;
  animation: focus-stage-light 7s ease-in-out infinite alternate;
}

.focus-stage-artwork__particle {
  --angle: calc((var(--particle-index) - 1) * 45deg);
  position: absolute;
  z-index: 3;
  left: 50%;
  top: 45%;
  width: 5px;
  height: 5px;
  border-radius: 50% 0 50% 50%;
  background: color-mix(in srgb, var(--species-accent, #6d5bdd) 65%, white);
  box-shadow: 0 0 8px rgba(255,255,255,.68);
  opacity: 0;
  pointer-events: none;
  animation: focus-stage-particle 760ms ease-out both;
  animation-delay: calc(var(--particle-index) * 24ms);
}

.focus-stage-artwork__loading {
  position: absolute;
  z-index: 4;
  inset: 42%;
  border: 2px solid color-mix(in srgb, var(--species-accent, #6d5bdd) 20%, transparent);
  border-top-color: var(--species-accent, #6d5bdd);
  border-radius: 50%;
  animation: focus-stage-loading .8s linear infinite;
}

@keyframes focus-stage-light {
  to { transform: translate3d(3%, -2%, 0) scale(1.05); opacity: .78; }
}

@keyframes focus-stage-particle {
  0% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0) scale(.5); }
  24% { opacity: .9; }
  100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-70px) scale(1.2); }
}

@keyframes focus-stage-loading {
  to { transform: rotate(1turn); }
}

@media (prefers-reduced-motion: reduce) {
  .focus-stage-artwork__layer { transition: none; }
  .focus-stage-artwork__light,
  .focus-stage-artwork__particle,
  .focus-stage-artwork__loading { animation: none; }
}
</style>
