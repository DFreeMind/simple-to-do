<template>
  <section class="focus-island" :class="{ expanded, paused: controller.status === 'paused', break: controller.phase !== 'focus' }" aria-labelledby="focus-controller-title" @pointerdown="$emit('drag', $event)">
    <div class="focus-island__ring" :style="ringStyle"><span>{{ progressText }}</span></div>
    <div class="focus-island__copy">
      <span v-if="expanded" class="focus-island__status">{{ statusLabel }}</span>
      <h1 id="focus-controller-title">{{ formattedTime }}</h1>
      <p>{{ controller.status === 'paused' ? `暂停 ${formattedPausedTime}` : controller.taskTitle || fallbackText }}<template v-if="expanded && expectedEnd"> · {{ expectedEnd }}</template></p>
    </div>
    <div v-if="expanded" class="focus-island__tools" @pointerdown.stop>
      <FocusControllerStyleMenu :model-value="controller.style" @select="$emit('select-style', $event)" />
      <button type="button" :class="{ active: controller.alwaysOnTop }" :aria-label="controller.alwaysOnTop ? '取消窗口置顶' : '置顶窗口'" @click="$emit('toggle-top')"><Pin v-if="controller.alwaysOnTop" :size="15" fill="currentColor"/><PinOff v-else :size="15"/></button>
      <button type="button" aria-label="关闭专注控制器" @click="$emit('close')"><X :size="16"/></button>
    </div>
    <div class="focus-island__primary" @pointerdown.stop>
      <button type="button" :disabled="busy" :aria-label="controller.status === 'paused' ? '继续专注' : '暂停专注'" @click="$emit('action', controller.status === 'paused' ? 'resume' : 'pause')"><Play v-if="controller.status === 'paused'" :size="17" fill="currentColor"/><Pause v-else :size="17" fill="currentColor"/></button>
      <button class="expand" type="button" :aria-expanded="expanded" :aria-label="expanded ? '收起操作' : '展开操作'" @click="$emit('toggle-expanded')"><ChevronUp v-if="expanded" :size="16"/><ChevronDown v-else :size="16"/></button>
    </div>
    <div v-if="expanded" class="focus-island__secondary" @pointerdown.stop>
      <button type="button" :disabled="busy || !canAdjust" @click="$emit('action','subtract-five')"><Minus :size="14"/>5 分钟</button>
      <button type="button" :disabled="busy || !canAdjust" @click="$emit('action','add-five')"><Plus :size="14"/>5 分钟</button>
      <button type="button" :disabled="busy" @click="$emit('action','finish')"><Check :size="14"/>完成</button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Check, ChevronDown, ChevronUp, Minus, Pause, Pin, PinOff, Play, Plus, X } from 'lucide-vue-next'
import FocusControllerStyleMenu from './FocusControllerStyleMenu.vue'
const props=defineProps({controller:{type:Object,required:true},formattedTime:{type:String,required:true},canAdjust:Boolean,busy:Boolean,progressRatio:{type:Number,default:0},expanded:Boolean,liveSeconds:{type:Number,default:0},pausedSeconds:{type:Number,default:0}})
defineEmits(['action','toggle-top','close','select-style','drag','toggle-expanded'])
const progressPercent=computed(()=>Math.round(Math.max(0,Math.min(1,props.progressRatio))*100))
const progressText=computed(()=>props.controller.durationSeconds===null?'∞':`${progressPercent.value}%`)
const ringStyle=computed(()=>({background:`conic-gradient(${props.controller.status==='paused'?'#c0923f':props.controller.phase==='focus'?'#238f80':'#4e9fac'} 0 ${progressPercent.value}%, #e1efeb ${progressPercent.value}% 100%)`}))
const statusLabel=computed(()=>props.controller.status==='paused'?'已暂停':props.controller.phase==='focus'?'正在专注':'正在休息')
const fallbackText=computed(()=>props.controller.phase==='focus'?'保持在当前这件事上':'暂时离开屏幕，恢复一下')
const expectedEnd=computed(()=>{if(props.controller.remainingSeconds===null||props.controller.status==='paused')return'';const date=new Date(Date.now()+props.liveSeconds*1000);return`预计 ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')} 结束`})
const formattedPausedTime=computed(()=>formatDuration(props.pausedSeconds))
function formatDuration(seconds){const value=Math.max(0,Math.floor(seconds||0));const hours=Math.floor(value/3600);const minutes=Math.floor((value%3600)/60);const rest=value%60;return hours>0?`${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`:`${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`}
</script>

<style scoped>
.focus-island{position:relative;display:flex;width:382px;height:78px;margin:4px;align-items:center;padding:0 12px 0 14px;border:1px solid rgba(38,91,80,.14);border-radius:28px;color:#172923;background:rgba(255,255,255,.97);box-shadow:0 13px 30px rgba(31,82,72,.18);user-select:none}.focus-island.expanded{width:422px;height:124px;padding:17px 14px;border-radius:30px}.focus-island__ring{position:relative;display:grid;width:48px;height:48px;flex:none;place-items:center;border-radius:50%}.focus-island__ring:after{content:"";width:36px;height:36px;border-radius:50%;background:#fff}.focus-island__ring span{position:absolute;z-index:1;color:#176f64;font-size:10px;font-weight:900}.expanded .focus-island__ring{width:57px;height:57px}.expanded .focus-island__ring:after{width:44px;height:44px}.focus-island.paused .focus-island__ring span{color:#946b30}.focus-island__copy{min-width:0;margin-left:13px}.focus-island__status{display:block;margin-bottom:3px;color:#238f80;font-size:11px;font-weight:800}.paused .focus-island__status{color:#946b30}.focus-island__copy h1{margin:0;font-size:28px;line-height:1;letter-spacing:-.055em;font-variant-numeric:tabular-nums}.expanded .focus-island__copy h1{font-size:32px}.focus-island__copy p{max-width:178px;overflow:hidden;margin:5px 0 0;color:#596f69;font-size:11px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.expanded .focus-island__copy p{max-width:218px}.focus-island__primary{display:flex;gap:6px;margin-left:auto}.focus-island__primary button,.focus-island__tools>button{display:grid;width:35px;height:35px;place-items:center;border:1px solid #d7e5e1;border-radius:11px;color:#49635d;background:#f8fbfa}.focus-island__primary button:first-child{border-color:#238f80;color:#fff;background:#238f80}.focus-island__primary .expand{width:32px}.focus-island__tools{position:absolute;top:7px;right:13px;display:flex;gap:2px}.focus-island__tools :deep(.focus-style-menu__popover){right:0;left:auto;display:grid;width:270px;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px;padding:4px}.focus-island__tools :deep(.focus-style-menu__popover button){min-height:51px;padding:6px 8px}.focus-island__tools :deep(.focus-style-menu__popover button small){display:none}.focus-island__tools>button{width:34px;height:34px;border:0;background:transparent}.focus-island__tools>button:hover,.focus-island__tools>button.active{color:#176f64;background:#e5f2ee}.expanded .focus-island__primary{margin-right:2px}.focus-island__secondary{position:absolute;right:14px;bottom:10px;display:flex;gap:5px}.focus-island__secondary button{display:inline-flex;min-height:29px;align-items:center;gap:3px;padding:0 9px;border:1px solid #d8e5e2;border-radius:9px;color:#405b54;background:#f5faf8;font-size:10px;font-weight:750}.focus-island__secondary button:hover:not(:disabled){color:#176f64;background:#fff}.focus-island button:disabled{cursor:default;opacity:.42}.focus-island button:focus-visible{outline:3px solid rgba(35,143,128,.28);outline-offset:2px}@media(prefers-reduced-motion:reduce){.focus-island{transition:none}}
.focus-island{box-shadow:inset 0 1px 0 rgba(255,255,255,.92)}
.focus-island.expanded{height:148px;padding:17px 14px 40px}
</style>
