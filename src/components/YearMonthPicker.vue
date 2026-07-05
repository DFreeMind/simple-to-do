<template>
  <div class="year-month-picker" @click.stop>
    <div class="ym-header">
      <button class="ym-nav" type="button" aria-label="上一年" @click="localYear--">‹</button>
      <strong>{{ localYear }}年</strong>
      <button class="ym-nav" type="button" aria-label="下一年" @click="localYear++">›</button>
    </div>
    <div class="ym-grid">
      <button
        v-for="month in months"
        :key="month.value"
        class="ym-month"
        :class="{
          active: localYear === year && month.value === monthIndex,
          today: localYear === todayYear && month.value === todayMonth
        }"
        type="button"
        @click="selectMonth(month.value)"
      >
        {{ month.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  year: { type: Number, required: true },
  monthIndex: { type: Number, required: true }
})
const emit = defineEmits(['select', 'close'])

const localYear = ref(props.year)
const today = new Date()
const todayYear = today.getFullYear()
const todayMonth = today.getMonth()
const months = Array.from({ length: 12 }, (_, index) => ({
  value: index,
  label: `${index + 1}月`
}))

function selectMonth(month) {
  emit('select', { year: localYear.value, month })
}

function closeOnWindowClick() {
  emit('close')
}

function closeOnEscape(event) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  window.setTimeout(() => {
    window.addEventListener('click', closeOnWindowClick)
    window.addEventListener('keydown', closeOnEscape)
  }, 0)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeOnWindowClick)
  window.removeEventListener('keydown', closeOnEscape)
})
</script>
