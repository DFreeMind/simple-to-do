<template>
  <div ref="menuRef" class="focus-style-menu">
    <button
      class="focus-style-menu__trigger"
      type="button"
      :aria-expanded="open"
      aria-haspopup="menu"
      aria-label="切换控制器形态"
      title="切换形态"
      @pointerdown.stop
      @click="open = !open"
    ><component :is="triggerIconComponent" :size="triggerSize" /></button>
    <div v-if="open" class="focus-style-menu__popover" role="menu" @pointerdown.stop>
      <button v-for="option in options" :key="option.id" type="button" role="menuitemradio" :aria-checked="modelValue === option.id" @click="select(option.id)">
        <span><strong>{{ option.label }}</strong><small>{{ option.description }}</small></span>
        <Check v-if="modelValue === option.id" :size="15" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, Palette, PanelTop } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, required: true },
  triggerIcon: { type: String, default: 'panel' },
  triggerSize: { type: Number, default: 16 }
})
const emit = defineEmits(['select'])
const open = ref(false)
const menuRef = ref(null)
const triggerIconComponent = computed(() => props.triggerIcon === 'palette' ? Palette : PanelTop)
const options = [
  { id: 'orbit', label: '轨道表盘', description: '圆形进度' },
  { id: 'island', label: '专注岛', description: '紧凑常驻' },
  { id: 'classic', label: '经典卡片', description: '操作完整' }
]

function select(style) { open.value = false; emit('select', style) }
function handleOutside(event) { if (!menuRef.value?.contains(event.target)) open.value = false }
onMounted(() => document.addEventListener('pointerdown', handleOutside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutside))
</script>

<style scoped>
.focus-style-menu { position: relative; z-index: 20; }
.focus-style-menu__trigger { display: grid; width: 34px; height: 34px; place-items: center; border: 0; border-radius: 10px; color: #61756f; background: transparent; }
.focus-style-menu__trigger:hover, .focus-style-menu__trigger[aria-expanded="true"] { color: #176f64; background: #e4f1ed; }
.focus-style-menu__popover { position: absolute; top: calc(100% + 7px); left: 0; width: 174px; overflow: hidden; padding: 5px; border: 1px solid #d3e3df; border-radius: 13px; background: rgba(255,255,255,.98); box-shadow: 0 16px 36px rgba(21,64,56,.2); }
.focus-style-menu__popover button { display: flex; width: 100%; min-height: 42px; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 9px; border: 0; border-radius: 9px; color: #314640; background: transparent; text-align: left; }
.focus-style-menu__popover button:hover { color: #176f64; background: #edf7f4; }
.focus-style-menu__popover span { display: grid; gap: 1px; }
.focus-style-menu__popover strong { font-size: 12px; }
.focus-style-menu__popover small { color: #5f746e; font-size: 10px; }
.focus-style-menu__popover svg { color: #238f80; }
button:focus-visible { outline: 3px solid rgba(35,143,128,.28); outline-offset: 2px; }
</style>
