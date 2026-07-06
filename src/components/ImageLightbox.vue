<template>
  <Teleport to="body">
    <Transition name="lightbox-fade">
      <div
        v-if="visible"
        class="image-lightbox"
        role="dialog"
        aria-modal="true"
        @click.self="$emit('close')"
        @keydown="onKeydown"
        tabindex="0"
        ref="rootEl"
      >
        <button class="lightbox-close" @click="$emit('close')" :aria-label="'关闭'">
          <X :size="22" />
        </button>

        <button
          v-if="images.length > 1"
          class="lightbox-nav lightbox-prev"
          @click.stop="prev"
          :aria-label="'上一张'"
        >
          <ChevronLeft :size="28" />
        </button>

        <div class="lightbox-content" @click.stop>
          <Transition :name="slideDir" mode="out-in">
            <img
              v-if="currentImage"
              :key="currentIndex"
              :src="currentImage"
              :alt="`图片 ${currentIndex + 1}/${images.length}`"
              class="lightbox-image"
            />
          </Transition>
        </div>

        <button
          v-if="images.length > 1"
          class="lightbox-nav lightbox-next"
          @click.stop="next"
          :aria-label="'下一张'"
        >
          <ChevronRight :size="28" />
        </button>

        <div v-if="images.length > 1" class="lightbox-counter">
          {{ currentIndex + 1 }} / {{ images.length }}
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  images: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 },
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const currentIndex = ref(props.startIndex)
const slideDir = ref('slide-left')
const rootEl = ref(null)
const currentImage = computed(() => props.images[currentIndex.value] || '')

watch(() => props.visible, (v) => {
  if (v) {
    if (!props.images.length) {
      emit('close')
      return
    }
    currentIndex.value = clampIndex(props.startIndex)
    nextTick(() => rootEl.value?.focus())
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

watch(() => props.startIndex, (v) => {
  currentIndex.value = clampIndex(v)
})

watch(() => props.images.length, (length) => {
  if (!length) {
    if (props.visible) emit('close')
    return
  }
  currentIndex.value = clampIndex(currentIndex.value)
})

function prev() {
  if (props.images.length < 2) return
  slideDir.value = 'slide-right'
  currentIndex.value = (currentIndex.value - 1 + props.images.length) % props.images.length
}

function next() {
  if (props.images.length < 2) return
  slideDir.value = 'slide-left'
  currentIndex.value = (currentIndex.value + 1) % props.images.length
}

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
}

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

function clampIndex(index) {
  if (!props.images.length) return 0
  const safeIndex = Number.isFinite(index) ? Math.trunc(index) : 0
  return Math.max(0, Math.min(props.images.length - 1, safeIndex))
}
</script>

<style scoped>
.image-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(6px);
  outline: none;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
  z-index: 10;
}
.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.25);
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
  z-index: 10;
}
.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.22);
}
.lightbox-prev { left: 20px; }
.lightbox-next { right: 20px; }

.lightbox-content {
  max-width: 90vw;
  max-height: 88vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-image {
  max-width: 90vw;
  max-height: 88vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
  user-select: none;
}

.lightbox-counter {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 500;
}

/* Slide transitions */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.slide-left-enter-from { opacity: 0; transform: translateX(24px); }
.slide-left-leave-to { opacity: 0; transform: translateX(-24px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-24px); }
.slide-right-leave-to { opacity: 0; transform: translateX(24px); }

/* Fade for open/close */
.lightbox-fade-enter-active { transition: opacity 0.2s ease; }
.lightbox-fade-leave-active { transition: opacity 0.15s ease; }
.lightbox-fade-enter-from,
.lightbox-fade-leave-to { opacity: 0; }
</style>
