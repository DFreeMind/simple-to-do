<template>
  <section class="focus-orbit" :class="{ paused: controller.status === 'paused', break: controller.phase !== 'focus' }" aria-labelledby="focus-controller-title" @pointerdown="$emit('drag', $event)">
    <svg class="focus-orbit__face" viewBox="0 0 288 288" aria-hidden="true">
      <defs>
        <linearGradient id="focus-orbit-gradient" x1="0" x2="1"><stop stop-color="#187f73"/><stop offset="1" stop-color="#4fb4be"/></linearGradient>
        <clipPath id="focus-orbit-dial-clip"><circle cx="144" cy="144" r="142"/></clipPath>
      </defs>
      <circle class="bezel" cx="144" cy="144" r="136"/>
      <g transform="rotate(-90 144 144)">
        <circle class="ticks" pathLength="100" cx="144" cy="144" r="100"/>
        <circle class="major-ticks" pathLength="100" cx="144" cy="144" r="100"/>
        <circle class="track" cx="144" cy="144" r="116"/>
        <circle class="progress" pathLength="100" cx="144" cy="144" r="116" :style="{ strokeDashoffset: 100 - progressPercent }"/>
      </g>
      <circle v-if="isCountdown" class="marker" :cx="markerPoint.x" :cy="markerPoint.y" r="6"/>
      <path class="dock-shell" clip-path="url(#focus-orbit-dial-clip)" d="M20 236C36 232 43 219 62 213C88 205 200 205 226 213C245 219 252 232 268 236C276 240 280 247 280 256V288H8V256C8 247 12 240 20 236Z"/>
      <path class="dock-seam" clip-path="url(#focus-orbit-dial-clip)" d="M20 236C36 232 43 219 62 213C88 205 200 205 226 213C245 219 252 232 268 236"/>
    </svg>

    <div class="focus-orbit__tools" @pointerdown.stop>
      <FocusControllerStyleMenu :model-value="controller.style" trigger-icon="palette" :trigger-size="12" @select="$emit('select-style', $event)" />
      <button type="button" :class="{ active: controller.alwaysOnTop }" :aria-label="controller.alwaysOnTop ? '取消窗口置顶' : '置顶窗口'" @click="$emit('toggle-top')"><Pin v-if="controller.alwaysOnTop" :size="12"/><PinOff v-else :size="12"/></button>
      <button type="button" aria-label="完成本轮" title="完成本轮" @click="$emit('action', 'finish')"><CircleCheck :size="14"/></button>
      <button type="button" aria-label="关闭专注控制器" title="关闭小窗" @click="$emit('close')"><X :size="13"/></button>
    </div>

    <div class="focus-orbit__core">
      <span class="focus-orbit__status"><i></i>{{ statusLabel }}</span>
      <h1 id="focus-controller-title">{{ formattedTime }}</h1>
      <p>{{ controller.taskTitle || fallbackText }}</p>
      <span class="focus-orbit__remaining">{{ remainingLabel }}</span>
    </div>

    <div class="focus-orbit__dock" @pointerdown.stop>
      <button type="button" :disabled="busy || !canAdjust" aria-label="缩短五分钟" @click="$emit('action', 'subtract-five')"><Minus :size="16"/></button>
      <button class="primary" type="button" :disabled="busy" :aria-label="controller.status === 'paused' ? '继续专注' : '暂停专注'" @click="$emit('action', controller.status === 'paused' ? 'resume' : 'pause')"><Play v-if="controller.status === 'paused'" :size="19" fill="currentColor"/><Pause v-else :size="19" fill="currentColor"/></button>
      <button type="button" :disabled="busy || !canAdjust" aria-label="延长五分钟" @click="$emit('action', 'add-five')"><Plus :size="16"/></button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { CircleCheck, Minus, Pause, Pin, PinOff, Play, Plus, X } from 'lucide-vue-next'
import FocusControllerStyleMenu from './FocusControllerStyleMenu.vue'

const props = defineProps({ controller: { type: Object, required: true }, formattedTime: { type: String, required: true }, canAdjust: Boolean, busy: Boolean, progressRatio: { type: Number, default: 0 }, pausedSeconds: { type: Number, default: 0 } })
defineEmits(['action', 'toggle-top', 'close', 'select-style', 'drag'])

const progressPercent = computed(() => Math.max(0, Math.min(100, props.progressRatio * 100)))
const isCountdown = computed(() => props.controller.remainingSeconds !== null && Number(props.controller.durationSeconds) > 0)
const markerPoint = computed(() => {
  const angle = (progressPercent.value / 100) * Math.PI * 2 - Math.PI / 2
  return { x: 144 + 116 * Math.cos(angle), y: 144 + 116 * Math.sin(angle) }
})
const statusLabel = computed(() => props.controller.status === 'paused' ? '已暂停' : props.controller.phase === 'focus' ? '正在专注' : '正在休息')
const fallbackText = computed(() => props.controller.phase === 'focus' ? '保持在当前这件事上' : '暂时离开屏幕，恢复一下')
const remainingLabel = computed(() => props.controller.status === 'paused' ? `暂停 ${formatDuration(props.pausedSeconds)}` : isCountdown.value ? `剩余 ${Math.round(progressPercent.value)}%` : '自由计时')
function formatDuration(seconds) { const value = Math.max(0, Math.floor(seconds || 0)); const hours = Math.floor(value / 3600); const minutes = Math.floor((value % 3600) / 60); const rest = value % 60; return hours > 0 ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}` : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}` }
</script>

<style scoped>
.focus-orbit{position:relative;display:grid;width:232px;height:232px;margin:12px;place-items:center;border:1px solid rgba(31,91,80,.12);border-radius:50%;color:#172923;background:radial-gradient(circle at 36% 22%,#fff 0%,#fcfefd 50%,#f2f9f7 100%);box-shadow:inset 0 0 0 2px rgba(226,243,238,.66),inset 0 1px 0 rgba(255,255,255,.96);user-select:none}.focus-orbit__face{position:absolute;inset:0;width:232px;height:232px}.focus-orbit__face circle{fill:none}.bezel{stroke:#d5e8e4;stroke-width:1}.ticks{stroke:#bdddd7;stroke-width:1.25;stroke-dasharray:.3 1.78;opacity:.68}.major-ticks{stroke:#acd2cb;stroke-width:1.8;stroke-dasharray:.75 11.75;opacity:.64}.track{stroke:#d8ebe7;stroke-width:4.5}.progress{stroke:url(#focus-orbit-gradient);stroke-width:4.4;stroke-linecap:round;stroke-dasharray:100;transition:stroke-dashoffset .35s ease}.marker{fill:#43ad9d!important;stroke:#fff;stroke-width:3;filter:drop-shadow(0 0 3px rgba(67,173,157,.42))}.paused .progress{stroke:#c0923f}.break .progress{stroke:url(#focus-orbit-gradient)}.paused .marker{fill:#c0923f!important}.break .marker{fill:#43ad9d!important}.dock-shell{fill:rgba(255,255,255,.985);stroke:none}.dock-seam{fill:none;stroke:#d8e8e4;stroke-width:1.1}
.focus-orbit__core{position:relative;z-index:2;display:grid;justify-items:center;margin-top:-13px;text-align:center;transform:translateY(1px)}.focus-orbit__status{display:inline-flex;align-items:center;gap:5px;color:#238f80;font-size:10px;font-weight:800;transform:translateY(5px)}.focus-orbit__status i{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 0 3px rgba(45,161,143,.12)}.paused .focus-orbit__status{color:#9b7234}.break .focus-orbit__status{color:#238f80}h1{margin:7px 0 5px;color:#10251e;font-size:42px;font-weight:600;line-height:.96;letter-spacing:-.06em;font-variant-numeric:tabular-nums}.focus-orbit__core p{width:158px;overflow:hidden;margin:0;color:#536d65;font-size:11px;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}.focus-orbit__remaining{margin-top:5px;color:#278d80;font-size:11px;font-weight:750;font-variant-numeric:tabular-nums}.paused .focus-orbit__remaining{color:#936e34}.break .focus-orbit__remaining{color:#278d80}
.focus-orbit__dock{position:absolute;z-index:5;right:53px;bottom:28px;left:53px;display:flex;height:38px;align-items:flex-start;justify-content:space-between;padding:3px 3px 0}.focus-orbit__dock button{position:relative;display:grid;width:27px;height:27px;cursor:pointer;place-items:center;border:1px solid #d9e9e5;border-radius:50%;color:#5a726b;background:#fbfdfc;box-sizing:border-box;transition:background .16s ease,color .16s ease,border-color .16s ease}.focus-orbit__dock button:hover:not(:disabled){border-color:#9fcfc5;color:#176f64;background:#fff}.focus-orbit__dock .primary{width:33px;height:33px;border:0;color:#fff;background:linear-gradient(135deg,#2eaa99,#168174);box-shadow:0 2px 5px rgba(34,142,126,.22)}.focus-orbit__dock .primary:hover:not(:disabled){color:#fff;background:#176f64}
.focus-orbit__tools{position:absolute;z-index:10;display:block;inset:0;pointer-events:none}.focus-orbit__tools>*{position:absolute;pointer-events:auto}.focus-orbit__tools>.focus-style-menu{top:18px;left:36px}.focus-orbit__tools :deep(.focus-style-menu__trigger){width:30px;height:30px;cursor:pointer;border-radius:50%}.focus-orbit__tools>button{display:grid;width:30px;height:30px;cursor:pointer;place-items:center;border:0;border-radius:50%;color:#58716b;background:transparent;transition:background .16s ease,color .16s ease}.focus-orbit__tools>button:hover{color:#176f64;background:#e4f1ed}.focus-orbit__tools>button.active{color:#176f64}.focus-orbit__tools>button:nth-child(2){top:8px;left:55px}.focus-orbit__tools>button:nth-child(3){top:14px;right:45px}.focus-orbit__tools>button:nth-child(4){top:27px;right:28px}button:disabled{cursor:default;opacity:.4}button:focus-visible{outline:3px solid rgba(35,143,128,.3);outline-offset:2px}@media(prefers-reduced-motion:reduce){.progress,.focus-orbit__dock button,.focus-orbit__tools>button{transition:none}}
</style>
