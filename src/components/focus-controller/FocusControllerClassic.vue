<template>
  <section class="focus-classic" aria-labelledby="focus-controller-title">
    <header class="focus-classic__titlebar" @pointerdown="$emit('drag', $event)">
      <span class="focus-classic__brand"><span><TimerReset :size="16" /></span><strong>专注控制器</strong></span>
      <span class="focus-classic__tools">
        <FocusControllerStyleMenu :model-value="controller.style" @select="$emit('select-style', $event)" />
        <button type="button" :class="{ active: controller.alwaysOnTop }" :aria-pressed="controller.alwaysOnTop" :aria-label="controller.alwaysOnTop ? '取消窗口置顶' : '置顶窗口'" :title="controller.alwaysOnTop ? '取消置顶' : '置顶'" @pointerdown.stop @click="$emit('toggle-top')"><Pin v-if="controller.alwaysOnTop" :size="17" fill="currentColor" /><PinOff v-else :size="17" /></button>
        <button type="button" aria-label="关闭专注控制器" title="关闭小窗" @pointerdown.stop @click="$emit('close')"><X :size="18" /></button>
      </span>
    </header>
    <div class="focus-classic__summary">
      <span class="focus-classic__status" :class="{ paused: controller.status === 'paused' }"><i></i>{{ statusLabel }}</span>
      <h1 id="focus-controller-title">{{ formattedTime }}</h1>
      <p>{{ controller.taskTitle || fallbackText }}</p>
    </div>
    <div class="focus-classic__progress">
      <div class="focus-classic__progress-meta">
        <span>{{ progressLabel }}</span>
        <span>{{ progressMeta }}</span>
      </div>
      <div
        class="focus-classic__progress-track"
        :class="{ free: !isCountdown }"
        :role="isCountdown ? 'progressbar' : undefined"
        :aria-label="isCountdown ? '专注剩余时间' : undefined"
        :aria-valuemin="isCountdown ? 0 : undefined"
        :aria-valuemax="isCountdown ? 100 : undefined"
        :aria-valuenow="isCountdown ? progressPercent : undefined"
      ><i :style="{ width: `${isCountdown ? progressPercent : 100}%` }"></i></div>
    </div>
    <div class="focus-classic__actions">
      <button class="primary" type="button" :disabled="busy" @click="$emit('action', controller.status === 'paused' ? 'resume' : 'pause')"><Play v-if="controller.status === 'paused'" :size="18" fill="currentColor" /><Pause v-else :size="18" fill="currentColor" />{{ controller.status === 'paused' ? '继续' : '暂停' }}</button>
      <button type="button" :disabled="busy || !canAdjust" aria-label="缩短五分钟" @click="$emit('action', 'subtract-five')"><Minus :size="17" />5 分钟</button>
      <button type="button" :disabled="busy || !canAdjust" aria-label="延长五分钟" @click="$emit('action', 'add-five')"><Plus :size="17" />5 分钟</button>
      <button class="finish" type="button" :disabled="busy" @click="$emit('action', 'finish')"><Check :size="17" />完成</button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Check, Minus, Pause, Pin, PinOff, Play, Plus, TimerReset, X } from 'lucide-vue-next'
import FocusControllerStyleMenu from './FocusControllerStyleMenu.vue'
const props = defineProps({ controller: { type: Object, required: true }, formattedTime: { type: String, required: true }, liveSeconds: { type: Number, default: 0 }, progressRatio: { type: Number, default: 0 }, canAdjust: Boolean, busy: Boolean })
defineEmits(['action', 'toggle-top', 'close', 'select-style', 'drag'])
const statusLabel = computed(() => props.controller.status === 'paused' ? '已暂停' : props.controller.phase === 'focus' ? '正在专注' : '正在休息')
const fallbackText = computed(() => props.controller.phase === 'focus' ? '保持在当前这件事上' : '暂时离开屏幕，恢复一下')
const isCountdown = computed(() => props.controller.remainingSeconds !== null && Number(props.controller.durationSeconds) > 0)
const progressPercent = computed(() => Math.round(Math.max(0, Math.min(1, props.progressRatio)) * 100))
const progressLabel = computed(() => isCountdown.value ? `剩余 ${progressPercent.value}%` : '自由计时')
const progressMeta = computed(() => {
  if (!isCountdown.value) return `已专注 ${props.formattedTime}`
  if (props.controller.status === 'paused') return '计时已暂停'
  const end = new Date(Date.now() + Math.max(0, props.liveSeconds) * 1000)
  return `预计 ${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')} 结束`
})
</script>

<style scoped>
.focus-classic{display:grid;width:382px;height:286px;grid-template-rows:52px minmax(0,1fr) auto auto;overflow:hidden;border:1px solid #c9dfda;border-radius:14px;color:#172923;background:radial-gradient(circle at 14% 0,rgba(211,241,233,.72),transparent 38%),linear-gradient(150deg,#fff 0%,#f8fcfb 64%,#eef7f4 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.92)}
.focus-classic__titlebar{display:flex;align-items:center;justify-content:space-between;padding:0 8px 0 17px;border-bottom:1px solid rgba(42,112,99,.11);color:#4b6760;user-select:none}.focus-classic__brand,.focus-classic__brand>span,.focus-classic__tools{display:inline-flex;align-items:center}.focus-classic__brand{gap:9px;font-size:12px}.focus-classic__brand>span{justify-content:center;width:28px;height:28px;border-radius:9px;color:#1f8879;background:rgba(224,244,238,.78)}.focus-classic__brand strong{font-weight:750}.focus-classic__tools{gap:2px}.focus-classic__tools>button{display:grid;width:40px;height:40px;place-items:center;border:0;border-radius:10px;color:#5a716b;background:transparent;transition:color .16s ease,background .16s ease}.focus-classic__tools>button:hover{color:#176f64;background:#e8f3f0}.focus-classic__tools>button.active{color:#176f64;background:#dcefe9}
.focus-classic__summary{display:grid;align-content:center;justify-items:center;min-height:0;padding:9px 28px 7px;text-align:center}.focus-classic__status{display:inline-flex;align-items:center;gap:7px;color:#1d8b7b;font-size:12px;font-weight:800}.focus-classic__status i{width:7px;height:7px;border-radius:50%;background:#2da18f;box-shadow:0 0 0 4px rgba(45,161,143,.12)}.focus-classic__status.paused{color:#8b7040}.focus-classic__status.paused i{background:#c0923f;box-shadow:0 0 0 4px rgba(192,146,63,.13)}h1{margin:4px 0 0;color:#13251f;font-size:45px;font-variant-numeric:tabular-nums;letter-spacing:-.06em;line-height:1}.focus-classic__summary p{max-width:300px;overflow:hidden;margin:6px 0 0;color:#536b64;font-size:12px;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}
.focus-classic__progress{display:grid;gap:5px;padding:0 20px 12px}.focus-classic__progress-meta{display:flex;align-items:center;justify-content:space-between;color:#60756f;font-size:11px;font-weight:650;font-variant-numeric:tabular-nums}.focus-classic__progress-meta span:first-child{color:#237c70}.focus-classic__progress-track{height:6px;overflow:hidden;border:1px solid #d3e5e0;border-radius:999px;background:#eaf3f0}.focus-classic__progress-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#188677,#35aa98);transition:width .35s ease}.focus-classic__progress-track.free i{background:#beded6;opacity:.7}
.focus-classic__actions{display:grid;grid-template-columns:1.15fr 1fr 1fr .95fr;gap:7px;padding:0 15px 15px}.focus-classic__actions button{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:5px;border:1px solid #d1e2de;border-radius:11px;color:#415c55;background:rgba(255,255,255,.86);font-size:12px;font-weight:750;transition:border-color .16s ease,color .16s ease,background .16s ease}.focus-classic__actions button:hover:not(:disabled){border-color:#9fcfc5;color:#176f64;background:#fff}.focus-classic__actions .primary{border-color:#238f80;color:#fff;background:linear-gradient(135deg,#259b8b,#168073)}.focus-classic__actions .primary:hover:not(:disabled){border-color:#176f64;color:#fff;background:#176f64}.focus-classic__actions .finish{border-color:#8fc9bd;color:#176f64;background:rgba(255,255,255,.94)}.focus-classic__actions .finish:hover:not(:disabled){border-color:#238f80;background:#edf8f5}button:disabled{cursor:default;opacity:.42}button:focus-visible{outline:3px solid rgba(35,143,128,.28);outline-offset:2px}@media(prefers-reduced-motion:reduce){.focus-classic__tools>button,.focus-classic__actions button,.focus-classic__progress-track i{transition:none}}
</style>
