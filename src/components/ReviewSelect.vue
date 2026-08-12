<template>
  <div class="review-select" :class="{ open, 'review-select--quiet': variant === 'quiet' }">
    <button
      ref="triggerRef"
      type="button"
      class="review-select__trigger"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-label="ariaLabel"
      @click="toggle"
    >
      <span class="review-select__label">{{ currentLabel }}</span>
      <ChevronDown :size="12" :class="{ 'is-open': open }" />
    </button>

    <Teleport to=".app">
      <Transition name="review-select-pop">
        <div
          v-if="open"
          ref="menuRef"
          class="review-select__menu"
          role="listbox"
          :style="menuStyle"
          @click.stop
        >
          <button
            v-for="opt in options"
            :key="opt.value"
            type="button"
            role="option"
            :aria-selected="modelValue === opt.value"
            :class="{ active: modelValue === opt.value }"
            @click="select(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [String, Number], required: true },
  // [{ value, label }]
  options: { type: Array, required: true },
  ariaLabel: { type: String, default: '' },
  // 用于筛选面板等紧凑表单，默认保持常规按钮样式
  variant: { type: String, default: 'default' },
  // 分页等小控件可收窄下拉宽度
  menuWidth: { type: Number, default: 152 }
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const triggerRef = ref(null)
const menuRef = ref(null)
const triggerRect = ref({ left: 0, top: 0, width: 0, bottom: 0 })

const currentLabel = computed(() => props.options.find(o => String(o.value) === String(props.modelValue))?.label || props.options[0]?.label || '')

// fixed 定位（Teleport 到 .app，继承主题变量且不被卡片容器裁剪）
const menuStyle = computed(() => {
  if (!triggerRect.value.width) return { visibility: 'hidden' }
  const margin = 8
  const width = props.menuWidth
  const desiredLeft = triggerRect.value.left
  const maxLeft = (typeof window !== 'undefined' ? window.innerWidth : 1024) - width - margin
  const left = Math.max(margin, Math.min(desiredLeft, maxLeft))
  const top = triggerRect.value.bottom + 4
  return { left: `${left}px`, top: `${top}px`, width: `${width}px` }
})

function toggle() {
  if (open.value) close()
  else openMenu()
}

function openMenu() {
  updateRect()
  open.value = true
  nextTick(() => {
    const active = menuRef.value?.querySelector('.active')
    active?.focus?.() || menuRef.value?.firstElementChild?.focus?.()
  })
}

function close() {
  open.value = false
}

function select(value) {
  emit('update:modelValue', value)
  close()
}

function updateRect() {
  const el = triggerRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  triggerRect.value = { left: r.left, top: r.top, width: r.width, bottom: r.bottom }
}

function handleOutsidePointerDown(event) {
  if (!open.value) return
  if (triggerRef.value?.contains(event.target)) return
  if (menuRef.value?.contains(event.target)) return
  close()
}

function handleKeydown(event) {
  if (event.key === 'Escape' && open.value) {
    event.stopPropagation()
    close()
  }
}

watch(open, (o) => {
  if (typeof window === 'undefined') return
  if (o) {
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
  } else {
    window.removeEventListener('scroll', updateRect, true)
    window.removeEventListener('resize', updateRect)
  }
})

onMounted(() => {
  // 使用捕获阶段，避免父级浮层的 stopPropagation 让选择菜单无法关闭。
  document.addEventListener('pointerdown', handleOutsidePointerDown, true)
  document.addEventListener('keydown', handleKeydown, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  document.removeEventListener('keydown', handleKeydown, true)
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', updateRect, true)
    window.removeEventListener('resize', updateRect)
  }
})
</script>

<style scoped>
.review-select {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
}

.review-select__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  max-width: 160px;
  padding: 0 10px;
  border: 1px solid var(--divider-soft);
  border-radius: 9px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 12px;
  font-weight: 550;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
}
.review-select__trigger:hover { border-color: var(--border-strong); }
.review-select__trigger:focus-visible,
.review-select.open .review-select__trigger {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.review-select__label {
  overflow: hidden;
  text-overflow: ellipsis;
}
.review-select__trigger svg {
  flex-shrink: 0;
  color: var(--text-muted);
  transition: transform var(--transition-fast);
}
.review-select__trigger svg.is-open { transform: rotate(180deg); }

.review-select--quiet { width: 100%; }
.review-select--quiet .review-select__trigger {
  width: 100%;
  max-width: none;
  min-height: 32px;
  justify-content: space-between;
  padding: 0 7px;
  border-color: transparent;
  border-radius: 7px;
  background: var(--surface-muted);
}
.review-select--quiet .review-select__trigger:hover { border-color: transparent; background: var(--accent-soft); color: var(--accent-strong); }

/* 下拉菜单（Teleport 到 .app + fixed，不透明白底） */
.review-select__menu {
  position: fixed;
  z-index: 1100;
  display: grid;
  gap: 2px;
  padding: 5px;
  border: 1px solid var(--divider-soft);
  border-radius: 10px;
  background: var(--surface, #fff);
  box-shadow: 0 16px 40px rgba(8, 24, 20, .18), 0 2px 8px rgba(8, 24, 20, .08);
  opacity: 1;
}
.review-select__menu button {
  display: flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 12px;
  font-weight: 550;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.review-select__menu button:hover {
  background: var(--accent-soft);
  color: var(--accent-strong);
}
.review-select__menu button.active {
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-weight: 650;
}

.review-select-pop-enter-active, .review-select-pop-leave-active { transition: opacity .12s ease, transform .12s ease; }
.review-select-pop-enter-from, .review-select-pop-leave-to { opacity: 0; transform: translateY(-3px); }
</style>
