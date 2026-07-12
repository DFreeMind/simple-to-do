<template>
  <div class="color-picker" @click.stop>
    <!-- 色相/饱和度选择面板 -->
    <div class="color-picker__panel" ref="panelRef" @mousedown.prevent="startPanelDrag">
      <div class="color-picker__saturation" :style="{ backgroundColor: hueColor }">
        <div class="color-picker__saturation-white"></div>
        <div class="color-picker__saturation-black"></div>
        <div
          class="color-picker__cursor"
          :style="{ left: `${saturation}%`, top: `${100 - brightness}%` }"
        ></div>
      </div>
    </div>

    <!-- 色相滑块 -->
    <div class="color-picker__hue">
      <div class="color-picker__hue-slider" ref="hueSliderRef" @mousedown.prevent="startHueDrag">
        <div
          class="color-picker__hue-cursor"
          :style="{ left: `${hue}%` }"
        ></div>
      </div>
    </div>

    <!-- 透明度滑块（可选） -->
    <div class="color-picker__alpha" v-if="showAlpha">
      <div class="color-picker__alpha-slider" :style="{ background: alphaGradient }">
        <div
          class="color-picker__alpha-cursor"
          :style="{ left: `${alpha * 100}%` }"
          @mousedown="startAlphaDrag"
        ></div>
      </div>
    </div>

    <!-- 颜色信息 -->
    <div class="color-picker__info">
      <div class="color-picker__preview" :style="{ backgroundColor: hexColor }"></div>
      <div class="color-picker__inputs">
        <div class="color-picker__input-group">
          <label>HEX</label>
          <input
            type="text"
            :value="hexColor"
            @change="handleHexChange"
            maxlength="7"
            class="color-picker__hex-input"
          />
        </div>
        <div class="color-picker__input-group">
          <label>R</label>
          <input
            type="number"
            :value="rgb.r"
            @change="handleRgbChange('r', $event)"
            min="0"
            max="255"
            class="color-picker__rgb-input"
          />
        </div>
        <div class="color-picker__input-group">
          <label>G</label>
          <input
            type="number"
            :value="rgb.g"
            @change="handleRgbChange('g', $event)"
            min="0"
            max="255"
            class="color-picker__rgb-input"
          />
        </div>
        <div class="color-picker__input-group">
          <label>B</label>
          <input
            type="number"
            :value="rgb.b"
            @change="handleRgbChange('b', $event)"
            min="0"
            max="255"
            class="color-picker__rgb-input"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '#4A90D9' },
  showAlpha: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const panelRef = ref(null)
const hueSliderRef = ref(null)
const hue = ref(0)
const saturation = ref(100)
const brightness = ref(100)
const alpha = ref(1)

let isDraggingPanel = false
let isDraggingHue = false
let isDraggingAlpha = false

// 初始化颜色
onMounted(() => {
  if (props.modelValue) {
    const hsv = hexToHsv(props.modelValue)
    hue.value = hsv.h
    saturation.value = hsv.s
    brightness.value = hsv.v
  }
})

// 监听外部颜色变化
watch(() => props.modelValue, (newColor) => {
  if (newColor) {
    const hsv = hexToHsv(newColor)
    hue.value = hsv.h
    saturation.value = hsv.s
    brightness.value = hsv.v
  }
})

// 当前色相的CSS颜色
const hueColor = computed(() => `hsl(${hue.value}, 100%, 50%)`)

// 十六进制颜色
const hexColor = computed(() => {
  const rgb = hsvToRgb(hue.value, saturation.value, brightness.value)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
})

// RGB值
const rgb = computed(() => {
  return hsvToRgb(hue.value, saturation.value, brightness.value)
})

// 透明度渐变背景
const alphaGradient = computed(() => {
  const solid = hexColor.value
  return `linear-gradient(to right, transparent, ${solid})`
})

// 面板拖拽
function startPanelDrag(e) {
  isDraggingPanel = true
  updatePanelPosition(e)
  window.addEventListener('mousemove', handlePanelDrag)
  window.addEventListener('mouseup', stopPanelDrag)
}

function handlePanelDrag(e) {
  if (isDraggingPanel) {
    updatePanelPosition(e)
  }
}

function stopPanelDrag() {
  isDraggingPanel = false
  window.removeEventListener('mousemove', handlePanelDrag)
  window.removeEventListener('mouseup', stopPanelDrag)
}

function updatePanelPosition(e) {
  if (!panelRef.value) return
  const rect = panelRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))

  saturation.value = Math.round((x / rect.width) * 100)
  brightness.value = Math.round(100 - (y / rect.height) * 100)

  emitColor()
}

// 色相拖拽
function startHueDrag(e) {
  isDraggingHue = true
  updateHuePosition(e)
  window.addEventListener('mousemove', handleHueDrag)
  window.addEventListener('mouseup', stopHueDrag)
}

function handleHueDrag(e) {
  if (isDraggingHue) {
    updateHuePosition(e)
  }
}

function stopHueDrag() {
  isDraggingHue = false
  window.removeEventListener('mousemove', handleHueDrag)
  window.removeEventListener('mouseup', stopHueDrag)
}

function updateHuePosition(e) {
  const slider = hueSliderRef.value
  if (!slider) return
  const rect = slider.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  hue.value = Math.round((x / rect.width) * 360)
  emitColor()
}

// 透明度拖拽
function startAlphaDrag(e) {
  isDraggingAlpha = true
  updateAlphaPosition(e)
  document.addEventListener('mousemove', handleAlphaDrag)
  document.addEventListener('mouseup', stopAlphaDrag)
}

function handleAlphaDrag(e) {
  if (isDraggingAlpha) {
    updateAlphaPosition(e)
  }
}

function stopAlphaDrag() {
  isDraggingAlpha = false
  document.removeEventListener('mousemove', handleAlphaDrag)
  document.removeEventListener('mouseup', stopAlphaDrag)
}

function updateAlphaPosition(e) {
  const slider = document.querySelector('.color-picker__alpha-slider')
  if (!slider) return
  const rect = slider.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  alpha.value = Math.round((x / rect.width) * 100) / 100
  emitColor()
}

// 颜色转换函数
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 }
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

function hsvToRgb(h, s, v) {
  s /= 100
  v /= 100
  const c = v * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = v - c
  let r = 0, g = 0, b = 0

  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

function hexToHsv(hex) {
  const rgb = hexToRgb(hex)
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min

  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  }
}

// 输入处理
function handleHexChange(e) {
  const hex = e.target.value
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    const hsv = hexToHsv(hex)
    hue.value = hsv.h
    saturation.value = hsv.s
    brightness.value = hsv.v
    emitColor()
  }
}

function handleRgbChange(channel, e) {
  const value = Math.max(0, Math.min(255, parseInt(e.target.value) || 0))
  const newRgb = { ...rgb.value }
  newRgb[channel] = value

  const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b)
  const hsv = hexToHsv(hex)
  hue.value = hsv.h
  saturation.value = hsv.s
  brightness.value = hsv.v
  emitColor()
}

function emitColor() {
  emit('update:modelValue', hexColor.value)
}

onBeforeUnmount(() => {
  stopPanelDrag()
  stopHueDrag()
  stopAlphaDrag()
})
</script>

<style scoped>
.color-picker {
  width: 100%;
  padding: 12px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.color-picker__panel {
  width: 100%;
  height: 160px;
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
  cursor: crosshair;
}

.color-picker__saturation {
  position: relative;
  width: 100%;
  height: 100%;
}

.color-picker__saturation-white {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, white, transparent);
}

.color-picker__saturation-black {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent, black);
}

.color-picker__cursor {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.color-picker__hue {
  margin-bottom: 12px;
}

.color-picker__hue-slider {
  position: relative;
  width: 100%;
  height: 14px;
  border-radius: 7px;
  background: linear-gradient(
    to right,
    hsl(0, 100%, 50%),
    hsl(60, 100%, 50%),
    hsl(120, 100%, 50%),
    hsl(180, 100%, 50%),
    hsl(240, 100%, 50%),
    hsl(300, 100%, 50%),
    hsl(360, 100%, 50%)
  );
  cursor: pointer;
}

.color-picker__hue-cursor {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.color-picker__alpha {
  margin-bottom: 12px;
}

.color-picker__alpha-slider {
  position: relative;
  width: 100%;
  height: 14px;
  border-radius: 7px;
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
  cursor: pointer;
}

.color-picker__alpha-cursor {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.color-picker__info {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.color-picker__preview {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.color-picker__inputs {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 8px;
}

.color-picker__input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-picker__input-group label {
  font-size: 10px;
  color: #999;
  text-transform: uppercase;
}

.color-picker__hex-input,
.color-picker__rgb-input {
  width: 100%;
  height: 28px;
  padding: 0 6px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
  outline: none;
  transition: border-color 0.2s;
}

.color-picker__hex-input:focus,
.color-picker__rgb-input:focus {
  border-color: #4A90D9;
}

.color-picker__rgb-input::-webkit-inner-spin-button,
.color-picker__rgb-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.color-picker__rgb-input {
  -moz-appearance: textfield;
}
</style>
