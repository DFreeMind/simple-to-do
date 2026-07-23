<template>
  <Teleport to="body">
    <Transition name="focus-celebration">
      <div v-if="celebration" class="focus-celebration" role="dialog" aria-modal="true" aria-labelledby="focus-celebration-title" aria-describedby="focus-celebration-description" @click.self="dismiss" @keydown.esc.stop="dismiss" @keydown.tab="trapFocus">
        <section ref="dialogCard" class="focus-celebration__card" role="document">
          <span class="focus-celebration__glow focus-celebration__glow--top" aria-hidden="true"></span>
          <span class="focus-celebration__glow focus-celebration__glow--bottom" aria-hidden="true"></span>
          <button class="focus-celebration__close" type="button" aria-label="关闭专注完成提示" @click="dismiss"><X :size="20" /></button>

          <div class="focus-celebration__hero" aria-hidden="true">
            <span class="focus-celebration__halo"></span>
            <span class="focus-celebration__check"><CircleCheck :size="43" :stroke-width="1.8" /></span>
            <Sparkles class="focus-celebration__sparkle focus-celebration__sparkle--one" :size="18" />
            <Sparkles class="focus-celebration__sparkle focus-celebration__sparkle--two" :size="13" />
          </div>

          <div class="focus-celebration__copy">
            <p class="focus-celebration__eyebrow">专注完成</p>
            <h2 id="focus-celebration-title">这一段时间，属于重要的事</h2>
            <p class="focus-celebration__metric">
              <strong>{{ durationParts.value }}</strong>
              <span>{{ durationParts.unit }}</span>
            </p>
            <p id="focus-celebration-description" class="focus-celebration__duration">已经记录到你的专注历程</p>
          </div>

          <div v-if="celebration.taskTitle" class="focus-celebration__task">
            <span>本轮推进</span>
            <strong>{{ celebration.taskTitle }}</strong>
          </div>

          <div v-if="celebration.reward" class="focus-celebration__reward">
            <span class="focus-celebration__reward-icon"><FocusRewardBadge :reward="celebration.reward" size="md" /></span>
            <span><small>专注收获</small><strong>{{ rewardName }}</strong></span>
          </div>

          <p v-if="celebration.pendingBreak" class="focus-celebration__tip">
            <span><Coffee :size="18" /></span>
            <span><strong>接下来，休息 {{ durationText(celebration.breakSeconds) }}</strong><small>起身喝水，看看远处，让注意力重新充电。</small></span>
          </p>

          <div class="focus-celebration__actions">
            <button v-if="celebration.pendingBreak" ref="primaryAction" class="focus-celebration__primary" type="button" @click="$emit('start-break')">开始休息</button>
            <button v-else ref="primaryAction" class="focus-celebration__primary" type="button" @click="$emit('dismiss')">收下这次专注</button>
            <button v-if="celebration.pendingBreak" class="focus-celebration__secondary" type="button" @click="$emit('dismiss')">稍后休息</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { CircleCheck, Coffee, Sparkles, X } from 'lucide-vue-next'
import FocusRewardBadge from './FocusRewardBadge.vue'

const props = defineProps({
  celebration: { type: Object, default: null }
})

const emit = defineEmits(['dismiss', 'start-break'])
const primaryAction = ref(null)
const dialogCard = ref(null)

const rewardName = computed(() => ({
  blueberry: '蓝莓', strawberry: '草莓', tomato: '番茄', watermelon: '西瓜', pumpkin: '南瓜'
}[props.celebration?.reward] || '蓝莓'))

const durationParts = computed(() => {
  const minutes = Math.max(1, Math.round((Number(props.celebration?.elapsedSeconds) || 0) / 60))
  if (minutes >= 60 && minutes % 60 === 0) return { value: minutes / 60, unit: '小时' }
  return { value: minutes, unit: '分钟' }
})

watch(() => props.celebration?.id, async (id) => {
  if (!id) return
  await nextTick()
  primaryAction.value?.focus()
})

function dismiss() {
  emit('dismiss')
}

function trapFocus(event) {
  const controls = [...(dialogCard.value?.querySelectorAll('button:not(:disabled)') || [])]
  if (!controls.length) return
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function durationText(seconds) {
  const minutes = Math.max(1, Math.round((Number(seconds) || 0) / 60))
  return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时${minutes % 60 ? ` ${minutes % 60} 分钟` : ''}` : `${minutes} 分钟`
}
</script>
