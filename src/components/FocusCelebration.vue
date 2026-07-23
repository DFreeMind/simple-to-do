<template>
  <Teleport to="body">
    <Transition name="focus-celebration">
      <div v-if="celebration" class="focus-celebration" role="dialog" aria-modal="true" aria-labelledby="focus-celebration-title" aria-describedby="focus-celebration-description" @click.self="dismiss" @keydown.esc.stop="dismiss" @keydown.tab="trapFocus">
        <section ref="dialogCard" class="focus-celebration__card" role="document">
          <button class="focus-celebration__close" type="button" aria-label="关闭专注完成提示" @click="dismiss"><X :size="20" /></button>
          <header class="focus-celebration__header">
            <span class="focus-celebration__brand"><CircleCheck :size="22" /></span>
            <span>易简清单 · 专注时刻</span>
          </header>
          <div class="focus-celebration__copy">
            <p class="focus-celebration__eyebrow">这一轮，完成得很稳</p>
            <h2 id="focus-celebration-title">完成 {{ durationText(celebration.elapsedSeconds) }} 专注</h2>
            <p v-if="celebration.taskTitle" class="focus-celebration__task">推进了：{{ celebration.taskTitle }}</p>
            <p id="focus-celebration-description" class="focus-celebration__duration">{{ celebration.pendingBreak ? `建议休息 ${durationText(celebration.breakSeconds)}，再继续下一轮。` : '这段投入已经稳稳记下。' }}</p>
          </div>
          <div v-if="celebration.reward" class="focus-celebration__reward">
            <FocusRewardBadge :reward="celebration.reward" size="md" />
            <span>收获 {{ rewardName }}</span>
          </div>
          <p v-if="celebration.pendingBreak" class="focus-celebration__tip"><Coffee :size="16" />离开屏幕，喝口水，看看远处。</p>
          <div class="focus-celebration__actions">
            <button v-if="celebration.pendingBreak" ref="primaryAction" class="focus-celebration__primary" type="button" @click="$emit('start-break')">开始休息</button>
            <button v-else ref="primaryAction" class="focus-celebration__primary" type="button" @click="$emit('dismiss')">完成</button>
            <button v-if="celebration.pendingBreak" class="focus-celebration__secondary" type="button" @click="$emit('dismiss')">稍后休息</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { CircleCheck, Coffee, X } from 'lucide-vue-next'
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
