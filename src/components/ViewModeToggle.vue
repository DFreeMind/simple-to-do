<template>
  <div class="view-mode-toggle">
    <button
      class="view-mode-btn"
      :class="{ active: modelValue === 'list' }"
      type="button"
      title="列表模式"
      @click="$emit('update:modelValue', 'list')"
    >
      <List :size="16" />
    </button>
    <button
      class="view-mode-btn"
      :class="{ active: modelValue === 'group' }"
      type="button"
      title="分组模式"
      @click="$emit('update:modelValue', 'group')"
    >
      <LayoutGrid :size="16" />
    </button>
  </div>
</template>

<script setup>
import { List, LayoutGrid } from 'lucide-vue-next'

defineProps({
  modelValue: {
    type: String,
    default: 'list'
  }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.view-mode-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--color-bg-secondary);
  border-radius: 6px;
}

.view-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-mode-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.view-mode-btn.active {
  background: var(--color-bg-primary);
  color: var(--color-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
